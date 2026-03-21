# ADR-1-7: Legacy Ontology Compatibility Policy

**Status:** Accepted
**Date:** 2026-03-21
**Context:** Legacy Compatibility Decision

## Decision

`@memo/ontology` is now a **frozen compatibility shim** for the legacy `MEMO_Ontology`
package surface.

New ontology work must happen in:

1. `@memo/ontology-core`
2. `@memo/ontology-medical`
3. future product-family or technology extensions

`@memo/ontology` remains supported only so existing projects that import
`MEMO_Ontology::*` continue to resolve.

No new reusable ontology concepts should be added to `@memo/ontology` unless they are
strictly required to preserve backward compatibility.

## Audit Result

The remaining compatibility-only content in `@memo/ontology` falls into four buckets:

### 1. Legacy namespace surface

- root package name `MEMO_Ontology`
- broad compatibility config/viewpoint surface for older projects

### 2. Legacy-only modeling conveniences

These remain only in the compatibility package and are not active backbone targets:

- `Responsibility`
- `LogicalComponentExternal`
- `ActionDefinition`
- `ActionUsage`
- `ItemDefinition`
- legacy `extend` / `include` relationship declarations
- legacy business/behavior viewpoints

### 3. Legacy-only domain content

The main remaining product-specific leftover is:

- `Catheter`

This stays legacy-only unless a future product-family ontology explicitly promotes it.

### 4. Broad duplicated compatibility definitions

The package still ships duplicated SysML/config content so the old namespace works without
forcing existing models to rewrite imports immediately.

## Why

Keeping `@memo/ontology` in a permanently transitional state causes two problems:

- people may keep adding new concepts to the wrong package
- the repo loses a clear distinction between active ontology evolution and backward compatibility

Freezing the shim keeps compatibility while protecting the clean layered ontology.

## Deprecation Path

### For new ontology development

Use:

- `@memo/ontology-core`
- `@memo/ontology-medical`
- `MEMO_Ontology_Medical::*` in new medical models

Do not add new ontology concepts to `MEMO_Ontology`.

### For existing projects

Projects already using `MEMO_Ontology::*` may continue to do so.

The compatibility shim remains supported in the current line, but it should be treated as
stable/frozen rather than as the preferred modeling surface.

### For future retirement work

If the repo later gains generated alias packages or explicit import-rewrite tooling, the
compatibility shim can be reduced further or retired. That is a separate milestone.

## Consequences

- `@memo/ontology` remains in the workspace and continues to resolve legacy imports
- `@memo/ontology` is no longer an active destination for ontology growth
- product-specific leftovers such as `Catheter` are explicitly legacy-only until promoted
- roadmap work after this point should target the medical backbone, rule pack, and reference models
