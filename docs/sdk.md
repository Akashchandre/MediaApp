# Core SDK reference

## Workspace setup

The packages are local npm workspaces in the MediaApp repository; they have not
been published to npm. To run the examples against the supplied packages:

```bash
git clone https://github.com/Akashchandre/MediaApp.git
cd MediaApp
npm ci
npm run build -w @headless-media/core
```

Use Node 24 (the repository's configured target). Add React consumer examples
inside `apps/web/src`, where npm links the workspace packages automatically.
Run `npm run dev` from the root to start the app. For a standalone core consumer,
use a script in this workspace after building core. Native examples belong in a
React Native application that links the local native packages.

The web app imports the React wrapper and the independent UI library. Direct
core imports, such as the example below, are for framework-independent consumers;
only wrappers import core in the application's dependency graph.

## Standalone client quick start

`@headless-media/core` is TypeScript without React/DOM imports. It uses `fetch`,
`URLSearchParams`, and optional `AbortSignal`; supply a compatible `fetch` when
the runtime does not provide one. Within this workspace, build core before using
its package entry: `npm run build -w @headless-media/core`.

```ts
import { createMediaClient, MediaClientError } from "@headless-media/core";

export async function findPhotos(apiKey: string) {
  const client = createMediaClient({ apiKey, logEvents: false });
  try {
    return await client.search({ kind: "photo", query: "ocean", perPage: 12 });
  } catch (error) {
    if (error instanceof MediaClientError) console.warn(error.code);
    throw error;
  }
}
```

Use a persistent client per session to benefit from caching. React consumers
should use the [wrapper](./wrappers.md), not instantiate clients in render.

## Configuration and operations

| API | Behavior |
|---|---|
| `createMediaClient({ apiKey, fetch?, cacheTtlMs?, logEvents? })` | Trims and requires a nonempty key; default cache TTL is 60,000 ms; activity logging defaults on |
| `search({ query, kind, page?, perPage?, signal? })` | Requires a nonblank query; kinds are `photo` or `video` |
| `discover({ kind, page?, perPage?, signal? })` | Curated photos or popular videos |
| `getItem({ kind, id, signal? })` | Fetch one item; ID must stringify to digits |
| `clearCache()` | Clears completed-response cache, not in-flight work |
| `trackView({ mediaId, kind })` / `trackDownload({ mediaId, kind })` | Emit and return an activity event; neither calls a download endpoint |
| `on("view" \| "download", listener)` | Returns an unsubscribe function |

Pagination defaults to page 1 and 24 items; pages must be positive integers and
`perPage` must be an integer from 1 to 80. `MediaPage` always contains `items`,
`page`, `perPage`, `hasNextPage`, and `nextPage` (number or null). Current
normalization interprets an upstream next-page marker as `page + 1`.

## Models

All items include string `id`, `kind`, `title`, `width`, `height`, `previewUrl`,
`pexelsUrl`, and `creator: { id, name, url }`. Narrow on `kind`:

- Photos: `sources: { thumbnail, medium, large, original }` holds image URLs.
- Videos: `duration` in seconds and `sources: [{ id, url, quality, width, height,
  mimeType }]`; source dimensions can be null. The consumer chooses a playable
  file and owns playback/failure behavior.

Public contracts are exported from `packages/media-core/src/index.ts`; the
complete type definitions are in `packages/media-core/src/types.ts`.

## Cache and cancellation semantics

Each client owns its own URL-keyed response cache and in-flight request map.
Identical concurrent URLs share one HTTP request; successful JSON is cached
until its TTL expires. Set `cacheTtlMs: 0` to disable completed-response caching.
There is no persistent cache, maximum-size eviction, or automatic retry/backoff.

Aborting cancels that caller's wait, not the shared transport. Other callers
can still receive the response, and it can populate the cache. Even an already
aborted caller can initiate transport before its wait rejects. `clearCache()`
does not cancel requests; a pending response can repopulate it later.

## Errors and events

`MediaClientError` exposes `code`, optional `status`, and `retryable` (default
false); some errors retain a `cause`. Do not log arbitrary transport causes if
they could contain credentials.

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | Missing key/fetch or invalid arguments |
| `AUTHENTICATION_ERROR` | HTTP 401/403 |
| `NOT_FOUND` | HTTP 404 |
| `RATE_LIMITED` | HTTP 429; retryable |
| `NETWORK_ERROR` | Transport rejection; retryable |
| `API_ERROR` | Other HTTP failure; 5xx marked retryable |
| `INVALID_RESPONSE` | Response body is not valid JSON |
| `ABORTED` | Caller's signal aborted |

Malformed successful JSON is not fully schema-validated; missing required nested
fields may cause ordinary JavaScript errors. Do not assume every failure is a
`MediaClientError`. Retryability is metadata, not an automatic retry policy.

Events are `{ type, mediaId, kind, timestamp }`, with timestamp in epoch
milliseconds. Listener delivery is synchronous; consumer listeners should not
throw because exceptions interrupt delivery. Default logging uses `console.info`
and contains only the activity payload. Disable it with `logEvents: false`.
The SDK neither stores event history nor sends analytics to a service.
