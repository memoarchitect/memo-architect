# Validation & Closure Rules

MEMO enforces **closure rules** — automated checks that verify your model has
complete traceability as required by ISO 14971, IEC 62304, and ISO 13485.

## Running Validation

```bash
pnpm memo validate
```

This parses your model, checks all closure rules, and reports gaps:

```
MEMO Validate — my-device

Checking 15 closure rules against 74 elements...

✗ CR-MED-001  Every Hazard must have ≥1 mitigates relationship
              Missing: hazAirEmbolism (Air Embolism)

✗ CR-MED-007  Every SoftwareRequirement must trace to SystemRequirement
              Missing: swReqLogging (Audit Logging)

⚠ CR-MED-008  Every SystemRequirement should trace to UserNeed
              Missing: sysReqBattery (Battery Life)

Results: 2 errors, 1 warning — 94% complete
```

- **Errors** (`✗`) — must be fixed; `memo validate` exits with code 1 (blocks CI)
- **Warnings** (`⚠`) — should be fixed; does not block CI

## The 15 Medical Closure Rules

### Risk Management — ISO 14971

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-001 | Every **Hazard** must have ≥1 `mitigates` relationship | Error |
| CR-MED-002 | Every **Hazard** must trace to ≥1 SystemFunction or UseCase | Error |
| CR-MED-003 | Every **RiskControl** must be verified by ≥1 Test | Error |
| CR-MED-004 | Every **Risk** must identify ≥1 Hazard | Error |
| CR-MED-005 | Every **HazardousSituation** must be caused by a Hazard | Error |
| CR-MED-006 | Every **Harm** must be led to by a HazardousSituation | Warning |

### Requirements Traceability — IEC 62304

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-007 | Every **SoftwareRequirement** must trace to SystemRequirement | Error |
| CR-MED-008 | Every **SystemRequirement** should trace to UserNeed | Warning |
| CR-MED-009 | Every **SystemRequirement** should be satisfied by Component | Warning |

### Architecture Completeness

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-010 | Every **SystemFunction** must be allocated to Component/Software | Error |
| CR-MED-011 | Every **Software** must have `safetyClassification` attribute | Error |
| CR-MED-012 | Every **UseCase** should trace to ≥1 Scenario | Warning |

### Verification

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-013 | Every **SystemRequirement** should be verified by ≥1 Test | Warning |
| CR-MED-014 | Every **SoftwareRequirement** should be verified by ≥1 Test | Warning |
| CR-MED-015 | Every **UserNeed** should trace to ≥1 UseCase | Warning |

## The Completeness Bar (Web UI)

When running `memo dev`, the web UI shows a **completeness bar** at the bottom
of the screen. This visualizes the same closure rules in real time:

- **Green segments** — rules fully satisfied
- **Red/orange segments** — rules with gaps
- **Percentage** — overall model completeness

Click a segment to see which elements are missing connections.

## Fixing Common Gaps

### "Hazard has no mitigates" (CR-MED-001)

Every hazard needs at least one risk control mitigating it:

```sysml
// Add a risk control
requirement rcAlarmSystem : RiskControl {
    attribute redefines name = "Audible Alarm System";
}

// Connect it to the hazard
connection : mitigates connect rcAlarmSystem to hazAirEmbolism;
```

### "SoftwareRequirement not traced to SystemRequirement" (CR-MED-007)

```sysml
connection : traceTo connect swReqLogging to sysReqAuditTrail;
```

### "Software missing safetyClassification" (CR-MED-011)

```sysml
part myFirmware : Software {
    attribute redefines name = "Control Software";
    attribute redefines safetyClassification = "C";  // A, B, or C per IEC 62304
}
```

### "SystemRequirement not verified by Test" (CR-MED-013)

```sysml
part testBattery : Test {
    attribute redefines name = "Battery Life Test";
    attribute redefines testType = "System";
}

connection : verify connect testBattery to sysReqBattery;
```

## Using Validation in CI

Add validation to your CI pipeline to block merges with incomplete traceability:

```yaml
# .github/workflows/validate.yml
- name: Validate MEMO model
  run: pnpm memo validate
  # Exit code 1 = errors found → build fails
```

!!! tip "Progressive enforcement"
    Start with warnings-only mode while your model is still growing. Once
    the core traceability is in place, enable error-level rules in CI.

## Custom Closure Rules

You can define additional closure rules in your `memo.config.yaml`:

```yaml
extends: "@memo/medical"

closureRules:
  - id: CR-PROJ-001
    description: "Every Component must be allocated to a PhysicalModule"
    sourceKind: Component
    relationship: allocateTo
    targetKinds: [PhysicalModule]
    minCount: 1
    severity: warning
```

## Next Steps

- [Viewpoints & Diagrams](viewpoints-diagrams.md) — visualize your model by concern
- [Modeling Your Device](modeling-guide.md) — add more elements and relationships
