import { mergeProps } from "./props.js";

export function useMediaLightbox({
  items = [], selectedIndex = null, onSelectedIndexChange, label = "Media preview",
} = {}) {
  const isOpen = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < items.length;
  const canPrevious = isOpen && selectedIndex > 0;
  const canNext = isOpen && selectedIndex < items.length - 1;
  const close = () => onSelectedIndexChange?.(null);
  const previous = () => { if (canPrevious) onSelectedIndexChange?.(selectedIndex - 1); };
  const next = () => { if (canNext) onSelectedIndexChange?.(selectedIndex + 1); };
  function button(label, onPress, disabled, props) {
    return mergeProps({
      accessibilityRole: "button", accessibilityLabel: label,
      accessibilityState: { disabled }, disabled, onPress,
    }, props);
  }
  return {
    isOpen, item: isOpen ? items[selectedIndex] : null,
    canPrevious, canNext, close, previous, next,
    getModalProps: (props) => mergeProps({
      visible: isOpen, onRequestClose: close,
    }, props),
    getContentProps: (props) => mergeProps({
      accessibilityLabel: label, accessibilityViewIsModal: isOpen,
      onAccessibilityEscape: close,
    }, props),
    getCloseProps: (props) => button("Close preview", close, !isOpen, props),
    getPreviousProps: (props) => button("Previous item", previous, !canPrevious, props),
    getNextProps: (props) => button("Next item", next, !canNext, props),
  };
}
