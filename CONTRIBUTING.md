# Contributing

## Branch model

`main` is always deployable. New work happens on `feature/vX.Y.Z` branches. PR to `main` only after user acceptance testing.

## Commit messages

Conventional Commits. `type(scope): description`. Subject ≤72 chars, imperative mood.

```
feat(users): add subscription fields
fix(bills/flows): correct pagination meta
refactor(envelope): remove controller-side wrapping
```

## Cross-repo coordination

This repo's contract is consumed by `Axiom-Saas-Web`. See `docs/integration.md`.

## Local checks

```bash
npm run lint
npm test
npm run build
```

## Reference

- Architecture: `CLAUDE.md`
- Cross-repo spec: `docs/integration-standards.md`
