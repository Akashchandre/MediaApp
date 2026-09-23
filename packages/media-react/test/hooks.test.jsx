// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as web from "../src/index.js";
import * as native from "../../media-native/src/index.js";

afterEach(cleanup);

function media(id) {
  return { id, kind: "photo", title: id };
}

function client(overrides = {}) {
  return {
    search: vi.fn(),
    discover: vi.fn(),
    getItem: vi.fn(),
    trackView: vi.fn(),
    trackDownload: vi.fn(),
    clearCache: vi.fn(),
    on: vi.fn(() => () => undefined),
    ...overrides,
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function page(id, number = 1, nextPage = null) {
  return { items: [media(id)], page: number, nextPage, hasNextPage: nextPage !== null };
}

describe.each([["React", web], ["React Native", native]])("%s wrapper", (_name, api) => {
  const { MediaProvider, useMediaSearch, useMediaItem, useMediaClient, useMediaActions, useMediaEvent } = api;
  function provider(mediaClient) {
    return function Wrapper({ children }) {
      return <MediaProvider client={mediaClient}>{children}</MediaProvider>;
    };
  }
  it("loads discovery results and appends the next page", async () => {
    const mediaClient = client({
      discover: vi
        .fn()
        .mockResolvedValueOnce({ items: [media("one")], page: 1, nextPage: 2, hasNextPage: true })
        .mockResolvedValueOnce({ items: [media("two")], page: 2, hasNextPage: false }),
    });
    const { result } = renderHook(() => useMediaSearch({ kind: "photo" }), {
      wrapper: provider(mediaClient),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.loadMore());

    expect(result.current.items.map((item) => item.id)).toEqual(["one", "two"]);
    expect(result.current.hasNextPage).toBe(false);
    expect(mediaClient.discover.mock.calls[1][0].page).toBe(2);
    await act(() => result.current.loadMore());
    expect(mediaClient.discover).toHaveBeenCalledTimes(2);
  });

  it("does not allow an older query response to replace a newer one", async () => {
    let resolveFirst;
    let resolveSecond;
    const first = new Promise((resolve) => { resolveFirst = resolve; });
    const second = new Promise((resolve) => { resolveSecond = resolve; });
    const mediaClient = client({ search: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) });
    const { result, rerender } = renderHook(
      ({ query }) => useMediaSearch({ query, kind: "photo" }),
      { initialProps: { query: "first" }, wrapper: provider(mediaClient) },
    );

    await waitFor(() => expect(mediaClient.search).toHaveBeenCalledTimes(1));
    rerender({ query: "second" });
    await waitFor(() => expect(mediaClient.search).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond({ items: [media("new")], page: 1, hasNextPage: false });
      await second;
    });
    await act(async () => {
      resolveFirst({ items: [media("old")], page: 1, hasNextPage: false });
      await first;
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["new"]);
  });

  it("surfaces request errors and retries", async () => {
    const failure = new Error("offline");
    const mediaClient = client({
      discover: vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce({
        items: [media("recovered")], page: 1, hasNextPage: false,
      }),
    });
    const { result } = renderHook(() => useMediaSearch(), { wrapper: provider(mediaClient) });

    await waitFor(() => expect(result.current.error).toBe(failure));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items[0]?.id).toBe("recovered"));
  });

  it("keeps failed pagination results and retries the same page without duplicate requests", async () => {
    const pending = deferred();
    const mediaClient = client({
      discover: vi.fn().mockResolvedValueOnce(page("one", 1, 4))
        .mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page("four", 4)),
    });
    const { result } = renderHook(() => useMediaSearch(), { wrapper: provider(mediaClient) });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    let first;
    act(() => { first = result.current.loadMore(); void result.current.loadMore(); });
    expect(mediaClient.discover).toHaveBeenCalledTimes(2);
    expect(result.current.isLoadingMore).toBe(true);
    await act(async () => { pending.reject(new Error("offline")); await first; });
    expect(result.current.items[0].id).toBe("one");
    expect(result.current.error.message).toBe("offline");
    await act(() => result.current.loadMore());
    expect(mediaClient.discover.mock.calls.map(([args]) => args.page)).toEqual([1, 4, 4]);
    expect(result.current.items.map((item) => item.id)).toEqual(["one", "four"]);
  });

  it("does not let old pagination unlock or replace a new query's pagination", async () => {
    const oldMore = deferred();
    const newMore = deferred();
    const mediaClient = client({
      search: vi.fn().mockResolvedValueOnce(page("old", 1, 2))
        .mockReturnValueOnce(oldMore.promise).mockResolvedValueOnce(page("new", 1, 2))
        .mockReturnValueOnce(newMore.promise),
    });
    const { result, rerender, unmount } = renderHook(
      ({ query }) => useMediaSearch({ query }),
      { initialProps: { query: "old" }, wrapper: provider(mediaClient) },
    );
    await waitFor(() => expect(result.current.items[0]?.id).toBe("old"));
    let oldTask;
    act(() => { oldTask = result.current.loadMore(); });
    const oldSignal = mediaClient.search.mock.calls[1][0].signal;
    rerender({ query: "new" });
    expect(oldSignal.aborted).toBe(true);
    await waitFor(() => expect(result.current.items[0]?.id).toBe("new"));
    let newTask;
    act(() => { newTask = result.current.loadMore(); });
    await act(async () => { oldMore.resolve(page("stale", 2)); await oldTask; });
    await act(() => result.current.loadMore());
    expect(mediaClient.search).toHaveBeenCalledTimes(4);
    expect(result.current.isLoadingMore).toBe(true);
    await act(async () => { newMore.resolve(page("new-more", 2)); await newTask; });
    expect(result.current.items.map((item) => item.id)).toEqual(["new", "new-more"]);
    unmount();
    expect(mediaClient.search.mock.calls[3][0].signal.aborted).toBe(true);
  });

  it("disables and re-enables requests with fresh loading state", async () => {
    const pending = deferred();
    const mediaClient = client({ discover: vi.fn().mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(page("fresh")) });
    const { result, rerender } = renderHook(
      ({ enabled }) => useMediaSearch({ enabled }),
      { initialProps: { enabled: false }, wrapper: provider(mediaClient) },
    );
    expect(mediaClient.discover).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    rerender({ enabled: true });
    expect(result.current.isLoading).toBe(true);
    rerender({ enabled: false });
    expect(mediaClient.discover.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => { pending.resolve(page("stale")); await pending.promise; });
    expect(result.current.items).toEqual([]);
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.items[0]?.id).toBe("fresh"));
  });

  it("protects single-item results from stale IDs and cancels on unmount", async () => {
    const first = deferred();
    const second = deferred();
    const mediaClient = client({ getItem: vi.fn().mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise) });
    const { result, rerender, unmount } = renderHook(
      ({ id }) => useMediaItem({ id }),
      { initialProps: { id: "1" }, wrapper: provider(mediaClient) },
    );
    expect(result.current.isLoading).toBe(true);
    rerender({ id: "2" });
    expect(result.current.item).toBeNull();
    expect(mediaClient.getItem.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => { second.resolve(media("2")); await second.promise; });
    await act(async () => { first.resolve(media("1")); await first.promise; });
    expect(result.current.item.id).toBe("2");
    unmount();
    expect(mediaClient.getItem.mock.calls[1][0].signal.aborted).toBe(true);
  });

  it("supports missing IDs, item errors, retry, and disabling", async () => {
    const mediaClient = client({ getItem: vi.fn().mockRejectedValueOnce(new Error("missing"))
      .mockResolvedValueOnce(media("2")) });
    const { result, rerender } = renderHook(
      ({ id, enabled }) => useMediaItem({ id, enabled }),
      { initialProps: { id: null, enabled: true }, wrapper: provider(mediaClient) },
    );
    expect(mediaClient.getItem).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    rerender({ id: "2", enabled: true });
    await waitFor(() => expect(result.current.error?.message).toBe("missing"));
    act(() => result.current.retry());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.item?.id).toBe("2"));
    rerender({ id: "2", enabled: false });
    expect(result.current.item).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("uses the latest event callback and cleans up on type changes and unmount", () => {
    const unsubscribe = vi.fn();
    const mediaClient = client({ on: vi.fn(() => unsubscribe) });
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ type, listener }) => useMediaEvent(type, listener),
      { initialProps: { type: "view", listener: first }, wrapper: provider(mediaClient) },
    );
    const event = { type: "view", mediaId: "42", kind: "photo" };
    rerender({ type: "view", listener: second });
    mediaClient.on.mock.calls[0][1](event);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(event);
    expect(mediaClient.on).toHaveBeenCalledTimes(1);
    rerender({ type: "download", listener: second });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("preserves provider identity and delegates actions to a replacement client", () => {
    const first = client();
    const second = client();
    let activeClient = first;
    const actions = renderHook(() => useMediaActions(), {
      wrapper: ({ children }) => <MediaProvider client={activeClient}>{children}</MediaProvider>,
    });
    const originalActions = actions.result.current;
    actions.rerender();
    expect(actions.result.current).toBe(originalActions);
    activeClient = second;
    actions.rerender();
    const data = { mediaId: "42", kind: "photo" };
    actions.result.current.trackView(data);
    actions.result.current.trackDownload(data);
    actions.result.current.clearCache();
    expect(second.trackView).toHaveBeenCalledWith(data);
    expect(second.trackDownload).toHaveBeenCalledWith(data);
    expect(second.clearCache).toHaveBeenCalledOnce();
    expect(first.trackView).not.toHaveBeenCalled();
    const stable = renderHook(() => useMediaClient(), {
      wrapper: ({ children }) => <MediaProvider apiKey="test-key" logEvents={false}>{children}</MediaProvider>,
    });
    const instance = stable.result.current;
    stable.rerender();
    expect(stable.result.current).toBe(instance);
  });

  it("settles requests after Strict Mode effect cleanup and replay", async () => {
    const mediaClient = client({ discover: vi.fn().mockResolvedValue(page("strict")) });
    const { result } = renderHook(() => useMediaSearch(), {
      reactStrictMode: true,
      wrapper: provider(mediaClient),
    });
    await waitFor(() => expect(result.current.items[0]?.id).toBe("strict"));
    expect(mediaClient.discover.mock.calls[0][0].signal.aborted).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
