# Contributing

## Workflow

1. Open or pick a GitHub issue. Every change maps to exactly one issue.
2. Branch from `main` as `navi-revenge-<issue-number>/<short-slug>`.
3. Keep each change small, modular, and testable on its own.
4. Open a PR into `main` that includes `Closes #<issue-number>`.

## Commit messages

Every commit subject must start with the issue tag:

```
navi-revenge-<issue-number>: <summary>
```

Example: `navi-revenge-12: add vocabulary list endpoint`

A local `commit-msg` hook rejects commits without the tag. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

`fixup!` and `squash!` commits are allowed when they carry the same tag prefix.

## Tests before pushing

CI runs these same commands. Run them before you push.

```bash
cd backend && mvn -B verify
cd frontend && npm ci && npm run lint && npm run typecheck && npm run test:coverage && npm run build
```

`mvn -B verify` compiles, runs the unit tests, enforces the JaCoCo coverage gate and the Checkstyle gate, and packages the jar. Do not skip the tests as a habit. `mvn -B -DskipTests package` is available for a fast package when you have already run the tests, but use it only as an option.

Gates and what CI checks: see [docs/ci-cd-standard.md](docs/ci-cd-standard.md).
