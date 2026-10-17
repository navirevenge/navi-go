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
   | JDBC URL | `jdbc:h2:file:./.data/navigo;MODE=PostgreSQL` |
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

### Cause

`npm ci` installs exactly what `package-lock.json` records and refuses to run if the lock and `package.json` disagree. The lockfile had been edited to add the new package without a full resolve, so its entries for the `@emnapi` packages were incomplete.

### Resolution

1. Regenerate the lockfile: `cd frontend && npm install`.
2. Validate with a clean install: `rm -rf node_modules && npm ci`. It must pass.
3. Commit the regenerated `package-lock.json` together with `package.json`.

### Prevention

- After changing `package.json`, always check the install with `rm -rf node_modules && npm ci`. Do not treat `npm install` as the check, because it rewrites the lockfile and hides the problem.

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
- Pending: the first GitHub Actions run on the pull request.

