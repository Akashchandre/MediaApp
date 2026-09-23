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

- [x] Implement grid prop-getters and load-more behavior.
- [x] Implement accessible lightbox state, keyboard controls, focus trap, and restoration.
- [x] Implement reel scroll-snap props and active-item detection.
- [x] Test all hooks with fixture data only.

## Phase 5 — Headless native UI

- [x] Implement native grid/list prop-getters.
- [x] Implement lightbox state and accessibility props.
- [x] Implement vertical reel and viewability prop-getters.
- [x] Test behavior with fixture data and no SDK imports.

## Phase 6 — AI skills

- [x] Write the data-wiring `SKILL.md` against actual wrapper APIs.
- [x] Write the component-usage `SKILL.md` against actual UI APIs.
- [x] Validate both skills and record a skill-guided integration rehearsal.

## Phase 7 — React web application

- [x] Read both skills before implementation and record their use in the full app.
- [x] Add in-memory API-key configuration.
- [x] Add curated photos, search, kind switching, pagination, and retry states.
- [x] Wire photo grid to lightbox and video results to reels.
- [x] Wire view/download activity events and Pexels attribution.
- [x] Add responsive consumer-owned CSS.
- [x] Run app tests and full verification.
- [ ] Check the live photo/video browser journey.

## Phase 8 — Verification, docs, and deployment readiness

- [x] Complete SDK and component documentation.
- [x] Run lint, typecheck, boundary checks, tests, and production builds.
- [x] Document limitations, scope decisions, and AI assistance.
- [x] Prepare Netlify configuration, deployment, and submission instructions.
- [ ] Record the first successful Netlify build and complete deployed browser acceptance checks.
