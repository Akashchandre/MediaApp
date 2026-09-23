# AI assistance and skill-use evidence

## Attribution

The implementation in this repository was generated/edited with Codex during the
phase-by-phase conversation. The user supplied the assignment, chose TypeScript
for core and JavaScript elsewhere, and directed phase progression. No manual
code authorship or independent human review is claimed here.

The supplied planning conversation is
[Explain Project Requirements](https://chatgpt.com/share/6ab36409-4dec-83e9-b13b-cbfa045306d1).
It establishes the assignment and plan, not a complete transcript of this coding
session. A shareable link for this implementation session is still needed for
the final submission. Do not share any transcript containing account credentials.

## Phase 6: creation and rehearsal

Created [media-data](../skills/media-data/SKILL.md) and
[media-ui](../skills/media-ui/SKILL.md) after inspecting the actual wrapper,
headless hooks, and media data shapes. The skill-creator guidance influenced
their scope: exact APIs and integration pitfalls, short descriptions, no
unnecessary templates or global installation.

The main coding agent read both completed SKILL.md files before implementing
[SkillWiringExample.jsx](../apps/web/src/examples/SkillWiringExample.jsx).
This is a small integration rehearsal in the app's source tree, not the finished
demo and not mounted by App. No independent subagent evaluation was performed.

Implementation brief used for the rehearsal:

> Use both skills to build a small photo consumer with an injected client,
> discovery/search, loading/error/empty states, Load More, a controlled lightbox,
> and app activity subscriptions. Verify navigation tracking and failed-page retry
> without adding SDK imports to the app or data calls to the UI library.

| Skill instruction | Observable implementation | Verification |
|---|---|---|
| Import wrapper and UI packages only in the app | Example imports both public packages; no direct core import | Boundary check and lint |
| Use provider client injection | Test fixtures enter through MediaProvider | Tests use real wrapper/UI hooks with a stub client |
| Preserve items on pagination error; retry via loadMore | Error message sits alongside grid | Test records request pages 1, 2, 2 and retained first item |
| Native dialog, mounted independently of selected content | Unconditional dialog receives getDialogProps | Test opens, navigates, escapes, and restores focus |
| One tracking point per selection | Selection callback handles open/previous/next; close emits no view | Strict Mode test expects two views for open + next |
| Use event subscriptions with cleanup | useMediaEvent for view/download | Listener sets are empty after unmount |
| Reset view selection for a new query | Gallery keyed by submitted query | Search change closes prior lightbox |

Corrections/decisions: the rehearsal kept SDK models inside the app, used the
existing singular kind values, and used the wrapper's error state rather than
adding another request effect. No public package API changes were needed.

Validation:

- Bundled skill-creator `quick_validate.py` passed for both skill folders.
- Consumer integration tests live in `apps/web/test/skill-wiring.test.jsx`.
- `npm run verify` passed with 56 tests in 6 files, lint, typecheck, dependency
  checks, and core/web production builds.
- Validation uses mocked clients, modal methods, and jsdom; it does not establish
  live Pexels access, real file downloads, or browser top-layer/layout behavior.
- The download link records a request and links to the original. A browser may
  open cross-origin media instead of saving it; no save-completion claim is made.

## Phase 7: full-app implementation, verification pending

The main agent reread both skills before replacing the foundation screen in
`apps/web/src/App.jsx` and `apps/web/src/styles.css`. No subagents were used.

The data skill guided runtime-only key ownership, draft/submitted query separation,
query/kind remounts, wrapper-managed pagination/retry, and event subscriptions.
The UI skill guided the always-mounted native dialog, prop-getter composition,
fixed-height reel pages, load-more placement outside the reel, active playback,
and Strict Mode view-event deduplication. Markup and styles remain in the app;
no core imports or Pexels request logic were added to UI components.

Implemented entry/key/disconnect flow, search/suggestions, photo gallery/lightbox,
video reels, activity history, attribution, and responsive CSS. Download links
record requests, not completed saves. Video downloads link to the selected MP4;
they are not described as original files.

Added 7 tests in `apps/web/test/app.test.jsx`, using real wrapper/UI hooks with
fixture clients (plus a mocked transport for provider/key integration). Intended
coverage: key lifecycle, submitted search/kind switching, photo navigation/focus/
events, failed-page retry, authentication recovery, active video playback, and
autoplay/missing-source fallback. These tests have **not run**.

`npm run verify` was rejected before execution by automatic approval review
because its account usage limit was reached. The prior 56-test passing result
applies to Phase 6, not the changed app. Current lint, types, boundaries, tests,
and production build still require a successful run. No live API access,
real-browser rendering, keyboard/modal behavior, playback, or saving was verified.

### Follow-up: blank-screen diagnosis and successful verification

The local dev server exposed the actual startup issue: the entry module used
`React.createElement` without importing a React binding. The web app had no Vite
configuration selecting the automatic JSX runtime. Added `apps/web/vite.config.js`
and two compiler regression tests in `apps/web/test/startup.test.js`; those tests
check the real web compiler options instead of relying on Vitest's JSX defaults.

After approval became available, `npm run verify` passed with 65 tests in 8 files,
lint, types, boundary checks, and production builds. This supersedes the pending
automated verification above. A fresh dev server's HTTP responses confirmed
automatic JSX imports; no browser visual or live-Pexels verification is claimed.
