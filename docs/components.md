# Headless web UI

Import `useMediaGrid`, `useMediaLightbox`, and `useMediaReel` from
`@headless-media/ui-react`. They accept arbitrary data and callbacks, import only
React, and ship no markup or styles. They work without a provider, API key, or SDK.

## Prop-getter rules

- Spread the returned props onto the specified DOM element.
- Pass custom handlers, refs, attributes, and class names **into** the getter.
  Spreading handlers afterward replaces the internal behavior.
- Custom handlers run first. Call `event.preventDefault()` to cancel the hook's handler.
  Undefined custom values leave defaults intact.
- Dialog/reel getters compose callback and object refs. Keep the dialog/container
  mounted while using the hook; changing its DOM element requires remounting the consumer.
- Do not override required accessibility attributes or detach returned refs.
- Consumers own item keys, labels, rendering, CSS, loading/error messages, downloads,
  video playback, and any activity tracking.

## Grid

`useMediaGrid({ items, onItemSelect, onLoadMore, hasNextPage, isLoading,
isLoadingMore, label })` returns:

| Getter | Element | Behavior |
|---|---|---|
| `getContainerProps(props?)` | `div` / `section` | Named group and busy state |
| `getItemProps({ index, ...props })` | `button` | Calls `onItemSelect(items[index], index)` |
| `getLoadMoreProps(props?)` | `button` | Guards busy, pending, and exhausted pagination |

Use buttons with accessible text or image alt text. The container uses a group,
not an ARIA grid: normal Tab navigation remains available without requiring
spreadsheet-style arrow key navigation. Return the pagination promise from
`onLoadMore`; handle its error in the consumer so a click does not produce an
unhandled rejection. Failed requests release the pending guard.

## Lightbox

`useMediaLightbox({ items, selectedIndex, onSelectedIndexChange, label })`
uses controlled selection: `null` means closed. The callback receives an index
or `null`. Invalid indices and empty items close the dialog.

It returns `isOpen`, `item`, `canPrevious`, `canNext`, `close()`,
`previous()`, `next()`, and these getters:

- `getDialogProps(props?)`: spread on a native `<dialog>`; do not pass `open`.
- `getTitleProps(props?)`: optional heading ID for explicit `aria-labelledby`.
- `getCloseProps(props?)`, `getPreviousProps(props?)`, `getNextProps(props?)`: buttons.

The browser's `showModal()` supplies the top layer and makes the background inert.
The hook moves focus inside, wraps Tab/Shift+Tab, closes on Escape/native cancel,
and restores the opener on close if it is still mounted. Left/right arrows
navigate without wrapping and do not hijack input/textarea/select editing.
Keep a visible close button. Provide a descriptive `label` or a visible heading
referenced by `aria-labelledby`. These behaviors follow the
[WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Requires native modal dialog support in the browser, or a consumer-supplied
dialog polyfill. Never add CSS that forces a closed dialog to display.

### Fixture-only grid and lightbox

```jsx
import { useState } from "react";
import { useMediaGrid, useMediaLightbox } from "@headless-media/ui-react";

const allItems = [
  { key: "red", name: "Red study", color: "#e85d75" },
  { key: "blue", name: "Blue study", color: "#4582c4" },
  { key: "green", name: "Green study", color: "#37a77f" },
];

export function GalleryExample() {
  const [count, setCount] = useState(2);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const items = allItems.slice(0, count);
  const grid = useMediaGrid({
    items,
    hasNextPage: count < allItems.length,
    onLoadMore: () => setCount((value) => value + 1),
    onItemSelect: (_item, index) => setSelectedIndex(index),
  });
  const box = useMediaLightbox({
    items, selectedIndex, onSelectedIndexChange: setSelectedIndex,
    label: "Color study preview",
  });
  return <>
    <div {...grid.getContainerProps({ className: "example-grid" })}>
      {items.map((item, index) => (
        <button key={item.key} {...grid.getItemProps({ index })}>
          <span style={{ background: item.color }} aria-hidden="true">■</span> {item.name}
        </button>
      ))}
    </div>
    <button {...grid.getLoadMoreProps()}>Load more</button>
    <dialog {...box.getDialogProps()}>
      <h2 {...box.getTitleProps()}>{box.item?.name}</h2>
      <button {...box.getCloseProps()}>Close</button>
      <button {...box.getPreviousProps()}>Previous</button>
      <button {...box.getNextProps()}>Next</button>
    </dialog>
  </>;
}
```

## Reels

`useMediaReel({ items, onActiveItemChange, label })` returns `activeIndex`
(`-1` for empty data), `activeItem`, `goTo(index)`,
`getContainerProps(props?)`, and `getItemProps({ index, ...props })`.

The active item is the page nearest the viewport after a scroll. Callbacks fire
for the initial active item and changes to the active item/index. Replacing a
callback alone does not replay it. React Strict Mode can replay mount effects;
activity consumers should account for that.

Up/down arrows, Home, and End page the focused container; controls inside retain
their keys. Paging clamps to available items. Viewport resizing preserves the
selected page using ResizeObserver, with window resize as a fallback.
Reset a changed dataset with a React `key` on the component that owns this hook;
appending a page can retain the mounted component.

### Required consumer layout and local-data example

Each item must fill **exactly one viewport height**, with no gaps, vertical
margins, or padding between pages. The hook ships none of these styles:

```css
.reels {
  height: min(70vh, 600px);
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain;
}
.reel {
  height: 100%;
  box-sizing: border-box;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
.reels:focus-visible { outline: 3px solid #4582c4; }
dialog::backdrop { background: rgb(0 0 0 / 65%); }
```

```jsx
import { useMediaReel } from "@headless-media/ui-react";

const cards = [{ id: "a", title: "First reel" }, { id: "b", title: "Second reel" }];
export function ReelExample() {
  const reel = useMediaReel({ items: cards });
  return <div {...reel.getContainerProps({ className: "reels" })}>
    {cards.map((card, index) => (
      <section key={card.id} {...reel.getItemProps({ index, className: "reel" })}>
        <h2>{card.title}</h2>
        <p>{reel.activeIndex === index ? "Active" : "Inactive"}</p>
      </section>
    ))}
  </div>;
}
```

For videos, the consumer uses `activeIndex` to play/pause its own video elements
and handles autoplay failures. This hook never starts downloads or emits SDK events.
Put a load-more control outside the scrolling viewport to preserve page geometry.

## Verification

The fixture suite covers generic selection, handler composition/cancellation,
pagination guards, modal keyboard/focus behavior, active reel changes, keyboard
paging, resizing, empty data, refs, and cleanup. jsdom has no layout or top layer:
dialog methods and dimensions are mocked. Real-browser scroll snapping, native
background isolation, and video playback still need the real-browser checks in
[the verification checklist](./verification.md).
