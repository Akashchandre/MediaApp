import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaClient, MediaClientError } from "../src/index.ts";

const photo = {
  id: 42,
  width: 1200,
  height: 800,
  url: "https://www.pexels.com/photo/42/",
  photographer: "Ada Camera",
  photographer_url: "https://www.pexels.com/@ada",
  photographer_id: 7,
  alt: "Misty mountains",
  src: {
    original: "https://images.example/original.jpg",
    large2x: "https://images.example/large.jpg",
    medium: "https://images.example/medium.jpg",
    tiny: "https://images.example/tiny.jpg",
  },
};

const video = {
  id: 88,
  width: 1080,
  height: 1920,
  duration: 12,
  url: "https://www.pexels.com/video/88/",
  image: "https://images.example/video.jpg",
  user: { id: 9, name: "Vera Video", url: "https://www.pexels.com/@vera" },
  video_files: [
    {
      id: 3,
      quality: "hd",
      file_type: "video/mp4",
      width: 1080,
      height: 1920,
      link: "https://videos.example/clip.mp4",
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchStub(body: unknown) {
  return vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
}

afterEach(() => vi.restoreAllMocks());

describe("createMediaClient", () => {
  it("requires an API key without leaking it in errors", () => {
    expect(() => createMediaClient({ apiKey: "" })).toThrowError(MediaClientError);
    expect(() => createMediaClient({ apiKey: "" })).toThrow("A Pexels API key is required.");
  });

  it("searches and normalizes photos with authorization and pagination", async () => {
    const request = fetchStub({ page: 2, per_page: 1, next_page: "next", photos: [photo] });
    const client = createMediaClient({ apiKey: "secret-key", fetch: request, logEvents: false });

    const result = await client.search({ query: "mountains", kind: "photo", page: 2, perPage: 1 });

    expect(request).toHaveBeenCalledWith(
      "https://api.pexels.com/v1/search?page=2&per_page=1&query=mountains",
      { headers: { Authorization: "secret-key" } },
    );
    expect(result).toMatchObject({ page: 2, perPage: 1, hasNextPage: true, nextPage: 3 });
    expect(result.items[0]).toMatchObject({
      id: "42",
      kind: "photo",
      title: "Misty mountains",
      previewUrl: "https://images.example/tiny.jpg",
      creator: { id: "7", name: "Ada Camera" },
    });
  });

  it("uses current Pexels video endpoints and normalizes files", async () => {
    const request = fetchStub(video);
    const client = createMediaClient({ apiKey: "key", fetch: request, logEvents: false });

    const result = await client.getItem({ kind: "video", id: 88 });

    expect(request).toHaveBeenCalledWith(
      "https://api.pexels.com/v1/videos/videos/88",
      { headers: { Authorization: "key" } },
    );
    expect(result).toMatchObject({
      id: "88",
      kind: "video",
      duration: 12,
      sources: [{ id: "3", quality: "hd", mimeType: "video/mp4" }],
    });
  });

  it("deduplicates matching in-flight requests and caches successful responses", async () => {
    let resolveRequest!: (value: Response) => void;
    const request = vi.fn(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    ) as unknown as typeof fetch;
    const client = createMediaClient({ apiKey: "key", fetch: request, logEvents: false });

    const first = client.discover({ kind: "photo" });
    const second = client.discover({ kind: "photo" });
    resolveRequest(jsonResponse({ page: 1, per_page: 24, photos: [photo] }));

    await Promise.all([first, second]);
    await client.discover({ kind: "photo" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed requests and maps authentication errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid token" }, 401))
      .mockResolvedValueOnce(jsonResponse({ page: 1, per_page: 24, photos: [] }));
    const client = createMediaClient({
      apiKey: "never-include-this",
      fetch: request as unknown as typeof fetch,
      logEvents: false,
    });

    await expect(client.discover({ kind: "photo" })).rejects.toMatchObject({
      code: "AUTHENTICATION_ERROR",
      status: 401,
    });
    await expect(client.discover({ kind: "photo" })).resolves.toMatchObject({ items: [] });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("emits activity to the default logger and removable app listeners", () => {
    const logger = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const client = createMediaClient({ apiKey: "key", fetch: fetchStub({}) });
    const listener = vi.fn();
    const unsubscribe = client.on("view", listener);

    const event = client.trackView({ mediaId: "42", kind: "photo" });
    unsubscribe();
    client.trackView({ mediaId: "43", kind: "photo" });

    expect(event).toMatchObject({ type: "view", mediaId: "42", kind: "photo" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledTimes(2);
  });

  it("rejects cancelled consumers without cancelling a shared request", async () => {
    const controller = new AbortController();
    const request = fetchStub({ page: 1, per_page: 24, videos: [video] });
    const client = createMediaClient({ apiKey: "key", fetch: request, logEvents: false });
    controller.abort();

    await expect(
      client.discover({ kind: "video", signal: controller.signal }),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });
});
