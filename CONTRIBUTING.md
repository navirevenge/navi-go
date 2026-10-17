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

```bash
cd backend && mvn verify
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```
