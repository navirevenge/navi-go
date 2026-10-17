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

## Run for development

```bash
# 1. backend (Java 21). Uses file-based H2 in backend/.data; no database container needed.
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
# 2. frontend (Node 22+)
cd frontend
npm ci && npm run dev
```

## Tests

```bash
cd backend && mvn verify                                   # unit + MockMvc integration tests (in-memory H2)
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

Integration tests run Flyway migrations against H2 in PostgreSQL mode; the migrations were also verified
against PostgreSQL 16.

## Documentation

[Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [API](docs/api.md) · [Data model](docs/data-model.md)
