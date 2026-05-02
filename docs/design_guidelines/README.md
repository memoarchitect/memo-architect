# MEMO Design Guidelines

Single source of truth for MEMO platform design, architecture, ADRs, and authoring rules. Live work tracking lives in [`../roadmap/`](../roadmap/) (auto-synced from GitLab).

---

## Start here

**[memo-platform-architecture.md](memo-platform-architecture.md)** — canonical platform architecture and grand plan. Read first. L0–L3 stack, four dimensions (architecture / compliance / artifact / viewpoint), default vs custom methodology, migration phases E1–E9. Every other doc here either feeds into it (normative authoring rules, decision records, reference architecture) or is an active branch handoff.

**[feedback-ontology-replace-handoff.md](feedback-ontology-replace-handoff.md)** — active branch (`feedback-ontology-replace`). Phase log + queued work.

---

## Document map

### Authoritative

| Doc | Role |
|---|---|
| [memo-platform-architecture.md](memo-platform-architecture.md) | Platform spec — single canonical ontology, methodology tailoring, dimensions, CLI surface, repo layout, migration phases |
| [feedback-ontology-replace-handoff.md](feedback-ontology-replace-handoff.md) | Active branch state |
| [architecture/sysmlv2-rulebook.md](architecture/sysmlv2-rulebook.md) | Normative SysML v2 authoring rules — every `.sysml` file must comply |
| [architecture/platform-strategy.md](architecture/platform-strategy.md) | Two-repo split (`memo-base` / `memo-architect`), package format. Ontology shape inside is updated by memo-platform-architecture |

### Reference architecture

| Doc | Role |
|---|---|
| [architecture/overview.md](architecture/overview.md) | System context + package architecture |
| [architecture/data-flow.md](architecture/data-flow.md) | `.sysml` → parser → model → web pipeline |
| [architecture/websocket-protocol.md](architecture/websocket-protocol.md) | CLI ↔ web app protocol |
| [architecture/monorepo.md](architecture/monorepo.md) | Turborepo + pnpm layout |
| [architecture/live-reload.md](architecture/live-reload.md) | Split watcher: project hot-reload vs ontology restart-required |

### Decision records

[adr/](adr/) — ADR-1-1 … ADR-1-11. Current direction is set by [ADR-1-11](adr/ADR-1-11-single-canonical-ontology.md), which supersedes ADR-1-6 and ADR-1-10. Older ADRs are retained for traceability with supersedence notes inline.

### Requirements baseline

[requirements/](requirements/) — implementation-derived feature/function catalogs, traceability, runtime surfaces. Auto-generated from code scans; orthogonal to platform architecture. Refresh as code evolves.

---

## Conventions

- **One canonical doc** — [memo-platform-architecture.md](memo-platform-architecture.md). New design proposals either update it directly or land as ADRs that get folded in. No parallel architecture docs.
- **Modularity discipline** — design changes must respect the L0/L1/L2/L3 split (helpers / ontology / methodology / project). If a proposal blurs those layers, that's the first thing to challenge.
- **Supersede, don't fork** — when an ADR is replaced, mark it `Superseded by [ADR-N]` and link forward. Keep the old file. Never edit historical decision content.
- **Live work tracking** — [`../roadmap/`](../roadmap/) is auto-synced from GitLab. Do not edit manually.
- **Branch handoffs** — kept at top level alongside memo-platform-architecture so current state is visible without spelunking.
- **Authoring rules** — every `.sysml` file complies with [sysmlv2-rulebook.md](architecture/sysmlv2-rulebook.md). Every config file follows [platform-strategy.md](architecture/platform-strategy.md) §package format.
