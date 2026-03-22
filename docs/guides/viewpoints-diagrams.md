# Viewpoints & Diagrams

MEMO organizes your model into **viewpoints** — focused lenses that show only
the elements and relationships relevant to a specific concern. Each viewpoint
supports specific **SysML v2 diagram types** for documentation and review.

## What Are Viewpoints?

A viewpoint filters your model to show a subset of elements and relationships.
Instead of looking at the entire model at once, you focus on one concern:

| Viewpoint | Focus | Diagram Types |
|-----------|-------|---------------|
| **Model** (auto) | Everything — complete model | BDD |
| **System Architecture** | Logical & physical decomposition | BDD, IBD, ACT, PKG |
| **Requirements Traceability** | Requirements chain (needs → sys → sw) | REQ, PKG |
| **Use Case View** | Actors, use cases, scenarios | UCD, ACT, PKG |
| **Verification & Validation** | Tests and requirement coverage | REQ, PAR, PKG |
| **Risk Overview** | ISO 14971 hazard chain | RISK, REQ, PKG |
| **Software Architecture** | Software decomposition | BDD, IBD, PKG |
| **Physical Architecture** | Hardware and physical BOM | BDD, IBD, PKG |

## Semantic Home vs Viewpoint

Organize ontology packages and model files by each kind's semantic home.
Use viewpoints as review and navigation slices that cut across those homes.

| Semantic Home | Typical Kinds | Common Viewpoints |
|-----------|-----------|-----------|
| **Purpose** | Actor, Stakeholder, Goal, Concern | Use Case View, Requirements Traceability |
| **Requirements** | UserNeed, SystemRequirement, SoftwareRequirement, UserInterfaceRequirement | Requirements Traceability, Software Architecture, Usability Engineering |
| **Functional / Operational** | UseCase, Scenario, SystemFunction, Procedure, UserActivity | System Architecture, Usability Engineering, Safety Analysis |
| **Logical / Physical** | System, Subsystem, LogicalComponent, PhysicalComponent, Microcontroller | System Architecture, Physical Architecture, Lifecycle Operations |
| **Software / Interfaces** | SoftwareComponent, Firmware, DataInterface, Message, RosNode | Software Architecture, Data & Messaging, Cybersecurity & Interoperability |
| **Risk / Safety** | Hazard, Harm, RiskControl, EssentialPerformance, SafetyFunction | Risk Overview, Risk Analysis, Safety Analysis, Usability Engineering |
| **QMS / Lifecycle** | DesignHistoryRecord, SoftwareWorkProduct, RiskManagementReport | Software Architecture, Clinical Evidence & Claims, Lifecycle Operations |
| **UI** | UIElement, UIScreen, UIPanel | Usability Engineering, Safety Analysis |

## Using Viewpoints in the Web UI

1. Launch the dev server: `pnpm memo dev --port 3000`
2. Open the **Viewpoint Browser** (left sidebar)
3. Click a viewpoint to filter the diagram
4. Click a diagram within the viewpoint to see a specific view

### Viewpoint Browser Features

- **Viewpoint sections** — expandable groups with diagram lists
- **Diagram type badges** — colored labels (BDD, REQ, RISK, etc.)
- **Auto indicators** — marks auto-generated diagrams
- **Element count** — shows how many elements are visible

## Diagram Types

MEMO supports SysML v2 diagram types. Each type has a specific purpose:

| Type | Full Name | Color | Use For |
|------|-----------|-------|---------|
| **BDD** | Block Definition Diagram | Purple | System structure, component hierarchy |
| **IBD** | Internal Block Diagram | Teal | Internal connections and flows |
| **REQ** | Requirements Diagram | Blue | Requirements hierarchy and traceability |
| **UCD** | Use Case Diagram | Orange | Actor-system interactions |
| **ACT** | Activity Diagram | Yellow | Workflows and processes |
| **PKG** | Package Diagram | Gray | Package organization |
| **PAR** | Parametric Diagram | Green | Constraint relationships |
| **RISK** | Risk Diagram | Red | Hazard chains (medical extension) |

## Default Diagrams

Each viewpoint comes with a default diagram that shows all relevant elements.
The medical config provides these out of the box:

### Architecture View

- **Architecture Allocation** (BDD) — shows system decomposition with
  allocation relationships

### Requirements Traceability

- **Requirements Traceability** (REQ) — full trace from user needs through
  system and software requirements

### Use Case View

- **Use Case Overview** (UCD) — actors connected to use cases and scenarios

### Verification & Validation

- **V&V Coverage** (REQ) — requirements with their verification tests

### Risk Overview (ISO 14971)

- **Risk Mitigation Chain** (RISK) — hazards → hazardous situations → harms,
  with risk controls and their mitigations

### Software Architecture

- **Software Decomposition** (BDD) — software components and their structure

### Physical Architecture

- **Physical BOM** (BDD) — hardware components bill of materials

## Auto-Generated Diagrams

The **Model Viewpoint** automatically generates diagrams that show the full
model:

- **Model Context** (BDD) — top-level system context
- **Model Decomposition** (BDD) — complete element hierarchy

These update automatically as you add elements — no manual curation needed.

## Exporting Diagrams

### Graphviz DOT

```bash
# Export full model
pnpm memo export dot -o model.dot

# Export specific viewpoint
pnpm memo export dot -o risk-view.dot --viewpoint risk-overview
```

Render with Graphviz:

```bash
dot -Tpng model.dot -o model.png
dot -Tsvg model.dot -o model.svg
```

### Static HTML

```bash
pnpm memo build -o dist
```

This generates a self-contained HTML file with the interactive viewer
embedded — useful for sharing with stakeholders who don't have MEMO installed.

### JSON Export

```bash
pnpm memo export json -o model.json
```

The JSON includes all elements, relationships, viewpoint assignments, and
diagram definitions — useful for custom tooling or reports.

## Custom Viewpoints

Define custom viewpoints in your `memo.config.yaml`:

```yaml
extends: "@memo/medical-modeling-profile"

viewpoints:
  - id: my-custom-view
    name: "Electrical Safety Review"
    visibleKinds:
      - ElectricalComponent
      - Hazard
      - RiskControl
      - Test
    visibleRelationships:
      - mitigates
      - verify
    supportedDiagramTypes: [bdd, req]
    diagrams:
      - id: diag-electrical-safety
        name: "Electrical Safety Chain"
        diagramType: bdd
        viewpointId: my-custom-view
        auto: true
        description: "Electrical hazards with their controls and verification"
```

### Viewpoint Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique viewpoint identifier |
| `name` | Yes | Display name |
| `visibleKinds` | Yes | Which element kinds to show |
| `visibleRelationships` | No | Which relationship types to show |
| `visibleLayers` | No | Which CoSMA layers to include |
| `supportedDiagramTypes` | No | Which diagram types can be created |
| `diagrams` | No | Pre-defined diagrams |

### Diagram Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique diagram identifier |
| `name` | Yes | Display name |
| `diagramType` | Yes | One of: bdd, ibd, req, ucd, act, pkg, par, risk |
| `viewpointId` | Yes | Which viewpoint this belongs to |
| `auto` | Yes | Auto-populated (`true`) or manually curated (`false`) |
| `description` | No | Documentation for the diagram |
| `properties` | No | Metadata key-value pairs (for doc generation) |
| `elementIds` | No | Specific elements to include (manual diagrams only) |
| `relationshipTypes` | No | Override visible relationship types |

## Tips

!!! tip "Start with auto diagrams"
    Use `auto: true` diagrams initially. They show everything in the viewpoint
    without manual curation. As your model grows, create focused manual diagrams
    for design reviews.

!!! tip "One diagram per design review topic"
    Create specific diagrams for each review topic: "Alarm Subsystem Safety",
    "Data Flow Architecture", "Battery Management Verification". This makes
    design review meetings more focused.

!!! tip "Use properties for doc generation"
    Add metadata to diagrams via `properties` for future document generation:
    ```yaml
    properties:
      documentSection: "4.2.1"
      reviewStatus: "Approved"
      lastReviewed: "2026-03-01"
    ```

## Next Steps

- [Starting a New Project](new-project.md) — set up from scratch
- [Importing Existing Data](importing-data.md) — bring in existing work
- [Validation & Closure Rules](validation.md) — check completeness
