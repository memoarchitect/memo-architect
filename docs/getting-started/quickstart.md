# Quick Start

This guide walks you through creating a new MEMO project and running the dev server.

## 1. Create a New Project

```bash
memo init my-device
```

This scaffolds:

```
my-device/
  memo.config.yaml     # Project config extending @memo/medical
  model/
    my-device.sysml    # Starter SysML v2 file
```

## 2. Explore the Starter File

Open `model/my-device.sysml`:

```sysml
package my_device {
    part def MyDeviceSystem :>> System {
        attribute redefines name = "my-device";
    }

    requirement def MainRequirement :>> SystemRequirement {
        attribute redefines name = "Main system requirement";
    }

    part def ExampleHazard :>> Hazard {
        attribute redefines name = "Example hazard";
    }
}
```

The `:>>` operator specializes from entity kinds defined in the ontology (e.g., `System`, `SystemRequirement`, `Hazard`). These kinds are defined in the medical domain config.

## 3. Start the Dev Server

```bash
cd my-device
memo dev
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
part def FlowSensor :>> RiskControl {
    attribute redefines name = "Flow rate monitoring sensor";
}

connection : mitigates connect FlowSensor to ExampleHazard;
```

The diagram will show a `mitigates` edge from FlowSensor to ExampleHazard, and the closure rule CR-MED-001 will be satisfied.

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
    WARN   CR-MED-007  Requirement "Main system requirement" has no traceTo

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

- Read the [CLI Reference](cli-reference.md) for all commands and options
- Explore the [Configuration Reference](../config/reference.md) to customize kinds, rules, and viewpoints
- See the [Architecture Overview](../architecture/overview.md) to understand the tool internals
