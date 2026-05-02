# MEMO Design Guidelines

Single source of truth for MEMO platform design, architecture, ADRs, and authoring rules. Live work tracking lives in [`../roadmap/`](../roadmap/) (auto-synced from GitLab).

---

## Start here

**[memo-platform-architecture.md](memo-platform-architecture.md)** — canonical platform architecture + grand plan. Read this first. All other docs in this directory either feed into it (normative authoring rules, decision records) or are historical context that it supersedes.

**[feedback-ontology-replace-handoff.md](feedback-ontology-replace-handoff.md)** — active branch handoff (`feedback-ontology-replace`). Picks up where the last session ended; checked off as phases land.

---

## Document index

### Authoritative

| Doc | Status | Role |
|---|---|---|
| [memo-platform-architecture.md](memo-platform-architecture.md) | Proposal (key doc) | L0–L3 stack, 4 dimensions, default vs custom methodology, migration phases E1–E9 |
| [feedback-ontology-replace-handoff.md](feedback-ontology-replace-handoff.md) | Active | Branch state + queued phases |
| [architecture/sysmlv2-rulebook.md](architecture/sysmlv2-rulebook.md) | Normative | SysML v2 authoring rules for every `.sysml` file |
| [architecture/platform-strategy.md](architecture/platform-strategy.md) | Accepted | Two-repo split, package format (still valid; updated by memo-platform-architecture for ontology shape) |
| [architecture/overview.md](architecture/overview.md) | Reference | Package architecture diagram |
| [architecture/data-flow.md](architecture/data-flow.md) | Reference | Data flow through the system |
| [architecture/websocket-protocol.md](architecture/websocket-protocol.md) | Reference | CLI ↔ web app protocol |
| [architecture/monorepo.md](architecture/monorepo.md) | Reference | Turborepo + pnpm layout |

### Decision records (ADRs)

[adr/](adr/) — ADR-1-1 through ADR-1-10. ADR-1-10 (two-ontology collapse) is being superseded by memo-platform-architecture's single-ontology direction; pending re-issue as ADR-1-11.

### Design briefs

[design/](design/) — closure-rules.md, configuration.md, cosma-layers.md, ontology.md, viewpoints.md.

### Ontology authoring

[ontology/](ontology/) — ONTOLOGY_DESIGN_PROMPT.md, reference.md.

### Requirements

[requirements/](requirements/) — feature/function catalogs, traceability, capability statistics, user needs, software requirements, verification tests.

### Historical / superseded

| Doc | Superseded by | Reason |
|---|---|---|
| [architecture/two-ontology-refactor.md](architecture/two-ontology-refactor.md) | memo-platform-architecture (single ontology) | Two-ontology split collapsed to one |
| [architecture/ontology-refactor-inventory.md](architecture/ontology-refactor-inventory.md) | memo-platform-architecture | Companion to two-ontology-refactor |
| [architecture/ontology-rearchitecture.md](architecture/ontology-rearchitecture.md) | memo-platform-architecture | Layer naming covered by §4 + §5 |
| [architecture/diagram-subsystem-audit.md](architecture/diagram-subsystem-audit.md) | architecture/fresh-architecture-plan.md | Replaced by v3 |
| [architecture/fresh-architecture-plan.md](architecture/fresh-architecture-plan.md) | memo-platform-architecture | Folded into grand plan |
| [architecture/execution-plan.md](architecture/execution-plan.md) | memo-platform-architecture §11 | Re-sequenced as E1–E9 |
| [architecture/rearchitect-prompt.md](architecture/rearchitect-prompt.md) | CLAUDE.md "Executing Milestones" section | Process doc moved into harness instructions |

---

## Conventions

- **One key doc** — `memo-platform-architecture.md`. New design proposals either update it or land as ADRs that it eventually folds in.
- **No status drift** — when a doc is superseded, mark it in this README's "Historical" table; do NOT delete (kept for traceability).
- **Live work tracking** stays in [`../roadmap/`](../roadmap/) — auto-synced from GitLab, do not edit manually.
- **Branch handoffs** stay at the top of this directory (alongside memo-platform-architecture) so the current state is visible without spelunking.
