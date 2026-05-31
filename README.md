# Qalibur

Agentic QE platform that runs 10 AI agents to automate the full quality engineering lifecycle — from test strategy through execution, reporting, and defect triage. Two modes: a live local run (real Anthropic API + GitHub integration) and a static demo on GitHub Pages.

## Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)
- A GitHub personal access token (repo + actions scope)

## Setup

```bash
cp .env.example .env        # Fill in your keys
npm run install:all          # Install root + backend + frontend deps
npm run dev                  # Starts backend (4000) + frontend (3000)
```

Open [localhost:3000](http://localhost:3000).

## Demo

[GitHub Pages](https://pragatig25.github.io/qalibur/) — static snapshot, no backend needed.

## Agents

| Agent | What it does |
|---|---|
| **Scout** | Reads repo structure, maps coverage gaps, dispatches pipeline |
| **Strategist** | Produces risk-based test strategy with equivalence partition tables |
| **Scribe** | Writes BDD Gherkin feature files from strategy |
| **Crafter** | Generates TypeScript Playwright scripts from feature files |
| **Gatekeeper** | Scores artifacts ≥ 9.5/10, self-corrects up to 3× |
| **Architect** | Reviews Playwright scripts for structure and patterns |
| **Runner** | Triggers GitHub Actions workflow via GitHub API |
| **Herald** | Generates HTML execution + coverage report |
| **Triage** | Classifies failures, generates defect records |
| **Deployer** | Commits artifacts to branch, opens PR, posts check |

## Architecture

```
frontend/   → React + Vite (demo mode reads from fixtures/)
backend/    → Node + Express + TypeScript (agents call Anthropic API)
```

## License

MIT
