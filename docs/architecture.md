# Public contracts and boundaries

## Core model

`MediaItem` is a discriminated union with common fields (`id`, `kind`, `width`, `height`, creator attribution, Pexels URL, preview URL) and kind-specific image or video sources.

`MediaPage` contains `items`, `page`, `perPage`, `hasNextPage`, and an optional `nextPage` value.

## Core client

```ts
const client = createMediaClient({ apiKey, fetch? });

client.search({ query, kind, page?, perPage?, signal? });
client.discover({ kind, page?, perPage?, signal? });
client.getItem({ kind, id, signal? });
client.trackView({ mediaId, kind });
client.trackDownload({ mediaId, kind });
client.on("view" | "download", listener);
client.clearCache();
```

The client attaches authentication only inside its HTTP transport, normalizes Pexels data, reuses completed requests for a short TTL, and shares identical requests that are already running.

## Wrapper contract

Both platform adapters expose:

- `MediaProvider`
- `useMediaClient`
- `useMediaSearch`
- `useMediaItem`
- `useMediaActions`
- `useMediaEvent`

Wrappers adapt React lifecycle to core calls. They do not construct URLs, normalize Pexels data, or define cache/event policy.

## UI contract

Web and native UI packages expose generic hooks for grid, lightbox, and reel behavior. They receive arbitrary items plus callbacks and return prop-getters. They do not know about Pexels or SDK media types.

## API-key decision

The browser demo asks reviewers for their own Pexels API key and retains it only in React memory. It is not written to storage, logs, source, URLs, errors, or events.
