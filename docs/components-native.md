# Headless React Native UI

Import `useMediaGrid`, `useMediaLightbox`, and `useMediaReel` from
`@headless-media/ui-native`. The hooks use React only and return props for
React Native components. No DOM APIs, SDK dependencies, media assumptions, or
styles are included. The consuming native app provides React Native itself.

The hook names match the web package; prop-getters reflect each platform's components.
Pass your native callbacks into getters so they compose with internal handlers.
Consumer callbacks run first; an event with `defaultPrevented` cancels internal behavior.
Undefined props preserve defaults. Accessibility state fields merge.
Do not override required data, paging geometry, refs, visibility, or viewability props.

## Grid

`useMediaGrid({ items = [], getItemKey, numColumns = 2, onItemSelect,
onLoadMore, hasNextPage = false, isLoading = false, isLoadingMore = false, label })`

| Getter | Native component | Responsibility |
|---|---|---|
| `getListProps(props?)` | FlatList | Data, keyExtractor, columns, end-reached load callback, busy state |
| `getItemProps({ index, ...props })` | Pressable | Selection callback, button role, bounds validation |
| `getLoadMoreProps(props?)` | Pressable | Load-more button, disabled/busy accessibility state |

`onItemSelect(item, index)` receives the original generic item. Keys default to
`item.id`, then `item.key`, then the index, converted to strings. Supply
`getItemKey(item, index)` returning unique stable strings for mutable lists.
Keep `numColumns` fixed per mounted FlatList; remount the list if column count changes.

End-reached and button callbacks share a pending guard. Return the promise from
`onLoadMore` and catch/display failures in the consumer; the guard releases on failure.
Loading, pending, and exhausted states block new requests. FlatList may call
end-reached on initial layout when the list does not fill its viewport.

## Lightbox

`useMediaLightbox({ items, selectedIndex = null, onSelectedIndexChange, label })`
returns `isOpen`, `item`, `canPrevious`, `canNext`, `close()`,
`previous()`, and `next()`.

- `getModalProps(props?)` supplies `visible` and `onRequestClose` for Modal,
  including Android back-button close handling.
- `getContentProps(props?)` supplies the content View's label,
  `accessibilityViewIsModal`, and `onAccessibilityEscape`.
- `getCloseProps`, `getPreviousProps`, `getNextProps` supply Pressable props
  with roles, labels, disabled flags, and native `onPress` handlers.

Selection is controlled by the consumer. `null`, empty items, and out-of-range
indices hide the Modal. Navigation does not wrap. A request to close calls
`onSelectedIndexChange(null)`; the consumer must update its state.
The native Modal owns presentation; there is no web focus trap. Screen-reader
focus placement/restoration and platform-specific behavior need device validation.
Provide a visible close control and accessible content.

## Reels

`useMediaReel({ items, getItemKey, itemHeight, onActiveItemChange, label })`
returns `activeIndex`, `activeItem`, `goTo(index)`,
`getListProps(props?)`, and `getItemProps({ index, ...props })`.

`itemHeight` is a required positive number. Measure the list viewport with
`onLayout`; render the hook's child component only after a positive measurement.
Every item must have exactly that height. Consumer styles provide a bounded list
viewport, item height, and appearance. Do not insert separators or vertical
headers/footers/padding into this list; they invalidate the paging offsets.

List props include vertical paging, snap interval, fixed item layout, and stable
viewability configuration/callbacks. An item becomes active after at least 60%
is visible for 100 ms. No item is active (`-1`, `null`) until visibility is
confirmed; empty notifications during a swipe preserve the last active selection.
Invalid or stale item tokens are ignored. The selection uses the consumer key.

`onActiveItemChange(item, index)` fires on confirmed active item/index changes.
Replacing the callback alone does not replay it. `goTo(index)` clamps its target
and calls the list ref's `scrollToOffset`; activity is confirmed by viewability,
not by the requested scroll. Height changes realign the current page without animation.
Getters compose object and callback refs. `extraData` includes activeIndex so
FlatList can rerender active/inactive media.

Use a stable callback when passing an additional `onViewableItemsChanged` into
the getter. Its composition remains stable while the supplied callback is stable.
Remount the hook's owner with a React key when replacing the whole dataset.
The consumer owns video playback, downloading, and SDK event wiring.

## Fixture harness and verification

[FixtureScreen.jsx](../packages/media-ui-native/examples/FixtureScreen.jsx)
is a small consumer screen using real FlatList, Pressable, View, Text, and Modal
imports. Mount it in an existing React Native application to try the local color
fixtures, pagination, modal navigation, and reels. No API key or SDK is needed.
Example styles are consumer-owned; library source ships none.

The automated React hook harness calls native callback payloads and checks list
props, request guards, modal navigation, accessibility escape, viewability,
ref composition, and resize/paging behavior. It runs in jsdom to host React;
it does not render React Native components or validate iOS/Android UI.
The fixture screen is included and linted, but no Metro build, emulator,
device, or native video player has been run.

Native prop contracts were checked against the official
[FlatList](https://reactnative.dev/docs/flatlist),
[Modal](https://reactnative.dev/docs/modal), and
[accessibility](https://reactnative.dev/docs/accessibility) documentation.
