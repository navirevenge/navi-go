# Running NAVI語 locally

How to package and run the backend and frontend, open the local H2 database, and create a user for functional testing.

## Quick start

With the prerequisites below installed, run from the repository root:

```bash
make install   # frontend dependencies, once or after lockfile changes
make dev       # backend on :8080 and frontend on :3000; Ctrl+C stops both
```

The steps below do the same work by hand and explain each part.

## Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| JDK | 21 | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Node.js | 22+ | `node -v` |
| Make (optional, for the `make` targets) | any | `make -v` |
| Docker (optional, for Compose only) | any recent | `docker compose version` |

If `java -version` reports "Unable to locate a Java Runtime", install a JDK 21 before continuing. On macOS with Homebrew, run `brew install openjdk@21` and set `JAVA_HOME` in `~/.zshrc`:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21   # Intel Macs: /usr/local/opt/openjdk@21
```

Maven and `make dev` read `JAVA_HOME`. Without it, Maven falls back to whichever JDK is on the path, which may be newer than 21.

## 1. Package the backend

```bash
cd backend
mvn -B package
```

This runs the unit and integration tests before packaging. The executable jar is written to `backend/target/navigo-backend-0.1.0-SNAPSHOT.jar`.

To package faster when you have already run the tests, add `-DskipTests`. Use it only as an option, not as the default.

## 2. Run the backend (local profile, H2)

The `local` profile uses a file-based H2 database at `backend/.data/navigo.mv.db` in PostgreSQL mode. Flyway creates the schema and seed content on first start. No database container is needed.

Run the packaged jar. Start it from `backend/` so the relative `./.data` path resolves correctly:

```bash
cd backend
java -jar target/navigo-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=local
```

Or run through Maven without packaging:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

`make backend` runs this same Maven command from the repository root.

Check that it is up:

```bash
curl -s http://localhost:8080/actuator/health
```

Rebuilding does not update a backend that is already running. Stop the backend before running `mvn package`, `mvn clean`, or `mvn install` in `backend/`, and start it again after the build. If you skip this, requests can hang and the log shows `NoClassDefFoundError`. See [error-log.md](./error-log.md).

Endpoints: API at `http://localhost:8080`, OpenAPI UI at `http://localhost:8080/swagger-ui.html`.

## 3. Build and run the frontend

Development server (hot reload):

```bash
cd frontend
npm ci
npm run dev
```

`make install` runs the `npm ci` step and `make frontend` runs the development server.

Production build, served on port 3000:

```bash
cd frontend
npm ci
npm run build
npm run start
```

Open `http://localhost:3000`.

The API URL is baked into the frontend at build time. It defaults to `http://localhost:8080`. To point at another backend, rebuild with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build
```

The backend allows browser calls from `http://localhost:3000` by default (`NAVIGO_CORS_ORIGINS`). Use a different origin only if the frontend runs elsewhere.

## 4. Run everything with Docker Compose (PostgreSQL)

This runs PostgreSQL 16, the backend (`prod` profile), and the frontend.

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and NAVIGO_JWT_SECRET (openssl rand -base64 48)
docker compose --env-file .env up --build
```

Ports: web `3000`, API `8080`, PostgreSQL `5432`.

## 5. Open the H2 database

The `local` profile enables the H2 web console. Start the backend first (step 2), open <http://localhost:8080/h2-console> in a browser, and sign in with the settings below. The console runs inside the backend process, so it works while the backend is running.

| Setting | Value |
| --- | --- |
| Driver class | `org.h2.Driver` |
| JDBC URL | `jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE` (relative to `backend/`) |
| User | `sa` |
| Password | empty |

The console pre-fills `jdbc:h2:~/test`. Replace it with the JDBC URL above. Otherwise you get `Database "/Users/<you>/test" not found` (error 90149). See [error-log.md](./error-log.md).

**Why it is local-only.** The console gives unrestricted SQL access to the database, with no per-user permissions. The `local` profile enables it in [application-local.yml](../backend/src/main/resources/application-local.yml). The `prod` profile does not, so it stays off in Docker Compose (step 4). [SecurityConfig.java](../backend/src/main/java/app/navigo/config/SecurityConfig.java) opens `/h2-console/**` and relaxes the frame policy only when the console is enabled.

### Command-line alternative: H2 Shell

Use the H2 Shell from the H2 jar that Maven already downloaded (version 2.3.232):

```bash
cd backend
H2_JAR="$HOME/.m2/repository/com/h2database/h2/2.3.232/h2-2.3.232.jar"
java -cp "$H2_JAR" org.h2.tools.Shell \
  -url "jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE" \
  -user sa -password ""
```

The Shell uses the same URL as the web console, including `AUTO_SERVER=TRUE`, so it can open the database while the backend is running. `AUTO_SERVER` lets H2 share the file between processes on localhost. Without it, the second process fails with "Database may be already in use" or "The file is locked". See [error-log.md](./error-log.md).

Useful queries:

```sql
SELECT id, email, display_name, created_at FROM users;
SELECT user_id, self_reported_level FROM learner_profiles;
SELECT id, slug, title FROM lessons ORDER BY position;
```

Run one query without the interactive prompt:

```bash
java -cp "$H2_JAR" org.h2.tools.Shell \
  -url "jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE" \
  -user sa -password "" \
  -sql "SELECT email, display_name FROM users"
```

## 6. Create a user for functional testing

Create users through the register endpoint. Do not insert rows into `users` by hand, because the password must be BCrypt-hashed and a `learner_profiles` row must exist.

Requirements from the API:

- `email`: required, valid format, up to 254 characters. Stored in lowercase.
- `password`: 8 to 72 characters.
- `displayName`: required, up to 100 characters.
- `currentLevel`: optional, `N1` to `N5`. Defaults to `N5` in the database when omitted.

With the backend running:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa.tester@example.com","password":"QaTest-1234","displayName":"QA Tester","currentLevel":"N5"}'
```

Expected: `201` with `accessToken`, `expiresInSeconds`, and `user`. A second call with the same email returns `409`.

Sign in to confirm the account works:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa.tester@example.com","password":"QaTest-1234"}'
```

Call an authenticated endpoint, replacing `<accessToken>` with the token from the response:

```bash
curl -s http://localhost:8080/api/v1/auth/me \
  -H 'Authorization: Bearer <accessToken>'
```

The test account can also be created from the register form at `http://localhost:3000`.

Test credentials are for local use only. Do not reuse them in staging or production.

## 7. Smoke test the Phase 1 flow

With a token from step 6 (`<accessToken>`):

```bash
# Start a study session on the seeded lesson "Greetings and introductions"
curl -s -X POST http://localhost:8080/api/v1/study-sessions \
  -H 'Authorization: Bearer <accessToken>' -H 'Content-Type: application/json' \
  -d '{"lessonId":"00000000-0000-0000-0000-0000000000b1"}'

# Complete it, replacing <sessionId> with the id from the previous response
curl -s -X POST http://localhost:8080/api/v1/study-sessions/<sessionId>/complete \
  -H 'Authorization: Bearer <accessToken>' -H 'Content-Type: application/json' \
  -d '{"durationMinutes":10}'

# Dashboard reflects the completed session
curl -s "http://localhost:8080/api/v1/dashboard?timezone=Asia/Tokyo" \
  -H 'Authorization: Bearer <accessToken>'
```

Also check in the UI at `http://localhost:3000` that the dashboard shows the study time.

## 8. Clean up test data

Delete one test user. The backend can keep running. In the same shell where `H2_JAR` was set in step 5, run:

```bash
cd backend
java -cp "$H2_JAR" org.h2.tools.Shell \
  -url "jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE" \
  -user sa -password "" \
  -sql "DELETE FROM users WHERE email = 'qa.tester@example.com'"
```

Related rows (learner profile, study sessions) are removed by `ON DELETE CASCADE`.

Reset the whole local database. This deletes all local data, including every user. Stop the backend first:

```bash
rm backend/.data/navigo.mv.db
```

Flyway recreates the schema and seed content on the next backend start.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Unable to locate a Java Runtime" | JDK 21 is not installed. Install it and confirm `java -version`. |
| Backend fails with a missing `NAVIGO_DB_URL` or `NAVIGO_JWT_SECRET` | The profile is not active. Use `--spring.profiles.active=local` or `-Dspring-boot.run.profiles=local`. |
| "Database may be already in use" or "The file is locked" at backend startup | Another process opened the database without `AUTO_SERVER=TRUE`, for example a backend from before this fix. Stop that process, rebuild, and start again. See [error-log.md](./error-log.md). |
| `/h2-console` returns `401` or `404` | The console is enabled only by the `local` profile. Rebuild and restart the backend with `--spring.profiles.active=local`. A backend started before these changes still has the old configuration. |
| Console says `Database "/Users/<you>/test" not found` (error 90149) | The login form still has the default `jdbc:h2:~/test` URL. Use the JDBC URL from section 5. See [error-log.md](./error-log.md). |
| Login spins or requests hang after a rebuild; the log shows `NoClassDefFoundError: ch/qos/logback/...` | The backend is still running a jar that was rebuilt underneath it. Stop it, rebuild if needed, and start it again. See [error-log.md](./error-log.md). |
| Port 8080 or 3000 already in use | Another process is running. Stop it or find it with `lsof -i :8080`. |
| Register returns `400` | Password must be 8 to 72 characters, `currentLevel` must be `N1` to `N5`, and `email` must be valid. |
| Register returns `409` | The email already exists. Sign in with it instead, or use a different email. |
| Login returns `401` | Wrong email or password. Emails are case-insensitive; passwords are not. |
| Browser shows CORS errors | The frontend origin is not in `NAVIGO_CORS_ORIGINS`. The default is `http://localhost:3000`. |
| Frontend calls the wrong API | `NEXT_PUBLIC_API_URL` is set at build time. Rebuild the frontend after changing it. |
