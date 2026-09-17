# Trenton Flames AI Scout

AI-assisted hockey prospect research dashboard for the **Trenton Flames** (Trenton, Nova Scotia, Canada), intended for future **Nova Scotia Hockey League** roster-building.

Architecture mirrors the Nampa Devils agent pattern:

- **Backend (Render):** Node.js/Express API with health/status, prospect listing, and safe research endpoint
- **Frontend (GitHub Pages):** static scouting dashboard with API integration and demo fallback

## Project structure

- `src/` backend service (`src/server.js` entrypoint)
- `frontend/` static dashboard files
- `scripts/build-frontend.js` static build/copy script
- `test/` API tests
- `render.yaml` Render web service configuration
- `.github/workflows/deploy-pages.yml` GitHub Pages deployment workflow

## Important demo-data disclaimer

This repository ships with clearly labelled **fictional demo prospects** for UI and workflow validation.
Do not treat demo profiles as verified real-world player records.

## Environment variables

See `.env.example`:

- `PORT` server port (Render injects `PORT` automatically)
- `CORS_ORIGIN` comma-separated allowed origins
- `AI_RESEARCH_PROVIDER` optional provider identifier label
- `AI_RESEARCH_API_KEY` optional secret key for future live integrations

Never commit secrets.

## Local setup

```bash
npm install
npm run dev
```

Backend: `http://localhost:3000`

Run tests:

```bash
npm test
```

Build frontend artifact:

```bash
npm run build
```

The build outputs static files into `dist/`.

## API endpoints

### `GET /health`
Service health and franchise metadata.

### `GET /api/status`
Backend status with `demoMode` and provider configuration state.

### `GET /api/prospects`
Returns seeded prospect list with filters:

- `search` text match
- `position` exact position
- `sort=asc|desc` fit-score sorting

### `POST /api/research/prospect`
Safe research response format that accepts query input and returns structured scouting records.

Example request:

```bash
curl -X POST http://localhost:3000/api/research/prospect \
  -H "Content-Type: application/json" \
  -d '{"query":"Trenton","position":"LD"}'
```

If `AI_RESEARCH_API_KEY` is missing, endpoint still returns useful structured demo results with transparent `demoMode` and source/disclaimer fields.

## Render deployment

`render.yaml` defines a Node web service:

- Build command: `npm ci`
- Start command: `npm start`

Manual setup in Render:

1. Create a new Web Service (or Blueprint) from this repository.
2. Confirm environment variables (`AI_RESEARCH_PROVIDER`, `AI_RESEARCH_API_KEY`, `CORS_ORIGIN`).
3. Deploy and note the service URL (`https://<service>.onrender.com`).

## GitHub Pages deployment

Workflow: `.github/workflows/deploy-pages.yml`

Repository setup:

1. Enable **Settings → Pages → Build and deployment → GitHub Actions**.
2. Add repository variable `RENDER_API_BASE_URL` with your Render URL.
3. Push to `main` (or run workflow manually).

The build script injects `API_BASE_URL` into `dist/config.js` when `RENDER_API_BASE_URL` is set.
Without it, frontend defaults to relative `/api` and falls back to local demo data if unavailable.

## Operational notes

- Review confidence and source labels before using any output operationally.
- Validate prospects through trusted scouting workflows, consent/privacy safeguards, and league governance.
- The current research endpoint is intentionally safe/demo-first and does not claim verified live player intelligence.
