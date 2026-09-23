---
name: media-ui
description: Build React web markup and consumer CSS using this repository's @headless-media/ui-react grid, lightbox, and reel prop-getters. Use for headless component integration and accessibility; not for SDK implementation or React Native components.
---

# Headless web UI wiring

Import `useMediaGrid`, `useMediaLightbox`, and `useMediaReel` from
`@headless-media/ui-react`. These are hooks, not ready-made components.
Supply JavaScript/JSX markup and CSS in the consumer. The UI package accepts
arbitrary items/callbacks and must not import the SDK, wrappers, or their types.
Connect data hooks only in the app; read `skills/media-data/SKILL.md` for that workflow.

## Prop-getter contract

Put custom handlers, refs, labels, and class names **inside** the getter argument.
Spreading a handler or ref afterward replaces essential behavior.
Consumer handlers run first; `preventDefault()` cancels the internal handler.
Undefined values preserve defaults. Dialog/reel getters compose object/callback refs.
Keep their target DOM nodes mounted; reset a replacement dataset by remounting
the component that owns the hook, rather than changing its target element.

## Grid

`useMediaGrid({ items, onItemSelect, onLoadMore, hasNextPage,
isLoading, isLoadingMore, label })` returns:

- `getContainerProps(props?)` → div/section, named group and busy state.
- `getItemProps({ index, ...props })` → button; selection calls
  `onItemSelect(items[index], index)`.
- `getLoadMoreProps(props?)` → button, disabled while busy/pending/exhausted.

Use real buttons with meaningful text/image alt text. Keep React keys on rendered
items (e.g. kind + ID); there is no web-grid `getItemKey` option.
Keep the grid mounted alongside any incremental error message.
Return the pagination promise and handle errors in the data layer/consumer.

## Lightbox

`useMediaLightbox({ items, selectedIndex, onSelectedIndexChange, label })`
is controlled: `null` closes it. Result:
`{ isOpen, item, canPrevious, canNext, close, previous, next,
getDialogProps, getTitleProps, getCloseProps, getPreviousProps, getNextProps }`.

```jsx
const [selectedIndex, setSelectedIndex] = useState(null);
const box = useMediaLightbox({
  items, selectedIndex, onSelectedIndexChange: setSelectedIndex,
  label: "Photo preview",
});
// Render this dialog unconditionally. Keep hooks above loading/error returns.
<dialog {...box.getDialogProps({ className: "lightbox" })}>
  <h2 {...box.getTitleProps()}>{box.item?.title}</h2>
  {box.item && <img src={box.item.sources.large} alt={box.item.title} />}
  <button {...box.getCloseProps()}>Close</button>
  <button {...box.getPreviousProps()}>Previous</button>
  <button {...box.getNextProps()}>Next</button>
</dialog>
```

Use a native `dialog`, not a div. Do not pass `open`; the hook calls
`showModal()` for native background isolation. Do not force a closed dialog
to display via CSS. A visible close control and accessible name are required.
The hook supplies Escape, bounded left/right navigation, Tab containment, and
opener restoration. Supply `aria-labelledby` only if the referenced title exists.
Target modern modal-dialog browsers or supply a polyfill in the consumer.

Keep the dialog selection callback as the app's single tracking point for opens
and navigation. Clearing the selection must not emit a view. An image-only
lightbox is sufficient for this assignment.

## Reels

`useMediaReel({ items, onActiveItemChange, label })` returns
`activeIndex`, `activeItem`, `goTo(index)`, `getContainerProps(props?)`,
and `getItemProps({ index, ...props })`.

Spread container props on a bounded scrolling div and item props on each page.
Every page must be exactly one viewport tall, with no inter-page gap, margin,
header/footer, or vertical padding that changes page offsets:

```css
.reels { height: min(70vh, 600px); overflow-y: auto; scroll-snap-type: y mandatory; }
.reel { height: 100%; box-sizing: border-box; scroll-snap-align: start; scroll-snap-stop: always; }
.reels:focus-visible { outline: 3px solid currentColor; }
dialog::backdrop { background: rgb(0 0 0 / 65%); }
```

Put load-more controls outside this viewport. Use `activeIndex` in consumer
video components to play the active video and pause inactive/unmounted videos;
catch play-promise failures and provide accessible manual controls. The hook
detects scroll position and keyboard paging, not video playback.
`onActiveItemChange(item, index)` includes the initial item; guard duplicate
tracking under Strict Mode if necessary. A changed query/kind should remount
the reel owner with a React key; appending pages should not reset it.

## Verification

Use local generic fixtures to verify package independence. For SDK integration,
test the consumer through `MediaProvider client={fixtureClient}`.
Check keyboard focus/close, selection navigation, pagination errors, prop/ref
composition, reel changes, and activity wiring. jsdom needs mocked native dialog
methods and dimensions; passing those tests does not verify browser layout.
Run `npm run verify` and record actual results in `docs/ai-usage.md`.
See [component docs and fixture examples](../../docs/components.md) for fuller
markup examples and test limitations.
