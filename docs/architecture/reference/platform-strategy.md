# Platform Strategy

This page is a reference summary of packaging and release strategy. The canonical architecture is [../platform.md](../platform.md).

## Product Decomposition

| Layer | Artifact | Role |
|---|---|---|
| L0 helpers | `@memo/sysml-base` | Shared SysML library types, dimensions, rule/view base defs |
| L1 ontology | `@memo/ontology` | Comprehensive medical-device ontology with architecture, compliance, artifact, and viewpoint dimensions |
| L2 methodology | `@memo/methodology-default` and custom packages | Scope, aliases, workflow, DHF bindings, rule strengths, viewpoint selection |
| L3 tool | MEMO Architect (`@memo/core`, `@memo/cli`, `@memo/web`) | Parse, validate, visualize, analyze, and export projects |

The ontology is the reusable modeling product. MEMO Architect consumes it and adds engineering workflow. Methodology packages tailor what the project sees without forking the ontology.

## Source Layout

Canonical ontology source follows the dimension layout from [../platform.md §4](../platform.md#4-single-ontology-repo-memoontology):

```text
ontology/
├── base/                 # L0-style helpers while local
├── architecture/         # architecture dimension, grouped by archLayer
├── compliance/           # compliance dimension, grouped by standard
├── artifacts/            # concrete DHF/review document kinds
├── viewpoints/           # viewpoint type kinds
├── views/                # view templates and definitions
├── relationships/        # cross-dimension connection defs
└── rules/                # ontology invariant rules
```

Methodology packages select subsets across those dimensions:

```text
packages/methodology-default/
└── sysml/methodology/default/

packages/methodology-gpca/
└── sysml/methodology/gpca/
```

## Package Format

MEMO should push semantics into SysML. Metadata files are thin package/project manifests, not duplicated type catalogs.

| File | Role |
|---|---|
| `.project.json` | Sysand/SysML package manifest when publishing as `.kpar` |
| `memo.package.yaml` | Temporary MEMO package identity and local source directory hints |
| `memo.config.yaml` | Project-level methodology pin and runtime options |
| `.sysml` files | Kinds, relationships, rules, scope, aliases, workflow, viewpoints |

Do not reintroduce `kinds:`, `relationshipTypes:`, or closure-rule catalogs as parallel YAML truth. Registries are derived from SysML.

## Methodology Strategy

`@memo/methodology-default` is comprehensive. Custom methodologies, such as GPCA, extend default and subtract or override:

- architecture layers
- compliance standards
- artifact/document kinds
- viewpoint types
- workflow stages
- rule strengths
- terminology aliases

This keeps ontology authors, methodology authors, and project authors on separate axes:

| Author | Edits |
|---|---|
| Ontology author | Shared kinds, relationships, invariant rules |
| Methodology author | Scope, workflow, rule strengths, aliases |
| Project author | Element instances and project-specific exemptions |

## Release Direction

The final-state split from [../platform.md §10](../platform.md#10-repo-layout-final-state) is:

```text
memo-base/             # L0 helpers
memo-ontology/         # L1 canonical ontology
memo-methodologies/    # L2 methodology library
memo-architect/        # L3 tool
```

During local development, subtree or workspace integration may keep these sources available in one checkout. Published consumers should depend on versioned ontology and methodology artifacts, not on tool internals.

## Migration Guardrails

- Architecture-changing work updates [../platform.md](../platform.md) or adds/supersedes an ADR.
- Reference docs summarize current behavior; they do not define competing plans.
- Generated requirements and roadmap plans are not source architecture.
- Ontology inspection remains read-only and secondary. The primary MEMO Architect mode is methodology-scoped modeling, compliance, artifacts, and diagrams.
