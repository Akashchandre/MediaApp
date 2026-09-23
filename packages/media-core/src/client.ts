import { MediaClientError } from "./errors.js";
import type {
  DiscoverOptions, GetItemOptions, MediaActivityEvent, MediaClient, MediaClientOptions,
  MediaEventType, MediaItem, MediaKind, MediaPage, PhotoItem, SearchOptions, TrackOptions,
  VideoItem, VideoSource,
} from "./types.js";

const API_BASE_URL = "https://api.pexels.com/v1";
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_CACHE_TTL_MS = 60_000;
type Listener = (event: MediaActivityEvent) => void;
interface CacheEntry { value: unknown; expiresAt: number; }

interface PexelsPhoto {
  id: number; width: number; height: number; url: string; photographer: string;
  photographer_url: string; photographer_id: number; alt?: string;
  src: { original: string; large?: string; large2x?: string; medium?: string; tiny?: string; };
}

interface PexelsVideoFile {
  id: number; quality?: string; file_type?: string; width?: number | null;
  height?: number | null; link: string;
}

interface PexelsVideo {
  id: number; width: number; height: number; duration: number; url: string; image: string;
  user: { id: number; name: string; url: string }; video_files?: PexelsVideoFile[];
}

interface PexelsPage<T> {
  page: number; per_page: number; next_page?: string; photos?: T[]; videos?: T[];
}

class ActivityEmitter {
  private readonly listeners = new Map<MediaEventType, Set<Listener>>();
  on(type: MediaEventType, listener: Listener): () => void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }
  emit(event: MediaActivityEvent): void {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
  }
}

function normalizePhoto(photo: PexelsPhoto): PhotoItem {
  const medium = photo.src.medium ?? photo.src.large ?? photo.src.original;
  const large = photo.src.large2x ?? photo.src.large ?? photo.src.original;
  return {
    id: String(photo.id), kind: "photo", width: photo.width, height: photo.height,
    title: photo.alt?.trim() || `Photo by ${photo.photographer}`,
    previewUrl: photo.src.tiny ?? medium, pexelsUrl: photo.url,
    creator: { id: String(photo.photographer_id), name: photo.photographer, url: photo.photographer_url },
    sources: { thumbnail: photo.src.tiny ?? medium, medium, large, original: photo.src.original },
  };
}

function normalizeVideoSource(file: PexelsVideoFile): VideoSource {
  return {
    id: String(file.id), url: file.link, quality: file.quality ?? "unknown",
    width: file.width ?? null, height: file.height ?? null, mimeType: file.file_type ?? "video/mp4",
  };
}

function normalizeVideo(video: PexelsVideo): VideoItem {
  return {
    id: String(video.id), kind: "video", width: video.width, height: video.height,
    duration: video.duration, title: `Video by ${video.user.name}`, previewUrl: video.image,
    pexelsUrl: video.url,
    creator: { id: String(video.user.id), name: video.user.name, url: video.user.url },
    sources: (video.video_files ?? []).filter((file) => Boolean(file.link)).map(normalizeVideoSource),
  };
}

function normalizePage<T>(response: PexelsPage<T>, items: T[], normalize: (item: T) => MediaItem): MediaPage {
  const page = response.page || 1;
  return {
    items: items.map(normalize), page, perPage: response.per_page || items.length,
    hasNextPage: Boolean(response.next_page), nextPage: response.next_page ? page + 1 : null,
  };
}

function assertKind(kind: MediaKind): void {
  if (kind !== "photo" && kind !== "video") {
    throw new MediaClientError("Media kind must be either photo or video.", { code: "VALIDATION_ERROR" });
  }
}

function pagination(page = 1, perPage = DEFAULT_PAGE_SIZE): URLSearchParams {
  if (!Number.isInteger(page) || page < 1) {
    throw new MediaClientError("Page must be a positive integer.", { code: "VALIDATION_ERROR" });
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 80) {
    throw new MediaClientError("Per-page must be an integer between 1 and 80.", { code: "VALIDATION_ERROR" });
  }
  return new URLSearchParams({ page: String(page), per_page: String(perPage) });
}

function abortedError(): MediaClientError {
  return new MediaClientError("The media request was cancelled.", { code: "ABORTED" });
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortedError());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortedError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error: unknown) => { signal.removeEventListener("abort", abort); reject(error); },
    );
  });
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? `Pexels request failed with status ${response.status}.`;
  } catch {
    return `Pexels request failed with status ${response.status}.`;
  }
}

function responseError(status: number, message: string): MediaClientError {
  if (status === 401 || status === 403) {
    return new MediaClientError("Pexels rejected the API key.", { code: "AUTHENTICATION_ERROR", status });
  }
  if (status === 404) {
    return new MediaClientError("The requested media could not be found.", { code: "NOT_FOUND", status });
  }
  if (status === 429) {
    return new MediaClientError("The Pexels API rate limit was reached.", {
      code: "RATE_LIMITED", status, retryable: true,
    });
  }
  return new MediaClientError(message, { code: "API_ERROR", status, retryable: status >= 500 });
}

export function createMediaClient(options: MediaClientOptions): MediaClient {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) throw new MediaClientError("A Pexels API key is required.", { code: "VALIDATION_ERROR" });
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new MediaClientError("No fetch implementation is available.", { code: "VALIDATION_ERROR" });
  }

  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<unknown>>();
  const emitter = new ActivityEmitter();
  if (options.logEvents !== false) {
    const log = (event: MediaActivityEvent) => console.info("[media-core] activity", event);
    emitter.on("view", log);
    emitter.on("download", log);
  }

  async function perform<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await fetcher(url, { headers: { Authorization: apiKey } });
    } catch (cause) {
      throw new MediaClientError("Unable to reach the Pexels API.", {
        code: "NETWORK_ERROR", retryable: true, cause,
      });
    }
    if (!response.ok) throw responseError(response.status, await responseMessage(response));
    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new MediaClientError("Pexels returned an invalid JSON response.", {
        code: "INVALID_RESPONSE", cause,
      });
    }
  }

  function request<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const query = params.toString();
    const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return withAbort(Promise.resolve(cached.value as T), signal);
    if (cached) cache.delete(url);
    const active = inflight.get(url) as Promise<T> | undefined;
    if (active) return withAbort(active, signal);
    const pending = perform<T>(url).then(
      (value) => { inflight.delete(url); if (ttl > 0) cache.set(url, { value, expiresAt: Date.now() + ttl }); return value; },
      (error: unknown) => { inflight.delete(url); throw error; },
    );
    inflight.set(url, pending);
    return withAbort(pending, signal);
  }

  function activity(type: MediaEventType, data: TrackOptions): MediaActivityEvent {
    assertKind(data.kind);
    if (!data.mediaId.trim()) throw new MediaClientError("A media ID is required.", { code: "VALIDATION_ERROR" });
    const event: MediaActivityEvent = { type, mediaId: data.mediaId, kind: data.kind, timestamp: Date.now() };
    emitter.emit(event);
    return event;
  }

  return {
    async search(options: SearchOptions): Promise<MediaPage> {
      assertKind(options.kind);
      const query = options.query.trim();
      if (!query) throw new MediaClientError("A search query is required.", { code: "VALIDATION_ERROR" });
      const params = pagination(options.page, options.perPage);
      params.set("query", query);
      if (options.kind === "photo") {
        const response = await request<PexelsPage<PexelsPhoto>>("/search", params, options.signal);
        return normalizePage(response, response.photos ?? [], normalizePhoto);
      }
      const response = await request<PexelsPage<PexelsVideo>>("/videos/search", params, options.signal);
      return normalizePage(response, response.videos ?? [], normalizeVideo);
    },
    async discover(options: DiscoverOptions): Promise<MediaPage> {
      assertKind(options.kind);
      const params = pagination(options.page, options.perPage);
      if (options.kind === "photo") {
        const response = await request<PexelsPage<PexelsPhoto>>("/curated", params, options.signal);
        return normalizePage(response, response.photos ?? [], normalizePhoto);
      }
      const response = await request<PexelsPage<PexelsVideo>>("/videos/popular", params, options.signal);
      return normalizePage(response, response.videos ?? [], normalizeVideo);
    },
    async getItem(options: GetItemOptions): Promise<MediaItem> {
      assertKind(options.kind);
      const id = String(options.id).trim();
      if (!/^\d+$/.test(id)) throw new MediaClientError("A numeric media ID is required.", { code: "VALIDATION_ERROR" });
      const path = options.kind === "photo" ? `/photos/${id}` : `/videos/videos/${id}`;
      if (options.kind === "photo") return normalizePhoto(await request<PexelsPhoto>(path, new URLSearchParams(), options.signal));
      return normalizeVideo(await request<PexelsVideo>(path, new URLSearchParams(), options.signal));
    },
    trackView(data: TrackOptions) { return activity("view", data); },
    trackDownload(data: TrackOptions) { return activity("download", data); },
    on(type: MediaEventType, listener: Listener) { return emitter.on(type, listener); },
    clearCache() { cache.clear(); },
  };
}
