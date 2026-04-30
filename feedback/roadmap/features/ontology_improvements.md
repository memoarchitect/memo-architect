# Ontology Improvements for a Medical Device Modeling Library

## Purpose

This document captures recommended ontology-level improvements for a medical device modeling library intended to support architecture-as-code, regulatory traceability, cybersecurity, and scalable reuse across products.

The emphasis is on improvements that increase practical value for regulated medical device development without making the ontology unnecessarily heavy.

## Design Principles

The improvements should preserve the following principles:

- keep the core ontology compact
- make cross-layer traceability explicit
- support regulatory use, not just architecture description
- separate semantic model from views and documents
- allow extension by methodology, product, and organization
- avoid excessive element proliferation unless the added semantics justify it

## 1. Closed-Loop Traceability as a First-Class Pattern

A core improvement is to formalize the end-to-end safety and compliance loop rather than relying only on generic trace links.

Recommended semantic chain:

```text
Hazard -> Risk -> ControlMeasure -> Requirement -> DesignElement -> VerificationCase -> EvidenceArtifact
```

Recommended cybersecurity chain:

```text
Threat -> Vulnerability -> CyberRisk -> Mitigation -> SecurityRequirement -> VerificationCase -> EvidenceArtifact
```

This should be modeled as a reusable ontology pattern so that completeness checks can be automated.

## 2. Safety and Software Classification Structure

The ontology should explicitly support IEC 62304-oriented software structure.

Recommended additions:

- SoftwareSystem
- SoftwareItem
- SoftwareUnit
- SafetyClassification
- SoftwareOfUnknownProvenance

Recommended attributes:

- safetyClass
- softwareItemCriticality
- ofConcern
- segregationRationale

This makes it easier to support software architecture views, verification expectations, and compliance reporting.

## 3. Design Controls as First-Class Ontology Concepts

Design controls should be modeled explicitly, not inferred only through document views.

Recommended additions:

- UserNeed
- IntendedUse
- IndicationForUse
- DesignInput
- DesignOutput
- DesignReview
- DesignChange
- DesignTransfer
- DesignHistoryArtifact

This improvement supports FDA/QMSR-style traceability and makes DHF-oriented document generation more robust.

## 4. Cybersecurity as a First-Class Layer

Cybersecurity should remain a full ontology layer and not merely a subtype of general risk.

Recommended cybersecurity concepts:

- CybersecurityAsset
- Threat
- Vulnerability
- ThreatScenario
- TrustBoundary
- AttackSurface
- CyberHazard
- CyberRisk
- CyberMitigation
- SecurityRequirement
- SecurityClaim
- SecurityEvidence

Recommended relationships:

- asset exposedTo threat
- threat exploits vulnerability
- scenario crosses trust boundary
- mitigation reduces cyber risk
- security requirement derivedFrom mitigation
- cyber hazard contributesTo safety risk
- security evidence supports security claim

The cyber layer should be able to reference software, hardware, interfaces, data, clinical workflow, and safety artifacts.

## 5. Data and Privacy Modeling

Connected medical devices often require explicit treatment of privacy and regulated data handling.

Recommended additions:

- DataAsset
- DataFlow
- DataStore
- DataClassification
- PrivacyRisk
- PrivacyControl
- RetentionPolicy
- AccessControlPolicy

Recommended classifications:

- PHI
- PII
- telemetry
- device operational data
- diagnostic data
- service data

This should remain linked to, but distinct from, the cybersecurity layer.

## 6. Clinical and Use Context Layer

Many medical device issues arise from inadequate modeling of the clinical context.

Recommended additions:

- UserRole
- ClinicalWorkflow
- UseScenario
- ProcedureStep
- UseEnvironment
- HumanFactorsConcern
- OperationalContext

This layer helps connect user needs, hazards, usability concerns, training, alarms, and workflow-specific risks.

## 7. Verification, Validation, and Evidence Semantics

Verification and validation should be more explicit at the ontology level.

Recommended additions:

- VerificationCase
- ValidationScenario
- TestMethod
- TestResult
- EvidenceArtifact
- ReviewRecord
- ObjectiveEvidence
- CoverageAssertion

Recommended attributes:

- acceptanceCriteria
- resultStatus
- evidenceLocation
- coverageScope
- residualConcern

This supports stronger views and stronger automated compliance checks.

## 8. Configuration, Baseline, and Release Concepts

A practical medical device ontology should support lifecycle and configuration semantics.

Recommended additions:

- ConfigurationItem
- Baseline
- Release
- Variant
- SubmissionPackage
- ChangeRequest
- ImpactAssessment

This helps relate architecture and compliance views to actual product baselines and submissions.

## 9. Reusable Cross-Layer Relationships

Rather than introducing large numbers of special-purpose links, a small set of meaningful reusable relationship families should be introduced.

Recommended relationship families:

- derivesFrom
- satisfies
- mitigates
- verifies
- validates
- contributesTo
- allocatedTo
- constrainedBy
- exposedBy
- dependsOn
- evidences
- impacts

The ontology should define where these relationships are valid across layers.

## 10. Consistency and Completeness Rules

The ontology should support rule definitions for common regulatory and engineering checks.

Examples:

- every hazard should have at least one control
- every control should map to at least one requirement
- every requirement should have at least one verification case
- every software item should have a safety classification
- every cyber threat should map to at least one mitigation or documented rationale
- every trust boundary crossing should identify protections or controls

These rules can initially be represented as documented constraints and later formalized for automated checking.

## 11. Reusable Archetypes and Reference Models

To support startups and early programs, the ontology should include reusable reference patterns for common device classes.

Examples:

- infusion pump archetype
- patient monitor archetype
- surgical robot archetype
- imaging/navigation archetype
- connected therapy system archetype

These should be templates, not rigid mandatory structures.

## 12. Recommended Improvement Priorities

### Highest priority

- closed-loop traceability pattern
- cybersecurity-to-safety integration
- explicit software item and safety classification structure
- explicit verification and evidence semantics

### Medium priority

- data/privacy sublayer
- clinical context layer
- configuration and release modeling

### Later priority

- deeper formal rule language
- richer product family/variant libraries
- more archetype packs

## Summary

The best ontology improvements are those that make the library more useful for real medical device programs while preserving a lightweight mental model.

The main goal is not just to describe system structure, but to support:

- design control traceability
- risk and cybersecurity reasoning
- verification and evidence linkage
- reusable views and documentation
- future automation
