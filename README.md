# Headless Media Ecosystem

A take-home sample showing a portable Pexels media SDK, thin React and React Native adapters, independent headless UI hooks, and a React web application.

## Architecture

```text
web app ──> media-react ──> media-core
   │
   └──────> media-ui-react

native consumer ──> media-native ──> media-core
       │
       └──────────> media-ui-native
```

The core is TypeScript. Wrappers, UI libraries, and the web app use JavaScript/JSX. UI packages never import the SDK or wrappers.

## Commands

```bash
npm ci
npm run dev
```

Open the Local URL printed by Vite (usually `http://localhost:5173`). The
connection screen is visible without a key. Enter a Pexels API key there to
browse live photos/videos; an account password is not an API key.
The key stays in memory and is cleared on disconnect or refresh. A browser-only
app cannot keep a shared API key secret.

```bash
npm run verify   # lint, types, boundaries, tests, and production build
npm run build   # production build only; web output is apps/web/dist
npm run preview -w @headless-media/web  # serve the production build locally
```

Keep the dev command running while browsing. If port 5173 is occupied, use the
actual URL printed in the terminal. Restart the dev server if it still shows
the old foundation screen.

See [PHASES.md](./PHASES.md), [PROGRESS.md](./PROGRESS.md), and [docs/architecture.md](./docs/architecture.md).

Phases 1–6 are complete. Phase 7 implements the Frameflow web interface: search,
photo grid/lightbox, video reels, pagination, and session activity. Automated
verification passes with 65 tests and production builds; live-browser checks
remain pending. Library usage is documented in
[wrapper docs](./docs/wrappers.md) and [headless UI docs](./docs/components.md).
See [native UI docs](./docs/components-native.md) for FlatList/Modal contracts
and the local-data native fixture screen.

Before changing the app integration, read the repository-local
[data skill](./skills/media-data/SKILL.md) and [UI skill](./skills/media-ui/SKILL.md).
[AI usage evidence](./docs/ai-usage.md) records the tested integration rehearsal,
Phase 7 implementation, and remaining live-browser verification.

## Netlify deployment

The root `netlify.toml` uses repository-root installation, Node 24,
`npm run verify`, and publish directory `apps/web/dist`. No API-key environment
variable is needed. Do not set the base directory to `apps/web`.

Follow [the Netlify guide](./docs/deployment.md) for importing the repository,
local production checks, and troubleshooting. The user deployed the demo at
https://moonlit-shortbread-e4f2c7.netlify.app/; later local fixes require re-upload.
The full [SDK reference](./docs/sdk.md) and
[verification/submission checklist](./docs/verification.md) cover behavior,
limitations, and remaining acceptance checks.
