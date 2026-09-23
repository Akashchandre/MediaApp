import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assignRef, itemKey, mergeProps } from "./props.js";

export function useMediaReel({
  items = [], getItemKey = itemKey, itemHeight, onActiveItemChange, label = "Media reels",
} = {}) {
  if (!Number.isFinite(itemHeight) || itemHeight <= 0) throw new Error("itemHeight must be a positive number.");
  const listRef = useRef(null);
  const latest = useRef({ items, getItemKey });
  const listener = useRef(onActiveItemChange);
  const [selection, setSelection] = useState(null);
  const activeIndex = selection
    ? items.findIndex((item, index) => getItemKey(item, index) === selection.key) : -1;
  const activeItem = items[activeIndex] ?? null;
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    latest.current = { items, getItemKey };
    listener.current = onActiveItemChange;
    activeIndexRef.current = activeIndex;
  }, [items, getItemKey, onActiveItemChange, activeIndex]);
  useEffect(() => {
    if (activeIndex >= 0) listener.current?.(activeItem, activeIndex);
  }, [activeItem, activeIndex]);
  useEffect(() => {
    // Preserve the visible page when orientation changes the measured viewport.
    if (activeIndexRef.current >= 0) {
      listRef.current?.scrollToOffset({ offset: activeIndexRef.current * itemHeight, animated: false });
    }
  }, [itemHeight]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 100 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const { items: current, getItemKey: key } = latest.current;
    const visible = viewableItems
      .filter((token) => token.isViewable && Number.isInteger(token.index) &&
        token.index >= 0 && token.index < current.length &&
        key(current[token.index], token.index) === key(token.item, token.index))
      .sort((a, b) => a.index - b.index)[0];
    // Empty notifications occur while swiping; retain the last confirmed active page.
    if (visible) setSelection({ key: key(current[visible.index], visible.index) });
  }, []);

  function goTo(index) {
    if (!items.length || !Number.isInteger(index)) return;
    const target = Math.max(0, Math.min(items.length - 1, index));
    listRef.current?.scrollToOffset({ offset: target * itemHeight, animated: false });
    // Actual visibility, rather than a requested scroll, confirms the active item.
  }

  return {
    activeIndex, activeItem, goTo,
    getListProps: ({ ref, ...props } = {}) => ({
      ...mergeProps({
        data: items, keyExtractor: getItemKey, extraData: activeIndex,
        horizontal: false, pagingEnabled: true, snapToInterval: itemHeight,
        snapToAlignment: "start", decelerationRate: "fast",
        accessibilityLabel: label, viewabilityConfig, onViewableItemsChanged,
        getItemLayout: (_data, index) => ({ length: itemHeight, offset: itemHeight * index, index }),
      }, props),
      ref: (node) => { listRef.current = node; assignRef(ref, node); },
    }),
    getItemProps: ({ index, ...props }) => mergeProps({
      accessibilityLabel: `Item ${index + 1} of ${items.length}`,
      accessibilityState: { selected: index === activeIndex },
    }, props),
  };
}
