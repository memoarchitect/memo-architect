# Quick Start

**Canonical 5-minute path:** install → scaffold → first output. Once it works, see [Starting a New Project](new-project.md) for the full walkthrough.

## 1. Create a New Project

```bash
memo init my-device
```

This scaffolds:

```
my-device/
  memo.config.yaml     # Project config extending @memo/medical-modeling-profile
  model/
    my-device.sysml    # Starter SysML v2 file
```

## 2. Explore the Starter File

Open `model/my-device.sysml`:

```sysml
package my_device {
    import MEMO_Ontology_Medical::*;

    part myDeviceSystem : System {
        attribute redefines name = "my-device";
    }

    requirement mainRequirement : SystemRequirement {
        attribute redefines title = "Main system requirement";
    }

    requirement exampleHazard : Hazard {
        attribute redefines title = "Example hazard";
    }
}
```

The `:>` operator specializes from entity kinds defined in the ontology (e.g., `System`, `SystemRequirement`, `Hazard`). These kinds are defined in the medical domain config.

## 3. Start the Dev Server

```bash
cd my-device
memo-architect dev
```

Your browser opens at `http://localhost:3000` showing:

- **Diagram** — Interactive graph of your model elements and relationships
- **Sidebar** — Searchable model explorer grouped by CoSMA layer
- **Completeness Bar** — Overall and per-layer completeness percentages
- **Viewpoint Selector** — Filter the diagram by viewpoint (Risk, Requirements, etc.)
- **Gap Bar** — Validation violations from closure rules

## 4. Add Elements and Relationships

Edit your `.sysml` file and save. The dev server detects the change and instantly updates the browser.

### Adding a risk control relationship:

```sysml
requirement flowSensorControl : RiskControl {
    attribute redefines title = "Flow rate monitoring sensor";
}

connection : Mitigates connect control ::> flowSensorControl to hazard ::> exampleHazard;
```

The diagram will show a `mitigates` edge from `flowSensorControl` to `exampleHazard`, and the closure rule CR-MED-001 will be satisfied.

## 5. Validate Your Model

```bash
memo validate
```

Output:

```
MEMO Validate

Project: my-device
  3 elements, 1 relationships, 2 violations, 33% complete

  Violations:
    ERROR  CR-MED-001  Hazard "Example hazard" has no mitigates relationship
    WARN   CR-MED-007  Requirement "Main system requirement" has no derives relationship

  Completeness:
    risk          ████░░░░░░  50%
    requirements  ██░░░░░░░░  25%
    overall       ███░░░░░░░  33%
```

## 6. Organize by Domain

As your model grows, split into files by domain:

```
model/
  risk/
    hazards.sysml
    risk-controls.sysml
  requirements/
    user-needs.sysml
    system-requirements.sysml
  architecture/
    system-architecture.sysml
  verification/
    tests.sysml
```

The parser recursively finds all `.sysml` files — organize however suits your workflow.

## Next Steps

- **Detailed walkthrough** → [Starting a New Project](new-project.md) — CoSMA layers, SysML syntax, multi-file models
- **All CLI commands** → [CLI Usage](cli-usage.md)
- **Customize your model** → [Configuration Reference](../developers/config/reference.md)
- **Understand the internals** → see `docs/architecture/README.md`
