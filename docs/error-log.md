# Error log

Each entry records what happened, why, and how it was resolved.

## H2 console: `Database "/Users/<you>/test" not found` (error 90149)

**Area:** Local development, H2 web console (`http://localhost:8080/h2-console`)
**Profile:** `local`

### Symptom

After logging in to the H2 console with the Postgres-style settings, the page showed:

```
Database "/Users/xaymunyun/test" not found, either pre-create it or allow remote
database creation (not recommended in secure environments) [90149-232]
```

Error 90149 is H2's `DATABASE_NOT_FOUND_1` code. The message names a path under the home directory, not the app's database.

### Cause

The H2 console's login form pre-fills the JDBC URL with H2's default, `jdbc:h2:~/test`.

- `~` expands to the user's home directory, `/Users/xaymunyun`.
- So the console looked for `/Users/xaymunyun/test.mv.db`, which does not exist.
- That file is not the app's database. The app stores its data at `backend/.data/navigo.mv.db`, set by `spring.datasource.url` in [application-local.yml](../backend/src/main/resources/application-local.yml).
- The console refuses to create a database implicitly, so it reports 90149 instead of creating an empty one.

The console was reachable, so the security fix was working. The failure was only in the login form's URL.

### Resolution

1. Start the backend from `backend/` with the `local` profile, so the relative path resolves.
2. In the H2 console login form, replace the default URL. Keep the other fields as shown:

   | Field | Value |
   | --- | --- |
   | Driver class | `org.h2.Driver` |
   | JDBC URL | `jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE` |
   | User | `sa` |
   | Password | (empty) |

3. Click **Connect**.

The `;MODE=PostgreSQL` setting must match the datasource. H2 rejects a different mode on a database that is already open.

The step-by-step table is in [running-locally.md](./running-locally.md#5-open-the-h2-database).

### Verification status

- The failure was reported from the user's browser. Scripted `curl` checks during debugging did not reproduce the error text, so they are not evidence either way.
- Pending: the user has not yet confirmed a successful login with the app URL.
- Confirmed no stray database was created at `/Users/xaymunyun/test.mv.db` by the test requests.

### Prevention

- The docs now tell the user to replace the default URL, and the troubleshooting table has a row for error 90149.

---

## CI: `npm ci` fails with EUSAGE after adding a dependency

**Area:** Frontend dependencies, CI (`.github/workflows/ci.yml`, `frontend` job)

### Symptom

After adding `@vitest/coverage-v8` to `frontend/package.json`, `npm ci` stopped with:

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

The lockfile was missing `@emnapi/core`, and `@emnapi/wasi-threads` did not match.

Later, after the first fix was pushed, the CI run still failed with:

```
npm error Missing: @emnapi/runtime@1.11.3 from lock file
npm error Missing: @emnapi/core@1.11.3 from lock file
```

### Cause

`npm ci` installs exactly what `package-lock.json` records. It refuses to run if the lock and the dependency tree that npm builds from it disagree.

The `@emnapi` packages are dependencies of optional `wasm32` packages (`@img/sharp-wasm32`, `@unrs/resolver-binding-wasm32-wasi`, `@tailwindcss/oxide-wasm32-wasi`). Those packages were recorded without top-level `@emnapi/core` and `@emnapi/runtime` entries.

The first fix regenerated the lock with npm 11.6.1 (the version on the developer machine). That lock passed locally with npm 11.6.1 and 11.6.2. CI still failed. Newer npm 11 (11.21.1) on Linux x64 reproduced the exact CI error, so the newer npm validator is stricter about these optional entries than the older one.

### Resolution

1. Regenerate the lock with the newest npm 11 release: `cd frontend && npx npm@11.21.1 install --package-lock-only --ignore-scripts`. This adds top-level `@emnapi/core` and `@emnapi/runtime` entries.
2. Validate against both versions: `npx npm@11.21.1 ci --os=linux --cpu=x64` (what CI does) and `rm -rf node_modules && npm ci` with npm 11.6.1. Both must pass.
3. Commit the regenerated `package-lock.json` with `package.json`. Result: PR #12 CI passes on run 39069468467.

### Prevention

- Generate the lock with the same npm major and minor that CI uses. Check the npm version in the CI log, and use `npx npm@<version>` locally.
- Check each lock change against a newer npm 11 release, not only the one on your machine.
- Never treat `npm install` as the check, because it rewrites the lockfile and hides the problem. Validate with `npm ci`.

---

## CI: frontend test fails with "Found multiple elements with the role button and name Start"

**Area:** Frontend tests (`frontend/src/__tests__/pages.test.tsx`)

### Symptom

Three study-page tests failed with `TestingLibraryElementError: Found multiple elements with the role "button" and name "Start"`.

### Cause

The study page renders one Start button per lesson. The mock lesson list has several lessons, so `getByRole("button", { name: "Start" })` matches more than one element and throws. The assertion was written for a single lesson.

### Resolution

Use a helper that clicks the first lesson's Start button:

```ts
async function startFirstLesson() {
  fireEvent.click((await screen.findAllByRole("button", { name: "Start" }))[0]);
}
```

Result: 50 of 50 frontend tests pass, and line coverage is 99.35%.

### Prevention

- When a list renders the same button many times, query all matches or scope the query to one row. Do not use a single-match query.

---

## CI: ESLint reports errors in `frontend/coverage/`

**Area:** Frontend lint (`npm run lint`)

### Symptom

After running `npm run test:coverage`, `npm run lint` failed. It reported `Unused eslint-disable directive` in `coverage/lcov-report/block-navigation.js`.

### Cause

The Vitest coverage run writes an HTML report, and that report contains generated JavaScript. ESLint's flat config only ignored `.next`, `out`, and `build`, so it linted the generated files.

### Resolution

Added `"coverage/**"` to `globalIgnores` in [eslint.config.mjs](../frontend/eslint.config.mjs). Lint then passed.

### Prevention

- Every generated output directory must be in the lint ignore list. `coverage/` is already in `.gitignore`, but `.gitignore` does not affect ESLint.

---

## CI: backend Checkstyle and JaCoCo setup

**Area:** Backend build (`backend/pom.xml`)

### Symptoms and causes

| Symptom | Cause | Resolution |
| --- | --- | --- |
| Checkstyle failed with 4 violations: a star import, two declarations on one line, and an `if` without braces | The code predated the style gate | Replaced the star import with explicit imports in [DashboardService.java](../backend/src/main/java/app/navigo/dashboard/DashboardService.java), split the declarations, and added braces in `ApiIntegrationTest` |
| Checkstyle could not find its config | `${maven.multiModuleProjectDirectory}` only resolves when a `.mvn` folder exists, and this project has none | Changed the path to `${project.basedir}/config/checkstyle.xml` |
| The JaCoCo branch numbers looked wrong at first | The branch columns (`BRANCH_MISSED`, `BRANCH_COVERED`) sit at different positions than the line columns | Read the CSV header and select columns by name |
| JaCoCo `check` could pass without measuring anything | The `check` goal skips silently when `jacoco.exec` is missing | The workflow asserts that `target/site/jacoco/jacoco.xml` exists before it finishes |

### Verification status

- Local `mvn -B verify` passes: 10 tests, 0 Checkstyle violations, and the JaCoCo gates (line 80%, branch 55%) met.
- GitHub Actions run 39069468467 on PR #12: backend, frontend, and CI Quality Gate all pass.

---

## Login hangs after valid credentials; `NoClassDefFoundError: ch/qos/logback/classic/spi/ThrowableProxy` in the log

**Area:** Local development, running backend (`backend/target/navigo-backend-0.1.0-SNAPSHOT.jar`)
**Issue:** [#13](https://github.com/navirevenge/navi-go/issues/13)

### Symptom

The login page spins after valid credentials. The backend log shows Tomcat errors that end in:

```
Exception in thread "http-nio-8080-exec-7" java.lang.NoClassDefFoundError: ch/qos/logback/classic/spi/ThrowableProxy
Caused by: java.lang.ClassNotFoundException: ch.qos.logback.classic.spi.ThrowableProxy
```

While the bug was live, even `curl http://localhost:8080/actuator/health` timed out with no bytes received. The JVM was alive, its acceptor and poller threads were healthy, and no request thread was blocked in application code.

### Cause

The backend was started from a fat jar that was rebuilt while it was still running.

- The app was started at 16:20:05 with `java -jar target/navigo-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=local`.
- `mvn package` rewrote `target/navigo-backend-0.1.0-SNAPSHOT.jar.original` at 16:58:25, while that process was still running.
- A JVM loads classes lazily from the jar it opened at startup. The logback classes are nested in the fat jar under `BOOT-INF/lib/`. The first time the app logs an exception, it needs `ThrowableProxy`. If the jar on disk changed since startup, that read fails.
- The failure is hidden. Tomcat's `NioEndpoint` tries to log the original socket error, the logging call throws `NoClassDefFoundError`, and the worker thread dies without writing a response. The client waits until it times out. In the browser, that looks like a login that never finishes.

The jar on disk was intact. The nested `logback-classic-1.5.18.jar` contains `spi/ThrowableProxy`. The problem is the running JVM, not the build output.

### Explanation

Rebuilding a jar does not update a process that is already running. Maven replaces the file, but the JVM keeps reading the old file's offsets. Any class the JVM had not loaded yet is read from the wrong bytes or fails to load. Here, `ThrowableProxy` was first needed when Tomcat logged the first request error, so the first logged error was also the first attempt to load that class.

The login logic itself is fine. On a fresh build with a fresh start, `POST /api/v1/auth/register` returned `201` and `POST /api/v1/auth/login` returned `200` in about 0.1 s.

### Verification

Each step was run on a scratch copy, not on the user's running instance:

1. Fresh build, fresh start on port 8091, in-memory H2: register `201`, login `200` in 0.10 s. The login code works.
2. Thread dump of the stuck instance (`jstack`): request threads idle, acceptor and poller running, no `BLOCKED` threads, no deadlock, no application frames. The server was accepting connections but never answering.
3. Open file handles of the stuck JVM: it held `target/navigo-backend-0.1.0-SNAPSHOT.jar.original`, rewritten at 16:58:25.
4. Reproduction: start a copy of the fat jar on port 8092. Overwrite the copy in place with the rebuilt `.original` jar. Then `GET /api/v1/auth/me` and `POST /api/v1/auth/login` both hung for 10 s with no response, and the log showed `NoClassDefFoundError: ch/qos/logback/classic/spi/ThrowableProxy` on `http-nio-8092-exec-2` and `-exec-3`. This matches the user's log.

Not confirmed: the first error that Tomcat was logging. The pasted log starts after it. The first failing request is not known, so the exact application exception behind the first log line remains unidentified. This does not change the fix, because the hang happens whatever the original error was.

### Resolution

1. Stop the running backend (`Ctrl+C` in its terminal, or `kill <pid>` after finding it with `lsof -i :8080`).
2. Rebuild: `cd backend && mvn -B package`.
3. Start the rebuilt jar again: `java -jar target/navigo-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=local`.
4. Confirm: `curl -s http://localhost:8080/actuator/health` returns `UP`, and a login with a valid account returns `200`.

No application code changed. The fix is in the run procedure, and [running-locally.md](./running-locally.md) now says to stop or restart the backend after every rebuild.

### Prevention

- Never run `mvn package`, `mvn clean`, or `mvn install` in `backend/` while the backend started from `target/` is still running. Stop the backend first, or restart it after the build.
- If the backend hangs, check for `NoClassDefFoundError` in its log before debugging application code. The error is usually a stale JVM, not the code.
- Any "server stopped responding" report should start with `curl -m 10 http://localhost:8080/actuator/health`. A `000` with no bytes means the request thread died or the server is stuck. Take a thread dump with `jstack <pid>` before restarting, so the state is preserved.

---

## Second backend launch fails: `The file is locked: backend/.data/navigo.mv.db`

**Area:** Local development, backend startup and H2 file database (`backend/src/main/resources/application-local.yml`)
**Issue:** [#15](https://github.com/navirevenge/navi-go/issues/15)

### Symptom

Starting the backend with the `local` profile while another backend was already running failed at startup:

```
Caused by: org.h2.jdbc.JdbcSQLNonTransientConnectionException: Database may be already in use: "/Users/xaymunyun/Documents/projects 2026/navi-go/backend/.data/navigo.mv.db". Possible solutions: close all other connection(s); use the server mode [90020-232]
Caused by: org.h2.mvstore.MVStoreException: The file is locked: /Users/xaymunyun/Documents/projects 2026/navi-go/backend/.data/navigo.mv.db [2.3.232/7]
```

The H2 Shell and H2 console also fail with the same error while the backend is running.

### Cause

The `local` profile uses `jdbc:h2:file:./.data/navigo;MODE=PostgreSQL`, an embedded H2 file database. H2 locks the `.mv.db` file for the process that opens it. A second process that opens the same file without a shared-access setting is refused.

- The backend that was running had been restarted at 17:24 and held the lock (PID 25486, the only process with the file open).
- The second launch tried to open the same file, so Flyway's startup connection failed.
- The H2 trace log (`backend/.data/navigo.trace.db`) recorded the same `file is locked` error nine times, which matches the failed launches.

### Explanation

Embedded H2 is single-process by default. That is safe, but it means the backend, the H2 console, and the H2 Shell cannot use the database at the same time. The earlier docs told users to stop the backend before opening the Shell. That is a workaround, not a fix, and it also blocks the console while the app is running.

H2's `AUTO_SERVER=TRUE` setting lets the first process that opens the file also start a local server on a random port. Later processes on the same machine connect through that server instead of locking the file. Without the setting, the second process fails as shown above.

### Verification

1. `mvn -B package` after the change: 10 tests, 0 failures, `BUILD SUCCESS`. The build ran with the backend stopped, following the rule in this log.
2. Rebuilt jar started on port 8080 with `--spring.profiles.active=local`: `/actuator/health` returned `UP`.
3. A second backend on port 8091 against the same database started without the lock error and returned `UP`. Port 8080 stayed up.
4. The H2 Shell, with the new URL, read `information_schema.tables` (15 tables) while both backends were running.
5. The temporary 8091 process was then stopped. Port 8080 stayed up.

### Resolution

1. Add `;AUTO_SERVER=TRUE` to the local JDBC URL in [application-local.yml](../backend/src/main/resources/application-local.yml):

   ```yaml
   url: jdbc:h2:file:./.data/navigo;MODE=PostgreSQL;AUTO_SERVER=TRUE
   ```

2. Use the same URL in the H2 console and the H2 Shell. Both are documented in [running-locally.md](./running-locally.md#5-open-the-h2-database).
3. Rebuild and restart the backend. A backend still running the old jar keeps the lock without `AUTO_SERVER`, so it must be restarted.

### Trade-offs

- `AUTO_SERVER` opens a TCP port on the local machine that other local processes can use. It is acceptable for a laptop dev database, which is why it is set only in the `local` profile. Production uses PostgreSQL and does not read this URL.
- The database still holds one file. Two backends writing at once share it through H2's server, but this setup is for local use only.

### Prevention

- Every H2 URL in the docs must use the same settings as the datasource. Before, the docs had two different URLs.
- Use `;AUTO_SERVER=TRUE` for any embedded H2 file database that a developer might open from a second tool.
- Check the trace log (`backend/.data/navigo.trace.db`) when startup fails with a database error. It keeps the full stack trace even when the console output is cut off.


