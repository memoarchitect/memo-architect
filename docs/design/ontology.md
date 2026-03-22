# Ontology & Type System

The MEMO ontology defines the vocabulary of entity types and relationship types that models are built from.

## Package Direction

MEMO is moving to a layered ontology structure:

- **`@memo/ontology-core`** — domain-agnostic MBSE backbone
- **`@memo/ontology-medical`** — regulated medical device development backbone built on top of core
- **Product-family extensions** — device or platform specific packages
- **Rules / views / templates** — separate from ontology packages

The current `@memo/ontology` package is a frozen compatibility shim layered on top of `@memo/ontology-medical`. It preserves the legacy `MEMO_Ontology` surface while the clean backbone lives in `@memo/ontology-core` and `@memo/ontology-medical`. See [ADR-1-6](../adr/ADR-1-6-ontology-core-medical-split.md) and [ADR-1-7](../adr/ADR-1-7-legacy-ontology-compatibility-policy.md).

## Design Philosophy

MEMO uses **SysML v2 specialization** as the type mechanism. Rather than inventing a proprietary metamodel, entity kinds are defined as SysML v2 definitions that specialize base constructs:

```sysml
// Ontology definition (in @memo/ontology)
part def Hazard {
    attribute name : String;
    attribute severity : String;
}

// User model (specializes the ontology type)
part def OverInfusion :> Hazard {
    attribute redefines name = "Over-infusion of drug";
    attribute redefines severity = "critical";
}
```

The `:>` operator means "specializes" — the user's `OverInfusion` inherits all attributes from `Hazard`.

## Entity Kinds

Entity kinds are mapped to SysML v2 constructs:

| Construct | Used For | Examples |
|---|---|---|
| `part def` | Physical/logical elements | System, Component, InterfaceContract |
| `requirement def` | Needs and requirements | StakeholderNeed, UserNeed, SystemRequirement |
| `action def` | Functions/behaviors | SystemFunction, OperationalActivity |
| `port def` | Interfaces/ports | Port, DataPort, FlowPort |
| `connection def` | Relationships | mitigates, derives, verify |

### Intended Boundary

As the ontology is split:

- **Core** keeps reusable MBSE concepts such as stakeholders, requirements, functions, logical/physical/software architecture, interfaces, system-of-systems integration, message/data-modeling semantics, analysis, verification, and procedure-context semantics such as environments, performers, subjects, and resources.
- **Medical base** adds medical-device-specific concepts such as `UserNeed`, risk management, residual-risk / benefit-risk governance, cybersecurity, clinical-terminology anchors, design-control/usability artifacts, software lifecycle semantics, safety/essential-performance concepts, structured FTA / FMEA risk-analysis semantics, clinical evaluation / claims semantics, lifecycle-operations semantics, regulated product-configuration anchors, and ROS-specialized messaging/platform semantics.
- **Extensions** still carry device-family or technology-specific concepts when the repo eventually supports them as independent packages. The current medical backbone only includes reusable product-family/configuration semantics that are broadly applicable across regulated medical devices.

### SysML v2 Compliance Boundary

MEMO's ontology files are authored against the SysML v2 textual constructs that the current parser actually supports:

- `package` / `import`
- `part def`, `requirement def`, `action def`, `port def`, `interface def`, `item def`, `connection def`, `attribute def`, `enum def`
- specialization via `:>`
- typed connection ends, usages, viewpoints, and views

The ontology packages were audited to stay inside that supported subset. They do not rely on custom ontology-only syntax, and they no longer document unsupported `:>>` specialization examples.

This is **SysML v2 subset compliance**, not a claim that MEMO implements the full OMG SysML 2.0 language. The current parser/serializer boundary is intentionally narrower than the full formal specification.

### Compatibility Policy

`@memo/ontology` is now treated as a frozen compatibility shim:

- new ontology concepts go to `@memo/ontology-core` or `@memo/ontology-medical`
- legacy `MEMO_Ontology::*` imports remain supported
- remaining legacy-only content such as `Responsibility`, `LogicalComponentExternal`, behavior helper kinds, and `Catheter` should not drive new backbone design

## Relationship Types

Relationships are defined as SysML v2 connection definitions with typed ends:

```sysml
connection def mitigates {
    end control : RiskControl;
    end hazard : Hazard;
}
```

Each relationship type has:

- **Name** — The relationship identifier (e.g., `mitigates`)
- **Source end** — Typed reference to the source element kind
- **Target end** — Typed reference to the target element kind
- **Layer** — CoSMA layer it belongs to
- **Color** — Visualization color

### Selected Relationship Types

| Type | Source → Target | Layer | Purpose |
|---|---|---|---|
| `derives` | Need/Requirement → derived Requirement | requirements | Downstream requirement derivation |
| `refines` | Base concern/use case → refiner | requirements | More precise refinement when generic tracing is too weak |
| `traceTo` | Element → Element | requirements | Fallback trace only when no stronger stable semantics are worth encoding |
| `participatesInSystemOfSystems` | System → System Of Systems | logical | Explicit system-of-systems membership for connected device ecosystems |
| `exposesInterface` | System/component → Data Interface | interfaces | Declares a system-owned integration surface |
| `hasEndpoint` | Data Interface → Data Endpoint | interfaces | Binds an interface to a concrete endpoint/port |
| `implementsProtocol` | Interface subject → Communication Protocol | interfaces | Captures wire/API protocol semantics |
| `conformsToProfile` | Interface subject → Interoperability Profile | interfaces | Captures profile-level interoperability commitments |
| `carriesExchangeItem` | Data Interface → Exchange Item | interfaces | Declares the payload or message family an interface carries |
| `publishesTo` / `subscribesTo` | publisher/subscriber → Publish Subscribe Channel | interfaces | Declares message-channel participation explicitly instead of relying on generic tracing |
| `publishesMessage` / `consumesMessage` | publisher/subscriber → Message | interfaces | Captures the message type actually emitted or consumed |
| `servesInterface` / `invokesInterface` | provider/consumer → Request Response Interface | interfaces | Distinguishes service server and service client roles |
| `carriesRequestMessage` / `carriesResponseMessage` | Request Response Interface → request/response message | interfaces | Makes request/response payload semantics first-class |
| `definesMessageSchema` / `hasMessageField` | Message Schema → message/field | interfaces | Captures message-structure semantics without flattening them into comments or generic evidence |
| `hasSubProcedure` | Procedure → Procedure step | operational | Procedure decomposition for reusable workflow structure |
| `performedBy` | Procedure → Operational Actor | operational | Explicit performer or user role |
| `performedOn` | Procedure → Operational Entity | operational | Explicit subject/recipient of a procedure |
| `occursIn` | Procedure → Operational Environment | operational | Explicit use-context / environment assignment |
| `usesResource` | Procedure → Resource/element | operational | Procedure-to-resource usage trace |
| `hasEquipment` | Environment → equipment | operational | Environment resource availability |
| `hasPersonnel` | Environment → Operational Actor | operational | Environment staffing / user presence |
| `containsSubstance` | Environment → Substance | operational | Environment material/substance context |
| `mitigates` | RiskControl → Hazard | risk | ISO 14971 risk mitigation |
| `causes` | Hazard → HazardousSituation | risk | Causal chain |
| `leadsTo` | HazardousSituation → Harm | risk | Harm pathway |
| `identifies` | Risk → Hazard | risk | Risk record identifies the associated hazard |
| `plansRiskManagement` | Risk Management Plan → risk-governance subject | qms | Explicit ISO 14971 planning scope across risks and analyses |
| `assessesResidualRisk` | Residual Risk Evaluation → Risk/HazardousSituation/Harm | risk | Explicit residual-risk acceptability linkage |
| `weighsAgainstBenefit` | Benefit-Risk Assessment → Clinical Benefit | risk | Connects benefit-risk rationale to the claimed clinical benefit |
| `concludesBenefitRisk` | Benefit-Risk Assessment → residual-risk subject | risk | Captures the assessment outcome over residual-risk evaluations |
| `concludesOverallResidualRisk` | Risk Management Report → Overall Residual Risk Evaluation | qms | Records overall residual-risk acceptability in a governed report |
| `monitorsRiskSubject` | Production/Post-Production Signal → Hazard/Harm/Risk/Control | qms | Feeds production/post-production learning back into the risk backbone |
| `modelsThreat` | Threat Model → Threat Scenario | risk | Connects cybersecurity analysis structure to concrete threat scenarios |
| `threatensAsset` | Threat Scenario → Cyber Asset | risk | Declares the cyber asset under attack |
| `exploitsVulnerability` | Threat Scenario → Vulnerability | risk | Captures the vulnerability a threat depends on |
| `mitigatesThreat` | Security Control → Threat Scenario | risk | Connects a security control to the threat it reduces |
| `securesInterface` | Security Control → Data Interface | risk | Declares which integration surface the control protects |
| `maintainsSbom` | SBOM Artifact → software subject | software-lifecycle | Links SBOM content to the software it enumerates |
| `supportsSecureUpdate` | Secure Update Capability → software/cyber asset | software-lifecycle | Captures update/authenticity capability for connected devices |
| `bindsTerminology` | Terminology Binding → interface/observation | interfaces | Associates an interface with external clinical terminology semantics |
| `referencesCodeSystem` / `referencesValueSet` | Terminology Binding → terminology reference | interfaces | Records versioned external terminology anchors without importing their full content |
| `usesConceptMap` / `mapsSourceCodeSystem` / `mapsTargetCodeSystem` | Binding/concept map → terminology systems | interfaces | Captures translation boundaries between device-local and external clinical terminology |
| `claimsForUse` | Clinical Claim → Intended Use / Indication | design-control | Binds claims to the clinical use context they are meant to support |
| `supportsClinicalClaim` / `evaluatesClinicalClaim` | Clinical evidence / evaluation report → Clinical Claim | qms | Connects claims to evidence sources and governed clinical-evaluation conclusions |
| `manufacturesSubject` / `installsSubject` / `maintainsSubject` / `calibratesSubject` | Lifecycle procedure → device subject | operational | Makes manufacturing, installation, maintenance, and calibration first-class lifecycle traces |
| `hasProductVariant` / `selectsFeature` / `configuresItem` / `constrainsVariant` | Family/baseline/constraint → variant subject | logical / qms / design-control | Captures regulated product-family and baseline semantics without collapsing into ad hoc trace links |
| `analyzesFailureMode` | FMEA → Failure Mode | risk | Structured failure analysis coverage |
| `hasFailureCause` | Failure Mode → Failure Cause | risk | Captures why a failure mode occurs |
| `resultsInFailureEffect` | Failure Mode → Failure Effect | risk | Captures what the failure mode produces |
| `escalatesToRisk` | Failure Effect → Hazard/HazardousSituation | risk | Connects analysis effects into ISO 14971 risk structure |
| `detectsFailureMode` | RiskControl/DetectionControl → Failure Mode | risk | Detection-oriented control trace |
| `definesTopEvent` | Fault Tree Analysis → Top Event | risk | Declares the fault tree objective |
| `contributesToEvent` | Basic/Intermediate Event → parent Event | risk | Fault propagation toward the top event |
| `triggersHazardousSituation` | Top Event → HazardousSituation | risk | Connects fault-tree outcomes into the risk chain |
| `hasAnatomicalSite` | subject/procedure → Anatomical Site | operational | Connects procedures or recipients to the relevant body site |
| `usesMethod` | Procedure → Procedure Method | operational | Explicit procedure-method semantics |
| `usesRoute` | Procedure → Route Of Administration | operational | Explicit route semantics |
| `producesObservation` | Procedure → Clinical Observation | operational | Procedure outcome / observation production |
| `observesSubject` | Clinical Observation → patient/site/state | operational | Observation target semantics |
| `affectsMorphology` | Procedure → Morphology State | operational | Morphology/state change caused by a procedure |
| `appliesEnvironmentQualifier` | Environment → Clinical Environment Qualifier | operational | Explicit sterile/clinical environment qualifiers |
| `addressesUseError` | UI Requirement → Use Error | design-control | Explicit IEC 62366 usability trace |
| `analyzesUseError` | Use Error Analysis → Use Error | design-control | Use-error analysis structure |
| `evaluatesRequirement` | Validation Case → UI Requirement | verification | Formative/summative evaluation linkage |
| `supportsOperatingFunction` | Essential Performance → Primary Operating Function | safety | Essential-performance claim tied to the protected function |
| `definesLossCondition` | Essential Performance → EP Loss Condition | safety | Explicit loss-of-essential-performance semantics |
| `protectsEssentialPerformance` | RiskControl → Essential Performance | safety | Stronger safety trace from control to protected performance |
| `implementsRiskControl` | Implementer → RiskControl | safety | Requirement/function/architecture implementation of a control |
| `governsActivity` | Lifecycle Process → Lifecycle Activity | software-lifecycle | IEC 62304 process-to-activity structure |
| `producesWorkProduct` | Lifecycle Activity → Work Product | software-lifecycle | IEC 62304 activity-to-artifact structure |
| `satisfy` | Element → Requirement | requirements | Satisfaction link |
| `verify` | Test → Requirement/RiskControl | verification | Verification evidence |
| `documents` / `evidences` | QMS record/evidence → subject | qms | DHF / evidence trace across regulated artifacts |

## Ontology Package

The current `@memo/ontology` package ships a compatibility surface:

```
packages/ontology/
  sysml/
    entities/          # Part/requirement/action/port definitions
    relationships/     # Connection definitions
    index.sysml       # Package entry point
  memo.config.yaml    # Base config for layers, kinds, relationships, and viewpoints
```

`@memo/medical` now extends `@memo/ontology-medical` for rules, viewpoints, and templates. The legacy `@memo/ontology` package remains only as a frozen compatibility shim for existing imports.

## Target Package Stack

The target package stack is:

```text
@memo/ontology-core
  ├── purpose / program / stakeholder concerns
  ├── operational (including procedures, environments, performers, subjects, resources)
  ├── requirements
  ├── functional
  ├── logical (including system-of-systems anchors)
  ├── physical
  ├── software
  ├── interfaces (including data interfaces, protocols, profiles, endpoints, messages, schemas, pub-sub, and request-response semantics)
  ├── analysis
  ├── verification
  └── relationships

@memo/ontology-medical
  ├── clinical-evaluation
  ├── clinical-context
  ├── cybersecurity-interoperability
  ├── design-control
  ├── medical-development (`UserNeed` on top of `StakeholderNeed`)
  ├── operations-service
  ├── product-line
  ├── platform (including ROS-specialized nodes, topics, publications, subscriptions, services, and message-schema types)
  ├── risk-management (including residual risk, benefit-risk, and post-market anchors)
  ├── risk-analysis (FTA / FMEA semantics on top of medical risk management)
  ├── software-lifecycle
  ├── safety-essential-performance
  ├── regulatory-trace references
  └── medical relationship specializations
```

Rules, viewpoints, completeness logic, and example models remain outside ontology packages. This separation is deliberate: the ontology carries the reusable model semantics, while `@memo/medical` carries viewpoint and rule concerns in line with ISO/IEC/IEEE 42010's distinction between model content and viewpoint-driven description.
