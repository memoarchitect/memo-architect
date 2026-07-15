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

The three-repo split from [../platform.md §10](../platform.md#10-repo-layout-executed-2026-07-12) was executed on 2026-07-12 — see [ADR-1-17](../../decisions/adr/ADR-1-17-three-repo-split.md) (Implemented). Public repo naming maps to the meMO four-layer stack:

```text
memo/            # Layers 01 Ontology + 02 Methodology — pure SysML v2 / KerML content
                 #   github: memoarchitect/memo
memo-tools/      # Layer 03 Tools — engine (@memo/core) + memo CLI (@memo/cli) + tooling
                 #   github: memoarchitect/memo-tools
memo-architect/  # Layer 04 Architect — web app (@memo/web)
                 #   github: memoarchitect/memo-architect
```

Dependency direction: `memo ◄─ memo-tools ◄─ memo-architect`. The ontology content (formerly L0/L1/L2 repos) collapsed into one pure-content release; the tool split into engine vs UI so CLI-only users are served without the web bundle. The former monorepo is now the memo-architect webapp repo itself (ontology and engine stripped out, history preserved); the GitHub mirrors are squashed cuts; `memo-tools` consumes the content repo as a git submodule, and `memo-architect` consumes `memo-tools` the same way (`memo-tools`, nesting the content submodule) with pnpm workspace globs resolving `@memo/core` as a normal workspace dependency. Published consumers will depend on versioned sysand artifacts, not on tool internals.

## Migration Guardrails

- Architecture-changing work updates [../platform.md](../platform.md) or adds/supersedes an ADR.
- Reference docs summarize current behavior; they do not define competing plans.
- Generated requirements and roadmap plans are not source architecture.
- Ontology inspection remains read-only and secondary. The primary MEMO Architect mode is methodology-scoped modeling, compliance, artifacts, and diagrams.
