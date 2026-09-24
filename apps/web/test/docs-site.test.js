import { afterAll, beforeAll, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { createDocsAssets } from "../../../scripts/docs-site.mjs";

let assets;
let server;
let origin;

beforeAll(async () => {
  assets = await createDocsAssets();
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "silent",
  });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
});

afterAll(async () => { await server?.close(); });

it("publishes readable SDK/wrapper and web/native UI guides with escaped examples", () => {
  const sdk = new JSDOM(assets.get("docs/sdk/index.html")).window.document;
  const components = new JSDOM(assets.get("docs/components/index.html")).window.document;
  expect(sdk.querySelectorAll("h1")).toHaveLength(1);
  expect(sdk.querySelector("main").textContent).toContain("createMediaClient");
  expect(sdk.getElementById("wrappers").textContent).toContain("useMediaSearch");
  expect(components.querySelectorAll("h1")).toHaveLength(1);
  expect(components.getElementById("components-native").textContent).toContain("FlatList");
  expect(components.querySelector("pre").textContent).toContain("<dialog");
  expect(components.querySelector("dialog")).toBeNull();
  expect(components.querySelectorAll("script")).toHaveLength(0);
  expect(sdk.querySelectorAll("table").length).toBeGreaterThan(0);
});

it("resolves every local navigation link, section anchor, and stylesheet in the generated site", () => {
  for (const [file, html] of assets) {
    if (!file.endsWith(".html")) continue;
    const document = new JSDOM(html).window.document;
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const link of document.querySelectorAll("a[href], link[href]")) {
      const url = new URL(link.getAttribute("href"), `https://docs.test/${file}`);
      if (url.origin !== "https://docs.test" || url.pathname === "/") continue;
      const target = url.pathname.slice(1) + (url.pathname.endsWith("/") ? "index.html" : "");
      expect(assets.has(target), `${file} links to missing ${target}`).toBe(true);
      if (url.hash) {
        const destination = new JSDOM(assets.get(target)).window.document;
        expect(destination.getElementById(decodeURIComponent(url.hash.slice(1))), `${file}: ${url.href}`).not.toBeNull();
      }
    }
  }
});

it("serves direct documentation requests in Vite without the app or an API key", async () => {
  for (const path of ["/docs", "/docs/", "/docs/sdk", "/docs/sdk/?review=1", "/docs/components/", "/docs/components/index.html"]) {
    const response = await fetch(origin + path);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<main");
    expect(html).not.toContain('/src/main.jsx');
  }
  const css = await fetch(origin + "/docs/assets/docs.css");
  expect(css.headers.get("content-type")).toContain("text/css");
  expect((await fetch(origin + "/docs/missing/")).status).toBe(404);
});
