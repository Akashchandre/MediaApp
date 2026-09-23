import { useCallback, useEffect, useId, useRef } from "react";
import { assignRef, mergeProps } from "./props.js";

const focusable = 'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]';
const isEditing = (target) =>
  target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName);

// Controlled selection: null means closed. Spread dialog props on a native <dialog>.
export function useMediaLightbox({
  items = [], selectedIndex = null, onSelectedIndexChange, label = "Media preview",
} = {}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const isOpen = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < items.length;
  const canPrevious = isOpen && selectedIndex > 0;
  const canNext = isOpen && selectedIndex < items.length - 1;
  const close = useCallback(() => onSelectedIndexChange?.(null), [onSelectedIndexChange]);
  const previous = () => { if (canPrevious) onSelectedIndexChange?.(selectedIndex - 1); };
  const next = () => { if (canNext) onSelectedIndexChange?.(selectedIndex + 1); };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;
    const returnFocus = dialog.ownerDocument.activeElement;
    // showModal makes the rest of the document inert and uses the browser's top layer.
    if (!dialog.open) dialog.showModal();
    dialog.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [isOpen]);

  function onKeyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "Tab") {
      const dialog = dialogRef.current;
      const candidates = [...dialog.querySelectorAll(focusable)].filter((node) =>
        !node.disabled && node.tabIndex >= 0 && !node.closest('[hidden], [inert], [aria-hidden="true"]') &&
        node.getClientRects().length > 0,
      );
      const first = candidates[0];
      const last = candidates.at(-1);
      const focused = dialog.ownerDocument.activeElement;
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (focused === first || !candidates.includes(focused))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (focused === last || !candidates.includes(focused))) {
        event.preventDefault(); first.focus();
      }
    }
    if (isEditing(event.target)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
  }

  return {
    isOpen, item: isOpen ? items[selectedIndex] : null, canPrevious, canNext,
    close, previous, next,
    getDialogProps: ({ ref, ...props } = {}) => ({
      ...mergeProps({
        tabIndex: -1, "aria-modal": true, "aria-label": label,
        onKeyDown,
        onCancel: (event) => { event.preventDefault(); close(); },
      }, props),
      ref: (node) => { dialogRef.current = node; assignRef(ref, node); },
    }),
    getTitleProps: (props) => mergeProps({ id: titleId }, props),
    getCloseProps: (props) => mergeProps({ type: "button", "aria-label": "Close preview", onClick: close }, props),
    getPreviousProps: (props) => mergeProps({
      type: "button", "aria-label": "Previous item", disabled: !canPrevious, onClick: previous,
    }, props),
    getNextProps: (props) => mergeProps({
      type: "button", "aria-label": "Next item", disabled: !canNext, onClick: next,
    }, props),
  };
}
