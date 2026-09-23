# Deploy Frameflow to Netlify

This is a static web app. Netlify serves the built files; the browser calls
Pexels directly. No backend, functions, database, or shared server-side key is
required. Deployment configuration is prepared, but no site has been published
from this coding session.

## Simple option: build and upload

1. In the project root, run `npm run build` (not `npm build`). Dependencies are
   already installed here; on a fresh checkout, run `npm ci` first.
2. Log in to Netlify and open [Netlify Drop](https://app.netlify.com/drop).
3. Drag the **`apps/web/dist`** folder into the upload area. This folder contains
   `index.html` and `assets`; do not upload the whole repository or `node_modules`.
4. Open the URL Netlify provides. Enter your Pexels API key in the app to browse media.

That is enough for manual deployment: no Git connection or Netlify CLI is needed.
For updates, build again and upload the new `apps/web/dist` to the existing
site's Deploys page. See [Netlify's manual deployment guide](https://docs.netlify.com/deploy/create-deploys/).
The repository's `netlify.toml` build settings apply to the Git-connected option
below, not to a prebuilt folder upload. No deployment has been performed yet.

## Optional: repository-connected deployment

Commit and push the deployment files to your repository, then import that
repository in Netlify. The root `netlify.toml` specifies:

| Setting | Value |
|---|---|
| Base directory | Repository root (`.`), not `apps/web` |
| Build command | `npm run verify` |
| Publish directory | `apps/web/dist` |
| Node version | `24` (also recorded in `.nvmrc`) |
| npm flags | `--include=dev`, because verification/build tools are dev dependencies |
| API-key environment variable | None |

Leave the optional package directory unset for this single-site repository.
Review these settings if automatic framework detection suggests different
values. Root installation makes all workspace packages available; verification
builds core before building web. A failed check prevents publication of that build.
The existing `package-lock.json` must be committed.

These choices follow Netlify's [monorepo guidance](https://docs.netlify.com/build/configure-builds/monorepos/),
[file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/),
and [dependency configuration](https://docs.netlify.com/build/configure-builds/manage-dependencies/).

After the first successful deploy, open its HTTPS URL and complete
[the browser checklist](./verification.md). Do not share an untested URL as a
verified submission. Record the URL, deployed commit, and actual checks there.

## Local production check

Use Node 24 to match the configured deployment runtime, recorded in `.nvmrc`.
Run from the repository root:

```bash
npm ci
npm run verify
npm run preview -w @headless-media/web
```

Open the URL printed by preview. `apps/web/dist` is the deployable folder; do not
publish the repository root or the source-only `apps/web` directory. The latest
local verification used Node 20.19.4; the Node 24/Linux Netlify build still needs
its first successful run. No cloud-build success is claimed.

The app currently uses only `/`; search and selection are React state, not URL
routes. No catch-all rewrite is necessary. Add routing rules only if URL-based
client routes are introduced later.

## Key handling and troubleshooting

- Enter your Pexels API key in the deployed connection screen. Do not put it in
  `netlify.toml`, a `VITE_*` variable, source code, or build logs. A key in a static
  bundle is public; runtime entry is visible to the browser user as well.
- Disconnect or refresh clears the app's in-memory key. Browser/password-manager
  behavior is outside the app's control.
- A blank screen is not expected without a key. Check browser console/network
  errors and confirm the deployed commit includes `apps/web/vite.config.js`.
  Locally, restart servers started before that config existed.
- Missing `@headless-media/core` output usually means the wrong build command or
  base directory. Use the root command; do not run only the web workspace build.
- Authentication errors require a valid Pexels API key, not an account password.
  Quota or network errors require recovery in the app, not Netlify secrets.
- Download links may open media in a new tab. They do not guarantee a saved file.

## Submission handoff

Include the repository URL, verified Netlify URL and commit, setup commands,
[architecture](./architecture.md), [SDK reference](./sdk.md), platform/UI usage
docs, [verification and limitations](./verification.md), and
[AI-use evidence](./ai-usage.md). Share only a credential-free implementation
transcript. Package publishing and React Native app deployment are out of scope.
