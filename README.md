# NAVI語 (Navigo)

NAVI語 (Navi-go, ナビ語) is an AI-powered Japanese learning platform: structured grammar and vocabulary, spaced repetition, conversation
practice and adaptive study plans. English-speaking learners, beginner → conversational fluency.

> **Status: Phase 1 (Foundation).** Working today: registration/login (JWT), application shell with the six main
> sections, a dashboard backed by real data, study-session logging and "Continue studying". Grammar/vocabulary
> libraries, the AI tutor, spaced repetition and voice are planned (see [docs/roadmap.md](docs/roadmap.md)).
> Dashboard values with no underlying data (retention, grammar mastery, skills) show "—" / "Not assessed" rather
> than invented numbers; the JLPT level is labelled *self-reported* until assessments exist.

## Stack

Next.js 16 (React, TypeScript, Tailwind CSS) · Java 21 / Spring Boot 3.4 · PostgreSQL 16 · Flyway · Spring Security (JWT).

## Run everything with Docker

```bash
cp .env.example .env
# set POSTGRES_PASSWORD and NAVIGO_JWT_SECRET (openssl rand -base64 48) in .env
docker compose --env-file .env up --build
```

Open http://localhost:3000. API: http://localhost:8080, OpenAPI UI: http://localhost:8080/swagger-ui.html.

## Run locally with H2

The `local` Spring profile is active by default and stores its H2 database in `backend/data/`.
PostgreSQL remains configured in `application.yml` for deployments; select an explicit deployment
profile when staging and production profiles are added.

```bash
# Terminal 1: build and run the backend (Java 21 and Maven)
cd backend
mvn package
NAVIGO_JWT_SECRET="$(openssl rand -base64 48)" java -jar target/navigo-backend-0.1.0-SNAPSHOT.jar

# Terminal 2: run the frontend (Node 22+)
cd frontend
npm ci && npm run dev
```

Open http://localhost:3000. The frontend connects to the backend at http://localhost:8080.

## Tests

```bash
cd backend && mvn verify                                   # unit + MockMvc integration tests (in-memory H2)
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

Integration tests run Flyway migrations against H2 in PostgreSQL mode; the migrations were also verified
against PostgreSQL 16.

## Documentation

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [API](docs/api.md) · [Data model](docs/data-model.md)
