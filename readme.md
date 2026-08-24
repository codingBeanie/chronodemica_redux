# Chronodemica

Chronodemica is a worldbuilding tool for simulating population dynamics, voting behaviour, and
election outcomes over time. Define population groups and political parties, give them opinions
on policy topics, and let the simulation turn that into votes, seat allocations, and a parliament
you can watch evolve from one election to the next.

It is a hobby project, built for worldbuilders, writers, and anyone who enjoys tinkering with
"what if" political scenarios — as well as for fun with simulation and data visualisation in
general.

## Screenshots

**Worlds** — every account can hold multiple independent worlds; switch between them from the
header or manage them here.

![Worlds overview](docs/screenshots/worlds.png)

**Election simulation** — national vote share by party, checked against the electoral threshold.

![Simulation results](docs/screenshots/simulation.png)

**Parliament** — seat allocation rendered as an interactive hemicycle.

![Parliament hemicycle](docs/screenshots/parliament.png)

## How it works

A **world** holds your parties, population groups (pops), and policy topics. Each topic has one
or more **statements** — concrete positions a party can take on it (for example, a topic
"Taxation" might have statements like "Lower income tax" or "Raise corporate tax").

A **period** represents a legislative term — the stretch of time between one election and the
next, with its own voting system and parliament size. The election that opens it is a snapshot in
time: it fixes the topic importances, party popularity, pop sizes, turnout, and eligibility as
they stand on voting day. Within a period, each party endorses one statement per topic, and each
pop distributes its approval across a topic's statements by percentage.

Running the simulation for a period combines all of this — topic importance, statement approval,
and party popularity — into a score per party for each population group, turns those scores into
votes, applies the voting system's threshold, and apportions parliament seats (currently via the
Sainte-Laguë method). The result is that period's election outcome, which can be compared against
the previous period, explored seat by seat in the parliament hemicycle, or drilled down per
population group to see exactly which statements drove the outcome.

## Features

- Multiple independent worlds per account, each with its own parties, pops, topics, and history
- Political parties with configurable colors, founding/dissolution years, and left-right seat
  orientation
- Population groups with configurable size, turnout, and eligibility, tracked across periods
- Policy topics and statements, with per-period importance and approval
- Election simulation with proportional representation, an electoral threshold, and Sainte-Laguë
  seat apportionment
- Parliament view with an interactive hemicycle diagram and manual government/opposition marking
- Minimal winning coalition finder
- Voting behaviour drill-down, showing exactly how a population group's approval broke down by
  topic, statement, and party
- World export and import as a single portable SQLite file, for backups or sharing a world
- One-click demo data seeding to explore the app without building a world from scratch
- Light and dark themes
- Single-user authentication (username and password); everything else is scoped per world

## Tech stack

- **Backend**: FastAPI, SQLModel, SQLite, managed with [uv](https://docs.astral.sh/uv/)
- **Frontend**: React, TypeScript, Vite, Mantine

## Running locally

### Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 20+ and npm

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`. On first launch you will be asked to choose a username
and password for this installation; from there you can create your first world.

## Running with Docker

The repository includes a `docker-compose.yml` along with a `Dockerfile` for the backend and the
frontend (built as a static bundle and served with nginx). Build and run both services with:

```bash
docker compose up --build
```

The frontend will be available at `http://localhost:5173` and the backend at
`http://localhost:8000`. Application data is stored in a Docker volume, so it persists across
restarts.

Pre-built images are not published yet — this currently builds from source. Publishing ready-to-pull
images to a container registry so Chronodemica can be self-hosted without a local build is planned
for a future release.

## Roadmap

- Publish pre-built Docker images to a container registry
- Broader authentication options (OIDC support, e.g. via Pocket ID) beyond the current single-user
  login

## AI disclaimer

This project was built with the help of Claude (Anthropic), as a hobby and learning exercise.
