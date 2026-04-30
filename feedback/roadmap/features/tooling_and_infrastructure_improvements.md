# Tooling and Infrastructure Improvements for a Medical Device Modeling Library

## Purpose

This document captures tooling and infrastructure improvements needed to make a medical device modeling library practical for day-to-day use.

The goal is not only to define a good ontology, but to make the library usable in real engineering workflows involving architecture, design control, risk management, cybersecurity, verification, and documentation.

## Design Principles

Tooling and infrastructure should:

- preserve the semantic model as the source of truth
- keep views and presentations separate from core semantics
- support lightweight adoption
- be version-controlled and review-friendly
- integrate with engineering and quality workflows
- allow gradual automation

## 1. Improve Import and Packaging Strategy

The library should have a clearly defined import strategy for tools such as SysON or other textual SysML v2 environments.

Recommended improvements:

- define a stable entry-point file
- define recommended import order
- provide a flattened import bundle for tools that struggle with multi-file dependencies
- add syntax validation checks for all packages in CI
- provide a minimal import profile for quick evaluation

Recommended artifacts:

- import_order.md
- minimal_import_bundle.sysml
- flattened_library_bundle.sysml

## 2. Add Validation and Consistency Checking

A modeling library for medical devices becomes much more valuable when it can detect incomplete or inconsistent traceability.

Recommended validation capabilities:

- missing hazard controls
- requirements without verification
- software items without safety classification
- cyber threats without mitigation
- trust boundary crossings without protections
- views with unresolved references
- document views missing required metadata

These can begin as rule definitions and evolve into executable validation.

## 3. Add Query and View Generation Infrastructure

Since views should be able to pull from the model, the infrastructure should support query-backed view generation.

Recommended improvements:

- define typed selection queries
- add reusable query library
- add query examples for each example model
- support view generation from query results
- support diagram, table, and document-section outputs from the same semantic selection

This is important for scalability and for documentation automation.

## 4. Strengthen Document Generation Pipeline

The tooling should support turning the semantic model into usable documentation.

Recommended outputs:

- architecture overview pages
- software design descriptions
- risk trace tables
- cybersecurity assessment sections
- verification and evidence matrices
- DHF/QMSR-oriented sections

Recommended infrastructure:

- markdown generation templates
- mkdocs integration
- PDF export path
- trace matrix export path
- evidence index generation

## 5. Integrate with Quality and Work Management Systems

The library becomes more useful when it can connect to engineering and quality workflows.

Recommended integrations:

- Jira or work-item mapping for requirements, defects, and verification tasks
- test management linkage
- evidence artifact references
- release/baseline linkage
- issue-to-model traceability

This does not require hard tool coupling, but the ontology and infrastructure should support stable identifiers and mapping hooks.

## 6. Add Release Manifest and Change Communication

For a single release-wide version strategy, tooling should make the release structure obvious.

Recommended artifacts:

- package version manifest
- changelog
- impact note
- release summary

Recommended automation:

- generate release manifest from source metadata
- verify that release version is consistent across docs and package entry points

## 7. Add CI/CD Support

A practical modeling library should be treated like code.

Recommended automation in CI:

- syntax checks
- import validation
- dependency checks
- consistency rule checks
- document generation smoke test
- example package validation

This supports architecture-as-code and reduces hidden model drift.

## 8. Add Tooling Profiles for Different Audiences

Different users need different entry paths.

Recommended profiles:

- architecture profile
- safety/risk profile
- cybersecurity profile
- verification/compliance profile
- starter profile for new users

Each profile can define:

- recommended packages
- recommended views
- example import path
- example docs

## 9. Add Better Example Tooling Support

Examples should not only exist; they should be runnable and reviewable.

Recommended improvements:

- example-specific import scripts
- example validation reports
- example-generated markdown docs
- example-generated diagrams or view summaries
- example dependency maps

This lowers the barrier to adoption.

## 10. Add Stable Identifiers and Reference Conventions

Even with a single package version, stable identifiers improve tooling and document references.

Recommended identifier categories:

- viewpoints
- views
- document templates
- example packages
- reusable traceability patterns

These identifiers do not need element-level versioning, but they help references remain stable across releases.

## 11. Add Authoring Guidance and Repository Standards

Tooling is easier to use when repository structure is standardized.

Recommended standards:

- package naming conventions
- folder structure conventions
- import dependency guidelines
- view/viewpoint authoring guidance
- metadata requirements for documented elements
- extension mechanism guidance

Recommended files:

- CONTRIBUTING.md
- AUTHORING_GUIDE.md
- MODELING_GUIDELINES.md

## 12. Add Migration-Friendly Infrastructure

Even though the current recommendation is to use a single release-wide version, the infrastructure should still make upgrades understandable.

Recommended improvements:

- release notes with impact summary
- migration notes for major structural changes
- deprecated construct registry when needed
- compatibility notes for example models

This keeps future upgrades manageable without introducing heavy per-element versioning.

## 13. Add Security and Compliance Reporting Support

Since cybersecurity is now a first-class layer, the tooling should support cyber-specific outputs.

Recommended outputs:

- threat model report
- cyber risk assessment summary
- trust boundary report
- security requirement coverage view
- security evidence summary

These outputs should align with the same model-backed view approach as the rest of the package.

## 14. Add Infrastructure for Reuse Across Product Lines

If the library is intended for product families or startups, it should support reuse cleanly.

Recommended improvements:

- product extension template
- archetype starter packages
- variant modeling examples
- organization-specific viewpoint packs
- methodology extension packs

This improves scalability without forcing every project into the same structure.

## 15. Recommended Tooling Priorities

### Highest priority

- import strategy and validation
- query-backed view generation
- consistency checks
- markdown/mkdocs-based document generation
- example validation automation

### Medium priority

- Jira/work-item mapping hooks
- release manifest automation
- audience-specific tooling profiles
- cyber reporting outputs

### Later priority

- deeper migration tooling
- richer product-line automation
- more advanced visual rendering support

## Summary

Tooling and infrastructure improvements should make the library practical, reviewable, and automatable.

The highest-value direction is:

- treat the model as code
- validate it continuously
- generate views and documents from it
- keep integrations lightweight but real
- support medical device traceability, risk, cybersecurity, and evidence workflows
