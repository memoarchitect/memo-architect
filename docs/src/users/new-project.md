# Starting a New Project

**Detailed walkthrough.** If you haven't done the 5-minute quickstart yet, start there → [Quick Start](running.md).

This guide covers the full project structure, CoSMA layers, SysML syntax patterns, and how to organize larger models.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20 |
| pnpm | >= 9.15 |

Make sure MEMO is built first:

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
pnpm install
pnpm build
```

## 1. Scaffold Your Project

```bash
pnpm memo init my-device
```

This creates:

```
my-device/
├── memo.config.yaml      # Project configuration
└── model/
    └── my-device.sysml    # Starter model file
```

### What's in `memo.config.yaml`?

```yaml
projectName: my-device
projectType: device

extends: "@memo/medical-modeling-profile"

ontologies:
  - name: "@memo/ontology"
    version: "^0.4.0"
```

The key line is `extends: "@memo/medical-modeling-profile"`. This gives you:

- **250+ element kinds** across 10+ CoSMA layers (purpose, requirements, risk,
  functional, logical, physical, software, interfaces, verification, UI)
- **110+ relationship types** including cyber/integration, clinical-evidence, lifecycle-operations, data-messaging, and risk-analysis traces
- **109 closure rules** aligned with ISO 14971, IEC 62304, IEC 62366, IEC 60601, FDA-aligned cybersecurity expectations, privacy/data-governance and terminology-import boundary semantics, regulated lifecycle/configuration traceability, and event-driven data-interface semantics
- **11 viewpoints** for focused views of your model

## 2. Understand the CoSMA Layers

MEMO organizes every element into a **CoSMA layer** — a standardized systems
engineering decomposition. When you create an element of a certain kind,
it automatically belongs to its layer.

| Layer | Example Kinds | Purpose |
|-------|---------------|---------|
| **Purpose** | Actor, Stakeholder, Goal, Concern | Who cares about the device and why |
| **Requirements** | UserNeed, SystemRequirement, SoftwareRequirement | What the device must do |
| **Risk** | Hazard, HazardousSituation, Harm, Risk, RiskControl | ISO 14971 risk management |
| **Functional** | UseCase, Scenario, SystemFunction, ComponentFunction | Workflows and functions the device performs |
| **Logical** | System, Subsystem, LogicalComponent | Logical decomposition |
| **Physical** | Microcontroller, ElectricalComponent, MechanicalComponent | Physical hardware |
| **Software** | Software, SoftwareComponent, Firmware | Software architecture |
| **Interfaces** | Port, PortEthernet, Interface, DataType | Connection points |
| **Verification** | Test | Test definitions |
| **UI** | UIScreen, UIPanel, UIElement | Product UI elements traceable to requirements and risk |

## 3. Write Your First Elements

Open `model/my-device.sysml` and start adding elements:

```sysml
package MyDevice {
    import MEMO_Ontology_Medical::*;

    // A stakeholder
    part surgeon : Actor {
        attribute redefines name = "Surgeon";
    }

    // A requirement
    requirement sysReqSafeCutting : SystemRequirement {
        attribute redefines title = "Safe Cutting";
        doc /* The device shall stop cutting if tissue resistance exceeds 5N */
    }

    // A hazard (risk layer)
    requirement hazExcessiveForce : Hazard {
        attribute redefines title = "Excessive Cutting Force";
    }

    requirement rcForceLimiter : RiskControl {
        attribute redefines title = "Force limiting control";
    }

    // Connect the risk control to the hazard
    connection : Mitigates connect control ::> rcForceLimiter to hazard ::> hazExcessiveForce;
}
```

### SysML Syntax Quick Reference

| Pattern | When to use |
|---------|-------------|
| `part myId : KindName { ... }` | Most elements (actors, components, functions) |
| `requirement myId : KindName { ... }` | Requirements, hazards, risks |
| `action myId : KindName { ... }` | Activities, scenarios, use cases |
| `connection : relType connect source to target;` | Relationships |
| `attribute redefines title = "...";` | Set the display label for requirements and risk claims |
| `attribute redefines name = "...";` | Set the display label for parts and actions |
| `doc /* ... */` | Add documentation |

!!! info "Construct is automatic"
    You don't need to memorize which SysML construct to use. When you import via
    CSV, MEMO auto-derives the construct from the element kind. In `.sysml` files,
    refer to the repository architecture docs for which construct
    each kind uses.

## 4. Launch the Dev Server

```bash
cd my-device
pnpm memo dev --port 3000
```

Or from the repo root:

```bash
pnpm memo dev --port 3000
```

This starts:

1. **File watcher** — monitors `model/` for `.sysml` changes
2. **Parser** — builds the semantic model in real time
3. **WebSocket server** — pushes model updates to the browser
4. **Web UI** — interactive diagram viewer at `http://localhost:3000`

The browser opens automatically. Every time you save a `.sysml` file, the
diagram and sidebar update instantly.

## 5. Explore the Web UI

The MEMO web app has several panels:

- **Viewpoint Browser** (left sidebar) — switch between viewpoints and diagrams
- **Diagram Canvas** (center) — interactive graph with ELK.js layout
- **Properties Panel** (right sidebar) — inspect selected elements
- **Completeness Bar** (bottom) — shows model completeness per closure rule

### Try These Actions

1. Click a viewpoint (e.g., "Risk Overview") to filter the diagram
2. Click an element node to see its properties
3. Use the completeness bar to identify traceability gaps
4. Switch viewpoints to see different slices of your model

## 6. Organize Larger Models

As your model grows, split into multiple files:

```
my-device/
├── memo.config.yaml
└── model/
    ├── purpose/
    │   └── actors-stakeholders.sysml
    ├── requirements/
    │   ├── user-needs.sysml
    │   ├── system-requirements.sysml
    │   └── software-requirements.sysml
    ├── functional/
    │   └── use-cases-and-functions.sysml
    ├── risk/
    │   └── hazard-analysis.sysml
    ├── architecture/
    │   ├── logical.sysml
    │   ├── physical.sysml
    │   └── software.sysml
    └── verification/
        └── tests.sysml
```

MEMO recursively parses all `.sysml` files under `model/`. Use subdirectories
freely — they don't affect the model semantics.

!!! tip "One package per file"
    Keep each `.sysml` file in its own `package` block. Use `import` to
    reference elements across packages.

## Next Steps

- **Have existing data?** → [Importing Existing Data](importing-data.md)
- **Need to add traceability?** → [Modeling Your Device](modeling-guide.md)
- **Ready to check compliance?** → [Validation & Closure Rules](validation.md)
