# Project Working Rules

This file records the development rules used while building the sample. The two deliverable AI skills live separately under `skills/` and will describe the final public APIs.

## Technology

- `media-core`: strict TypeScript compiled with `tsc`.
- Wrappers, headless UI packages, and web app: JavaScript/JSX.
- Monorepo: npm workspaces.
- Web app: React and Vite.
- Tests: Vitest and Testing Library.
- Styling: consumer-owned plain CSS.

## Required dependency boundaries

- The app may import `media-react` and `media-ui-react`, never `media-core` directly.
- `media-react` and `media-native` may import `media-core` and React only.
- UI packages may not import core or either wrapper.
- Core may not import React, React Native, DOM APIs, or UI code.
- Do not import SDK types into UI packages; UI contracts remain generic.

## Implementation conventions

- Keep Pexels URLs, authentication, response normalization, cache policy, and event semantics in core.
- Keep wrappers thin: lifecycle, state, subscriptions, and delegation only.
- UI hooks accept items and callbacks and return state plus prop-getters.
- Include loading, empty, error, retry, and pagination states.
- Never log, commit, persist, or include an API key in an event or error.
- Update `PROGRESS.md` after every completed phase.
