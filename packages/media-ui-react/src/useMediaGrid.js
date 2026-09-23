import { useRef } from "react";
import { mergeProps } from "./props.js";

export function useMediaGrid({
  items = [], onItemSelect, onLoadMore, hasNextPage = false,
  isLoading = false, isLoadingMore = false, label = "Media results",
} = {}) {
  const pending = useRef(false);
  const busy = isLoading || isLoadingMore;
  async function loadMore() {
    if (busy || !hasNextPage || !onLoadMore || pending.current) return;
    pending.current = true;
    try { await onLoadMore(); } finally { pending.current = false; }
  }
  return {
    getContainerProps: (props) => mergeProps({
      role: "group", "aria-label": label, "aria-busy": busy,
    }, props),
    getItemProps: ({ index, ...props }) => mergeProps({
      type: "button",
      disabled: index < 0 || index >= items.length,
      onClick: () => onItemSelect?.(items[index], index),
    }, props),
    getLoadMoreProps: (props) => mergeProps({
      type: "button", disabled: busy || !hasNextPage || !onLoadMore,
      "aria-busy": isLoadingMore, onClick: loadMore,
    }, props),
  };
}
