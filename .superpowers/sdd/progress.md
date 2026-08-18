# Skill Plaza v2 — SDD Progress (Saas-Server, 2026-08-18, clean restart)

**Plan:** `docs/superpowers/plans/2026-08-18-skill-plaza-saas-server.md`
**Spec:** `docs/superpowers/specs/2026-08-17-skill-plaza-design.md` (revised: no versioning)
**Branch:** `feat/skill-plaza` (fresh off `main`)
**Execution guide:** `docs/superpowers/execution/skill-plaza-execution-guide.md`

## Tasks (unversioned schema)

- Task 1: complete (c2b89d5..39e0ccd, husky clean, no --no-verify needed)
- Task 2: complete (39e0ccd..69a8968, SkillConfig namespace registered)
- Task 3: complete (69a8968..68d1ed0, 5 unversioned tables migration; tools jsonb in skill; NULLS NOT DISTINCT; partial WHERE deleted_at IS NULL; plan_skill.plan_id uuid; raw SQL for idempotency)
- Task 4: complete (68d1ed0..de68548, SkillEntity 25 columns mirrored; 11/11 driver-free specs)
- Task 5: complete (de68548..d429b0e, 4 entities — no skill-version/skill-tool entities; skill_file FK to skill; session_skill_mount without skill_version)
- Task 6: complete (d429b0e..e6bce76, SkillRepository with In() pattern)
- Task 7: complete (e6bce76..a649dcd, 4 remaining repositories; no skill-version/tool-tool repos; all methods align with brief)
- Task 8: complete (a649dcd..e29e607, SkillStorageService with 4 methods + 6/6 specs)
- Task 9: complete (e29e607..9b79e95, FrontmatterValidator + 4/4 specs)
- Task 10: complete (9b79e95..4d4ab14, menu seed via migration — chose migration per CLAUDE.md)
- Task 11: complete (4d4ab14..36df733, ServiceTokenGuard + 3/3 specs)

**Current HEAD:** `36df733`
**Next task:** Task 12 (SkillResolverService — CRITICAL: 4 boundary cases per spec §3.5)

## Architectural decision (2026-08-18): **drop skill versioning**

One skill = one current version. Upload overwrites, edits overwrite.

- ❌ Drop `skill_version` table (merge fields into `skill`)
- ❌ Drop `skill_tool` table (replace with `skill.tools jsonb`)
- ✅ Modify `skill_file.skill_version_id` → `skill_file.skill_id`
- ❌ Drop `session_skill_mount.skill_version` column
- Resolver returns `{id}[]` (was `{id, version}[]`)
- Upload endpoint: `PUT /skills/{id}/content` (idempotent)
- Cache keys: `(skill_id, content_hash)` everywhere