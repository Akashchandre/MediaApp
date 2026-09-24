import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Marked, Renderer } from "marked";

const repository = "https://github.com/Akashchandre/MediaApp";
const root = new URL("../", import.meta.url);
const stylesheet = new URL("./docs-site.css", import.meta.url);
const pages = [
  {
    slug: "sdk",
    title: "SDK documentation",
    description: "A portable media client. Thin platform adapters. One clear data contract.",
    sources: ["docs/sdk.md", "docs/wrappers.md"],
  },
  {
    slug: "components",
    title: "Component documentation",
    description: "Grid, lightbox, and reels. Bring your own data, markup, and styles.",
    sources: ["docs/components.md", "docs/components-native.md"],
  },
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function sectionId(source) {
  return source.split("/").at(-1).replace(/\.md$/, "");
}

function documentationLink(href, source) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
  const resolved = new URL(href, `https://source.local/${source}`);
  const path = resolved.pathname.slice(1);
  const page = pages.find((candidate) => candidate.sources.includes(path));
  if (page) {
    const fragment = resolved.hash ? `-${resolved.hash.slice(1)}` : "";
    return `/docs/${page.slug}/#${sectionId(path)}${fragment}`;
  }
  return `${repository}/blob/main/${path}${resolved.hash}`;
}

function renderMarkdown(markdown, source, contents) {
  const prefix = sectionId(source);
  const usedIds = new Map();
  // Only repository-authored Markdown is rendered, at build time or by the dev server.
  // A per-document instance keeps renderer state isolated across requests/builds.
  const parser = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type === "link") token.href = documentationLink(token.href, source);
    },
    renderer: {
      heading(token) {
        const label = token.text.replace(/[`*_]/g, "");
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const base = `${prefix}-${slug}`;
        const count = usedIds.get(base) || 0;
        usedIds.set(base, count + 1);
        const id = count ? `${base}-${count + 1}` : base;
        if (token.depth <= 2) contents.push({ id, label, depth: token.depth });
        const level = Math.min(token.depth + 1, 6);
        return `<h${level} id="${id}"><a class="heading-link" href="#${id}">${this.parser.parseInline(token.tokens)}</a></h${level}>\n`;
      },
      table(token) {
        return `<div class="table-scroll" role="region" aria-label="API reference table" tabindex="0">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
      code(token) {
        const language = escapeHtml(token.lang || "Example");
        const code = Renderer.prototype.code.call(this, token).replace("<pre>", '<pre tabindex="0">');
        return `<figure class="code-example"><figcaption>${language}</figcaption>${code}</figure>\n`;
      },
    },
  });
  return `<section id="${prefix}" class="reference-section">${parser.parse(markdown)}
    <p class="source-link"><a href="${repository}/blob/main/${source}">View this guide on GitHub ↗</a></p></section>`;
}

function shell({ title, description, slug, body, contents = [] }) {
  const nav = pages.map((page) => `<a href="/docs/${page.slug}/"${page.slug === slug ? ' aria-current="page"' : ""}>${page.slug === "sdk" ? "SDK" : "Components"}</a>`).join("");
  const toc = contents.length ? `<aside class="sidebar"><nav aria-label="On this page">
    <p class="nav-label">On this page</p><ul>${contents.map((item) => `<li class="toc-depth-${item.depth}"><a href="#${item.id}">${escapeHtml(item.label)}</a></li>`).join("")}</ul>
    </nav></aside>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#284b39" />
  <title>${escapeHtml(title)} | Frameflow</title>
  <link rel="stylesheet" href="/docs/assets/docs.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/docs/" aria-label="Frameflow documentation home"><span aria-hidden="true">▧</span> frameflow<span class="brand-dot">.</span><span class="docs-label">Docs</span></a>
    <nav aria-label="Documentation">${nav}<a class="app-link" href="/">Open app ↗</a></nav>
  </header>
  <div class="docs-layout${contents.length ? "" : " overview-layout"}">
    ${toc}
    <main id="main" tabindex="-1">
      <div class="page-intro"><p class="eyebrow">Headless media ecosystem</p><h1>${escapeHtml(title)}</h1><p class="lead">${escapeHtml(description)}</p></div>
      ${body}
      <footer><a href="${repository}">Source repository ↗</a><span>Frameflow · Built with Pexels</span><a href="#main">Back to top ↑</a></footer>
    </main>
  </div>
</body>
</html>`;
}

export async function createDocsAssets() {
  const rendered = await Promise.all(pages.map(async (page) => {
    const sources = await Promise.all(page.sources.map((source) => readFile(new URL(source, root), "utf8")));
    const contents = [];
    const body = sources.map((markdown, index) => renderMarkdown(markdown, page.sources[index], contents)).join("\n");
    return [`docs/${page.slug}/index.html`, shell({ ...page, body, contents })];
  }));
  const overview = shell({
    title: "Build your own media experience.",
    description: "Use the data layer, the UI behavior, or both. Each library has a single responsibility.",
    body: `<div class="guide-cards">${pages.map((page) => `<a class="guide-card" href="/docs/${page.slug}/"><h2>${page.title} <span aria-hidden="true">↗</span></h2><p>${page.description}</p><span class="card-action">Read the guide →</span></a>`).join("")}</div>
      <section class="overview-note"><h2>Start with the workspace</h2><p>The five libraries live in this repository as npm workspaces. They are not published to npm. Clone the repository, run <code>npm ci</code>, then <code>npm run dev</code> to explore the app. See the <a href="/docs/sdk/#sdk-workspace-setup">SDK setup guide</a> for package usage.</p><p>The documentation is available without an API key. To load live photos and videos in the demo, enter your own Pexels API key in the app.</p></section>`,
  });
  return new Map([
    ...rendered,
    ["docs/index.html", overview],
    ["docs/assets/docs.css", await readFile(stylesheet, "utf8")],
  ]);
}

export function docsSite() {
  return {
    name: "frameflow-documentation",
    configureServer(server) {
      const watched = [...pages.flatMap((page) => page.sources.map((source) => fileURLToPath(new URL(source, root)))), fileURLToPath(stylesheet)];
      server.watcher.add(watched);
      server.watcher.on("change", (file) => {
        if (watched.includes(file)) server.ws.send({ type: "full-reload", path: "*" });
      });
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, "http://localhost").pathname;
        if (path !== "/docs" && !path.startsWith("/docs/")) return next();
        try {
          const assets = await createDocsAssets();
          const key = path.endsWith(".css") || path.endsWith(".html")
            ? path.slice(1) : `${path.replace(/^\/|\/$/g, "")}/index.html`;
          const content = assets.get(key);
          if (content === undefined) {
            res.statusCode = 404;
            res.end("Documentation page not found");
            return;
          }
          res.setHeader("Content-Type", key.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8");
          res.end(content);
        } catch (error) { next(error); }
      });
    },
    async generateBundle() {
      for (const [fileName, source] of await createDocsAssets()) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}
