# Cross-Repo Integration

This repo (`Axiom-Saas-Server`) and `Axiom-Saas-Web` share an API contract and a release version.

## Version model

Both repos maintain a `feature/vX.Y.Z` branch in lockstep. The version number is shared — server v1.0.0 and web v1.0.0 always ship together.

```
server main
  └─ feature/v1.0.0   ← server commits land here

web main
  └─ feature/v1.0.0   ← web commits land here

After user acceptance testing: both PR to their respective main, both tagged v1.0.0.
```

## Contract source

Server's Swagger spec is the single source of truth. Generated at:

- `docs/swagger.json` (this repo, committed)
- `GET /api/docs-json` (live, while server runs)

The web repo regenerates its `src/types/api.d.ts` from this file on every contract change.

## Cross-repo coordination rule

When a server PR changes the contract:

1. PR title and description include `BREAKING CHANGE:` footer if applicable.
2. PR description links the corresponding web PR number (or PR URL).
3. Both PRs land under the same `feature/vX.Y.Z` branch on their respective repos.
4. CI does not gate one repo on the other — each runs independently. Coordination is by PR description.

## References

- Master spec: `docs/integration-standards.md`
- Conventions: `CLAUDE.md`
