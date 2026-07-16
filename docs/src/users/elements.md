# Choosing Elements

Choose an element by the engineering statement you want to preserve.

| Statement | Element kind |
|---|---|
| “A nurse programs therapy.” | `Actor` plus `OperationalActivity` |
| “The patient needs controlled analgesia.” | `StakeholderNeed` |
| “The pump shall enforce a bolus limit.” | `SystemRequirement` |
| “Evaluate the requested bolus.” | `LogicalFunction` |
| “Dose-management responsibility.” | `LogicalComponent` |
| “Dose-control firmware image.” | `FirmwareItem` |
| “Unintended over-infusion.” | `Hazard` |
| “Independent maximum-dose monitor.” | `RiskControl` |
| “Verify lockout interval enforcement.” | `VerificationCase` |
| “Approved test report 2.1.” | `Evidence` |

## A reliable naming pattern

```sysml
requirement reqBolusLimit : SystemRequirement {
    attribute :>> id = "REQ-025";
    attribute :>> name = "EnforceBolusLimit";
    attribute :>> statement =
        "The pump shall reject a bolus request that exceeds the configured limit.";
}
```

- `reqBolusLimit` is the SysML reference name.
- `REQ-025` is the lifecycle-stable engineering identifier.
- `EnforceBolusLimit` is a concise display name.
- `statement` contains the reviewable obligation.

## Common distinctions

**Need versus requirement:** a need expresses a stakeholder outcome; a
requirement makes a bounded, verifiable obligation.

**Function versus component:** a function says what transformation occurs; a
component says who or what owns responsibility.

**Hazard versus harm:** a hazard is a potential source of harm; harm is the
injury or damage.

**Verification versus evidence:** a verification case describes the check;
evidence records the result or artifact.

After choosing elements, connect them with
[typed relationships](relationships.md).
