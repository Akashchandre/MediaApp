export type MediaKind = "photo" | "video";

export interface MediaCreator { id: string; name: string; url: string; }

export interface BaseMediaItem {
  id: string;
  kind: MediaKind;
  width: number;
  height: number;
  title: string;
  previewUrl: string;
  pexelsUrl: string;
  creator: MediaCreator;
}

export interface PhotoItem extends BaseMediaItem {
  kind: "photo";
  sources: { thumbnail: string; medium: string; large: string; original: string; };
}

export interface VideoSource {
  id: string;
  url: string;
  quality: string;
  width: number | null;
  height: number | null;
  mimeType: string;
}

export interface VideoItem extends BaseMediaItem {
  kind: "video";
  duration: number;
  sources: VideoSource[];
}

export type MediaItem = PhotoItem | VideoItem;

export interface MediaPage {
  items: MediaItem[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
  nextPage: number | null;
}

export type MediaEventType = "view" | "download";
export interface MediaActivityEvent { type: MediaEventType; mediaId: string; kind: MediaKind; timestamp: number; }
export interface RequestOptions { page?: number; perPage?: number; signal?: AbortSignal; }
export interface SearchOptions extends RequestOptions { query: string; kind: MediaKind; }
export interface DiscoverOptions extends RequestOptions { kind: MediaKind; }
export interface GetItemOptions { id: string | number; kind: MediaKind; signal?: AbortSignal; }
export interface TrackOptions { mediaId: string; kind: MediaKind; }

export interface MediaClient {
  search(options: SearchOptions): Promise<MediaPage>;
  discover(options: DiscoverOptions): Promise<MediaPage>;
  getItem(options: GetItemOptions): Promise<MediaItem>;
  trackView(options: TrackOptions): MediaActivityEvent;
  trackDownload(options: TrackOptions): MediaActivityEvent;
  on(type: MediaEventType, listener: (event: MediaActivityEvent) => void): () => void;
  clearCache(): void;
}

export interface MediaClientOptions {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  cacheTtlMs?: number;
  logEvents?: boolean;
}
