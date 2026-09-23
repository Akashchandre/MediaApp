import { useCallback, useEffect, useRef, useState } from "react";
import { assignRef, mergeProps } from "./props.js";

// Each item must be exactly one container viewport tall; CSS belongs to the consumer.
export function useMediaReel({ items = [], onActiveItemChange, label = "Media reels" } = {}) {
  const containerRef = useRef(null);
  const [index, setIndex] = useState(0);
  const activeIndex = items.length ? Math.min(index, items.length - 1) : -1;
  const activeItem = items[activeIndex] ?? null;
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  const listenerRef = useRef(onActiveItemChange);
  useEffect(() => { listenerRef.current = onActiveItemChange; }, [onActiveItemChange]);
  useEffect(() => {
    if (activeIndex >= 0) listenerRef.current?.(activeItem, activeIndex);
  }, [activeItem, activeIndex]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container?.clientHeight || !items.length) return;
    setIndex(Math.max(0, Math.min(items.length - 1, Math.round(container.scrollTop / container.clientHeight))));
  }, [items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    function resize() {
      // Retain the selected page when the consumer's viewport dimensions change.
      container.scrollTop = Math.max(0, activeIndexRef.current) * container.clientHeight;
    }
    resize();
    if (typeof ResizeObserver === "undefined") {
      container.ownerDocument.defaultView.addEventListener("resize", resize);
      return () => container.ownerDocument.defaultView.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [items.length]);

  function goTo(nextIndex) {
    if (!items.length || !Number.isInteger(nextIndex)) return;
    const target = Math.max(0, Math.min(items.length - 1, nextIndex));
    containerRef.current?.scrollTo({ top: target * containerRef.current.clientHeight, behavior: "auto" });
    setIndex(target);
  }

  return {
    activeIndex, activeItem, goTo,
    getContainerProps: ({ ref, ...props } = {}) => ({
      ...mergeProps({
        role: "region", "aria-label": label, tabIndex: 0,
        onScroll: measure,
        onKeyDown: (event) => {
          // Controls inside a reel keep their native keyboard behavior.
          if (event.target !== event.currentTarget) return;
          const keys = { ArrowDown: activeIndex + 1, ArrowUp: activeIndex - 1, Home: 0, End: items.length - 1 };
          if (Object.hasOwn(keys, event.key)) { event.preventDefault(); goTo(keys[event.key]); }
        },
      }, props),
      ref: (node) => { containerRef.current = node; assignRef(ref, node); },
    }),
    getItemProps: ({ index: itemIndex, ...props }) => mergeProps({
      role: "group", "aria-label": `Item ${itemIndex + 1} of ${items.length}`,
      "aria-current": itemIndex === activeIndex ? "true" : undefined,
      "data-active": itemIndex === activeIndex,
    }, props),
  };
}
