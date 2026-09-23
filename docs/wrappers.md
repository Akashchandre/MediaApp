# React and React Native wrappers

Both packages expose the same JavaScript API. Import from `@headless-media/react`
on web or `@headless-media/native` in a React Native consumer.
The wrappers use React lifecycle APIs and delegate requests and activity to core.
They contain no Pexels URLs, authentication rules, response normalization, or caching.

## Provider and hooks

```jsx
import {
  MediaProvider, useMediaSearch, useMediaActions, useMediaEvent,
} from "@headless-media/react";

function Results() {
  const { items, isLoading, isLoadingMore, error, hasNextPage, loadMore, retry } =
    useMediaSearch({ kind: "photo", query: "", perPage: 24 });
  const { trackView } = useMediaActions();
  useMediaEvent("view", (event) => console.info("App activity", event));

  if (isLoading) return <p>Loading...</p>;
  return (
    <section>
      {error && <p role="alert">{error.message}</p>}
      {error && !items.length && <button onClick={retry}>Retry</button>}
      {!error && !items.length && <p>No media found.</p>}
      {items.map((item) => (
        <button key={item.id} onClick={() => trackView({ mediaId: item.id, kind: item.kind })}>
          {item.title}
        </button>
      ))}
      {hasNextPage && (
        <button disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </section>
  );
}

export function Example({ apiKey }) {
  return <MediaProvider apiKey={apiKey}><Results /></MediaProvider>;
}
```

This minimal example demonstrates data hooks only; `apps/web/src/App.jsx`
connects the independent UI hooks. Native consumers supply native markup.

| Export | Contract |
|---|---|
| `MediaProvider` | Accepts `apiKey`, optional `fetch`, `cacheTtlMs`, `logEvents`, and children. An injected `client` takes precedence for tests or advanced consumers. |
| `useMediaClient()` | Returns the provider's client. Throws outside a provider. |
| `useMediaSearch({ enabled = true, kind = "photo", perPage = 24, query = "" })` | Returns `items`, `page`, `hasNextPage`, `isLoading`, `isLoadingMore`, `error`, `loadMore()`, and `retry()`. Blank queries request discovery. |
| `useMediaItem({ enabled = true, id, kind = "photo" })` | Returns `item`, `isLoading`, `error`, and `retry()`. Missing IDs disable the request. |
| `useMediaActions()` | Stable delegates: `trackView({ mediaId, kind })`, `trackDownload({ mediaId, kind })`, and `clearCache()`. |
| `useMediaEvent(type, listener)` | Subscribes to `view` or `download`, uses the latest callback, and unsubscribes when type/client changes or the consumer unmounts. |

Provider configuration is memoized. Keep injected client and fetch references stable.
Changing configuration creates a new client and restarts dependent requests.
Keep API keys in memory; do not pass them to UI props or activity payloads.

Search changes, retries, and item changes expose fresh loading state immediately.
Disabled hooks return empty, idle state. Cleanup aborts each consumer's request,
including pagination, and ignores late settlements even if a transport ignores cancellation.
Core may finish a shared HTTP request for other consumers.

`loadMore()` follows core's `nextPage`, prevents concurrent pagination for the current
query, and retains existing items on failure. Call it again to retry that page.
`retry()` restarts the entire query from page 1. Appended pages preserve core's
item order and values; wrappers do not normalize or deduplicate media.

The two implementations intentionally remain self-contained to preserve package
boundaries. The shared behavior suite runs against both exports; changes must pass
both variants. These tests exercise React hooks in jsdom, not a native device or
React Native renderer. Native UI fixture contracts are in [native UI docs](./components-native.md).
