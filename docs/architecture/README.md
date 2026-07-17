# MEMO Architecture

Canonical platform architecture and reference material live here.

## Read First

| Doc | Role |
|---|---|
| [platform.md](platform.md) | Canonical platform architecture and grand plan |
| [reference/platform-strategy.md](reference/platform-strategy.md) | Package and repo strategy |
| [../decisions/index.md](../decisions/index.md) | ADR catalog and current decision state |
| [../design/README.md](../design/README.md) | Runtime design and authoring specifics |

## Reference Architecture

| Doc | Role |
|---|---|
| [reference/overview.md](reference/overview.md) | System context and package architecture |

## Conventions

- Keep [platform.md](platform.md) as the canonical architecture doc.
- Record durable decisions in [../decisions/adr/](../decisions/adr/) and keep the
  canonical docs focused on the accepted current state.
- Put concrete runtime behavior, protocols, and authoring rules in [../design/](../design/).
- Do not create new architecture plan files unless they are replacing a specific canonical doc.
