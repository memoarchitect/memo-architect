# Ontology Reference

This page provides a comprehensive catalog of the entity kinds and relationship types provided by the base MEMO ontology (`@memo/ontology-core`).

## CoSMA Layers

MEMO follows the **CoSMA** (Context, Stakeholder, Model, Analysis) architecture, split into granular layers.

### 1. Operational Layer (`operational.sysml`)
Focuses on the problem domain, users, and scenarios independent of the system implementation.

#### Kinds
| Kind | Base Construct | Description |
|---|---|---|
| `OperationalActor` | `part def` | Stakeholders or users involved in the operational context. |
| `OperationalEntity` | `part def` | Items, tools, or objects in the operational environment. |
| `OperationalEnvironment` | `part def` | The physical or virtual setting where operations occur. |
| `Resource` | `part def` | Assets required to perform an operation. |
| `Substance` | `part def` | Physical materials or substances (e.g., Medicine, Blood). |
| `Observable` | `part def` | Clinical or physical parameters that can be measured. |
| `OperationalActivity` | `action def` | High-level activities performed by actors. |
| `Operation` | `action def` | A specific task or group of actions. |
| `Procedure` | `action def` | A structured sequence of operations with an objective. |
| `OperationalScenario` | `action def` | A specific sequence of events in an operational context. |
| `MissionPhase` | `part def`* | A distinct stage of a mission or operation. |

> [!NOTE]
> *`MissionPhase` is currently marked for reclassification to `action def`.

### 2. Functional Layer (`functional.sysml`)
Defines the "what" — the abstract behaviors and capabilities of the system.

#### Kinds
| Kind | Base Construct | Description |
|---|---|---|
| `Function` | `action def` | A generic unit of behavior. |
| `MissionFunction` | `action def` | Top-level function fulfilling a mission requirement. |
| `SystemFunction` | `action def` | Function provided by the system of interest. |
| `ComponentFunction` | `action def` | Function allocated to a specific sub-component. |
| `Scenario` | `action def` | A behavioral sequence illustrating a system use case. |
| `UseCase` | `part def`* | A high-level goal-oriented behavior. |

> [!NOTE]
> *`UseCase` is currently marked for reclassification to `action def`.

### 3. Requirements Layer (`requirements.sysml`)
Tracks stakeholder needs and formal system requirements.

#### Kinds
| Kind | Base Construct | Description |
|---|---|---|
| `StakeholderNeed` | `requirement def` | High-level goal from a stakeholder. |
| `SystemRequirement` | `requirement def` | Formal requirement on the system or component. |
| `Constraint` | `requirement def` | Design or operational constraint. |

---

## Relationship Reference

Relationships (connections) define how entities interact across layers.

| Type | Source | Target | Purpose |
|---|---|---|---|
| `satisfy` | `Any` | `Requirement` | Indicates an element fulfills a requirement. |
| `verify` | `Test` | `Requirement` | Indicates a test verifies a requirement. |
| `derives` | `Requirement` | `Requirement` | Downstream requirement derivation. |
| `refines` | `Any` | `Any` | More precise refinement of an abstraction. |
| `performedBy` | `Activity` | `Actor` | Assigns an activity to an operational role. |
| `mitigates` | `Control` | `Hazard` | Safety trace for risk mitigation. |

For a full list of relationships, see the [Ontology Design Doc](../design/ontology.md).
