# MEMO Architecture

Canonical platform architecture and reference material live here.

## Read First

| Doc | Role |
|---|---|
| [platform.md](platform.md) | Canonical platform architecture and grand plan |
| [reference/sysmlv2-rulebook.md](reference/sysmlv2-rulebook.md) | Normative SysML v2 authoring rules |
| [reference/platform-strategy.md](reference/platform-strategy.md) | Package and repo strategy |
| [../decisions/index.md](../decisions/index.md) | ADR catalog and current decision state |

## Reference Architecture

| Doc | Role |
|---|---|
| [reference/overview.md](reference/overview.md) | System context and package architecture |
| [reference/data-flow.md](reference/data-flow.md) | `.sysml` to parser to model to web pipeline |
| [reference/websocket-protocol.md](reference/websocket-protocol.md) | CLI to web app protocol |
| [reference/monorepo.md](reference/monorepo.md) | Turborepo and pnpm layout |
| [reference/live-reload.md](reference/live-reload.md) | Project hot-reload versus ontology restart-required behavior |

## Conventions

- Keep [platform.md](platform.md) as the canonical architecture doc.
- Add or supersede ADRs in [../decisions/adr/](../decisions/adr/) for durable decisions.
- Keep branch-specific transition notes in [../handoffs/](../handoffs/), not in architecture docs.
- Do not create new architecture plan files unless they are replacing a specific canonical doc.
