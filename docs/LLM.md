# MEMO LLM Context

Use this as the small context pack for AI agents. Do not scan the whole repository first.

## Load In This Order

1. [README.md](README.md) for the documentation map.
2. [architecture/platform.md](architecture/platform.md) for the canonical architecture.
3. [architecture/reference/sysmlv2-rulebook.md](architecture/reference/sysmlv2-rulebook.md) before editing `.sysml`.
4. [decisions/index.md](decisions/index.md) for accepted and superseded ADRs.
5. [roadmap/north-star.md](roadmap/north-star.md) for product priorities.

## Use Only When Needed

- [architecture/reference/](architecture/reference/) for implementation architecture details.
- [decisions/adr/](decisions/adr/) for historical rationale.
- [generated/requirements/](generated/requirements/) for generated traceability baselines.
- [handoffs/](handoffs/) for branch-specific transition context.
- `docs/src/` for published user/developer docs.

## Do Not Treat As Planning Sources

- `docs/dist/` is built site output.
- `docs/generated/` is generated/reference material.
- `docs/roadmap/*.md` except `north-star.md` are GitLab-synced snapshots.

## Update Rules

- Architecture changes go to [architecture/platform.md](architecture/platform.md) or a new ADR.
- Roadmap state changes go through GitLab and the roadmap tooling.
- Avoid duplicate plan files. Prefer updating the canonical doc and linking from indexes.
