# Qalibur — MVP Build Plan

**Agentic QE platform. Localhost-first. Demo on GitHub Pages. Live via clone-and-run.**

---

## What we're building

A web dashboard + Node backend that runs 10 AI agents to automate the full QE lifecycle — test strategy, Gherkin cases, Playwright scripts, quality gate review, GitHub Actions execution, and defect triage. Two modes from one codebase: a public demo page (static snapshots on GitHub Pages) and a live local run (real Anthropic API calls, real GitHub integration).

---

## Repo structure

```
qalibur/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/            # api.js — switches live vs demo based on VITE_MODE
│   │   └── main.jsx
│   ├── fixtures/           # Snapshot JSON for demo mode
│   │   ├── runs.json
│   │   ├── artifacts.json
│   │   ├── gate-reviews.json
│   │   ├── agent-log.json
│   │   └── defects.json
│   ├── index.html
│   └── vite.config.js
├── backend/                # Node + Express (TypeScript)
│   ├── src/
│   │   ├── agents/         # One file per agent
│   │   ├── routes/         # REST endpoints
│   │   ├── middleware/     # Auth check
│   │   └── index.ts
│   └── tsconfig.json
├── .env.example
├── .gitignore              # .env must be listed here
├── package.json            # Root — runs both via concurrently
└── README.md
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev, easy GitHub Pages deploy |
| Backend | Node + Express + TypeScript | Simple, familiar, good Anthropic SDK support |
| AI | Anthropic API — `claude-sonnet-4-5` | Agent calls, server-side only |
| Auth | ALLOWED_USERS env var | No OAuth, no DB, just a list of GitHub handles |
| CI/CD | GitHub Actions | Free, already used for Playwright runs |
| Demo hosting | GitHub Pages | Static build, free, no backend needed |
| Dev | concurrently | One `npm run dev` starts frontend + backend |

---

## Environment variables

```bash
# .env.example — copy to .env, never commit .env

ANTHROPIC_API_KEY=           # From console.anthropic.com
GITHUB_TOKEN=                # Personal access token — repo + actions scope
GITHUB_OWNER=                # Your GitHub username
SESSION_SECRET=              # Any random string, 32+ chars
ALLOWED_USERS=yourhandle     # Comma-separated GitHub handles
VITE_MODE=live               # Set to "demo" for static GitHub Pages build
VITE_API_URL=http://localhost:4000
```

---

## The 10 agents

All agents live in `backend/src/agents/`. Each is a function that takes context and returns a structured result. All call the Anthropic API — `claude-sonnet-4-5` model.

| Agent | File | What it does | Output |
|---|---|---|---|
| Scout | `scout.ts` | Reads repo structure, maps coverage gaps, dispatches pipeline | `coverage-gap.json` |
| Strategist | `strategist.ts` | Produces risk-based test strategy with EP tables | `test-strategy.md` |
| Scribe | `scribe.ts` | Writes BDD Gherkin feature files from strategy | `*.feature` |
| Crafter | `crafter.ts` | Generates TypeScript Playwright scripts from feature files | `*.spec.ts` |
| Gatekeeper | `gatekeeper.ts` | Scores artifacts ≥9.5/10, self-corrects up to 3× | `gate-review.json` |
| Architect | `architect.ts` | Reviews Playwright scripts for structure and patterns | `arch-review.json` |
| Runner | `runner.ts` | Triggers GitHub Actions workflow via GitHub API | Actions run URL |
| Herald | `herald.ts` | Generates HTML execution + coverage report | `report.html` |
| Triage | `triage.ts` | Classifies failures, generates defect records | `triage.json` |
| Deployer | `deployer.ts` | Commits artifacts to branch, opens PR, posts check | GitHub PR URL |

---

## Backend routes

```
POST /api/run            — start a pipeline run (Scout entry point)
GET  /api/runs           — list all runs
GET  /api/runs/:id       — get run details + artifacts
GET  /api/runs/:id/log   — SSE stream of live agent activity
POST /api/runs/:id/approve  — human approves a gate-blocked artifact
POST /api/runs/:id/reject   — human rejects, triggers re-run with note
GET  /api/health         — wake-up ping
```

Auth middleware on every route: checks `x-github-user` header against `ALLOWED_USERS`. Simple, no tokens needed on localhost.

---

## Frontend pages

```
/                — Dashboard: run history, stats, recent activity
/run/new         — New run form: repo URL + feature description + options
/run/:id         — Run detail: agent log, artifacts, gate score, approve/reject
/run/:id/report  — Herald HTML report embedded in iframe
```

Demo mode (`VITE_MODE=demo`): `lib/api.js` returns data from `fixtures/*.json` instead of calling `localhost:4000`. Same components, same routes, no backend needed.

---

## Agent pipeline flow

```
User submits → Scout (reads repo) 
             → Strategist (test strategy)
             → Gatekeeper (score ≥9.5?)
                 └─ if fail → retry up to 3×, then flag for human
             → Scribe (Gherkin cases)
             → Gatekeeper
             → Crafter (Playwright scripts)
             → Architect + Gatekeeper (parallel review)
             → Deployer (commit + PR)
             → Runner (trigger GitHub Actions)
             → Herald (report)
             → Triage (if failures)
```

Each step streams a log event via SSE so the dashboard shows live progress.

---

## GitHub Actions workflow

Committed to the target repo by Deployer as `.github/workflows/qalibur.yml`:

```yaml
name: Qalibur test run
on:
  workflow_dispatch:
    inputs:
      run_id:
        description: Qalibur run ID
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        continue-on-error: true
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

Runner triggers this via `POST /repos/{owner}/{repo}/actions/workflows/qalibur.yml/dispatches` and polls for completion.

---

## Demo fixtures

Pre-recorded in `frontend/fixtures/` — real-looking data from an actual run. Each fixture matches the shape of the live API response exactly so the same React components render both.

- `runs.json` — 5 historical runs with timestamps, status, gate scores
- `artifacts.json` — sample strategy, feature file, and Playwright script
- `gate-reviews.json` — Gatekeeper output with scores per criterion and reasoning
- `agent-log.json` — timestamped agent activity sequence for animated replay
- `defects.json` — Triage output with failure classification and screenshot paths

---

## Auth — no database needed

Backend `middleware/auth.ts`:
```typescript
const allowed = process.env.ALLOWED_USERS?.split(',').map(s => s.trim()) ?? []

export function requireAuth(req, res, next) {
  const user = req.headers['x-github-user']
  if (!user || !allowed.includes(user)) {
    return res.status(401).json({ error: 'not authorised' })
  }
  next()
}
```

Frontend sends `x-github-user: yourhandle` with every request. On localhost this is just set in a config — no OAuth flow needed. The env file is the security boundary.

---

## GitHub Pages deploy

`frontend/vite.config.js` sets `base: '/qalibur/'`. A GitHub Actions workflow builds with `VITE_MODE=demo` and pushes the `dist/` folder to the `gh-pages` branch:

```yaml
name: Deploy demo
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build:demo
        working-directory: frontend
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: frontend/dist
```

`package.json` script: `"build:demo": "VITE_MODE=demo vite build"`

---

## Build order for Claude Code

Build in this sequence — each phase is independently runnable:

1. **Repo scaffold** — root `package.json` with concurrently, `.env.example`, `.gitignore`, `README.md`
2. **Backend skeleton** — Express app, health route, auth middleware, SSE scaffold
3. **Frontend skeleton** — Vite + React, `lib/api.js` with mode switch, basic routing
4. **Scout + Strategist** — first two agents wired end to end, `/api/run` route, live log stream
5. **Scribe + Crafter + Gatekeeper** — full artifact pipeline with quality gate loop
6. **Dashboard UI** — run list, run detail page, agent log replay, artifact viewer
7. **Deployer + Runner** — GitHub API integration, Actions trigger, PR creation
8. **Herald + Triage** — report generation, failure classification
9. **Fixtures + demo mode** — generate fixtures from a real run, wire `VITE_MODE=demo`
10. **GitHub Pages deploy** — `build:demo` script, deploy workflow

---

## README must include

- What it is (2 sentences)
- Prerequisites: Node 20+, an Anthropic API key, a GitHub personal access token
- Setup: `cp .env.example .env` → fill values → `npm install` → `npm run dev`
- Where to open: `localhost:3000`
- Demo: link to GitHub Pages URL
- Agent list with one-line descriptions

---

## Key constraints to respect throughout

- `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` only ever in `.env` and Render env vars — never in frontend code, never logged, never returned to client
- `.env` in `.gitignore` from day one — check before first commit
- All Anthropic API calls in `backend/src/agents/` only — never in frontend
- Fixtures match live API response shapes exactly — no special-case rendering code
- One `npm run dev` from root starts everything — no multi-terminal setup
