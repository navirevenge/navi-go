# Standard CI/CD setup (PR template for every app)

**Apply this to every new application** (Spring Boot + Maven backend, Next.js + TypeScript frontend).
Every PR into `main` must pass the same automated checks before it can merge.

## Why

- **CI** runs the build and tests on a clean machine for every change.
- **Quality gate** is a check that fails the pipeline when a metric drops below a threshold (coverage, style).

Together they stop broken, untested, or unstyled code from reaching `main`.

## Scope of the PR

| Area | Change |
| --- | --- |
| Workflow | `.github/workflows/ci.yml`: backend and frontend jobs, plus a `CI Quality Gate` job |
| Backend | JaCoCo (coverage gate) and Checkstyle (style gate) in `pom.xml`; `config/checkstyle.xml` |
| Frontend | Vitest coverage (`@vitest/coverage-v8`) with thresholds; `lint`, `typecheck`, `test`, `build` scripts |
| Docs | Local commands and gate thresholds in `CONTRIBUTING.md` |

## Checklist

### 1. Workflow (`.github/workflows/ci.yml`)

- [ ] Triggers: `pull_request` to `main`, `push` to `main`, and `workflow_dispatch`.
- [ ] Least-privilege permissions: top level `contents: read`. CI never gets write access.
- [ ] Backend and frontend jobs run in parallel.
- [ ] Each job sets `timeout-minutes`.
- [ ] `concurrency` with `group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` and `cancel-in-progress: true`, so newer pushes cancel superseded runs for the same PR or branch.
- [ ] Dependency caching keyed to the lockfile or pom (`setup-java` `cache: maven`, `setup-node` `cache: npm`).
- [ ] Reproducible installs: `npm ci`, never `npm install`.
- [ ] Major versions of official actions are pinned. Check each action's runtime before pinning.
- [ ] No production secrets in pull-request workflows.
- [ ] No `continue-on-error` on required steps.
- [ ] A `CI Quality Gate` job with `needs: [backend, frontend]` and `if: always()`. It fails unless every required job result is `success`, so a skipped job cannot pass the gate.

### 2. Backend gates (Maven)

- [ ] JaCoCo `prepare-agent` runs in the default lifecycle.
- [ ] JaCoCo `check` runs at `verify` with a **BUNDLE LINE COVEREDRATIO minimum of 0.80**.
- [ ] Branch minimum is set just below the measured baseline (a ratchet). Measure first, then choose the number.
- [ ] Checkstyle `check` runs at `validate`, so style errors fail before tests run.
- [ ] `config/checkstyle.xml` checks correctness (unused imports, star imports, missing braces, empty catch blocks). It does not enforce formatting unless the codebase already follows it. Otherwise the first PR becomes a reformat.
- [ ] Use `${project.basedir}` for the Checkstyle config path. `${maven.multiModuleProjectDirectory}` only resolves when a `.mvn` directory exists.
- [ ] CI command: `mvn -B verify`. It compiles, runs unit tests, writes JaCoCo reports, enforces the gates, and packages the jar.
- [ ] Tests need no external database. Use in-memory H2 under `src/test/resources`.

### 3. Frontend gates (Next.js)

- [ ] `@vitest/coverage-v8` major version matches the installed `vitest`.
- [ ] `vitest.config.mts` sets `coverage.provider: 'v8'` and `coverage.thresholds.lines: 80`.
- [ ] Scripts: `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:coverage` (`vitest run --coverage`), `build`.
- [ ] CI runs: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`.
- [ ] Node version is pinned in the workflow to match local development.
- [ ] Coverage is measured over `src/**/*.{ts,tsx}` with `src/**/__tests__/**` excluded, so test helpers do not count.
- [ ] ESLint ignores generated output (`coverage/**`), or lint fails on the report files.

### 4. Branch protection (GitHub settings, once per repo)

- [ ] Require a pull request before merging into `main`.
- [ ] Require the status check `CI Quality Gate`. It aggregates the other jobs, so it is the only check you need to require.
- [ ] Require branches to be up to date before merging.
- [ ] Block force pushes and deletion of `main`.

### 5. Local parity

Run the same commands CI runs:

```bash
cd backend && mvn -B verify
cd frontend && npm ci && npm run lint && npm run typecheck && npm run test:coverage && npm run build
```

## Verification before merging

- [ ] The workflow runs on the PR and every job is green.
- [ ] A deliberately failing test makes the PR red and blocks the merge.
- [ ] Coverage below the threshold fails the JaCoCo or Vitest step.
- [ ] An unused import fails Checkstyle.
- [ ] A missing or skipped required job makes `CI Quality Gate` fail.

## Problems encountered and fixes (navi-go)

| # | Problem | Cause | Resolution |
| --- | --- | --- | --- |
| 1 | Checkstyle failed with 4 violations on the first run | Star import (`DashboardDtos.*`), several declarations on one line, and an `if` without braces | Replaced the star import with explicit imports, split the declarations, added braces. Choose the ruleset before enabling the gate, and fix the code in the same PR |
| 2 | Checkstyle config path not found | `${maven.multiModuleProjectDirectory}` only resolves when a `.mvn` folder exists | Changed to `${project.basedir}/config/checkstyle.xml` |
| 3 | JaCoCo branch numbers looked wrong on the first measurement | The branch CSV columns (`BRANCH_MISSED`, `BRANCH_COVERED`) differ from the instruction and line columns | Read the header row and select columns by name, not position |
| 4 | `npm ci` failed after adding `@vitest/coverage-v8`, both locally and in CI | Adding a dependency left `package-lock.json` out of sync (`@emnapi/core` missing, `@emnapi/wasi-threads` mismatch). `npm ci` refuses an out-of-sync lockfile. A lock made with an older npm 11 still failed on CI's newer npm 11 (`Missing: @emnapi/runtime@1.11.3 from lock file`) | Regenerate the lock with the same npm version CI uses (`npx npm@11.21.1 install --package-lock-only --ignore-scripts`), then validate with `npm ci`. Never validate with `npm install` alone. See the full entry in `docs/error-log.md` |
| 5 | JaCoCo `check` passes silently when no coverage data exists | The `check` goal skips when `jacoco.exec` is missing | Add an explicit CI step that fails if the JaCoCo report is missing |
| 6 | Frontend coverage was 12.8%, below the 80% gate | Only a few components had tests. Pages, layouts, and the auth flow were at 0% | Added tests for the API client, auth context, forms, app shell, pages, and UI components. Result: 99.4% lines |
| 7 | Test failed with "Found multiple elements with the role button and name Start" | Each lesson row renders its own Start button, so a bare `getByRole` matches several | Target the first match with `getAllByRole(...)[0]` in a helper, or pick the element by its row |
| 8 | ESLint reported errors inside `coverage/lcov-report/` | The generated HTML report is JavaScript that ESLint lints | Add `coverage/**` to the ESLint `globalIgnores` |

## Baseline for navi-go

- Backend line coverage: **89.3%** (259/290). Gate: 80%.
- Backend branch coverage: **59.7%** (40/67). Gate: 55% (a ratchet below the baseline).
- Frontend line coverage: **99.4%** after the tests were added. Gate: 80%. Before the tests it was 12.8%.

## Notes

- Keep gates strict and thresholds honest. Raise them as coverage grows. Never lower one to make a PR pass without a written reason in the PR description.
- Start every app with this same setup. Adjust per app only with a reason recorded in the PR.
