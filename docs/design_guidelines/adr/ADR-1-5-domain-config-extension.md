# ADR-1-5: Domain Config Extension Point

**Status:** Superseded by ADR-1-8
**Date:** 2026-03-02
**Superseded:** 2026-04-08 by [ADR-1-8: Project Configuration Format Contract](ADR-1-8-project-format-contract.md)

## Summary

This ADR originally documented a TypeScript `MEMOConfig` interface as the extension mechanism for domain configurations. That approach was superseded during the Phase 7–8 rearchitecture.

## Current Decision

See **[ADR-1-8: Project Configuration Format Contract](ADR-1-8-project-format-contract.md)** for the accepted configuration format.

The key decisions now are:

- **Device projects** use `memo.config.yaml` (monolithic, minimal — declares profile and extensions only).
- **Ontology/profile packages** use `memo.package.yaml` + optional `memo.rendering.yaml` and `memo.rules.yaml`.
- **Kinds** are defined in `.sysml` source files, not in YAML config (`config.kinds` has been removed).
- **Closure rules** are owned by extension packages via `memo.rules.yaml`, not by device projects.

## Historical Context

The original design (March 2026) used a TypeScript interface (`MEMOConfig`) serialized as `.memo/config.yaml` with inline `kinds:`, `closureRules:`, `cosmaLayers:`, and `relationshipTypes:` blocks. This was replaced because:

1. Inline `kinds:` blocks duplicated what the SysML AST already expresses — removing them enables the Apollo-11 directory-as-layer pattern (ADR-1-3).
2. The `.memo/` directory added unnecessary nesting — `memo.config.yaml` at the project root is simpler.
3. Separating identity (`memo.package.yaml`), rendering (`memo.rendering.yaml`), and rules (`memo.rules.yaml`) gives cleaner diffs and independent evolution.

The `extends` chain concept from the original ADR is preserved — projects inherit from profiles which inherit from ontologies.
