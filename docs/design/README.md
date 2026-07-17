# MEMO Design Guidance

Design guidance lives here when it is more specific than product architecture but still shared across implementations.

Use [../architecture/platform.md](../architecture/platform.md) for canonical architecture and [../decisions/index.md](../decisions/index.md) for durable decisions.

## Authoring Rules

| Doc | Role |
|---|---|
| [sysmlv2-rulebook.md](sysmlv2-rulebook.md) | Normative SysML v2 authoring rules for ontology, methodology, and project models |
| [ontology-portability.md](ontology-portability.md) | Why MEMO ontology constraints are portable standard SysML v2; the EE-5 external-parse gate |

## Runtime Design

| Doc | Role |
|---|---|
| [runtime/data-flow.md](runtime/data-flow.md) | Parser, registry, model, validation, and UI data flow |
| [runtime/websocket-protocol.md](runtime/websocket-protocol.md) | CLI to web app WebSocket protocol |
| [runtime/live-reload.md](runtime/live-reload.md) | Project hot-reload versus ontology/methodology restart-required behavior |

## Boundary

- Architecture docs explain product structure, package boundaries, and repository shape.
- Design docs explain concrete implementation behavior, authoring rules, protocols, and runtime flows.
- If a design rule becomes a durable product decision, record it in an ADR and
  update architecture documentation to state the accepted current behavior.
