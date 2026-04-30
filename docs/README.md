# MEMO Documentation Index

**For humans, AI agents (Claude / Sonnet / etc.), and LLMs:** start here. This is the hub for every architectural and operational document in the repo.

## Authoritative architecture (read first, in order)

1. **[`src/developers/architecture/fresh-architecture-plan.md`](src/developers/architecture/fresh-architecture-plan.md)** — v3 architecture spec.
   20 sections, 32 ADRs, 15 principles. The *what*. Namespace (`memo::*`), ontology shape, four-tab UI (🏗 Architecture · 🎨 Diagramming · 📄 DHF · 🛠 Tools), Miro-like diagramming engine (E1–E12), ConsistencyRule taxonomy (C1–C9), three-wave release, feature flags, drop-file extensibility.

2. **[`src/developers/architecture/sysmlv2-rulebook.md`](src/developers/architecture/sysmlv2-rulebook.md)** — SysML v2 modelling rule book.
   60+ rules grouped P/N/D/S/I/B/R/C/M/V/A/CE/DC/Q/L + FB rules. Cited from OMG SysML-v2-Release · GfSE/SysML-v2-Models · FiBO2SysMLv2. The *how to model*.

3. **[`src/developers/architecture/execution-plan.md`](src/developers/architecture/execution-plan.md)** — three-wave shipping plan.
   133 Sonnet-sized sessions across 18 phases. Per-session: scope, files, acceptance, tests, GitLab refs. The *how to ship*.

4. **[`src/developers/architecture/architecture-blocks.drawio`](src/developers/architecture/architecture-blocks.drawio)** — 7-tab block diagram.
   Hierarchy · namespace map · core blocks (B1–B14) · UI four-tab · data flow · quality attributes · dependency graph.

## Other architecture docs (specialised, supplementary)

| Doc | Topic |
|---|---|
| [`src/developers/architecture/overview.md`](src/developers/architecture/overview.md) | Package architecture diagram (legacy; superseded by §4 of v3 plan) |
| [`src/developers/architecture/platform-strategy.md`](src/developers/architecture/platform-strategy.md) | Two-repo split (memo-base + memo-architect), git subtree |
| [`src/developers/architecture/data-flow.md`](src/developers/architecture/data-flow.md) | Data flow detail (legacy; see v3 plan §12) |
| [`src/developers/architecture/websocket-protocol.md`](src/developers/architecture/websocket-protocol.md) | CLI ↔ web app protocol |
| [`src/developers/architecture/ontology-rearchitecture.md`](src/developers/architecture/ontology-rearchitecture.md) | OWL + Arcadia + EARS direction (some content folded into v3 plan) |
| [`src/developers/architecture/ontology-refactor-inventory.md`](src/developers/architecture/ontology-refactor-inventory.md) | Per-element audit |
| [`src/developers/architecture/two-ontology-refactor.md`](src/developers/architecture/two-ontology-refactor.md) | Collapsed 9 packages → arch + process (ADR-1-10) |
| [`src/developers/architecture/diagram-subsystem-audit.md`](src/developers/architecture/diagram-subsystem-audit.md) | Diagram subsystem audit driving v3 redesign |
| [`src/developers/architecture/monorepo.md`](src/developers/architecture/monorepo.md) | Turborepo + pnpm setup |

## ADRs

[`src/developers/adr/`](src/developers/adr/) — full ADR catalogue. v3 plan §14 lists ADR-1-1 through ADR-1-32 with cross-references.

## Roadmap (live)

```bash
pnpm run roadmap                  # phase summary from GitLab
memo roadmap-sync --dry-run       # show drift between spec and GitLab
memo roadmap-sync --apply         # reconcile (writes to GitLab)
```

GitLab is source of truth for state. `execution-plan.md` is source of truth for scope.

## For AI agents

If you are an LLM or AI agent working on this repo:
- **Always read v3 plan + rule book + execution plan before non-trivial work.** They override defaults.
- **Three-wave release order is binding.** Don't ship CLI before ontology; don't ship web before CLI base.
- **Quality priorities (in order):** usability → modularity → extensibility. See v3 §6.
- **Top user instructions** in `CLAUDE.md` at repo root + `~/.claude/CLAUDE.md`.
- **Do not delete or rewrite** these architecture docs without explicit user request — they are spec.
