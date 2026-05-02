# MEMO Documentation Index

**For humans, AI agents, and LLMs:** start here. Hub for every architectural and operational document in the repo.

## Authoritative architecture (read first)

1. **[`design_guidelines/memo-platform-architecture.md`](design_guidelines/memo-platform-architecture.md)** — canonical platform architecture and grand plan.
   L0–L3 stack, four dimensions (architecture / compliance / artifact / viewpoint), default vs custom methodology, CLI surface, repo layout, migration phases E1–E9. The *what* and the *how to evolve*.

2. **[`design_guidelines/architecture/sysmlv2-rulebook.md`](design_guidelines/architecture/sysmlv2-rulebook.md)** — SysML v2 modelling rule book.
   Normative authoring rules every `.sysml` file must comply with. The *how to model*.

3. **[`design_guidelines/architecture/platform-strategy.md`](design_guidelines/architecture/platform-strategy.md)** — two-repo split (`memo-base` + `memo-architect`), package format, git subtree.

4. **[`design_guidelines/feedback-ontology-replace-handoff.md`](design_guidelines/feedback-ontology-replace-handoff.md)** — active branch state.

## Reference architecture

| Doc | Topic |
|---|---|
| [`design_guidelines/architecture/overview.md`](design_guidelines/architecture/overview.md) | System context + package architecture |
| [`design_guidelines/architecture/data-flow.md`](design_guidelines/architecture/data-flow.md) | `.sysml` → parser → model → web pipeline |
| [`design_guidelines/architecture/websocket-protocol.md`](design_guidelines/architecture/websocket-protocol.md) | CLI ↔ web app protocol |
| [`design_guidelines/architecture/monorepo.md`](design_guidelines/architecture/monorepo.md) | Turborepo + pnpm layout |
| [`design_guidelines/architecture/live-reload.md`](design_guidelines/architecture/live-reload.md) | Project hot-reload vs ontology restart-required |

## ADRs

[`design_guidelines/adr/`](design_guidelines/adr/) — full catalog. Current direction: [ADR-1-11](design_guidelines/adr/ADR-1-11-single-canonical-ontology.md), which supersedes ADR-1-6 and ADR-1-10.

## Requirements baseline

[`design_guidelines/requirements/`](design_guidelines/requirements/) — implementation-derived feature/function catalogs. Auto-derived from code; orthogonal to platform spec.

## Roadmap (live, GitLab-backed)

```bash
pnpm run roadmap                  # phase summary from GitLab
pnpm run roadmap:open             # open issues by phase
pnpm run roadmap:bugs             # open bugs
```

GitLab is source of truth for state and scope. `roadmap/*.md` files are auto-synced — do not edit manually.

[`roadmap/north-star.md`](roadmap/north-star.md) — product strategy.

## For AI agents

- Always read **memo-platform-architecture** + **sysmlv2-rulebook** before non-trivial work. They override defaults.
- **Quality priorities (in order):** usability → modularity → separation of concerns → extensibility.
- **Adoption-first sequencing** — see [`roadmap/north-star.md`](roadmap/north-star.md).
- **Trunk-based development** — work on `main`, no feature branches (per `CLAUDE.md`).
- **Do not rewrite** authoritative architecture docs without explicit user request — they are spec. Add ADRs for decisions; supersede rather than overwrite.
