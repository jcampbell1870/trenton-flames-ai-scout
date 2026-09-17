# Trenton Flames AI Scout

AI-assisted hockey prospect research dashboard for the **Trenton Flames** in **Trenton, Nova Scotia, Canada**, built for future **Nova Scotia Hockey League** scouting workflows.

This repository mirrors the useful Nampa Devils architecture:

- **Backend (Render):** Node.js/Express API with health, status, prospects, and safe research/query responses
- **Frontend (GitHub Pages):** static dashboard with flame red/orange/charcoal branding, filters, and demo fallback
- **Build flow:** copy `frontend/` to `dist/` for Pages deployment
- **Tests:** Node native test runner plus `supertest`

## Why Render failed before

Render tried to deploy commit `ad79cec8e78c752a9490c8893434dbe9199846f0` from `main` while the repository only contained a minimal `README.md`, `LICENSE`, and `.gitignore`.

Because there was no `package.json`, `src/server.js`, or `render.yaml`, Render did **not** detect a Node application. It fell back to Python defaults and ran:

```bash
pip install -r requirements.txt
```

That failed because this project is a Node/Express application and does not use `requirements.txt`.

This PR fixes that by adding:

- `package.json` and lockfile
- `src/server.js` entrypoint that listens on `process.env.PORT`
- explicit `render.yaml` with `env: node`, `buildCommand: npm install`, and `startCommand: npm start`
- deployable frontend, tests, and Pages workflow

## Project structure

- `src/` backend service and demo scouting data
- `frontend/` static dashboard assets and local demo fallback data
- `scripts/build-frontend.js` frontend copy/build step
- `test/` API tests
- `render.yaml` Render web service configuration
- `.github/workflows/deploy-pages.yml` GitHub Pages deployment workflow
- `.env.example` example environment variables only; no secrets

## Demo data disclaimer

This repository ships with clearly labelled **fictional demo prospects** for UI, API, and deployment validation.

- Demo profiles are **not** verified real players.
- Demo output must **not** be treated as validated scouting intelligence.
- Any operational use should be verified through trusted league-approved sources and normal scouting review.

## Environment variables

See `.env.example`.

- `PORT` server port (`Render` injects this automatically)
- `CORS_ORIGIN` comma-separated allowed browser origins
- `AI_RESEARCH_PROVIDER` optional provider label
- `AI_RESEARCH_API_KEY` optional secret for future live integrations
- `TEAM_FACEBOOK_PAGE_NAME` display name for the official Trenton Flames Facebook source
- `TEAM_FACEBOOK_PAGE_URL` full official Trenton Flames `facebook.com` page URL used in research responses

Default official Facebook page:

- `https://www.facebook.com/p/Trenton-Flames-61579453380039/`

Never commit secrets.

> Note: GitHub Pages project sites share the host origin `https://<account>.github.io` across repositories. If you deploy the frontend as a Pages project site, CORS can only allow that host, not a repository subpath. Use a dedicated frontend domain if you need stricter browser-origin isolation.

## Local setup

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Start the Render-style web service locally:

```bash
npm start
```

Optional development watch mode:

```bash
npm run dev
```

Build the static frontend artifact:

```bash
npm run build
```

The frontend build outputs static files into `dist/`.

## API endpoints

### `GET /health` and `GET /api/health`

Health payload with service, franchise, league, and timestamp metadata.

### `GET /status` and `GET /api/status`

Status payload exposing whether the service is currently in demo mode, whether an AI research provider label is configured, and which team research sources are enabled.

### `GET /api/prospects`

Returns clearly labelled Trenton Flames demo prospects with:

- `search` text filtering
- `position` exact filtering
- `sort=asc|desc` fit-score sorting
- `demoMode`, source, and disclaimer-friendly metadata

### `POST /api/query` and `POST /api/research/prospect`

Safe research/query response contract that accepts JSON input and returns structured scouting records.

Example:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Trenton","position":"LD"}'
```

If `AI_RESEARCH_API_KEY` is not configured, the API still returns a transparent demo response with:

- `demoMode: true`
- `hasApiKeyConfigured: false`
- explicit source wording showing demo fallback
- `teamResearchSources` metadata including the Trenton Flames Facebook page when configured
- `researchChecklist` reminding scouts to review official team Facebook posts alongside trusted league sources
- a reminder that results must be validated before decisions

## Frontend dashboard

The Pages frontend under `frontend/` includes:

- responsive Trenton Flames branding
- prospect search and filters
- loading, empty, and API-fallback error states
- scouting cards with fit score, confidence, source, notes, and references
- a research-source panel that highlights the Trenton Flames Facebook page as part of the scouting workflow
- clear demo-data and verification disclaimers

### API base URL configuration

- `frontend/config.js` defaults to an empty `apiBaseUrl`, which makes local/root deployments use relative `/api`
- `frontend/config.example.js` shows how to point at a hosted Render API
- the Pages workflow injects `RENDER_API_BASE_URL` into `dist/config.js` at build time

## Render deployment setup

`render.yaml` explicitly configures a **Node** web service so Render does not fall back to Python:

- `env: node`
- `buildCommand: npm install`
- `startCommand: npm start`
- `NODE_VERSION=20`

### Manual Render steps

1. In Render, create a **Blueprint** or **Web Service** from this repository.
2. Confirm Render detects `render.yaml`.
3. Verify the service uses the Node runtime and the commands above.
4. Set `CORS_ORIGIN` to your allowed browser origin list. For GitHub Pages project sites this will be the shared `https://<account>.github.io` host, unless you use a dedicated custom domain.
5. `TEAM_FACEBOOK_PAGE_URL` defaults to the official Trenton Flames Facebook page (`https://www.facebook.com/p/Trenton-Flames-61579453380039/`). Adjust it only if the official page changes, and update `TEAM_FACEBOOK_PAGE_NAME` if needed.
6. Optionally add `AI_RESEARCH_PROVIDER` and `AI_RESEARCH_API_KEY`.
7. Deploy and note the resulting Render URL, for example `https://trenton-flames-ai-scout-api.onrender.com`.

## GitHub Pages setup

Workflow: `.github/workflows/deploy-pages.yml`

1. In GitHub, enable **Settings → Pages → Build and deployment → GitHub Actions**.
2. Add repository variable `RENDER_API_BASE_URL` with the deployed Render API URL.
3. Push to `main` or manually trigger the Pages workflow.

The workflow runs `npm ci`, builds `dist/`, writes a `.nojekyll` file for Pages-safe static hosting, uploads the Pages artifact, and deploys the static dashboard.

## Tests included

- health endpoint coverage
- status alias coverage
- prospects endpoint coverage
- query/research validation coverage
- demo-mode behavior coverage

## Operational notes

- Review confidence, notes, and source labels before using any output.
- Include the official Trenton Flames Facebook page in player research review before acting on public team signals.
- The current research endpoints are safe template endpoints, not a verified live scouting intelligence system.
- If you later add a real provider, keep the current transparent demo fallback and do not present unverified outputs as confirmed player facts.
