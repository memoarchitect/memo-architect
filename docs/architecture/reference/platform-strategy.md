# Platform Strategy

MEMO ships three independent products with a single dependency direction.

| Product | Package | Current responsibility |
|---|---|---|
| Ontology | `@memoarchitect/ontology` | SysML v2 ontology, methodologies, constraints, viewpoints, templates, and examples |
| Tools | `@memoarchitect/tools` | Parser, semantic model, validation, analysis, project operations, document tooling, and `memo` CLI |
| Architect | `@memoarchitect/architect` | Visual workbench and application composition |

## Dependency and release policy

- Tools pins an exact Ontology npm version.
- Architect pins exact Tools and Ontology npm versions.
- Products are installed, built, tested, and published independently.
- Releases publish dependency-first: Ontology, Tools, then Architect.
- Products on the same `MAJOR.MINOR` line are compatible; exact patch versions
  make builds reproducible.

## Coordinated development

The private `memo-meta` repository contains all three product repositories as
direct sibling submodules. Meta-only pnpm overrides link those sibling working
trees without changing product manifests. The meta build is explicitly ordered
Ontology → Tools → Architect.

## Source ownership

- Ontology owns reusable modeling semantics and packaged source content.
- Tools owns headless behavior and the shared typed application boundary.
- Architect owns presentation and interaction.
- Device projects own their `.sysml` instances and local configuration.
- `memo-meta` owns planning, proposals, internal reviews, handoffs, generated
  planning material, and coordinated release operations.

## Package truth

SysML remains the semantic source of truth. YAML and JSON files configure
projects or package resolution; they do not duplicate ontology kinds,
relationships, constraints, or viewpoints.
