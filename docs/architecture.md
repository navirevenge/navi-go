# Architecture

## Shape
A modular monolith with a clear frontend/backend split.

```
Browser (Next.js, PWA manifest) ──HTTPS/JSON──▶ Spring Boot API ──JDBC──▶ PostgreSQL
                                                   │ (Phase 3+) provider interfaces
                                                   └──▶ LLM / STT / TTS (server-side keys only)
```

- **frontend/** – Next.js App Router, client-rendered app pages behind an auth guard. No AI provider is ever
  called from the browser. Dark-first design tokens live in `globals.css`.
- **backend/** – packages by feature: `auth`, `user`, `dashboard`, `study`, `common`. Future: `content`,
  `srs`, `ai`, `conversation`, `speech`. Modules talk through services, not each other's tables.
- **Database** – Flyway migrations in `backend/src/main/resources/db/migration`. Learning content
  (grammar, vocabulary, lessons, sentences) is separate from user progress (sessions, cards, events, mistakes).

## Security
Stateless JWT (HS256, secret from `NAVIGO_JWT_SECRET`, startup fails if missing/short), BCrypt passwords,
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
