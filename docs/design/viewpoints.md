# Viewpoints

Viewpoints are preconfigured filters that show a subset of the model relevant to a specific concern. They let you focus on risk analysis, requirements traceability, or software architecture without the clutter of unrelated elements.

## How Viewpoints Work

Each viewpoint defines three filter criteria:

```yaml
viewpoints:
  - id: risk-overview
    label: Risk Overview (ISO 14971)
    visibleKinds:           # Only show these entity kinds
      - Hazard
      - HazardousSituation
      - Harm
      - RiskControl
      - SafetyGoal
    visibleRelationships:   # Only show these relationship types
      - mitigates
      - causes
      - leadsTo
      - identifies
    visibleLayers:          # Include elements from these layers
      - risk
```

An element is visible if it matches **either** `visibleKinds` **or** `visibleLayers`. Relationships are visible only if both their source and target elements are visible.

## Data Flow

Viewpoint filtering is performed **client-side** for simplicity and responsiveness:

1. Server sends the complete model + viewpoint definitions in `MemoModelDTO`
2. User clicks a viewpoint tab in `ViewpointSelector`
3. `DiagramCanvas` builds a filter function:
   ```typescript
   const filter = (el: MemoElement) =>
       kinds.has(el.kind) || layers.has(el.layer);
   ```
4. `computeLayout()` applies the filter to produce a subgraph
5. ELK.js computes layout for only the visible elements

## Medical Domain Viewpoints

| Viewpoint | Focus | Layers | Key Kinds |
|---|---|---|---|
| **Risk Overview** | ISO 14971 risk management | risk | Hazard, Harm, RiskControl, SafetyGoal |
| **Requirements Trace** | Requirements traceability | requirements | UserNeed, SystemRequirement, SoftwareRequirement |
| **Architecture View** | System decomposition | logical, functional | System, Component, SystemFunction |
| **Software View** | Software architecture | software, interfaces | SoftwareComponent, RosNode, Docker |
| **Physical View** | Hardware/physical | physical | PhysicalComponent, ComputingDevice, FPGA |
| **V&V** | Verification & Validation | verification, requirements | Test, SystemRequirement, RiskControl |
| **Use Case View** | User workflows | business, functional | Actor, UseCase, Scenario |

## UI Behavior

The `ViewpointSelector` component renders a tab bar:

```
[ All ] [ Risk Overview ] [ Requirements ] [ Architecture ] [ Software ] ...
```

- **All** (default) — Shows every element and relationship
- Selecting a viewpoint re-runs the ELK layout with only visible elements
- The "All" button has `id: null` (no filter applied)
- Viewpoint tabs are dynamically generated from the model DTO — no hardcoding

## Creating Custom Viewpoints

Add a viewpoint to your `memo.config.yaml`:

```yaml
viewpoints:
  - id: cybersecurity-view
    label: Cybersecurity
    visibleKinds:
      - ThreatModel
      - Vulnerability
      - SecurityControl
    visibleRelationships:
      - mitigates
      - exploits
    visibleLayers:
      - cybersecurity
```

The viewpoint appears automatically in the web app after restart.
