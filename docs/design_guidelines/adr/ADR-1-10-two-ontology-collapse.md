# ADR-1-10: Collapse 9 Fragmented Ontology Packages into 2

**Status:** Accepted
**Date:** 2026-04-21
**Replaces:** (none — new decision)

---

## Context

MEMO v0.x shipped with 9 separate ontology packages that grew organically from separate concerns:

| Old Package | Concern |
|-------------|---------|
| `@memo/ontology-medical-arch` | Architecture layers (operational, functional, logical, software, hardware, behavioral, verification, safety, security, privacy, relationships) |
| `@memo/ontology-medical-process` | QMS and design control artifacts |
| `@memo/ontology-iec62304` | IEC 62304 software lifecycle |
| `@memo/ontology-cybersecurity` | Cybersecurity and privacy concepts |
| `@memo/ontology-ros` | ROS 2 middleware extension |
| `@memo/ontology-clinical-interop` | Clinical terminology interoperability |
| `@memo/ontology-clinical-procedure` | Clinical evaluation and procedures |
| `@memo/ontology-medical-clinical-trial` | Clinical trial artifacts |
| `@memo/medical-product-line-profile` | Product line modeling (underdeveloped) |

This fragmentation caused several problems:

1. **Discovery friction**: New users had to understand which packages to combine
2. **Namespace proliferation**: 9 different `MEMO_Ontology_*` namespaces to import
3. **Dependency hell**: Profile had to declare extends chains across multiple packages
4. **Toolchain complexity**: init command had to resolve multi-package selection
5. **Test maintenance**: Each package needed its own parse/registry tests

The `medical-modeling-profile` extended 5+ packages, making the extends chain hard to reason about.

---

## Decision

Collapse the 9 packages into **2 authoritative packages** that map cleanly to the ISO 42010 architectural concern hierarchy:

### `@memo/ontology-arch` — Architecture Layers

Contains all 11 ISO 42010 / Arcadia architecture layers:

| Directory | Layer | Key Kinds |
|-----------|-------|-----------|
| `sysml/operational/` | operational | System, Actor, Stakeholder, UseCase, UserNeed, EnvironmentContext |
| `sysml/functional/` | functional | Function, UserActivity, ConstraintDefinition, DataObject |
| `sysml/logical/` | logical | LogicalComponent, Interface, Port |
| `sysml/software/` | software | SoftwareComponent, Software, Firmware, SoftwareInterface |
| `sysml/hardware/` | hardware | HardwareComponent, ElectricalComponent, MechanicalComponent, Microcontroller |
| `sysml/behavioral/` | behavioral | Scenario, Event, OperationalScenario |
| `sysml/verification/` | verification | Requirement, Test, VerificationCase, Evidence |
| `sysml/safety/` | safety | Hazard, HazardousSituation, Harm, Risk, Mitigation, FailureMode |
| `sysml/security/` | security | ThreatScenario, Asset, Control, TrustBoundary |
| `sysml/privacy/` | privacy | DataCategory, ProcessingActivity, DataSubjectCategory, RetentionRule |
| `sysml/relationships/` | crosscutting | All typed connection defs (Mitigates, TraceTo, AllocatedTo, …) |
| `sysml/axioms/` | crosscutting | Restriction axioms (model-level constraints) |
| `sysml/software-extension/` | software | ROS 2 middleware extension kinds |

Namespace: `MEMO_Ontology_Arch_*` (per layer), `MEMO_Ontology_Arch` (aggregate index)

### `@memo/ontology-process` — Regulatory Standards

Contains artifacts from each regulated standard, plus shared common infrastructure:

| Directory | Standard | Key Kinds |
|-----------|---------|-----------|
| `sysml/common/` | Shared | WorkProduct, LifecycleProcess, LifecycleActivity |
| `sysml/iso-14971/` | ISO 14971 | RiskManagementPlan, BenefitRiskAssessment, ResidualRiskEvaluation |
| `sysml/iec-62304/` | IEC 62304 | SoftwareSystem, SoftwareItem, SOUPItem, SoftwareAnomaly, SoftwareLifecycleProcess |
| `sysml/iso-13485/` | ISO 13485 | QualityManagementSystem, CAPA, ManagementReview |
| `sysml/iec-60601/` | IEC 60601 | EssentialPerformance, PrimaryOperatingFunction, SafetyFunction |
| `sysml/iso-14155/` | ISO 14155 | ClinicalEvaluation, PostMarketSurveillance |
| `sysml/iso-27001-27701/` | ISO 27001/27701 | InformationSecurityPolicy, PrivacyImpactAssessment |
| `sysml/fda-21cfr820/` | FDA 21 CFR 820 | DesignControlPlan, DHFRecord, Complaint |
| `sysml/eu-mdr/` | EU MDR | UDILabel, PostMarketClinicalFollowUp |
| `sysml/relationships/` | Shared | Process-specific typed connections |

Namespace: `MEMO_Ontology_Process_*` (per standard), `MEMO_Ontology_Process` (aggregate index)

---

## Consequences

### Positive

- **One import per concern**: device models import `MEMO_Ontology_Arch::*` and `MEMO_Ontology_Process::*`
- **Clear separation**: architecture concepts (what the system IS) vs. process artifacts (what the project DOES)
- **Simpler profile**: `medical-modeling-profile` extends `["@memo/ontology-arch", "@memo/ontology-process"]`
- **Better extensibility**: third-party extensions can extend one or both base packages
- **Fewer test files**: 2 parse/registry integration tests instead of 9
- **SysAnd export**: `index.sysml` in each package provides a single-file entry point for interop tools

### Negative / Trade-offs

- **Migration cost**: all existing models must update their import statements
- **Loss of granularity**: cannot import just "IEC 62304" without pulling in all of ontology-process
- **ROS as sub-module**: ROS 2 extension is embedded in ontology-arch rather than a separate opt-in package; pulling ontology-arch always includes ROS kinds

### Migration Guide

For any model file using old imports:

```sysml
// OLD
import MEMO_Ontology_MedicalArch::*;
import MEMO_Ontology_MedicalProcess::*;

// NEW
import MEMO_Ontology_Arch::*;
import MEMO_Ontology_Process::*;
```

For risk control elements:

```sysml
// OLD
requirement rcFlowLimiter : RiskControl {
    attribute redefines rcId = "RC-001";
}

// NEW
part rcFlowLimiter : Mitigation {
    attribute mitigationId = "RC-001";
    attribute title = "Flow Rate Limiter";
}
```

For risk identification connections:

```sysml
// OLD
connection : Identifies connect risk ::> riskX to hazard ::> hazY;

// NEW
connection : IdentifiesRisk connect source ::> riskX to risk ::> hazY;
```

---

## Alternatives Considered

**Keep 9 packages, improve discoverability**: Rejected. The root problem is the ontology itself being fragmented, not the documentation.

**Collapse to 1 package**: Rejected. The arch/process split is semantically meaningful and maps to the ISO 42010 "concerns" axis. Pure architecture modeling projects can use `ontology-arch` without pulling in regulated-standard artifacts.

**Collapse to 3 packages (arch + safety-process + quality-process)**: Rejected. Adding a third split point adds complexity without proportional benefit at the current scale.
