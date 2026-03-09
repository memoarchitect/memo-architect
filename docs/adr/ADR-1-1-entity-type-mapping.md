# ADR-1-1: Entity Type to SysML v2 Mapping

**Status:** Accepted (Revised v2)
**Date:** 2026-03-03
**Context:** Session 1 — Ontology (revised after EA MDG profile analysis)

## Decision

MEMO entity types map to **idiomatic SysML v2 constructs** based on their semantic role, informed by the Sparx EA MDG profile (MemoMDG v2.0, 60+ stereotypes) as a reference for completeness.

### Mapping Principle

The mapping is driven by **what the element IS**, not by verbatim EA stereotype translation:

| Semantic Role | SysML v2 Construct | Rationale |
|---|---|---|
| Traceable, verifiable claims | `requirement def` | Requirements, hazards, risks, harms, risk controls — things you trace to, satisfy, and verify |
| Structural decomposable elements | `part def` | Systems, components, software, hardware, actors, UI — things that have structure |
| Behavioral elements | `action def` | Functions, activities, scenarios — things that DO something |
| Connection points | `port def` | Physical and logical connection points on components |
| Behavioral contracts | `interface def` | Interfaces, ROS topics/services — contracts between components |
| Value types | `attribute def` | Data types, ROS messages |

### Complete Entity Mapping (60+ types, 9 domains)

#### Business Analysis (7 types → `part def`)
Actor, Stakeholder, Goal, Concern, Responsibility, Capability, Question

#### Requirements (7 types → `requirement def`)
Requirement (base), UserNeed, SystemRequirement, SoftwareRequirement, HardwareRequirement, DesignSpecification, OtherRequirement

**Hierarchy:** `UserNeed :> Requirement`, `SystemRequirement :> Requirement`, etc.

#### Risk Management (6 types → `requirement def`)
Hazard, HazardousSituation, Harm, Risk, RiskControl, SafetyGoal

**CRITICAL:** These are `requirement def`, NOT `part def`. In ISO 14971, hazards, risks, and controls are documented claims that must be traced, satisfied, and verified — they are requirements by nature.

#### Functional Analysis (6 types → `action def` + `part def`)
SystemFunction, ComponentFunction, UserActivity, UIFunction, Scenario → `action def`
UseCase → `part def` (contains scenarios)

#### Logical Architecture (9 types → `part def`)
System, SystemExternal, Subsystem, Component, LogicalComponent, LogicalComponentExternal, EnvironmentElement, ArchitectureDecision, ArchitectureRationale, QualityAttribute

#### Physical Architecture (9 types → `part def` with inheritance)
PhysicalComponent (base) → ElectricalComponent → Catheter
PhysicalComponent → MechanicalComponent
PhysicalComponent → HardwareNode → ComputingDevice → FPGA, DesktopComputer, Microcontroller, SingleBoardComputer
PhysicalModule

#### Software Architecture (7 types → `part def` with inheritance)
Software (base) → SoftwareComponent → RosNode
Software → SoftwareModule, Firmware, Docker, OperatingSystem

#### Interfaces & Ports (13 types → `port def` + `interface def`)
Ports: Port, PortEthernet, PortUSB, PortSerial, PortPower, PortCustom, ParallelPort
Interfaces: Interface, SoftwareInterface, SoftwareProvidedInterface, SoftwareRequiredInterface, RosTopic, RosService, RosPublication, RosSubscription, RosServiceCall

#### UI Wireframe (3 types → `part def`)
UIScreen, UIPanel, UIElement

#### Cross-Cutting (5 types)
DataType, RosMessage → `attribute def`
Test, Standard, RegulatoryRequirement → `part def`

### Why Risk Types are `requirement def`

| Evidence | Details |
|---|---|
| EA profile | `Memo_Hazard generalizes="SysML1.4::requirement"` — applies to Requirement metatype |
| ISO 14971 | Hazards, harms, and controls are documented, traced, and verified — requirement semantics |
| SysML v2 | `requirement def` supports `satisfy`, `verify`, and `trace` — exactly what risk management needs |
| Traceability | Risk controls satisfy safety goals; tests verify risk controls; requirements trace to hazards |

### Relationship Definitions (16 types)

| Relationship | SysML v2 | Use |
|---|---|---|
| Aggregation | `connection def` | Whole-part |
| Association | `connection def` | General link |
| TraceTo | `connection def` | Forward trace |
| Trace | `connection def` | Bidirectional trace |
| AllocateTo | `connection def` | Function → Structure |
| ComposedOf | `connection def` | Strong ownership |
| Dependency | `connection def` | Usage dependency |
| Realization | `connection def` | Implementation |
| Satisfy | `connection def` | Design satisfies requirement |
| Verify | `connection def` | Test verifies requirement |
| Mitigates | `connection def` | Control mitigates hazard |
| Causes | `connection def` | Hazard causes situation |
| LeadsTo | `connection def` | Situation leads to harm |
| Identifies | `connection def` | Risk identifies hazard |
| Extend | `connection def` | UseCase extension |
| Include | `connection def` | UseCase inclusion |

## Consequences

- All 60+ entity types have idiomatic SysML v2 representations.
- Inheritance hierarchies preserved (e.g., `ElectricalComponent :> PhysicalComponent`).
- Risk management types correctly use `requirement def` — enabling full ISO 14971 traceability.
- Domain configs specialize framework types without modifying the core ontology.

## SysML v2 Syntax Notes

> **Note:** `requirement def` specialization (`:>`) is in the SysML v2 spec. Pilot tool support varies.

> **Note:** SysML v2 does not have a native `use case def`. UseCase is modeled as `part def` containing behavioral scenarios.

> **Note:** `interface def` in SysML v2 replaces SysML 1.x InterfaceBlock. Provided/required is modeled through port conjugation.
