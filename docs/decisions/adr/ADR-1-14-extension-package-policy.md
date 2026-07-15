# ADR-1-14: Extension Package Policy — Medical-Only Scope, Out-Of-Tree Extensions

**Status:** Accepted
**Date:** 2026-05-02
**Reference:** [ADR-1-12](ADR-1-12-namespace-canonicalization.md), [platform.md](../../architecture/platform.md)

---

## Context

Earlier roadmap drafts included `@memo/automotive` (ISO 26262) and `@memo/aerospace` (DO-178C) as proof points that the architecture scales beyond medical. That scope-broadening drained focus. The product is medical-device-only.

Separately, the architecture must still support extensions — vendors with proprietary kinds, customers with site-specific compliance overlays, future medical sub-domains (e.g. IVD, surgical robotics) — without forcing them into the canonical `@memo/ontology` package.

## Decision

**Scope.** MEMO ships and supports medical-device modeling only. Automotive, aerospace, and other non-medical compliance regimes are explicitly out of scope.

**Extension namespace pattern.** Extensions live under `memo::ontology::ext::<extensionId>::*`. The `ext` segment is reserved for non-canonical kinds and is permitted alongside the canonical dimension segments.

```
memo::ontology::ext::ivd::*                    in-vitro diagnostics extension
memo::ontology::ext::surgical_robotics::*      surgical robotics extension
memo::ontology::ext::vendor_acme::*            vendor-private kinds
```

**Packaging.** Extensions ship as separate npm + Sysand packages (e.g. `@memo/ext-ivd`, `@memo/ext-surgical-robotics`). They are out-of-tree relative to `@memo/ontology` and version independently. Project pins extensions through `.project.json` `usage[]` URNs, same mechanism as the core ontology.

**Loader behaviour.** Extension packages are auto-discovered when their package is resolvable (npm workspace, registry, or local path). The loader scans `ontology/ext/<id>/` per package and registers kinds, rules, and viewpoints under `memo::ontology::ext::<id>::*`.

**No medical-only assumption inside the loader.** Loader does not check whether an extension is medical. Project owner is responsible for picking compatible extensions. Extension packages declare their compliance / device-class scope as metadata in `.project.json`.

## Consequences

**Roadmap simplification.** Epic Z drops automotive (Z-3) and aerospace (Z-4). Z keeps the plugin API contract (Z-1) and reusable component libraries (Z-2). Two new stories exemplify the extension pattern with **medical** sub-domains rather than non-medical regimes.

**Independent versioning.** Extension authors publish on their own cadence. Core ontology releases do not need to coordinate with extensions.

**No mono-repo coupling.** Extensions are separate Git repositories or separate workspace packages, not subdirectories under `@memo/ontology`. Repo split (Epic J) is unaffected — extensions live in additional repos as needed.

**Marketing / docs.** Project description, README, marketing materials reflect medical-only scope. Existing automotive/aerospace mentions in docs are removed during Epic L.

## Out of scope

- Automotive (ISO 26262) extension. Removed.
- Aerospace (DO-178C) extension. Removed.
- Any general-purpose systems engineering ontology (FIBO, etc.) beyond what already exists for medical traceability use cases.

## Pointers

- Plugin API: Epic Z-1
- Reusable libraries: Epic Z-2
- Loader namespace scan: legacy issue #261 (now mapped to Epic Z)
- Doc cleanup: Epic L (remove automotive/aerospace references)
