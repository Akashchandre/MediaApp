# Delivery Phases

## Phase 1 — Setup and contracts

- [x] Create the npm workspace and package folders.
- [x] Configure the TypeScript core and Vite web app.
- [x] Define public contracts and dependency rules.
- [x] Add linting, testing, and boundary-check foundations.
- [x] Choose runtime-only API-key entry for the demo.

## Phase 2 — Core SDK

- [x] Implement Pexels photo/video search, discovery, pagination, and item lookup.
- [x] Normalize typed media responses and errors.
- [x] Add cache and in-flight request de-duplication.
- [x] Add view/download events, default logger, and unsubscribe behavior.
- [x] Test core without React or DOM dependencies.

## Phase 3 — Platform data wrappers

- [x] Implement matching React and React Native provider/hooks contracts.
- [x] Expose query, pagination, item, actions, and event state.
- [x] Prevent stale requests from replacing newer state.
- [x] Verify wrappers contain no SDK business logic.

## Phase 4 — Headless web UI

- [ ] Implement grid prop-getters and load-more behavior.
- [ ] Implement accessible lightbox state, keyboard controls, focus trap, and restoration.
- [ ] Implement reel scroll-snap props and active-item detection.
- [ ] Test all hooks with fixture data only.

## Phase 5 — Headless native UI

- [ ] Implement native grid/list prop-getters.
- [ ] Implement lightbox state and accessibility props.
- [ ] Implement vertical reel and viewability prop-getters.
- [ ] Test behavior with fixture data and no SDK imports.

## Phase 6 — AI skills

- [ ] Write the data-wiring `SKILL.md` against actual wrapper APIs.
- [ ] Write the component-usage `SKILL.md` against actual UI APIs.
- [ ] Record how the skills guided the app implementation.

## Phase 7 — React web application

- [ ] Add in-memory API-key configuration.
- [ ] Add curated photos, search, kind switching, pagination, and retry states.
- [ ] Wire photo grid to lightbox and video results to reels.
- [ ] Wire view/download activity events and Pexels attribution.
- [ ] Add responsive consumer-owned CSS.

## Phase 8 — Verification, docs, and deployment readiness

- [ ] Complete SDK and component documentation.
- [ ] Run lint, typecheck, boundary checks, tests, and production builds.
- [ ] Document limitations, scope decisions, and AI assistance.
- [ ] Prepare deployment and submission instructions.
