# Architecture

## Shape
A modular monolith with a clear frontend/backend split.

```
Browser (Next.js, PWA manifest) ──HTTPS/JSON──▶ Spring Boot API ──JDBC──▶ PostgreSQL (staging/prod) · H2 file DB (local)
                                                   │ (Phase 3+) provider interfaces
                                                   └──▶ LLM / STT / TTS (server-side keys only)
```

- **frontend/** – Next.js App Router, client-rendered app pages behind an auth guard. No AI provider is ever
  called from the browser. Dark-first design tokens live in `globals.css`.
- **backend/** – packages by feature: `auth`, `user`, `dashboard`, `study`, `common`. Future: `content`,
  `srs`, `ai`, `conversation`, `speech`. Modules talk through services, not each other's tables.
- **Database** – Flyway migrations in `backend/src/main/resources/db/migration`. Learning content
  (grammar, vocabulary, lessons, sentences) is separate from user progress (sessions, cards, events, mistakes).

## API response shapes
Controllers return records from each module's `*Dtos` class, never database rows or raw entities. The study-session
endpoints return `SessionView` ([StudyDtos.java](../backend/src/main/java/app/navigo/study/StudyDtos.java)) because:

- **One shape for start and complete.** `POST /study-sessions` and `POST /study-sessions/{id}/complete` both return
  `SessionView`, so the client parses one type. Open sessions are valid because `completedAt` and `durationMinutes`
  are nullable.
- **Built from a query, not an entity.** Study code uses `JdbcClient` and has no JPA entity for sessions. `StudyService.find`
  maps each row into the view, which keeps the response to the fields the client needs.
- **No `userId` in the response.** Each query filters on the caller's id (`WHERE user_id = :u`). A session that belongs
  to another learner returns `404`, so the API never confirms that the id exists.

## Environments
Spring profiles choose the database and secrets. With no profile active, startup fails instead of falling back to a database.

| Profile | Database | How it runs |
| --- | --- | --- |
| `local` | File-based H2 in `backend/.data` (PostgreSQL mode) | `mvn spring-boot:run -Dspring-boot.run.profiles=local` |
| `prod` | PostgreSQL from `NAVIGO_DB_URL`, `NAVIGO_DB_USER`, `NAVIGO_DB_PASSWORD` | Docker Compose; staging and prod deploys with their own env values |

Tests use in-memory H2 from `backend/src/test/resources/application.yml`.

## Security
Stateless JWT (HS256, secret from `NAVIGO_JWT_SECRET`; staging/prod startup fails if missing, `local` uses a dev-only default), BCrypt passwords,
constant-work login to avoid user enumeration, bean validation on all inputs, centralized error handler
(no stack traces to clients), CORS limited to configured origins. All endpoints except register/login/health/OpenAPI require a token.

## Japanese text
Furigana is rendered with `<ruby>` from structured segments `{text, reading?}` (`example_sentences.japanese_segments`);
readings are never derived by character substitution. Romaji is off by default. A tokenizer/reading library (e.g. Sudachi/Kuromoji)
will supply readings at content-ingest time in Phase 2.

## Technical risks
| Risk | Mitigation |
| --- | --- |
| LLM hallucinated grammar explanations | Structured JSON output + schema validation; label AI explanations as unverified; prefer curated grammar content |
| AI cost/abuse | Per-user rate limiting on AI endpoints before Phase 3 ships |
| Accurate readings | Dictionary-based tokenizer at ingest, human-reviewed content |
| Pronunciation claims | No scoring from transcription alone; only with a real assessment provider |
| Token storage in `localStorage` | Acceptable for MVP; move to httpOnly cookie + refresh tokens before public release |

## MVP acceptance criteria (Phase 1)
1. A user can register, sign in and sign out; unauthenticated API calls return 401.
2. The dashboard shows level, streak, objectives, weekly stats, skills and a recommended lesson from backend data.
3. Completing a study session updates streak, weekly minutes, objectives and the recommendation.
4. `docker compose up` starts DB, API and web; CI runs backend and frontend tests.
