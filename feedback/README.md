# Final Medical Device SysML v2 Package

## Release
- Package version: **1.0.0**
- Release type: initial integrated release
- Versioning approach: **single package version for the whole release**

This release uses one version for the entire package rather than separate versions for each layer or library. That keeps adoption simple and makes upgrade guidance easier to communicate.

## Main changes in this release
- viewpoints and views are first-class libraries rather than being mixed into methodology or compliance packages
- dedicated `viewpoints/` library for reusable viewpoint definitions
- dedicated `views/` library for semantic views and document-backed views
- legacy `methodology/md_viewpoints.sysml` and `compliance/md_document_views.sysml` kept as compatibility re-exports
- `architecture/md_cybersecurity.sysml` added as a first-class ontology layer
- default layer-derived viewpoints, including a cybersecurity viewpoint
- explicit view selection queries and explicit exposed model content hooks
- cybersecurity support elements for attack surface and security claims
- example views aligned to typed selection queries for model-driven population

## Design principles
- ontology/model layers remain the source of truth
- methodology influences viewpoint derivation but does not own viewpoints
- viewpoints define reusable selection intent
- views bind viewpoint intent to model-driven content and presentation
- cybersecurity is modeled as a peer layer to safety, software, hardware, and assurance
- package versioning is release-wide and intentionally lightweight

## Cybersecurity modeling direction
- STRIDE-style threat categories are the default starting point
- cybersecurity can reference software, hardware, interfaces, context, risk, and assurance
- cyber risk, cyber hazard, and cyber mitigation are modeled explicitly so safety and security can be reasoned about together

## Versioning approach
This package currently uses a **single version for the whole release**. Internal draft labels such as v10, v11, or v12 were working snapshots during development and are not the package version.

For this release:
- the whole package is versioned as **1.0.0**
- the same version applies to core, ontology, methodology, viewpoints, views, compliance, and examples
- impact of future changes should be tracked through release notes and an impact note rather than per-element version fields

See:
- `manifest/PACKAGE_VERSION.md`
- `manifest/CHANGELOG.md`
- `manifest/IMPACT_NOTE.md`
- `manifest/md_release_manifest.sysml`


## Roadmap and Feature Planning

Additional forward-looking recommendations are captured under `roadmap/features/`:

- `ontology_improvements.md`
- `example_improvements.md`
- `tooling_and_infrastructure_improvements.md`
