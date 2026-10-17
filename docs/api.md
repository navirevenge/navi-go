# API (v1)

Interactive docs: `/swagger-ui.html`, machine-readable spec: `/v3/api-docs`. Errors use
`{timestamp, status, error, message, fieldErrors}`. Authenticated routes need the header `Authorization: Bearer <accessToken>`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | `{email, password(8-72), displayName, currentLevel?}` → `201 {accessToken, expiresInSeconds, user}`; `409` if email exists |
| POST | `/api/v1/auth/login` | `{email, password}` → `200` same shape; `401` on bad credentials |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/dashboard?timezone=Area/City` | Level estimate, objectives, retention, grammar mastery, skills, speaking history, streak, weekly stats, recommended lesson |
| GET | `/api/v1/lessons` | Lesson catalogue |
| POST | `/api/v1/study-sessions` | `{lessonId?}` start (or resume the open session for that lesson) |
| POST | `/api/v1/study-sessions/{id}/complete` | `{durationMinutes 0-600}`; `409` if already completed, `404` if not yours |
| GET | `/actuator/health` | Health (public) |
