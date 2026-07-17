# ADR-1-14: Extension Package Policy — Medical-Only Scope, Out-Of-Tree Extensions

**Status:** Accepted
**Date:** 2026-05-02
**Reference:** [ADR-1-12](ADR-1-12-namespace-canonicalization.md), [platform.md](../../architecture/platform.md)

---

## Context

Earlier roadmap drafts included `@memoarchitect/automotive` (ISO 26262) and `@memoarchitect/aerospace` (DO-178C) as proof points that the architecture scales beyond medical. That scope-broadening drained focus. The product is medical-device-only.

Separately, the architecture must still support extensions — vendors with proprietary kinds, customers with site-specific compliance overlays, future medical sub-domains (e.g. IVD, surgical robotics) — without forcing them into the canonical `@memoarchitect/ontology` package.

## Decision

**Scope.** MEMO ships and supports medical-device modeling only. Automotive, aerospace, and other non-medical compliance regimes are explicitly out of scope.

**Extension namespace pattern.** Extensions live under `memo::ontology::ext::<extensionId>::*`. The `ext` segment is reserved for non-canonical kinds and is permitted alongside the canonical dimension segments.

```
memo::ontology::ext::ivd::*                    in-vitro diagnostics extension
memo::ontology::ext::surgical_robotics::*      surgical robotics extension
memo::ontology::ext::vendor_acme::*            vendor-private kinds
```

**Packaging.** Extensions ship as separate npm + Sysand packages (e.g. `@memoarchitect/ext-ivd`, `@memoarchitect/ext-surgical-robotics`). They are out-of-tree relative to `@memoarchitect/ontology` and version independently. Project pins extensions through `.project.json` `usage[]` URNs, same mechanism as the core ontology.

**Loader behaviour.** Extension packages are auto-discovered when their package is resolvable (npm workspace, registry, or local path). The loader scans `ontology/ext/<id>/` per package and registers kinds, rules, and viewpoints under `memo::ontology::ext::<id>::*`.

**No medical-only assumption inside the loader.** Loader does not check whether an extension is medical. Project owner is responsible for picking compatible extensions. Extension packages declare their compliance / device-class scope as metadata in `.project.json`.

## Consequences

**Independent versioning.** Extension authors publish on their own cadence. Core ontology releases do not need to coordinate with extensions.

**No product-repository coupling.** Extensions are separate Git repositories and
packages, not subdirectories under `@memoarchitect/ontology`.

## Out of scope

- Automotive (ISO 26262) extension. Removed.
- Aerospace (DO-178C) extension. Removed.
- Any general-purpose systems engineering ontology (FIBO, etc.) beyond what already exists for medical traceability use cases.
