// @vitest-environment jsdom
// React hook harness: native prop callbacks are exercised directly, not converted to DOM events.
import { createRef, useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaGrid, useMediaLightbox, useMediaReel } from "../src/index.js";

const items = [{ key: "a", text: "First" }, { key: "b", text: "Second" }, { key: "c", text: "Third" }];
afterEach(cleanup);
const viewable = (index, data = items) => ({
  viewableItems: [{ item: data[index], index, key: data[index].key, isViewable: true }],
});

describe("native grid", () => {
  it("provides FlatList data, column layout, keys, and Pressable selection", () => {
    const select = vi.fn();
    const { result } = renderHook(() => useMediaGrid({ items, onItemSelect: select, numColumns: 3 }));
    const list = result.current.getListProps();
    expect(list.data).toBe(items);
    expect(list.numColumns).toBe(3);
    expect(list.horizontal).toBe(false);
    expect(list.keyExtractor(items[1], 1)).toBe("b");
    result.current.getItemProps({ index: 1 }).onPress();
    expect(select).toHaveBeenCalledWith(items[1], 1);
    result.current.getItemProps({ index: -1 }).onPress();
    expect(select).toHaveBeenCalledOnce();
    expect(result.current.getItemProps({ index: -1 }).disabled).toBe(true);
  });

  it("shares the load guard between onEndReached and the Load More button", async () => {
    let resolve;
    const load = vi.fn(() => new Promise((done) => { resolve = done; }));
    const { result, rerender } = renderHook(
      ({ hasNextPage, isLoadingMore }) => useMediaGrid({ items, hasNextPage, isLoadingMore, onLoadMore: load }),
      { initialProps: { hasNextPage: true, isLoadingMore: false } },
    );
    const pending = result.current.getListProps().onEndReached({ distanceFromEnd: 20 });
    await result.current.getLoadMoreProps().onPress();
    expect(load).toHaveBeenCalledOnce();
    resolve();
    await pending;
    rerender({ hasNextPage: true, isLoadingMore: true });
    expect(result.current.getLoadMoreProps().accessibilityState).toEqual({ disabled: true, busy: true });
    await result.current.getListProps().onEndReached();
    rerender({ hasNextPage: false, isLoadingMore: false });
    await result.current.getListProps().onEndReached();
    expect(load).toHaveBeenCalledOnce();
  });

  it("releases failed loads and composes consumer events and accessibility state", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce();
    const select = vi.fn();
    const { result } = renderHook(() => useMediaGrid({ items, onLoadMore: load, hasNextPage: true, onItemSelect: select }));
    await expect(result.current.getLoadMoreProps().onPress()).rejects.toThrow("offline");
    await result.current.getLoadMoreProps().onPress();
    expect(load).toHaveBeenCalledTimes(2);
    const props = result.current.getItemProps({
      index: 0, accessibilityState: { selected: true },
      onPress: (event) => { event.defaultPrevented = true; },
    });
    props.onPress({});
    expect(select).not.toHaveBeenCalled();
    expect(props.accessibilityState).toEqual({ disabled: false, selected: true });
  });
});

describe("native lightbox", () => {
  function useHarness(data = items) {
    const [selectedIndex, onSelectedIndexChange] = useState(null);
    return { ...useMediaLightbox({ items: data, selectedIndex, onSelectedIndexChange }), onSelectedIndexChange };
  }

  it("controls Modal visibility, navigation boundaries, and Android request-close", () => {
    const { result } = renderHook(() => useHarness());
    expect(result.current.getModalProps().visible).toBe(false);
    act(() => result.current.onSelectedIndexChange(0));
    expect(result.current.item).toBe(items[0]);
    expect(result.current.getContentProps().accessibilityViewIsModal).toBe(true);
    expect(result.current.getPreviousProps().disabled).toBe(true);
    act(() => result.current.getPreviousProps().onPress());
    expect(result.current.item).toBe(items[0]);
    act(() => result.current.getNextProps().onPress());
    expect(result.current.item).toBe(items[1]);
    act(() => result.current.next());
    expect(result.current.getNextProps().accessibilityState.disabled).toBe(true);
    act(() => result.current.next());
    expect(result.current.item).toBe(items[2]);
    act(() => result.current.getModalProps().onRequestClose());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.item).toBeNull();
  });

  it("supports accessibility escape and custom native callbacks", () => {
    const consumer = vi.fn();
    const { result } = renderHook(() => useHarness());
    act(() => result.current.onSelectedIndexChange(1));
    act(() => result.current.getContentProps({ onAccessibilityEscape: consumer }).onAccessibilityEscape());
    expect(consumer).toHaveBeenCalledOnce();
    expect(result.current.getModalProps().visible).toBe(false);
    act(() => result.current.onSelectedIndexChange(0));
    act(() => result.current.getCloseProps().onPress());
    expect(result.current.isOpen).toBe(false);
  });

  it("closes for empty data or invalid controlled indices", () => {
    const { result, rerender } = renderHook(({ data, index }) => useMediaLightbox({
      items: data, selectedIndex: index, onSelectedIndexChange: vi.fn(),
    }), { initialProps: { data: items, index: 2 } });
    rerender({ data: [], index: 2 });
    expect(result.current.isOpen).toBe(false);
    rerender({ data: items, index: -1 });
    expect(result.current.getModalProps().visible).toBe(false);
  });
});

describe("native reels", () => {
  it("provides native paging/layout props and stable viewability identities", () => {
    const { result, rerender } = renderHook(() => useMediaReel({ items, itemHeight: 600 }));
    const first = result.current.getListProps();
    expect(first.pagingEnabled).toBe(true);
    expect(first.snapToInterval).toBe(600);
    expect(first.getItemLayout(null, 2)).toEqual({ index: 2, length: 600, offset: 1200 });
    const consumer = vi.fn();
    const composed = result.current.getListProps({ onViewableItemsChanged: consumer });
    rerender();
    const second = result.current.getListProps({ onViewableItemsChanged: consumer });
    expect(second.onViewableItemsChanged).toBe(composed.onViewableItemsChanged);
    expect(second.viewabilityConfig).toBe(first.viewabilityConfig);
    act(() => second.onViewableItemsChanged(viewable(1)));
    expect(consumer).toHaveBeenCalledOnce();
    expect(result.current.activeIndex).toBe(1);
  });

  it("confirms activity from native visibility, ignores stale tokens, and uses latest listener", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ data, listener }) => useMediaReel({
      items: data, itemHeight: 600, onActiveItemChange: listener,
    }), { initialProps: { data: items, listener: first } });
    const notify = result.current.getListProps().onViewableItemsChanged;
    expect(result.current.activeIndex).toBe(-1);
    expect(first).not.toHaveBeenCalled();
    act(() => notify(viewable(0)));
    expect(first).toHaveBeenCalledWith(items[0], 0);
    act(() => notify(viewable(0)));
    expect(first).toHaveBeenCalledOnce();
    rerender({ data: items, listener: second });
    expect(second).not.toHaveBeenCalled();
    act(() => notify(viewable(1)));
    expect(second).toHaveBeenCalledWith(items[1], 1);
    act(() => notify({ viewableItems: [] }));
    expect(result.current.activeIndex).toBe(1);
    const replacement = [{ key: "new", text: "New" }];
    rerender({ data: replacement, listener: second });
    act(() => notify(viewable(0)));
    expect(result.current.activeIndex).toBe(-1);
    act(() => notify(viewable(0, replacement)));
    expect(result.current.activeItem).toBe(replacement[0]);
  });

  it("composes native refs, clamps imperative paging, and waits for visibility", () => {
    const ref = createRef();
    const list = { scrollToOffset: vi.fn() };
    const { result } = renderHook(() => useMediaReel({ items, itemHeight: 600 }));
    result.current.getListProps({ ref }).ref(list);
    expect(ref.current).toBe(list);
    act(() => result.current.goTo(99));
    expect(list.scrollToOffset).toHaveBeenLastCalledWith({ offset: 1200, animated: false });
    expect(result.current.activeIndex).toBe(-1);
    act(() => result.current.goTo(-3));
    expect(list.scrollToOffset).toHaveBeenLastCalledWith({ offset: 0, animated: false });
    result.current.getListProps({ ref }).ref(null);
    expect(ref.current).toBeNull();
    const callback = vi.fn();
    result.current.getListProps({ ref: callback }).ref(list);
    expect(callback).toHaveBeenCalledWith(list);
  });

  it("preserves active page when viewport height changes and handles empty data", () => {
    const list = { scrollToOffset: vi.fn() };
    const { result, rerender } = renderHook(({ data, height }) => useMediaReel({ items: data, itemHeight: height }),
      { initialProps: { data: items, height: 600 } });
    result.current.getListProps().ref(list);
    act(() => result.current.getListProps().onViewableItemsChanged(viewable(2)));
    rerender({ data: items, height: 400 });
    expect(list.scrollToOffset).toHaveBeenCalledWith({ offset: 800, animated: false });
    expect(result.current.getItemProps({ index: 2 }).accessibilityState.selected).toBe(true);
    rerender({ data: [], height: 400 });
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.activeItem).toBeNull();
    list.scrollToOffset.mockClear();
    act(() => result.current.goTo(0));
    expect(list.scrollToOffset).not.toHaveBeenCalled();
  });

  it("ignores non-viewable and out-of-bounds notifications", () => {
    const { result } = renderHook(() => useMediaReel({ items, itemHeight: 500 }));
    act(() => result.current.getListProps().onViewableItemsChanged({
      viewableItems: [
        { item: items[0], index: 0, isViewable: false },
        { item: items[0], index: 99, isViewable: true },
      ],
    }));
    expect(result.current.activeIndex).toBe(-1);
  });
});
