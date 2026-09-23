import { useRef } from "react";
import { itemKey, mergeProps } from "./props.js";

export function useMediaGrid({
  items = [], getItemKey = itemKey, numColumns = 2,
  onItemSelect, onLoadMore, hasNextPage = false,
  isLoading = false, isLoadingMore = false, label = "Media results",
} = {}) {
  if (!Number.isInteger(numColumns) || numColumns < 1) throw new Error("numColumns must be a positive integer.");
  const pending = useRef(false);
  const busy = isLoading || isLoadingMore;
  async function loadMore() {
    if (busy || !hasNextPage || !onLoadMore || pending.current) return;
    pending.current = true;
    try { await onLoadMore(); } finally { pending.current = false; }
  }
  return {
    getListProps: (props) => mergeProps({
      data: items, keyExtractor: getItemKey, numColumns, horizontal: false,
      accessibilityLabel: label, accessibilityState: { busy },
      onEndReached: loadMore, onEndReachedThreshold: 0.5,
    }, props),
    getItemProps: ({ index, ...props }) => {
      const disabled = !Number.isInteger(index) || index < 0 || index >= items.length;
      return mergeProps({
        accessibilityRole: "button", disabled, accessibilityState: { disabled },
        onPress: () => { if (!disabled) onItemSelect?.(items[index], index); },
      }, props);
    },
    getLoadMoreProps: (props) => {
      const disabled = busy || !hasNextPage || !onLoadMore;
      return mergeProps({
        accessibilityRole: "button", accessibilityLabel: "Load more",
        disabled, accessibilityState: { disabled, busy }, onPress: loadMore,
      }, props);
    },
  };
}
