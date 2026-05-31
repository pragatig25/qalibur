# Qalibur

> **Ten agents, one merged PR.** Qalibur owns the full quality-engineering lifecycle — from gap analysis through merge-ready test PR, gated by an LLM critic at every handoff.

<p>
  <a href="https://github.com/pragatig25/qalibur/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/pragatig25/qalibur/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://pragatig25.github.io/qalibur/"><img alt="Demo" src="https://img.shields.io/badge/demo-live-C15F3C"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <img alt="Node 20+" src="https://img.shields.io/badge/node-20%2B-339933">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.7-3178C6">
</p>

Most "AI for testing" tools generate a handful of test cases and stop. Qalibur runs the full pipeline: analyses the repo, designs the strategy, writes the tests, reviews them at a hard gate, opens the PR, runs CI, classifies the failures. Every handoff is scored by an independent critic — nothing reaches your branch unreviewed.

[**▶ Watch the live demo**](https://pragatig25.github.io/qalibur/) — no backend required, replays a real run against a fictional Stripe checkout repo.

---

## Why this exists

Conventional test generation tools produce code without context. They don't read the repo, don't reason about risk, don't differentiate flaky from genuine failures. Qalibur treats QE as a pipeline of small, focused agents — each with one prompt, one artefact, and one downstream consumer — with a gatekeeper between every pair. It's the architecture an experienced QE lead would build if they had ten engineers each owning one stage.

| Concern | What Qalibur does |
| --- | --- |
| **Non-deterministic models gate the build** | They don't. Gatekeeper rejects below 8.0/10, retries the upstream agent up to 3×, then escalates to a human. Deterministic CI is still the merge gate. |
| **AI writes the same shallow happy-path test for everything** | Strategist produces an explicit risk matrix and equivalence-partition tables before any code is written. Each test has a documented reason to exist. |
| **No traceability between artefacts** | Every artefact records the agent, parent artefact, gate score, and attempt number. The Herald report renders the whole chain. |
| **Failures land in someone's lap with no context** | Triage classifies each failing test as `flaky` / `regression` / `environment` / `genuine` and proposes a fix before a human opens the PR. |

---

## The ten agents

| # | Agent | Model | Owns |
| -- | --- | --- | --- |
| 1 | **Scout** | Sonnet | Repo walk + coverage-gap report |
| 2 | **Strategist** | Sonnet | Risk matrix + equivalence-partition tables |
| 3 | **Gatekeeper** | Haiku | Scores every artefact ≥ 8.0/10 or rejects |
| 4 | **Scribe** | Sonnet | Gherkin feature files |
| 5 | **Crafter** | Sonnet | Playwright TypeScript code |
| 6 | **Architect** | Haiku | Structural review (locators, isolation, conventions) |
| 7 | **Deployer** | — | Branch + commit + PR (GitHub API) |
| 8 | **Runner** | — | Dispatch GitHub Actions, wait for outcome |
| 9 | **Herald** | Haiku | Self-contained HTML execution report |
| 10 | **Triage** | Sonnet | Failure classification + suggested fix |

Gatekeeper sits between every Sonnet stage. Haiku is used wherever the work is comparison-heavy and the prompt is large (the gatekeeper rubric is prompt-cached).

---

## Architecture

```
┌─────────────┐    repo URL +    ┌────────────────────────────────┐
│   React UI  │ ───feature───▶   │   Node + Express + TS backend  │
│  (frontend) │                  │                                │
└─────▲───────┘                  │  ┌──────────────────────────┐  │
      │                          │  │       Pipeline           │  │
      │ SSE stream               │  │  Scout → Strategist →    │  │
      │ /api/runs/:id/log        │  │  Scribe → Crafter →      │  │
      │                          │  │  Architect → Deployer →  │  │
      │                          │  │  Runner → Herald → Triage│  │
      │                          │  │  (Gatekeeper at each ↓)  │  │
      │                          │  └──────────────────────────┘  │
      │                          │           │                    │
      │                          │           ▼                    │
      │                          │   Anthropic API (Sonnet/Haiku) │
      │                          │   GitHub API (octokit)         │
      │                          └────────────────────────────────┘
      │                                      │
      │                                      ▼
      └─────────────── PR + CI run on your repo ────────
```

Single-process for clarity; the in-memory store could be swapped for Postgres + a job queue without changing the agent interface.

---

## Modes

| Mode | URL | Backend | Cost |
| --- | --- | --- | --- |
| **Demo** | [pragatig25.github.io/qalibur](https://pragatig25.github.io/qalibur/) | None — replays fixtures | $0 |
| **Live (local)** | `localhost:3001/qalibur/#/live` | Yes, runs against Anthropic + GitHub | ~$0.04 / run |

Demo mode is what's deployed to GitHub Pages on every push to `main`. Live mode requires API keys (see below) and is intended for local use — there is no hosted live endpoint.

---

## Setup

### Prerequisites
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/) (for any pipeline that calls the LLM)
- A [GitHub personal access token](https://github.com/settings/tokens?type=beta) with **`Contents: read & write`** and **`Pull requests: read & write`** scopes, scoped to the repo you want tests generated for. Optional — without it, the Deployer and Runner agents are skipped and the rest of the pipeline still runs.

### Install

```bash
git clone https://github.com/pragatig25/qalibur.git
cd qalibur
cp .env.example .env             # then fill in your keys
npm run install:all              # installs root + backend + frontend
npm run dev                      # starts backend :4000 + frontend :3001
```

Open <http://localhost:3001/qalibur/>.

### Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes (live mode) | Auth for Sonnet / Haiku calls |
| `GITHUB_TOKEN` | optional | Auth for PR creation + Actions dispatch. Without it, Deployer/Runner are skipped. |
| `GITHUB_OWNER` | optional | Your GitHub username — used as the PR author / branch namespace |
| `ALLOWED_USERS` | yes | Comma-separated GitHub handles allowed to start runs (sent via `x-github-user` header). Defaults stop strangers from running up your bill. |
| `MODEL` | optional | Default `claude-sonnet-4-6`. Falls back to `claude-haiku-4-5-20251001` for gatekeeper/architect/herald. |
| `PORT` | optional | Backend port, defaults `4000`. |
| `VITE_MODE` | optional (build-time) | `live` (default) or `demo` for the GitHub Pages build. |
| `VITE_API_URL` | optional (build-time) | Frontend → backend base URL. Empty in dev (uses Vite proxy). |

---

## Running a live pipeline against your repo

```bash
# 1. Fork or push the test target you want Qalibur to analyse
# 2. Create a fine-grained PAT scoped to that repo (see Prerequisites above)
# 3. Put it in .env:
#      ANTHROPIC_API_KEY=sk-ant-...
#      GITHUB_TOKEN=github_pat_...
#      GITHUB_OWNER=your-username
#      ALLOWED_USERS=your-username
# 4. Start Qalibur
npm run dev
# 5. Open http://localhost:3001/qalibur/#/live
# 6. Paste the repo URL, describe the feature, submit
```

The agent log streams in real time over SSE. When the pipeline reaches the Deployer, a branch named `qalibur/run-<id>` is pushed to your target repo and a PR is opened. The Runner dispatches `.github/workflows/qalibur.yml` if you've added one to that repo (template below); without it the Runner skips and the pipeline still completes.

### Workflow template for the target repo

Drop this into `.github/workflows/qalibur.yml` of the repo you want tested:

```yaml
name: Qalibur tests
on:
  workflow_dispatch:
    inputs:
      run_id: { required: true, type: string }
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/e2e
```

---

## Development

```bash
npm run dev                      # both services
npm run dev:backend              # backend only (tsx watch)
npm run dev:frontend             # frontend only (vite)
npm run build                    # production frontend bundle
npm run build:demo               # demo-mode bundle (no backend)

cd backend && npx tsc --noEmit   # typecheck
cd frontend && npm run build     # build smoke test
```

### Project layout

```
qalibur/
├── backend/                 Node + Express + TypeScript
│   └── src/
│       ├── agents/          One file per agent
│       ├── routes/          REST + SSE endpoints
│       ├── middleware/      Auth (x-github-user header)
│       ├── pipeline.ts      Orchestration + gating loop
│       ├── llm.ts           Anthropic SDK wrapper
│       └── store.ts         In-memory run store + SSE broadcast
├── frontend/                React + Vite
│   ├── src/pages/           Landing, Demo, Live, Runs, RunDetail, RunReport
│   ├── src/components/      Layout, AgentLog, ArtifactViewer, GateReview
│   └── fixtures/            Demo-mode JSON (replayed in browser)
└── .github/workflows/       CI + GitHub Pages deploy
```

### Security

- `.env` is gitignored; commit `.env.example` (no values) only.
- The repo ships a pre-commit hook in `.githooks/pre-commit` that greps staged files for the obvious leak patterns (Anthropic, GitHub, AWS keys). Enable it with `git config core.hooksPath .githooks`.
- `ALLOWED_USERS` is checked on every run-creation request — there is no token-less mode.

---

## Roadmap

- [ ] Postgres + BullMQ instead of in-memory state (multi-tenant ready)
- [ ] Live mode on Fly.io behind an access-code gate (Haiku-only, cost-capped)
- [ ] Golden-output regression tests for each agent prompt
- [ ] Cost dashboard (per-run token usage from Anthropic response metadata)
- [ ] Optional human-approval gate before Deployer pushes

## License

[MIT](LICENSE) — built by [Pragati Gupta](https://pragati-gupta.com).
