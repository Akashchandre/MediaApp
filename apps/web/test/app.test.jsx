// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "../src/App.jsx";

const photo = (id) => ({
  id, kind: "photo", title: "Landscape " + id, previewUrl: "/preview.jpg",
  width: 1200, height: 800, sources: { medium: "/medium.jpg", large: "/large.jpg", original: "/original.jpg" },
  creator: { name: "Test Creator" }, pexelsUrl: "https://www.pexels.com/photo/" + id,
});
const video = (id, sources = [{ url: "/clip.mp4", mimeType: "video/mp4", quality: "sd" }]) => ({
  id, kind: "video", title: "Clip " + id, duration: 12, width: 1080, height: 1920,
  previewUrl: "/poster.jpg", sources, creator: { name: "Video Creator" }, pexelsUrl: "https://www.pexels.com/video/" + id,
});
const page = (items, nextPage = null, number = 1) => ({
  items, page: number, perPage: 18, nextPage, hasNextPage: nextPage !== null,
});
function fixtureClient() {
  const listeners = { view: new Set(), download: new Set() };
  const emit = (type, data) => {
    const event = { ...data, type, timestamp: 1 };
    listeners[type].forEach((listener) => listener(event));
    return event;
  };
  return {
    discover: vi.fn(({ kind }) => Promise.resolve(page(kind === "photo" ? [photo("1"), photo("2")] : [video("3"), video("4")]))),
    search: vi.fn().mockResolvedValue(page([photo("5")])),
    on: vi.fn((type, listener) => { listeners[type].add(listener); return () => listeners[type].delete(listener); }),
    trackView: vi.fn((data) => emit("view", data)),
    trackDownload: vi.fn((data) => emit("download", data)),
    listeners,
  };
}

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute("open", ""); } },
    close: { configurable: true, value() { this.removeAttribute("open"); } },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
});

it("requires a key, sends it through the real provider, and clears it on disconnect", async () => {
  const request = vi.fn(async () => new Response(JSON.stringify({ photos: [], page: 1, per_page: 18 })));
  render(<App fetch={request} />);
  const connect = screen.getByRole("button", { name: /Start exploring/ });
  expect(connect.disabled).toBe(true);
  const input = screen.getByLabelText("Pexels API key");
  expect(input.type).toBe("password");
  fireEvent.change(input, { target: { value: " fixture-key " } });
  fireEvent.click(connect);
  await screen.findByText("No results this time.");
  expect(request).toHaveBeenCalledWith(expect.stringContaining("/curated?"), {
    headers: { Authorization: "fixture-key" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
  expect(screen.getByLabelText("Pexels API key").value).toBe("");
  expect(screen.queryByRole("search")).toBeNull();
});

it("searches only on submit, switches kinds, and clears the query", async () => {
  const client = fixtureClient();
  client.search.mockImplementation(({ kind }) => Promise.resolve(page(kind === "photo" ? [photo("5")] : [video("6")])));
  render(<App client={client} />);
  await screen.findByRole("button", { name: "Open Landscape 1" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ocean" } });
  expect(client.search).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByRole("search"));
  await screen.findByRole("button", { name: "Open Landscape 5" });
  expect(client.search).toHaveBeenLastCalledWith(expect.objectContaining({ query: "ocean", kind: "photo" }));
  fireEvent.click(screen.getByRole("button", { name: /Videos/ }));
  await screen.findByLabelText("Clip 6");
  expect(client.search).toHaveBeenLastCalledWith(expect.objectContaining({ query: "ocean", kind: "video" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  await screen.findByLabelText("Clip 3");
  expect(client.discover).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "video" }));
});

it("tracks photo open, next, and requested download and restores focus on close", async () => {
  const client = fixtureClient();
  const view = render(<App client={client} />, { reactStrictMode: true });
  const trigger = await screen.findByRole("button", { name: "Open Landscape 1" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Next item" }));
  expect(client.trackView).toHaveBeenCalledTimes(2);
  expect(client.trackView).toHaveBeenLastCalledWith({ mediaId: "2", kind: "photo" });
  const download = within(dialog).getByRole("link", { name: /Download original/ });
  download.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(download);
  expect(client.trackDownload).toHaveBeenCalledWith({ mediaId: "2", kind: "photo" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }));
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(screen.getByText(/Session activity/));
  expect(screen.getByText("Download requested")).toBeTruthy();
  view.unmount();
  expect(client.listeners.view.size).toBe(0);
});

it("keeps photos visible after failed pagination and retries that page", async () => {
  const client = fixtureClient();
  client.discover.mockReset().mockResolvedValueOnce(page([photo("1")], 2))
    .mockRejectedValueOnce(new Error("Page unavailable"))
    .mockResolvedValueOnce(page([photo("2")], null, 2));
  render(<App client={client} />);
  await screen.findByRole("button", { name: "Open Landscape 1" });
  fireEvent.click(screen.getByRole("button", { name: /Discover more photos/ }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Open Landscape 1" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("button", { name: "Open Landscape 2" });
  expect(client.discover.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 2]);
});

it("shows authentication recovery and retries initial errors", async () => {
  const client = fixtureClient();
  client.discover.mockReset().mockRejectedValueOnce(Object.assign(new Error("Pexels rejected the API key."), {
    code: "AUTHENTICATION_ERROR",
  })).mockResolvedValueOnce(page([]));
  render(<App client={client} />);
  await screen.findByText("Use Disconnect above to enter a different Pexels key.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("No results this time.");
});

it("plays the active reel, pauses inactive reels, and tracks transitions once in Strict Mode", async () => {
  const client = fixtureClient();
  const view = render(<App client={client} />, { reactStrictMode: true });
  await screen.findByRole("button", { name: "Open Landscape 1" });
  fireEvent.click(screen.getByRole("button", { name: /Videos/ }));
  const first = await screen.findByLabelText("Clip 3");
  const second = screen.getByLabelText("Clip 4");
  await waitFor(() => expect(client.trackView).toHaveBeenCalledTimes(1));
  const play = HTMLMediaElement.prototype.play;
  const pause = HTMLMediaElement.prototype.pause;
  expect(play.mock.instances).toContain(first);
  expect(pause.mock.instances).toContain(second);
  const container = screen.getByRole("region", { name: "Media reels" });
  Object.defineProperty(container, "clientHeight", { value: 500 });
  container.scrollTo = vi.fn();
  fireEvent.click(screen.getByRole("button", { name: "Next video" }));
  expect(client.trackView).toHaveBeenCalledTimes(2);
  expect(client.trackView).toHaveBeenLastCalledWith({ mediaId: "4", kind: "video" });
  expect(play.mock.instances).toContain(second);
  expect(pause.mock.instances).toContain(first);
  expect(container.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
  view.unmount();
  expect(pause.mock.instances).toContain(second);
});

it("handles autoplay rejection and missing playable sources", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("Blocked"));
  const client = fixtureClient();
  client.discover.mockImplementation(({ kind }) => Promise.resolve(page(
    kind === "photo" ? [photo("1")] : [video("3"), video("4", [])],
  )));
  render(<App client={client} />);
  await screen.findByRole("button", { name: "Open Landscape 1" });
  fireEvent.click(screen.getByRole("button", { name: /Videos/ }));
  await screen.findByText("Autoplay is unavailable. Use the video controls to play.");
  expect(screen.getByText("No playable MP4 is available.")).toBeTruthy();
  await act(async () => fireEvent.play(screen.getByLabelText("Clip 3")));
  expect(screen.queryByText("Autoplay is unavailable. Use the video controls to play.")).toBeNull();
});
