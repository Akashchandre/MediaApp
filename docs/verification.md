# Verification and remaining checks

## Automated baseline

`npm run verify` runs lint, TypeScript core checking, dependency boundaries,
Vitest, and core/web production builds. Latest baseline: 65 tests in 8 files
passed locally on Windows with Node 20.19.4. No live Pexels key is used in tests.

Coverage includes SDK transport/models/cache/errors/events, shared wrapper
lifecycle/pagination/parity, independent web/native UI hooks, consumer skill
wiring, app flows, and the actual Vite JSX configuration. Two startup regression
tests protect against the previously blank screen caused by a missing JSX runtime.

These are behavioral tests, not a coverage-percentage or security-audit claim.
jsdom mocks dialog methods, dimensions, and video playback. Native tests use a
React hook harness, not a React Native renderer or device.

## Browser review evidence (2026-09-23)

Reviewed the deployed site at https://moonlit-shortbread-e4f2c7.netlify.app/
in isolated headless Chrome using a runtime-only key. Its assets matched the
previous local production build. Photos/videos loaded, lightbox next/Escape/focus
restoration worked, and switching reels paused the prior video. Browser storage
was empty and no runtime exceptions were reported. This was a viewport-emulated
review, not physical-device testing or a complete acceptance audit.

After mobile fixes, checked the local production preview at 320, 390, 600, 768,
and 1440px widths (video layouts at 320, 390, and 1440). At 390px, first photos
moved from approximately 567px to 415px down the page, and reels from 662px to
471px. Credits are 13px, mobile inputs 16px, and navigation/suggestion targets
44px high. No page-level horizontal overflow was observed; the suggestion row
intentionally scrolls independently. Lightbox focus/close and active-video
playback passed again. All 65 tests and builds passed after the edits.

The new build has not been uploaded. The fixed Netlify badge remains a dashboard
setting: turn it off using [the deployment guide](./deployment.md). Bottom safe
area spacing improves footer access but cannot prevent a fixed badge overlay
while scrolling. No badge setting was changed by the agent.

## Browser acceptance checklist (full pass still pending)

Use the production preview and then the Netlify HTTPS URL. Record browser,
viewport, deployed commit, and results; do not put keys in screenshots or logs.

- [ ] Connection screen renders before entering a key; no console startup errors.
- [ ] Enter a valid Pexels key; curated photos load. Refresh/disconnect returns to
  an empty key field. No key is written to browser storage by the app.
- [ ] Search, suggestions, clear search, and kind switching show the correct
  dataset. A later search is not replaced by an earlier slow response.
- [ ] Load More appends results. A failed page keeps existing items, and retry
  retries that page. Initial failures and successful empty results are distinct.
- [ ] Open a photo using keyboard; Tab stays inside the modal; arrow navigation,
  Escape/close, focus restoration, and background isolation work.
- [ ] A photo view emits once per selection/navigation; a download click records
  a request. Verify actual new-tab/save behavior without equating the two.
- [ ] Video pages snap with touch/scroll and focused arrow controls. Only the
  active reel plays; manual controls work when autoplay is blocked.
- [ ] Video/photo failures show fallbacks, and creator/Pexels links work.
- [ ] Desktop and narrow mobile layouts remain usable with keyboard and touch.
- [ ] Netlify build passes on configured Node 24/Linux; deployed assets load after
  a hard refresh. Record the first successful URL and deployment commit.

## Deliberate scope and limitations

- Static frontend with personal runtime key entry; no backend secret vault,
  shared-key proxy, authentication service, analytics backend, or persistence.
- Explicit pagination; no virtualized list or unlimited-feed performance claim.
- Cache/cancellation and malformed-response limitations are documented in
  [the SDK reference](./sdk.md). No automatic quota backoff.
- Modern native-dialog browsers are assumed; no bundled legacy polyfill.
- Autoplay, scroll snapping, media codecs, cross-origin saving, and API/network
  availability require real-browser checks. No completed-save guarantee.
- Native deliverables are reusable wrappers/hooks and fixtures, not a complete
  mobile application; no Metro/device/emulator verification or npm publication.
- The user deployed manually; the review above tested live media on that site.
  No Netlify cloud build, physical-device test, dependency vulnerability audit,
  or independent accessibility audit has been performed in this session.

## Submission evidence

Record the verified site URL and commit here after deployment. Include the
completed checks above, any known failures, and a credential-free implementation
session link in [AI usage](./ai-usage.md). Until then, these items remain pending.
