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
npm install
npm run dev
npm run verify
```

The demo asks for a Pexels API key at runtime and retains it only in memory. A browser-only app cannot keep a shared API key secret.

See [PHASES.md](./PHASES.md), [PROGRESS.md](./PROGRESS.md), and [docs/architecture.md](./docs/architecture.md).
