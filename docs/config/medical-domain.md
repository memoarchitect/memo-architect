# Medical Domain Configuration

The `@memo/medical` package provides a comprehensive domain configuration for medical device development, aligned with ISO 14971 (risk management) and IEC 62304 (software lifecycle).

## Overview

| Metric | Count |
|---|---|
| CoSMA Layers | 10 |
| Entity Kinds | 60+ |
| Relationship Types | 16 |
| Closure Rules | 15 |
| Viewpoints | 7 |

## Entity Kinds by Layer

### Business Analysis (`#8E44AD`)

Actor, Stakeholder, Goal, Concern, Responsibility, Capability

### Requirements (`#4A90D9`)

UserNeed, SystemRequirement, SoftwareRequirement, HardwareRequirement, DesignSpecification, OtherRequirement, Standard, RegulatoryRequirement

### Risk Management (`#E74C3C`)

Hazard, HazardousSituation, Harm, Risk, RiskControl, SafetyGoal

### Functional Analysis (`#E67E22`)

SystemFunction, ComponentFunction, UserActivity, UIFunction, UseCase, Scenario

### Logical Architecture (`#7B68EE`)

System, SystemExternal, Subsystem, Component, LogicalComponent, LogicalComponentExternal, ArchitectureDecision, QualityAttribute, Question

### Physical Architecture (`#95A5A6`)

PhysicalComponent, ElectricalComponent, MechanicalComponent, HardwareNode, ComputingDevice, PhysicalModule, FPGA, Microcontroller, SingleBoardComputer

### Software Architecture (`#F39C12`)

Software, SoftwareComponent, SoftwareModule, Firmware, Docker, OperatingSystem, RosNode

### Interfaces & Ports (`#1ABC9C`)

Port, DataPort, FlowPort, ServicePort, Interface, SoftwareInterface, ElectricalInterface, MechanicalInterface, RosTopic, RosService, DataType

### UI Wireframe (`#3498DB`)

UIScreen, UIPanel, UIElement

### Verification (`#2ECC71`)

Test

## Standards Alignment

### ISO 14971 — Risk Management

The risk layer and closure rules enforce the ISO 14971 risk management process:

- Hazard identification → `Hazard` elements
- Risk analysis → `HazardousSituation`, `Harm`, `Risk` elements
- Risk control → `RiskControl` elements with `mitigates` relationships
- Verification → `Test` elements with `verify` relationships to controls

**Enforced by rules:** CR-MED-001 through CR-MED-006

### IEC 62304 — Software Lifecycle

The requirements and software layers support IEC 62304 traceability:

- User needs → System requirements → Software requirements
- Software architecture decomposition
- Verification of requirements

**Enforced by rules:** CR-MED-007 through CR-MED-012

## Usage

Projects extend the medical config:

```yaml
projectName: my-device
projectType: device
extends: "@memo/medical"
```

All 60+ kinds, 15 rules, and 7 viewpoints are inherited automatically.
