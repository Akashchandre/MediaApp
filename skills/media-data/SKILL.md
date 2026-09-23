---
name: media-data
description: Wire React web consumers to this repository's @headless-media/react provider and hooks for media search, pagination, item lookup, and activity events. Use when building or reviewing SDK-backed UI; not for implementing the core client or native UI.
---

# Media data wiring

Build consumer code in JavaScript/JSX. Import data APIs from
`@headless-media/react`; never import `@headless-media/core` into the app.
Only the app connects data hooks to the independent UI package. Do not move SDK
calls into UI libraries or implement Pexels URLs/auth/cache in components.

## Provider and key lifetime

Mount `MediaProvider` only after a nonempty API key is available. The demo key
belongs in React state, never storage, source, Vite environment variables,
URLs, UI-library props, errors, or events. Browser requests expose the key to
the browser user; do not describe a frontend key as secret.

```jsx
import { useState } from "react";
import { MediaProvider } from "@headless-media/react";

export function MediaSession({ children }) {
  const [draft, setDraft] = useState("");
  const [apiKey, setApiKey] = useState("");
  if (apiKey) return <MediaProvider apiKey={apiKey}>
    <button onClick={() => setApiKey("")}>Disconnect</button>
    {children}
  </MediaProvider>;
  return <form onSubmit={(event) => {
    event.preventDefault();
    const key = draft.trim();
    if (key) { setApiKey(key); setDraft(""); }
  }}>
    <label>Pexels API key
      <input type="password" autoComplete="off" value={draft}
        onChange={(event) => setDraft(event.target.value)} />
    </label>
    <button disabled={!draft.trim()}>Connect</button>
  </form>;
}
```

Provider options: `apiKey`, `cacheTtlMs`, `fetch`, `logEvents`, or
`client` (an injected SDK-compatible object, taking precedence over configuration).
Keep injected references stable. Use client injection for tests; do not invent a
second provider or modify production hooks to accept fixtures.

## Exact hook contracts

| Hook | Inputs and result |
|---|---|
| `useMediaSearch(options?)` | `{ query = "", kind = "photo", perPage = 24, enabled = true }` → `{ items, page, hasNextPage, isLoading, isLoadingMore, error, loadMore, retry }` |
| `useMediaItem(options?)` | `{ id, kind = "photo", enabled = true }` → `{ item, isLoading, error, retry }`; missing ID disables fetching |
| `useMediaActions()` | `{ trackView, trackDownload, clearCache }` |
| `useMediaEvent(type, listener)` | Subscribes with automatic cleanup and latest callback |
| `useMediaClient()` | Returns provider client; ordinary UI should prefer the hooks above |

Kinds are singular `"photo"` and `"video"`. Blank queries use discovery.
All hooks must run under the provider and before conditional returns.
Keep a draft search separate from the submitted query if using a search form.
Key the result-view component by submitted query/kind to reset selection and
reels when the dataset changes, while keeping the provider stable.

Show initial loading, successful empty results, initial failure with `retry()`,
and incremental loading separately. A pagination error retains existing items:
show the error alongside results and call `loadMore()` to retry that page.
`retry()` restarts page 1. Feed `hasNextPage` and both loading flags into the
grid hook, and pass `loadMore` directly to its `onLoadMore`.
Do not calculate next-page numbers or add a separate network effect.

## Data and activity

Common item fields: `id`, `kind`, `title`, `previewUrl`, `width`,
`height`, `pexelsUrl`, `creator: { id, name, url }`.
Photos have `sources: { thumbnail, medium, large, original }`.
Videos have `duration` and `sources: [{ id, url, quality, width, height, mimeType }]`.
Choose a playable video source in the app, handle no-source/autoplay failures,
and retain creator/Pexels attribution. Do not treat video sources as photo sources.

`trackView({ mediaId: item.id, kind: item.kind })` and
`trackDownload({ mediaId: item.id, kind: item.kind })` delegate to core.
Events contain `type`, `mediaId`, `kind`, and `timestamp`.
Use `useMediaEvent("view", listener)` and a separate subscription for download.
Do not resubscribe manually in render. The default core logger remains independent.

Track a view when a lightbox item is selected (including previous/next) or a reel
becomes active. Avoid double-counting from both trigger clicks and selection
effects; keep one app-owned tracking point per interaction. Account for Strict
Mode effect replay when using mount effects for activity. A download event means
the user requested a download; never claim it proves the file saved.
Browser download/open logic stays in the app.

## Checks

Read [wrapper documentation](../../docs/wrappers.md) for examples or
[the implementation](../../packages/media-react/src/index.js) if a contract is unclear.
When composing UI, also read `skills/media-ui/SKILL.md`.
Run relevant consumer tests plus `npm run verify`.
Test discovery/search, failed pagination without losing items, events, and cleanup
using an injected client; use no real key in tests.
Record actual skill use and remaining gaps in `docs/ai-usage.md`; do not claim the
full app was built or live API behavior verified before those steps happen.
