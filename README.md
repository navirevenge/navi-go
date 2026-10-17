# NAVI語 (Navigo)

**Learn Japanese with a plan that adapts to you.** NAVI語 (Navi-go, ナビ語) brings structured grammar, vocabulary, spaced
repetition and conversation practice into one study path, built for English speakers going from beginner to conversational.

> **Status: Phase 1 (Foundation).** Working today: registration/login (JWT), application shell with the six main
> sections, a dashboard backed by real data, study-session logging and "Continue studying". Grammar/vocabulary
> libraries, the AI tutor, spaced repetition and voice are planned (see [docs/roadmap.md](docs/roadmap.md)).
> Dashboard values with no underlying data (retention, grammar mastery, skills) show "—" / "Not assessed" rather
> than invented numbers; the JLPT level is labelled *self-reported* until assessments exist.
## What you can do today

- Create an account and sign in (JWT).
- Move through the six main sections of the app shell.
- See a dashboard built from your own study data: level, streak, objectives, weekly minutes.
- Log study sessions and resume the lesson you were on with "Continue studying".

## Coming next

Grammar and vocabulary libraries, an AI conversation tutor, spaced repetition, and voice practice. See the
[roadmap](docs/roadmap.md) for phases and scope.
## Stack

Next.js 16 (React, TypeScript, Tailwind CSS) · Java 21 / Spring Boot 3.4 · PostgreSQL 16 · Flyway · Spring Security (JWT).

## Run everything with Docker

```bash
cp .env.example .env
# set POSTGRES_PASSWORD and NAVIGO_JWT_SECRET (openssl rand -base64 48) in .env
docker compose --env-file .env up --build
```

Open http://localhost:3000. API: http://localhost:8080, OpenAPI UI: http://localhost:8080/swagger-ui.html.

## Run for development

Needs JDK 21, Maven and Node 22+. The backend uses file-based H2 in `backend/.data`, so no database container is needed.

```bash
make install   # frontend dependencies (once, or after lockfile changes)
make dev       # backend on :8080 and frontend on :3000; Ctrl+C stops both
```

Run one side at a time with `make backend` or `make frontend`.

## Tests

```bash
cd backend && mvn verify                                   # unit + MockMvc integration tests (in-memory H2)
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

Integration tests run Flyway migrations against H2 in PostgreSQL mode; the migrations were also verified
against PostgreSQL 16.

## Documentation

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [API](docs/api.md) · [Data model](docs/data-model.md) · [Running locally](docs/running-locally.md) · [Concepts](docs/concepts.md)
