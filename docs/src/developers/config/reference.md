# memo.config.yaml Reference

Complete reference for all fields in `memo.config.yaml`.

## Top-Level Fields

```yaml
projectName: string          # Project name (required)
projectType: ontology|profile|library|device # "ontology" for shared types, "profile" for rules/viewpoints, "library" for reusable elements, "device" for projects
extends: string              # Parent config package (e.g., "@memo/medical-modeling-profile")
ontologies:                  # Referenced ontology packages
  - name: string
    version: string
```

## `cosmaLayers`

Defines visualization layers for grouping entities.

```yaml
cosmaLayers:
  - id: string       # Unique layer ID (e.g., "risk")
    label: string     # Human-readable label (e.g., "Risk Management")
    color: string     # Hex color (e.g., "#E74C3C")
```

Used for: diagram node coloring, sidebar grouping, completeness tracking.

## `kinds`

Defines entity types available in the model. Each kind maps a domain concept to a SysML v2 construct.

```yaml
kinds:
  Hazard:                          # Kind key (used in :> specialization)
    label: Hazard                  # Human-readable label
    layer: risk                    # CoSMA layer ID
    sysmlConstruct: part def       # SysML v2 construct
    icon: alert-triangle           # Optional icon identifier
    template: hazard.sysml         # Optional template file
    defaultAttributes:             # Optional default attributes
      severity: ""
      likelihood: ""
```

### Supported SysML Constructs

| Construct | Typical Use |
|---|---|
| `part def` | Physical/logical elements, hazards, risk controls |
| `requirement def` | Requirements at all levels |
| `action def` | Functions, use cases, behaviors |
| `port def` | Interfaces, ports, data types |
| `interface def` | Interface specifications |
| `connection def` | Relationship types |
| `attribute def` | Data types |
| `enum def` | Enumerations |

## `relationshipTypes`

Defines typed connections between elements.

```yaml
relationshipTypes:
  - name: mitigates          # Relationship identifier
    label: Mitigates          # Human-readable label
    layer: risk               # CoSMA layer
    color: "#E74C3C"          # Visualization color
```

Relationships are used in SysML as:

```sysml
connection : mitigates connect FlowSensor to OverInfusion;
```

## `closureRules`

Defines validation rules enforced against the model.

```yaml
closureRules:
  - id: CR-MED-001                    # Unique rule ID
    description: "Description"         # Human-readable
    entity: Hazard                     # Kind this applies to
    rule:
      type: requireRelationship        # Rule type
      relationship: mitigates          # Relationship to check
      direction: incoming|outgoing|any # Direction to check
      min: 1                           # Minimum required count
    severity: error|warning|info       # Violation severity
    completenessLayer: risk            # Layer for completeness tracking
```

### Rule Types

Currently supported:

| Type | Description |
|---|---|
| `requireRelationship` | Element must have N+ relationships of a given type |

### Direction Options

| Direction | Meaning |
|---|---|
| `incoming` | Relationships where this element is the **target** |
| `outgoing` | Relationships where this element is the **source** |
| `any` | Either direction counts |

## `viewpoints`

Defines diagram filter presets.

```yaml
viewpoints:
  - id: risk-overview               # Unique viewpoint ID
    label: Risk Overview (ISO 14971) # Display label
    visibleKinds:                    # Show elements of these kinds
      - Hazard
      - RiskControl
    visibleRelationships:            # Show these relationship types
      - mitigates
      - causes
    visibleLayers:                   # Show elements from these layers
      - risk
```

Elements are visible if they match `visibleKinds` OR belong to a `visibleLayers` layer. Relationships are visible only if both endpoints are visible.

## `workflows`

Legacy YAML workflow examples are retained here only to explain historical config shape. New workflow definitions belong in methodology SysML packages.

```yaml
workflows:
  - id: risk-analysis
    label: Risk Analysis Workflow
    steps:
      - id: identify-hazards
        label: Identify Hazards
        kinds: [Hazard]
      - id: add-controls
        label: Add Risk Controls
        kinds: [RiskControl]
```

## `firstRun`

Configuration for `memo init` scaffolding.

```yaml
firstRun:
  template: infusion-pump        # Template name
  promptForMetadata: true        # Ask for project metadata
  scaffoldFiles:
    - infusion-pump.sysml        # Files to create
```

## Full Example

```yaml
projectName: "@memo/medical-modeling-profile"
projectType: device
extends: "@memo/medical-modeling-profile"

ontologies:
  - name: "@memo/ontology"
    version: "^0.4.0"

cosmaLayers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
  - id: requirements
    label: Requirements
    color: "#4A90D9"

kinds:
  Hazard:
    label: Hazard
    layer: risk
    sysmlConstruct: requirement def
  SystemRequirement:
    label: System Requirement
    layer: requirements
    sysmlConstruct: requirement def

relationshipTypes:
  - name: mitigates
    label: Mitigates
    layer: risk
    color: "#E74C3C"

closureRules:
  - id: CR-001
    description: "Every Hazard must be mitigated"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
    completenessLayer: risk

viewpoints:
  - id: risk-overview
    label: Risk Overview
    visibleKinds: [Hazard, RiskControl]
    visibleRelationships: [mitigates]
    visibleLayers: [risk]
```
