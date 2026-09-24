# Frameflow: Complete Project Walkthrough

## 1. Folder structure

```text
MediaApp/
|-- apps/
|   `-- web/                         # Complete React web application
|       |-- src/
|       |   |-- main.jsx             # Browser entry point
|       |   |-- App.jsx              # Connection, search, gallery, reels, activity
|       |   |-- styles.css           # Application styling and responsive layout
|       |   `-- examples/
|       |       `-- SkillWiringExample.jsx
|       |-- test/
|       |   |-- app.test.jsx         # Application behavior
|       |   |-- skill-wiring.test.jsx
|       |   `-- startup.test.js      # Vite JSX startup regression checks
|       |-- index.html              # HTML shell
|       |-- vite.config.js          # Automatic JSX runtime
|       `-- package.json            # Web dependencies and scripts
|-- packages/
|   |-- media-core/                 # Framework-independent TypeScript SDK
|   |   |-- src/
|   |   |   |-- index.ts            # Public SDK exports
|   |   |   |-- types.ts            # Media, request, client, and event types
|   |   |   |-- client.ts           # Pexels requests, cache, normalization, events
|   |   |   `-- errors.ts           # Structured SDK errors
|   |   |-- test/client.test.ts
|   |   |-- tsconfig.json
|   |   `-- package.json
|   |-- media-react/                # React data provider and hooks
|   |   |-- src/index.js
|   |   |-- test/hooks.test.jsx
|   |   `-- package.json
|   |-- media-native/               # Matching data APIs for native consumers
|   |   |-- src/index.js
|   |   |-- test/contracts.test.js
|   |   `-- package.json
|   |-- media-ui-react/             # Headless browser UI behavior
|   |   |-- src/
|   |   |   |-- index.js
|   |   |   |-- props.js            # Prop/handler/ref composition helpers
|   |   |   |-- useMediaGrid.js
|   |   |   |-- useMediaLightbox.js
|   |   |   `-- useMediaReel.js
|   |   |-- test/hooks.test.jsx
|   |   `-- package.json
|   `-- media-ui-native/            # Headless React Native UI behavior
|       |-- src/
|       |   |-- index.js
|       |   |-- props.js
|       |   |-- useMediaGrid.js
|       |   |-- useMediaLightbox.js
|       |   `-- useMediaReel.js
|       |-- examples/FixtureScreen.jsx
|       |-- test/hooks.test.jsx
|       `-- package.json
|-- skills/
|   |-- media-data/SKILL.md         # Instructions for integrating data hooks
|   `-- media-ui/SKILL.md           # Instructions for integrating UI hooks
|-- scripts/check-boundaries.mjs    # Checks forbidden package dependencies
|-- docs/
|   |-- project-guide.md           # This complete walkthrough
|   |-- architecture.md            # Contracts and layer boundaries
|   |-- sdk.md                     # Core SDK reference
|   |-- wrappers.md                # React/native data-hook usage
|   |-- components.md              # Web UI-hook usage
|   |-- components-native.md       # Native UI-hook usage
|   |-- deployment.md              # Netlify deployment instructions
|   |-- verification.md            # Evidence, limitations, acceptance checklist
|   `-- ai-usage.md                 # Recorded AI assistance and skill use
|-- README.md                      # Quick introduction and commands
|-- PHASES.md                      # Delivery checklist
|-- PROGRESS.md                    # Development history and recorded results
|-- SKILLS.md                      # Repository working rules
|-- package.json                   # Workspace configuration and root commands
|-- package-lock.json              # Locked dependency tree
|-- eslint.config.js               # Lint and architectural restrictions
|-- vitest.config.js               # Test configuration and workspace aliases
|-- netlify.toml                   # Repository-connected deployment settings
|-- .nvmrc                         # Target Node version: 24
|-- .editorconfig                  # Shared editor formatting
`-- .gitignore                     # Generated/local files excluded from Git
```

Dependency installation generates `node_modules/`. Building generates
`packages/media-core/dist/` and `apps/web/dist/`. These are outputs, not the source
folders to edit. The web `dist` folder is the folder used for manual deployment.

## 2. What this project does

The project is called **Headless Media Ecosystem** in the repository. Its web
application is branded **Frameflow**. It lets a user connect with a personal
Pexels API key, discover or search photos and videos, inspect photos in a
lightbox, browse video reels, load additional results, and see recent activity.

The project also delivers reusable libraries. Another application can reuse the
Pexels SDK, the platform data hooks, or the UI behavior without copying the
Frameflow screen design.

The complete application is the web app. The native work consists of reusable
packages and a fixture screen; a complete Android or iOS application has not
been built in this repository. There is no application backend or database.

This walkthrough describes the source and recorded project evidence reviewed on
2026-09-23. Verification results below are existing recorded results, not new
test runs performed while writing this document.

## 3. Technology and package organization

| Technology | Where it is used | Purpose |
|---|---|---|
| npm workspaces | Root repository | Manage the application and libraries together |
| TypeScript | `media-core` | Define and compile the SDK's public contracts |
| JavaScript/JSX | Wrappers, UI packages, web app | Implement React behavior and screens |
| React | Web app and hooks | Components, state, context, and lifecycle |
| React DOM | Web entry point | Mount the application in the browser |
| Vite | Web app | Development server and production bundling |
| Plain CSS | `apps/web/src/styles.css` | Application appearance and responsive layout |
| Pexels API | Core SDK transport | Retrieve photo and video data |
| Vitest and Testing Library | Tests | Verify SDK, hooks, and application behavior |
| ESLint and boundary script | Root checks | Detect code issues and forbidden dependencies |
| Netlify configuration | Deployment | Publish the static web build |

Folder names and import names differ slightly:

| Folder | Package import name |
|---|---|
| `packages/media-core` | `@headless-media/core` |
| `packages/media-react` | `@headless-media/react` |
| `packages/media-native` | `@headless-media/native` |
| `packages/media-ui-react` | `@headless-media/ui-react` |
| `packages/media-ui-native` | `@headless-media/ui-native` |
| `apps/web` | `@headless-media/web` (application workspace) |

Running installation at the repository root links the local workspace packages.
They do not need to be published to npm for this application to use them.

## 4. Architecture: how the parts connect

```text
Frameflow web application
    |-- media-react ------> media-core ------> Pexels API
    `-- media-ui-react

Future native application / native consumer
    |-- media-native -----> media-core ------> Pexels API
    `-- media-ui-native
```

The application combines two independent kinds of behavior:

1. **Data behavior:** retrieve media, expose loading/errors, paginate, and track events.
2. **UI behavior:** select an item, open a dialog, move between items, and detect an active reel.

The SDK owns Pexels-specific details. The wrappers connect the SDK to React
lifecycle and state. The UI hooks accept generic items and callbacks. The app
supplies markup, styling, playback, and the connections between data and UI.

For example, the grid hook reports that an item was selected. Frameflow updates
its selected index and calls the data action that records a view. The grid hook
itself does not contact Pexels or create SDK activity events.

### Dependency rules

- The web app imports the React wrapper and web UI package, not core directly.
- Data wrappers delegate SDK operations to core and contain no Pexels URL or cache policy.
- UI packages do not import core or data wrappers and do not depend on SDK types.
- Core contains no React components or platform UI code.
- Native UI source does not depend on browser DOM behavior or the web UI package.

The root lint configuration and `scripts/check-boundaries.mjs` help enforce
these rules. The boundary script checks specified forbidden import patterns;
it is not a general security scanner.

## 5. Step-by-step implementation history

### Step 1: Established the workspace and contracts

We created one npm workspace containing the web app and five reusable packages.
The core received a strict TypeScript configuration; the application received a
Vite setup. Root commands were added for lint, type checking, tests, dependency
checks, development, and production builds.

We defined shared media models and public APIs before connecting the screens.
We also chose runtime API-key entry so the repository would not need a shared
Pexels credential embedded in its source or build.

### Step 2: Built the framework-independent media SDK

`packages/media-core/src/client.ts` implements `createMediaClient()`.
The client trims and validates the key, uses an injected or global `fetch`,
and adds the key to the request's `Authorization` header.

| Operation | Implemented behavior |
|---|---|
| `search()` | Search photos or videos using a nonblank query |
| `discover()` | Retrieve curated photos or popular videos |
| `getItem()` | Retrieve one photo or video by numeric ID |
| `trackView()` | Emit a local view event |
| `trackDownload()` | Emit a local download-request event |
| `on()` | Subscribe to an event and receive an unsubscribe function |
| `clearCache()` | Clear completed cached responses |

Photo and video responses are normalized into a consistent model. Every item
has a string ID, kind, title, dimensions, preview URL, Pexels URL, and creator
information. Photo items contain thumbnail, medium, large, and original URLs.
Video items contain duration and a list of sources with URL, quality, MIME type,
and dimensions.

Pagination returns `items`, `page`, `perPage`, `hasNextPage`, and `nextPage`.
The SDK defaults to 24 items per page and accepts page sizes from 1 through 80.
The current web application explicitly requests 18 items per page.

The client also implements:

- A response cache with a default lifetime of 60 seconds per client.
- Sharing of identical HTTP requests that are already running.
- Validation and structured errors for authentication, missing items, quota,
  network failures, HTTP failures, invalid JSON, and cancellation.
- Optional activity logging, enabled by default.
- Caller-level cancellation using an abort signal.

Cancellation stops that caller from waiting; it does not terminate the shared
HTTP request. A pending request can finish and populate the cache. There is no
automatic retry/backoff or persistent cache. Successful JSON is not fully
schema-validated, so malformed nested fields can still cause ordinary errors.

See [the SDK reference](./sdk.md) for exact contracts and edge cases.

### Step 3: Added React and React Native data adapters

Both adapters expose the same six public APIs:

| API | Responsibility |
|---|---|
| `MediaProvider` | Create or accept a client and share it through React context |
| `useMediaClient` | Access that client inside the provider |
| `useMediaSearch` | Load discovery/search results and expose pagination and retry |
| `useMediaItem` | Load one item and expose loading/error/retry state |
| `useMediaActions` | Delegate tracking and cache-clearing operations |
| `useMediaEvent` | Subscribe using the current listener and clean up on unmount |

An empty search query selects discovery. A nonempty query selects search.
Changing the query, media kind, client, or other request inputs creates a new
request identity. Cleanup and abort checks prevent older results from replacing
the current dataset.

`loadMore()` follows the SDK's next-page value and appends results. Duplicate
pagination requests are guarded. If a later page fails, existing items remain
visible. The app retries a failed later page with `loadMore()`; `retry()` starts
the initial request again.

These wrappers manage React state and lifecycle; core still owns transport,
normalization, caching, and event semantics. See [wrapper usage](./wrappers.md).

### Step 4: Built headless web UI hooks

“Headless” means the library supplies behavior and element properties while the
consumer supplies the actual visual elements and CSS. These hooks can work with
local fixture data without a provider or API key.

**Grid:** `useMediaGrid()` supplies container, item-button, and Load More
prop-getters. It handles selection callbacks, busy/disabled states, and pending
pagination guards. The container is an accessible group, not a spreadsheet-like
ARIA grid.

**Lightbox:** `useMediaLightbox()` uses a controlled selected index; `null`
means closed. It supplies properties for a native HTML `dialog`, its title,
close button, and previous/next buttons. It handles opening, Escape/cancel,
bounded arrow navigation, Tab containment, and restoring focus to the opener.
The browser's modal dialog behavior provides background isolation.

**Reels:** `useMediaReel()` exposes the active item/index, navigation, and
container/item prop-getters. It detects the page nearest the viewport from
scroll position, supports keyboard paging, and handles viewport resizing.
The consumer must make each reel exactly one container viewport high and
provide scroll-snap CSS.

Custom handlers and refs should be passed into prop-getters so internal behavior
is composed correctly. Replacing them after spreading the returned props can
break behavior. These hooks do not play videos, download files, or emit SDK events.

See [web UI contracts and examples](./components.md).

### Step 5: Built headless native UI hooks

The native package exports the same three hook names with properties intended
for React Native components:

| Hook | Native integration |
|---|---|
| `useMediaGrid` | `FlatList` data/keys/columns, end-reached loading, `Pressable` selection |
| `useMediaLightbox` | `Modal` visibility, close requests, accessibility escape, navigation |
| `useMediaReel` | Fixed-height list paging, viewability callbacks, ref-based scrolling |

Native reels require a positive measured `itemHeight`. Activity becomes
confirmed after an item is at least 60% visible for 100 milliseconds.
Programmatic scrolling requests movement; viewability confirms the active item.

`examples/FixtureScreen.jsx` demonstrates native components with local data.
Native hook tests use a React harness and simulated callback payloads. No
React Native renderer, Metro build, simulator, or physical-device validation
has been recorded. See [native UI documentation](./components-native.md).

### Step 6: Added repository-local AI integration skills

Two instruction documents were created for future integration work:

- `skills/media-data/SKILL.md` explains provider configuration, data hooks,
  pagination, errors, and events.
- `skills/media-ui/SKILL.md` explains UI prop-getters, refs, markup, layout,
  accessibility, and consumer responsibilities.

A small integration rehearsal was added in
`apps/web/src/examples/SkillWiringExample.jsx`, with tests for data/UI wiring.
It is an example, not the screen mounted by the main app. Recorded skill use
and implementation evidence live in [AI usage](./ai-usage.md).

### Step 7: Composed the Frameflow web application

`App.jsx` connects the data and UI packages into the complete user experience.
Its main components are:

| Component | What it does |
|---|---|
| `App` | Owns connection/key state, mounts the provider, shows header/footer |
| `Connect` | Accepts a personal API key and submits a nonblank trimmed value |
| `Explorer` | Owns search text, submitted query, media kind, and recent activity |
| `Results` | Loads data and renders loading, error, empty, and media states |
| `PhotoGallery` | Connects grid selection, lightbox navigation, and view events |
| `LoadMore` | Uses grid pagination behavior for video result loading |
| `VideoReels` | Connects reel navigation and active-item tracking |
| `VideoCard` | Chooses an MP4 source and manages playback and failure messages |
| `MediaImage` | Shows images and an unavailable-image fallback |
| `Credit` | Links media attribution to the Pexels item page |
| `DownloadLink` | Opens the media URL and records a download request |

Search is submitted by the form or a suggestion button, rather than making a
request after every keystroke. Suggestions include Nature, Architecture,
Ocean, People, and Travel. Clearing the query returns to discovery.

Results are keyed by kind and query, so changing the dataset resets gallery or
reel selection. Appending another page keeps the current result component.

The photo gallery displays medium images; the lightbox uses large images, with
an original-file link. Opening or navigating to a photo records a view.

Video playback prefers an SD MP4 source and falls back to another MP4. Active
videos attempt playback; inactive videos pause. The player is muted, loops,
supports inline playback, and exposes controls. Autoplay failures and load
failures have messages; missing MP4 sources get a fallback preview.

The activity panel retains the most recent 20 view/download-request events in
React state. The SDK supplies events but does not store this history. A
download event records a click/request, not proof that a file was saved.

### Step 8: Fixed startup and improved mobile presentation

An earlier blank screen was traced to JSX compiling into `React.createElement`
without a matching React binding. `apps/web/vite.config.js` now enables the
automatic JSX runtime. Two startup tests exercise the actual compiler
configuration because the normal test environment had masked the problem.

After deployment review, responsive styling was adjusted to improve mobile
readability and reduce space before the media. Recorded changes include larger
credits and input text, larger navigation targets, a horizontally scrollable
suggestion row, wrapping for long captions, and footer safe-area spacing.

The verification notes record viewport checks at 320, 390, 600, 768, and 1440
pixels, plus video checks at selected widths. No page-level horizontal overflow
was observed in those checks. These are viewport-emulated results, not physical
phone testing.

### Step 9: Prepared verification and deployment documentation

The project added a root Netlify configuration, a Node-version file, detailed
SDK/UI references, deployment instructions, and an acceptance checklist.
The configured repository-connected build runs the full verification command
before publishing `apps/web/dist`.

The repository records a user-performed manual deployment and a later browser
review. It also records that the subsequent mobile fixes still needed uploading.
Older statements saying no deployment had occurred describe an earlier stage;
they should not be treated as the latest deployment evidence.

## 6. A complete request journey

For a photo search such as “Ocean,” the application works as follows:

1. The user enters a key on the connection screen.
2. `App` stores it in memory and mounts `MediaProvider`.
3. The provider creates the shared SDK client.
4. The user submits “Ocean”; `Explorer` updates the submitted query.
5. `Results` calls `useMediaSearch({ kind: "photo", query, perPage: 18 })`.
6. The wrapper calls the client's search operation for page 1.
7. Core validates inputs and checks cached or already-running requests.
8. If needed, core requests Pexels data with the authorization header.
9. Core normalizes the response into `MediaPage` and photo items.
10. The wrapper updates its current request's state.
11. The app renders images and passes items/callbacks to the grid hook.
12. Selecting a photo updates the controlled lightbox index and tracks a view.
13. The event subscription adds the event to session activity.
14. Load More requests the next page and appends its items.

If the user submits another query before the original request completes, the
old response cannot replace the newer search state. If a next-page request
fails, already-loaded items remain available while the user retries.

## 7. State, credentials, and persistence

| Information | Location | Lifetime |
|---|---|---|
| API key | Connection/application React state and SDK closure | Current connected session |
| Search text and kind | `Explorer` state | Mounted explorer session |
| Media results and errors | Data-hook state | Current request/dataset |
| Cached HTTP responses | SDK client's in-memory map | TTL/client lifetime |
| Selected photo | Gallery state | Current mounted dataset |
| Active reel | Reel-hook state | Current mounted reel dataset |
| Recent activity | `Explorer` state, up to 20 events | Mounted explorer session |

Disconnect clears application key state and unmounts the explorer/provider.
Refreshing starts the application again without a stored key. The app does not
write the key to local storage, session storage, source files, or build config.
The key is still visible to the browser user in API requests because Pexels is
called directly from the browser.

There are no user accounts, saved collections, uploaded files, persistent event
history, or server-side credential storage in the current implementation.

## 8. Running the project locally

Run commands from the repository root. Node 24 is the target recorded in
`.nvmrc` and the deployment configuration.

### First installation

```bash
npm ci
```

This installs the locked dependencies and links workspaces.

### Development

```bash
npm run dev
```

This builds core and starts the web Vite server. Open the URL printed in the
terminal, usually `http://localhost:5173`. Keep the command running. The
connection screen works without a key; live media requires a Pexels API key.

Core is compiled once by this root command. After editing core, rebuild it
with `npm run build -w @headless-media/core` or restart the root dev command.

### Production preview

```bash
npm run build
npm run preview -w @headless-media/web
```

The build compiles core before bundling web. Preview serves the built web files
locally at the printed URL; it does not publish anything to Netlify.

### Command reference

| Command | Purpose |
|---|---|
| `npm run dev` | Build core and start web development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run workspace type-check scripts; currently core |
| `npm run check:boundaries` | Check forbidden package imports |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Compile core and build web production assets |
| `npm run verify` | Run lint, types, boundaries, tests, and builds in order |

## 9. Testing and recorded verification

The latest recorded automated baseline is **65 passing tests in 8 files**, plus
passing lint, core type checking, dependency boundaries, and production builds.
The recorded local environment was Windows with Node 20.19.4. This does not
establish a successful Node 24/Linux Netlify build.

| Test file | Main responsibility |
|---|---|
| `packages/media-core/test/client.test.ts` | SDK requests, normalization, cache, errors, and events |
| `packages/media-react/test/hooks.test.jsx` | Shared wrapper lifecycle and data behavior |
| `packages/media-native/test/contracts.test.js` | Native wrapper export-contract parity |
| `packages/media-ui-react/test/hooks.test.jsx` | Generic web grid, lightbox, and reel behavior |
| `packages/media-ui-native/test/hooks.test.jsx` | Native prop contracts and callbacks |
| `apps/web/test/skill-wiring.test.jsx` | Example consumer integration |
| `apps/web/test/app.test.jsx` | Frameflow application flows |
| `apps/web/test/startup.test.js` | Actual Vite JSX startup configuration |

Automated tests use mocked requests or fixtures, not a live API key. Browser
dialog methods, dimensions, and playback are mocked where necessary. Passing
these tests does not independently prove real media playback, touch behavior,
completed downloads, or native device accessibility.

The later browser-review record reports successful live photo/video loading,
lightbox navigation/Escape/focus restoration, and active/inactive video playback
on the deployed site and/or local preview. A full acceptance pass remains
pending. See [verification evidence and checklist](./verification.md).

## 10. Deployment workflow and current status

Frameflow is deployed as static HTML, JavaScript, and CSS. The browser calls
Pexels; this repository does not deploy an API server or database.

### Manual deployment workflow

1. Install dependencies with `npm ci` on a fresh checkout.
2. Run `npm run verify` to check and build the project.
3. Locate `apps/web/dist`, containing `index.html` and bundled assets.
4. Upload that folder using the existing Netlify site's deployment workflow.
5. Open the deployed URL and check connection, photo/video search, pagination,
   lightbox, playback, and responsive behavior.
6. Record the deployed source revision and actual acceptance results.

### Repository-connected deployment configuration

The checked-in `netlify.toml` specifies:

| Setting | Repository value |
|---|---|
| Base | `.` (repository root) |
| Build command | `npm run verify` |
| Publish directory | `apps/web/dist` |
| Node version | `24` |
| npm flags | `--include=dev` |
| API-key environment variable | None |

These are the project's checked-in settings. A manual upload uses already-built
assets and does not execute this repository build configuration.

The recorded user-deployed URL is
`https://moonlit-shortbread-e4f2c7.netlify.app/`. This document does not recheck
its current availability or asset version. The latest repository notes say the
mobile fixes needed re-uploading and the complete deployed acceptance checklist
was unfinished. They do not record a successful Netlify cloud build.

The deployment guide also records a Netlify-injected badge overlapping mobile
content. That is a hosting configuration issue; no account setting change is
recorded. See [the deployment guide](./deployment.md) for the existing handoff.

## 11. Completed work and remaining work

| Area | Current evidence/status |
|---|---|
| Workspace and public contracts | Implemented |
| Core SDK | Implemented and covered by mocked tests |
| React and native data wrappers | Implemented with shared behavior/parity checks |
| Web headless UI hooks | Implemented and tested with fixtures |
| Native headless UI hooks | Implemented and tested at hook/prop level |
| Integration skills and rehearsal | Written and recorded as validated |
| Frameflow web interface | Implemented with recorded passing automated checks |
| Startup regression fix | Implemented with compiler-configuration tests |
| Mobile layout improvements | Implemented with recorded local viewport checks |
| Manual deployment | Recorded as performed by the user |
| Latest mobile-build upload | Pending in the latest project notes |
| Full deployed acceptance checklist | Pending |
| Netlify Node 24/Linux cloud build | No successful run recorded |
| Native emulator/device validation | Not performed |

The project deliberately does not include a complete native app, backend proxy,
database, user authentication service, analytics service, persistent favorites,
virtualized web feed, or package publication. Downloads use media links and
cannot guarantee a completed save. Modern native-dialog browser support is
assumed. No independent accessibility or dependency-security audit is recorded.

## 12. Where to work on future changes

| Desired change | Primary files/folders |
|---|---|
| Adjust page layout, colors, spacing, mobile styles | `apps/web/src/styles.css` |
| Add or change visible web interactions | `apps/web/src/App.jsx` |
| Change Pexels data normalization or request policy | `packages/media-core/src/client.ts` |
| Extend SDK types/errors | `packages/media-core/src/types.ts`, `errors.ts` |
| Change query lifecycle or pagination state | Data-wrapper `src/index.js` files |
| Change generic browser interaction behavior | `packages/media-ui-react/src/` |
| Change native component prop behavior | `packages/media-ui-native/src/` |
| Change build/deployment settings | Root scripts, `.nvmrc`, `netlify.toml`, Vite config |

Preserve the layer boundaries when extending the project. Before changing app
integration, read the repository's two consumer skills. Add verification
appropriate to the behavior being changed and update the relevant reference
document and progress record with actual results.

For deeper reading, continue with [architecture](./architecture.md),
[SDK](./sdk.md), [wrappers](./wrappers.md), [web UI](./components.md),
[native UI](./components-native.md), and [verification](./verification.md).
