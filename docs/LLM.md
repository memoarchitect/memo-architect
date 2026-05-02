# MEMO LLM Context

Use this as the small context pack for AI agents. Do not scan the whole repository first.

## Load In This Order

1. [README.md](README.md) for the documentation map.
2. [architecture/platform.md](architecture/platform.md) for the canonical architecture.
3. [design/sysmlv2-rulebook.md](design/sysmlv2-rulebook.md) before editing `.sysml`.
4. [decisions/index.md](decisions/index.md) for accepted and superseded ADRs.
5. [roadmap/index.md](roadmap/index.md) for incremental implementation epics and stories.

## Use Only When Needed

- [architecture/reference/](architecture/reference/) for high-level architecture reference details.
- [design/](design/README.md) for runtime design, protocols, and authoring specifics.
- [decisions/adr/](decisions/adr/) for historical rationale.
- [generated/requirements/](generated/requirements/) for generated traceability baselines.
- `docs/src/` for published user/developer docs.

## Do Not Treat As Planning Sources

- `docs/dist/` is built site output.
- `docs/generated/` is generated/reference material.
- `docs/roadmap/*.md` are implementation plans, not architecture source.

## Update Rules

- Architecture changes go to [architecture/platform.md](architecture/platform.md) or a new ADR.
- Roadmap scope changes update [roadmap/index.md](roadmap/index.md) and the relevant epic file.
- Avoid duplicate plan files. Prefer updating the canonical doc and linking from indexes.
