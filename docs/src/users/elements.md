# Choosing Elements

Choose an element by the engineering statement you want to preserve.

| Statement | Element kind |
|---|---|
| "The pump is used for patient-controlled analgesia in adults." | `IntendedUse` |
| "A nurse programs therapy." | `User` (actorKind: clinician) plus an `OperativeAction` |
| "Deliver PCA therapy." | `SystemUseCase` or `ClinicalUseCase` |
| "The patient needs controlled analgesia." | `Need` (needKind: stakeholder) |
| "The pump shall enforce a bolus limit." | `Requirement` (requirementType: system) |
| "Evaluate the requested bolus." | `SystemFunction` |
| "Dose-management responsibility." | `LogicalComponent` |
| "Infusion manager software unit." | `SoftwareModule` (moduleKind: unit) |
| "The main controller MCU." | `ProcessingNode` |
| "Unintended over-infusion." | `Hazard` |
| "Respiratory depression." | `Harm` |
| "Independent maximum-dose monitor." | `RiskControlMeasure` |
| "Unauthorized change to the drug library." | `Threat` |
| "Verify lockout interval enforcement." | `VerificationCase` |
| "Approved test report 2.1." | `MemoEvidence` |

The [Modeling](../modeling/layers/index.md) section lists every kind in each
layer, with figures and examples.

## A reliable naming pattern

```sysml
requirement reqBolusLimit : Requirement {
    attribute :>> requirementType = RequirementTypeKind::system;
    @MemoIdentity { :>> providedId = "REQ-025"; :>> label = "EnforceBolusLimit"; }
    attribute :>> statement =
        "The pump shall reject a bolus request that exceeds the configured limit.";
}
```

- `reqBolusLimit` is the SysML reference name, used in source and relationships.
- `REQ-025` is the lifecycle-stable engineering identifier. Leave
  `providedId` out and MEMO hands out an id from the element's id family.
- `EnforceBolusLimit` is a concise display name; the explorer shows it.
- `statement` contains the reviewable obligation.

## Common distinctions

**Need versus requirement:** a need expresses a stakeholder outcome; a
requirement makes a bounded, verifiable obligation.

**Function versus component:** a function says what transformation occurs; a
component says who or what owns the responsibility. Join them with `allocate`.

**Logical versus physical:** a logical component is a responsibility; software
and hardware realize it (`RealizedBy`).

**Hazard versus harm:** a hazard is a potential source of harm; harm is the
injury or damage. A hazardous situation sits between them.

**Verification versus validation:** a verification case checks a requirement
or control; a validation case checks a need or the intended use.

**Verification case versus evidence:** a case describes the check; evidence
records the result.

After choosing elements, connect them with
[typed relationships](relationships.md).
