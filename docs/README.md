# MEMO Documentation Index

Start here for repository-level product, architecture, roadmap, and decision context.

## Read First

| Doc | Role |
|---|---|
| [LLM.md](LLM.md) | Minimal context pack for AI agents and LLMs |
| [architecture/platform.md](architecture/platform.md) | Canonical platform architecture and grand plan |
| [design/sysmlv2-rulebook.md](design/sysmlv2-rulebook.md) | Normative SysML v2 authoring rules |
| [roadmap/north-star.md](roadmap/north-star.md) | Product strategy and prioritization |
| [decisions/index.md](decisions/index.md) | Decision index and current ADR state |

## Main Areas

| Area | Contents |
|---|---|
| [architecture/](architecture/README.md) | Canonical architecture and high-level reference architecture |
| [design/](design/README.md) | Authoring rules, runtime design, protocols, and implementation-specific guidance |
| [decisions/](decisions/index.md) | ADRs and decision history |
| [roadmap/](roadmap/index.md) | GitLab-synced roadmap snapshots plus north star |
| [generated/requirements/](generated/requirements/index.md) | Generated requirements and traceability baseline |
| [handoffs/](handoffs/feedback-ontology-replace.md) | Branch handoffs and temporary transition notes |
| [src/](src/index.md) | MkDocs user/developer documentation source |

## Source Of Truth Rules

- Platform architecture changes update [architecture/platform.md](architecture/platform.md) or add an ADR in [decisions/adr/](decisions/adr/).
- SysML modeling rules live in [design/sysmlv2-rulebook.md](design/sysmlv2-rulebook.md).
- Roadmap state lives in GitLab. `docs/roadmap/*.md` files are generated snapshots except [roadmap/north-star.md](roadmap/north-star.md).
- Generated requirement catalogs live under [generated/requirements/](generated/requirements/) and should not be hand-maintained as product plans.
- Avoid new parallel planning docs. Add links to this index instead.
