# SysML v2 Rule Book — for MEMO ontology authors

**Status:** Normative for every `.sysml` file in `ontology/**` and `projects/**`.
**Date:** 2026-04-24.
**Source corpus studied:**
- `Systems-Modeling/SysML-v2-Release` — `sysml/src/training/` (42 numbered topics), `sysml/src/examples/` (Vehicle, Camera, Flashlight, Cause-and-Effect, Requirements, Mass Roll-up, Metadata, Geometry, Variability, Views, Analysis, Interaction, etc.), `sysml/src/validation/` (executable conformance models 01–18).
- `GfSE/SysML-v2-Models` — `models/SE_Models/` (Drone, ForestFireDetectionSystemModel, VehicleModel, lawnmowerPackage, Fischertechnik, EIT_System_Use_Cases, HVAC, Internet, MPLE, Stopwatch, Metamodel) and `models/example_EveOnlineMiningFrigate/` (Domain, LogicalArchitecture, UseCases — full multi-file system model).
- `hugoormo/FiBo2SysMLv2` — production-grade SysML v2 ontology library (FIBO Foundations, Business Entities, Business Processes, Corporate Actions, FBC, Derivatives, Indices, Loans, Market Data, Securities) + Sysand build/publish toolchain + paper "From an AI-Assisted SysMLv2 Model to a Domain-Integrated Reference Architecture" (Hugo Ormo, NTT DATA). Critical reference for ontology-as-library practice, CI aggregator pattern, `.kpar` packaging.
- DeepWiki §7 (cross-check on package layout and example patterns).
- `feedback/` package locally (medical-device shape).

This rule book extracts what those models do **consistently** and turns the patterns into rules MEMO ontology authors must follow. Each rule cites at least one source model so the rule is auditable. Rules are grouped by concern, numbered, and tagged for lint enforcement (`memo lint --rule <id>`).

---

## 0. Rule taxonomy

| Group | Prefix | What it covers |
|---|---|---|
| Packaging | **P** | files, packages, imports, visibility |
| Naming & IDs | **N** | identifiers, id literals, casing |
| Definition / Usage | **D** | def vs usage split, specialisation, redefines |
| Structure | **S** | parts, attributes, items, multiplicity |
| Interfaces | **I** | port def, interface def, conjugation, flow |
| Behaviour | **B** | actions, states, transitions |
| Requirements & Verification | **R** | requirement def, satisfy, verification def |
| Constraints | **C** | constraint def, assert / assume / require |
| Metadata & Stereotypes | **M** | metadata def, `#tag`, semantic metadata, library extensions |
| Views & Viewpoints | **V** | concern, viewpoint, view def, expose, render, filter |
| Allocation & Trace | **A** | allocation def, allocate, dependency, satisfy/derive/refine |
| Cause & Effect | **CE** | causation, multicausation, occurrence |
| Documentation | **DC** | doc strings, comments, language |
| Quantities & Units | **Q** | ISQ, SI, MeasurementReferences, dimensional values |
| Library hygiene | **L** | `library package`, abstract usages, semantic metadata extension |

---

## 1. Packaging rules (P)

### P1 · One namespace per file, declared as **nested** packages. File name = trailing namespace segment.
**Source:** every OMG training file (`Package Example.sysml` declares `package 'Package Example'`), every GfSE model file (`Domain.sysml` declares `package Domain`). Standard SysML v2 / KerML allows only a **single-identifier** name in a package *declaration* — qualified names (`::`) are for *references*, never declarations.
**MEMO rule:** filename `risk.sysml` → nest the namespace:
```sysml
package memo {
    package arch {
        package risk { … }
    }
}
```
The trailing segment (`risk`) is the content-bearing leaf. Do **not** write `package memo::arch::risk { … }` — that flat-qualified form is a former MEMO grammar extension that external SysML v2 tools (sysand, SysIDE, SysON) reject, making the ontology non-portable. The model builder reconstructs the full FQN (`memo::arch::risk`) from the nesting, so addressing and imports are unchanged. Wrapper packages (`memo`, `memo::arch`) are legitimately shared across files; only the leaf must be unique. No two leaf packages in one file.
**Why:** EE-5 portability gate — `memo-tools/memo/scripts/build-kpar.sh` builds the ontology with an external tool and fails CI if any declaration is non-portable. Enforced by conformance test `EE-5: no qualified names in package declarations`.
**Lint:** P1.

### P2 · Use `private import` by default; `public import` only at intentional re-export boundaries.
**Source:** OMG `VehicleDefinitions.sysml`:
```sysml
private import ScalarValues::*;
private import ISQ::*;
private import SI::*;
```
OMG `VehicleUsages.sysml` re-exports `VehicleDefinitions`:
```sysml
public import VehicleDefinitions::*;
```
**MEMO rule:** library files (`memo::core::*`, `memo::profile::viewpoints::core`, `memo::profile::views::core`) `public import` what they want to re-export. Every other file `private import`s. The "private private" form (`private import Definitions::* { … }`) from validation `1a-Parts Tree.sysml` is allowed when an inner package wants to firewall imports.
**Lint:** P2.

### P3 · Library packages use `library package`, not plain `package`.
**Source:** OMG `Model Library Example.sysml`:
```sysml
library package 'Model Library Example' { … abstract occurrence def Situation; … }
```
And `Semantic Metadata Example.sysml`.
**MEMO rule:** `memo::core::*`, `memo::profile::viewpoints::core`, `memo::profile::views::core`, `memo::profile::rules` declare `library package`. Domain-extension packages (`memo::arch::*`, `memo::process::*`) are plain `package`. Project models (`memo::projects::*`) are plain `package`.
**Lint:** P3.

### P4 · `alias` legitimises a synonym, never a hidden mutation.
**Source:** OMG `Package Example.sysml`:
```sysml
public alias Car for Automobile;
alias Torque for ISQ::TorqueValue;
```
**MEMO rule:** use `alias` only for backwards-compatibility shims during the `md::*` → `memo::*` migration. Tag every alias with a `// DEPRECATED — remove by P5` comment. Aliases ship in transition window only.

### P5 · Filesystem path encodes namespace one-to-one.
**Source:** OMG repo: `examples/Vehicle Example/VehicleDefinitions.sysml` ↔ `package VehicleDefinitions`. GfSE: `models/SE_Models/ForestFireDetectionSystemModel.sysml` ↔ `package ForestFireDetectionSystemModel`.
**MEMO rule:** `ontology/<dimension>/<segment>/<file>.sysml` maps to a matching `memo::<dimension>::...` package namespace. The dimension-first layout in [../architecture/platform.md](../architecture/platform.md) is the canonical path convention.
**Lint:** P5.

---

## 2. Naming & ID rules (N)

### N1 · Use unquoted identifiers when the name is a single CamelCase or camelCase token.
**Source:** OMG `VehicleDefinitions.sysml` uses `Vehicle`, `AxleAssembly`, `frontAxle`. Validation `8-Requirements.sysml` uses unquoted `MassLimitationRequirement`.
**MEMO rule:** part definitions = `PascalCase` (`Hazard`, `RiskControl`); part usages = `camelCase` (`fluidOverInfusion`); enums = `PascalCase` with `Kind` suffix (`ConcernKind`). Don't quote what doesn't need quoting.

### N2 · Use single-quoted strings only when the name contains spaces or punctuation.
**Source:** OMG `'Part Definition Example'`, `'Generate Torque'`, `'1a-Parts Tree'`. GfSE `'Market Leader'` for #systemObjective.
**MEMO rule:** prefer unquoted. Single-quote only if the human-readable label contains a space or starts with a digit.

### N3 · Stable id literal in angle brackets.
**Source:** OMG `Requirement Definitions.sysml`:
```sysml
requirement def <'1'> VehicleMassLimitationRequirement :> MassLimitationRequirement { … }
```
And cascades: `<'UR1.1'>`, `<'URI1.2.1'>` in `HSUVRequirements.sysml`.
**MEMO rule:** every requirement, hazard, mitigation, document section uses `<'<KIND>-<DOMAIN>-<NNN>'>` (e.g. `<'HAZ-INF-001'>`, `<'REQ-PUMP-014'>`, `<'CFR-820.30-c-001'>`). MEMO id format is decided once; lint enforces the regex.
**Lint:** N3.

### N4 · Single source of truth for `id` — angle-bracket form preferred over a separate `attribute id`.
**Source:** OMG uses angle-bracket `<'…'>` everywhere; the feedback package uses `attribute id = "…"` because feedback was hand-rolled. SysML v2 spec assigns the angle-bracket value to the `id` reserved attribute.
**MEMO rule:** prefer `<'…'>`. Where `id` already exists as a regular `attribute id : String`, keep it during the transition; convert to angle-bracket form by P5.

---

## 3. Definition / Usage rules (D)

### D1 · Every concrete instance is a usage of a definition.
**Source:** OMG `VehicleDefinitions.sysml` defines `part def Vehicle`; `VehicleUsages.sysml` declares `part vehicle_C1 : Vehicle`. Same shape across every example.
**MEMO rule:** project files (`memo::projects::*`) MUST contain only usages, never new `… def`s of an ontology kind. Definitions live in `memo::arch::*` or `memo::process::*`.
**Lint:** D1.

### D2 · Specialise with `:>` (subsetting kind), redefine with `redefines`, bind with `:>>`.
**Source:** OMG `Requirement Definitions.sysml`:
```sysml
requirement def <'1'> VehicleMassLimitationRequirement :> MassLimitationRequirement { … }
```
Validation `1a-Parts Tree.sysml`:
```sysml
attribute mass redefines Vehicle::mass = 1750 [kg]
```
Validation `8-Requirements.sysml`:
```sysml
attribute :>> mass = 2000 [kg];
```
**MEMO rule:**
- `:>` for type specialisation (`part def CyberHazard :> Hazard`).
- `redefines` to override a feature inherited from the def.
- `:>>` for binding a feature to a concrete value or another reference.
**Lint:** D2.

### D3 · Multiplicity uses `[…]` after the type. Use `[2]` for fixed, `[1..*]` for ranges, `[*]` for unbounded, `[2] ordered` when sequence matters.
**Source:** OMG `VehicleUsages.sysml` `part lugbolt: Lugbolt[4..5]`. Validation `1a-Parts Tree.sysml` `part frontWheel: Wheel[2] ordered`. GfSE Domain.sysml `part asteroid : Asteroid [1..*]`.
**MEMO rule:** state multiplicity explicitly when ≠ 1. Use `ordered` whenever rank matters (verification step ordering, action succession, port lanes).
**Lint:** D3.

### D4 · Use `subsets` to introduce a named sub-collection without redefining.
**Source:** OMG `VehicleUsages.sysml`:
```sysml
part leftFrontWheel subsets frontWheel = frontWheel#(1);
```
**MEMO rule:** when you need a name for the n-th of a multiplicity, use `subsets … = X#(n)`. Avoid duplicating the part.

### D5 · `ref part` for cross-references; `part` for owned (composite) parts.
**Source:** OMG `Part Definition Example.sysml`:
```sysml
part eng : Engine;       // owned (composite)
ref part driver : Person; // referenced (not owned)
```
GfSE Domain.sysml uses `ref part pilotPod : PilotPod [1..*];` for shared pods.
**MEMO rule:** in `memo::arch::*` definitions, model "X is part of Y" as `part`, "X uses Y" as `ref part`. A Hazard does not own a Mitigation — it `ref part`s a Mitigation. A System owns its Subsystems — `part`.
**Lint:** D5.

---

## 4. Structure rules (S)

### S1 · `attribute def` defines a value type; `item def` defines a flowing item; `part def` defines a structural component.
**Source:** OMG `Part Definition Example.sysml` (`attribute def VehicleStatus`); `Action Definition Example.sysml` (`item def Scene; item def Image`); GfSE Domain.sysml mixes all three.
**MEMO rule:** values that flow between ports are `item def` (e.g. `item def TherapyCommand`, `item def TelemetryFrame`). Pure parameters are `attribute`. Structural model elements are `part`. Don't confuse the three.

### S2 · Attributes typed against the OMG ISQ + SI libraries when physical.
**Source:** OMG `Requirement Definitions.sysml`:
```sysml
private import ISQ::*;
private import SI::*;
attribute massActual: MassValue;
```
Validation `1a-Parts Tree.sysml`:
```sysml
attribute mass :> ISQ::mass;
```
GfSE Domain.sysml uses `attribute warpSpeed : Real // AU/s` — i.e. a free-form unit comment, which is an anti-pattern.
**MEMO rule:** when a quantity has SI units, type it against `ISQ::*` (`MassValue`, `LengthValue`, `TimeValue`, `EnergyValue`, `TemperatureValue`) or use the `:>` form `attribute flowRate :> ISQ::volume / ISQ::time`. `Real` plus a unit comment is forbidden in MEMO.
**Lint:** Q1 (see §13).

### S3 · Boolean flags use `Boolean`; counts use `Integer`; identifiers use `String`. Derived sums use `NumericalFunctions::sum`.
**Source:** OMG `Constraint Assertions-1.sysml` `sum(partMasses) <= massLimit`.

### S4 · Containment hierarchy mirrors physical hierarchy.
**Source:** validation `1a-Parts Tree.sysml`:
```sysml
part vehicle1 {
    part frontAxleAssembly {
        part frontAxle: Axle;
        part frontWheel: Wheel[2] ordered;
    }
}
```
**MEMO rule:** a Subsystem nested inside a System part means physical containment. Use `ref part` for "associated with but not contained in" relationships.

---

## 5. Interface rules (I)

### I1 · `port def` declares a typed connection point with directional `in` / `out` items and possible `attribute`s.
**Source:** OMG `Port Example.sysml`:
```sysml
port def FuelOutPort {
    attribute temperature : Temp;
    out item fuelSupply : Fuel;
    in item fuelReturn : Fuel;
}
```
**MEMO rule:** every flow into/out of a part goes through a `port def`. Don't model flows on bare attributes.

### I2 · Conjugate ports with `~`.
**Source:** OMG `VehicleUsages.sysml` `port drive: ~DriveIF;`. `Flashlight Example.sysml` `port onOffCmdPort: ~OnOffCmdPort;`.
**MEMO rule:** the consumer side of a directed flow uses `~`. Don't define mirror-image port types.

### I3 · `interface def` declares the contract; `interface … connect` instantiates it between two specific ports.
**Source:** OMG `Interface Example.sysml`:
```sysml
interface def FuelInterface {
    end supplierPort : FuelOutPort;
    end consumerPort : FuelInPort;
}
interface : FuelInterface connect
    supplierPort ::> tankAssy.fuelTankPort to
    consumerPort ::> eng.engineFuelPort;
```
And `VehicleDefinitions.sysml` puts `flow` declarations inside the `interface def`:
```sysml
interface def Mounting {
    end axleMount: AxleMountIF;
    end hub: WheelHubIF;
    flow axleMount.transferredTorque to hub.appliedTorque;
}
```
**MEMO rule:** flows declared inside `interface def` are part of the contract; flows declared inside an instantiated `interface … connect` are case-specific.

### I4 · Use `flow` to declare an item movement; use `succession flow` to declare ordering.
**Source:** OMG `Flashlight Example.sysml` uses `succession flow onOffCmdFlow from sendOnOffCmd.onOffCmd to produceDirectedLight.onOffCmd;` (action layer) and `flow of Ore from asteroidOrePort.ore to shipOrePort.ore;` (interface layer in GfSE Domain.sysml).

---

## 6. Behaviour rules (B)

### B1 · Actions defined with `action def`, used with `action`, with `in` / `out` parameters.
**Source:** OMG `Action Definition Example.sysml`:
```sysml
action def Focus { in scene : Scene; out image : Image; }
action def TakePicture { in scene; out picture;
    action focus: Focus { in scene; out image; }
    flow from focus.image to shoot.image;
    action shoot: Shoot { in image; out picture; }
}
```
**MEMO rule:** behaviour is action; never overload "behaviour" onto attributes. Use `in`/`out` parameter forms for data flow between actions.

### B2 · States via `state def`, transitions named, `accept <signal>` triggers transitions.
**Source:** OMG `State Definition Example-1.sysml`:
```sysml
state def VehicleStates {
    first start then off;
    transition off_to_starting first off accept VehicleStartSignal then starting;
}
```
**MEMO rule:** every state machine has a named first state. Transitions are named. Trigger items are `attribute def …Signal`.

### B3 · Action allocation onto parts via `perform`.
**Source:** OMG `Allocation Definition Example.sysml`:
```sysml
part torqueGenerator : TorqueGenerator {
    perform providePower.generateTorque;
}
```
**MEMO rule:** "this part performs that action" uses `perform`. Don't copy actions into parts; allocate them.

---

## 7. Requirements & Verification rules (R)

### R1 · Requirement definitions carry text via `doc /* … */`, parameters as `attribute`, formal predicates as `require constraint { … }`.
**Source:** OMG `Requirement Definitions.sysml`:
```sysml
requirement def MassLimitationRequirement {
    doc /* The actual mass shall be less than or equal to the required mass. */
    attribute massActual: MassValue;
    attribute massReqd: MassValue;
    require constraint { massActual <= massReqd }
}
```
**MEMO rule:** the requirement *text* is the `doc` string. Non-`doc` body adds parameters and formal predicates only.

### R2 · `subject` binds the requirement to a model element.
**Source:** OMG `Requirement Definitions.sysml` `subject vehicle : Vehicle;`. Validation `8-Requirements.sysml` cascades subjects through grouped requirements.
**MEMO rule:** every concrete requirement usage has a `subject` bound to a Hazard, Function, Component, Interface, or Port.

### R3 · Compose requirements with `requirement <name> : <BaseDef>` containing nested `requirement` usages.
**Source:** OMG `HSUVRequirements.sysml`:
```sysml
requirement <'UR1.1'> Load: FunctionalRequirementCheck {
    requirement Passengers; requirement FuelCapacity; requirement Cargo;
}
```
**MEMO rule:** model requirement hierarchies as nested usages. Don't fake them with naming conventions like `REQ-1.1`.

### R4 · `assume constraint` for preconditions, `require constraint` for the obligation, `assert constraint` for design assertions.
**Source:** OMG `Requirement Definitions.sysml`:
```sysml
assume constraint { vehicle.fuelMass > 0[kg] }
```
Validation `8-Requirements.sysml`:
```sysml
assume constraint fuelConstraint { … vehicle.fuelLevel >= vehicle.fuelTankCapacity }
```
And OMG `Constraint Assertions-1.sysml`:
```sysml
assert constraint massConstraint : MassConstraint { in partMasses = (…); in massLimit = 2500[kg]; }
```
**MEMO rule:** use the right keyword. `require` ≠ `assume` ≠ `assert`. Auditors look for this distinction.

### R5 · Satisfaction with `satisfy <Requirement> by <usage>;`.
**Source:** OMG validation `8-Requirements.sysml`:
```sysml
satisfy 'vehicle1-c1 Specification' by vehicle1_c1;
```
**MEMO rule:** every requirement-to-design link is a `satisfy` element. Don't use bare metadata or comments.

### R6 · Verification cases use `verification def` with `objective` and `verify`.
**Source:** OMG `Verification Case Definition Example.sysml`:
```sysml
verification def VehicleMassTest {
    subject testVehicle : Vehicle;
    objective vehicleMassVerificationObjective {
        verify vehicleMassRequirement;
    }
    action collectData { … }
    action processData { … }
    action evaluateData { out verdict : VerdictKind = PassIf(vehicleMassRequirement(…)); }
    return verdict : VerdictKind = evaluateData.verdict;
}
```
**MEMO rule:** every IEC 62304 software unit, integration, and system test is a `verification def` with `objective` + `verify` + an action chain that returns a `VerdictKind`. No prose-only verification.

### R7 · Verdict via `VerificationCases::VerdictKind`. Don't roll your own enum.
**Source:** same file imports `VerificationCases::*` to get `PassIf` and `VerdictKind`.

---

## 8. Constraint rules (C)

### C1 · Standalone constraint definitions in `constraint def`; instantiated and tied with `assert constraint <name> : <Def> { in … = …; }`.
**Source:** OMG `Constraint Assertions-1.sysml` (full pattern reproduced under R4).
**MEMO rule:** for shared formal predicates (e.g. `MassConstraint`, `RiskAcceptabilityConstraint`), define once and assert per-part with `in` bindings.

### C2 · Boolean expressions use `and`, `or`, `not` (keywords, not symbolic).
**Source:** OMG validation `11b-Safety and Security Feature Views.sysml`:
```sysml
filter @Safety and (as Safety).isMandatory;
```

### C3 · Numeric expressions use SI literals: `2500[SI::kg]`, `0.0[N * m]`.
**Source:** OMG `Verification Case Definition Example.sysml` `massActual <= 2500[SI::kg]`. `VehicleUsages.sysml` `T1 = 10.0 [N * m];`.
**MEMO rule:** always units in `[…]`. The unit type is part of the value.

---

## 9. Metadata & stereotype rules (M)

### M1 · Define stereotypes with `metadata def`.
**Source:** OMG `Metadata Example-1.sysml`:
```sysml
metadata def SafetyFeature;
metadata def SecurityFeature {
    :> annotatedElement : SysML::PartDefinition;
    :> annotatedElement : SysML::PartUsage;
}
```
**MEMO rule:** any cross-cutting tag (Safety, Security, ESSENTIAL_PERFORMANCE, SOUP, IEC62304_CLASS_B, IEC62304_CLASS_C, IFU, USERNEED) is a `metadata def`, not an attribute.

### M2 · Apply metadata as `metadata <Tag> about <part1>, <part2>;` (long form) or inline `@Tag` (short form).
**Source:** OMG `Metadata Example-1.sysml`:
```sysml
metadata SafetyFeature about
    vehicle::interior::seatBelt,
    vehicle::interior::driverAirBag,
    vehicle::bodyAssy::bumper;
```
Validation `11b-Safety and Security Feature Views.sysml` short form:
```sysml
part seatBelt[2] {@Safety{isMandatory = true;}}
```
**MEMO rule:** use long form for bulk tagging from a central place; short form for tightly-coupled tag at the point of declaration.

### M3 · Hash-prefixed user keywords are reserved for **registered** stereotypes.
**Source:** OMG `User Keyword Example.sysml`:
```sysml
#scenario def DeviceFailure {
    #cause 'battery old' { … }
    #causation connect 'battery old' to 'power low';
}
```
And GfSE `Domain.sysml` `#mop`, `#moe` — Measure of Performance / Effectiveness from SYSMOD library.
**MEMO rule:** every `#tag` MEMO uses must be defined as `metadata def <tag> :> SemanticMetadata { :>> baseType = <usages> meta SysML::Usage; }` in `memo::core::stereotypes` (per OMG `Semantic Metadata Example.sysml`). No ad-hoc `#tag`s.
**Lint:** M3.

### M4 · Stereotype kind taxonomy (`#system`, `#systemObjective`, `#mop`, `#moe`, `#mof`, `#cause`, `#effect`, `#causation`, `#multicausation`, `#scenario`, `#situation`, `#failure`).
**Source:** GfSE Drone + Forest Fire models (SYSMOD library), OMG Cause and Effect examples.
**MEMO rule:** MEMO ships its own `memo::core::stereotypes` with: `#hazard`, `#hazardousSituation`, `#harm`, `#mitigation`, `#riskControl`, `#residualRisk`, `#designInput`, `#designOutput`, `#userNeed`, `#essentialPerformance`, `#soup`, `#sbomComponent`, `#cve`, `#trustBoundary`, `#asset`, `#threat`, `#vulnerability`, `#cyberRisk`, `#privacyImpact`, `#dpia`, `#useCaseClinical`, `#capa`, `#designReview`, `#sw62304ClassB`, `#sw62304ClassC`, `#essentialPerformance60601`. All registered as `SemanticMetadata` extensions.

---

## 10. View & Viewpoint rules (V)

### V1 · `concern` declares a stakeholder concern with `subject` and `stakeholder`.
**Source:** OMG `Viewpoint Example.sysml`:
```sysml
concern 'system breakdown' {
    doc /* … */
    subject;
    stakeholder se : 'Systems Engineer';
    stakeholder ivv : 'IV&V';
}
```
**MEMO rule:** stakeholders typed (`Regulator`, `ClinicalEngineer`, `SafetyEngineer`, `SoftwareLead`, `CISO`, `DPO`, `Reviewer`).

### V2 · `viewpoint` frames concerns and may carry `require constraint` describing what the view must show.
**Source:** OMG `Viewpoint Example.sysml`:
```sysml
viewpoint 'system structure perspective' {
    frame 'system breakdown';
    frame 'modularity';
    require constraint { doc /* A system structure view shall show … */ }
}
```
**MEMO rule:** every MEMO viewpoint (in `memo::profile::viewpoints::default_viewpoints`) frames at least one concern.

### V3 · `view def` defines a view kind; `view` instantiates one.
**Source:** OMG `Views Example.sysml`:
```sysml
view def 'Part Structure View' {
    satisfy 'system structure perspective';
    filter @SysML::PartUsage;
}
view 'vehicle structure view' : 'Part Structure View' {
    expose vehicle::**;
    render asTreeDiagram;
}
```
**MEMO rule:** MEMO `DiagramView : View` and `DocumentBackedView : View` are view definitions. Every concrete view in `memo::profile::views::*` is a `view <id> : DiagramView { … }` (one file per view, see platform.md §5.2).

### V4 · `expose` selects exposed elements via path expressions; `**` recurses; `[…]` filters.
**Source:** OMG `Views Example.sysml`:
```sysml
expose vehicle::**;
expose vehicle::**[@Safety];
expose vehicle::**[not (@Safety)];
```
Validation `11b-Safety and Security Feature Views.sysml`:
```sysml
expose vehicle::**[@Safety and (as Safety).isMandatory];
```
**MEMO rule:** prefer `expose` path expressions when the slice is structural (descendants of a part). Use the MEMO-specific `selectionQuery : ViewSelectionQuery` (a `part`) for cross-cutting slices that go beyond what `expose` can express. Both forms are legal; pick the simpler one per view.

### V5 · `render` selects a presentation: `asTreeDiagram`, `asElementTable`, `asTextualNotation`, `asTextualNotationTable`.
**Source:** OMG `Views Example.sysml` defines `rendering asTextualNotationTable :> asElementTable { … }` to compose new renderings from existing ones.
**MEMO rule:** MEMO renderings extend the `Views::*` library renderings. Every MEMO `DiagramView.diagramType` (bdd, ibd, afd, matrix, bowtie, fta, stpa, table, tree, heatmap, pkg) maps to a named `rendering` part in `memo::profile::views::renderings`. Don't invent string keys without a backing `rendering` def.

### V6 · `filter` predicates over metadata.
**Source:** OMG validation `11b-Safety and Security Feature Views.sysml`:
```sysml
view def SafetyFeatureView { filter @Safety; render asTreeDiagram; }
```
**MEMO rule:** built-in metadata predicates over MEMO stereotypes (`@hazard`, `@mitigation`, `@essentialPerformance`, `@iec62304ClassC`, etc.) compose with `and`/`or`/`not`. Any non-metadata filter goes in `selectionExpression`.

---

## 11. Allocation & traceability rules (A)

### A1 · `allocation def` typed; `allocation … allocate <src> to <tgt>;` instantiates.
**Source:** OMG `Allocation Definition Example.sysml`:
```sysml
allocation def LogicalToPhysical { end logical : LogicalElement; end physical : PhysicalElement; }
allocation torqueGenAlloc : LogicalToPhysical allocate torqueGenerator to powerTrain;
```
**MEMO rule:** use `allocation def` for logical→physical, function→component, requirement→test mappings. Don't conflate with `connection def` (which is for runtime data flow) or `interface def` (which is for ports).

### A2 · `satisfy` for requirement→design; `verify` (inside `verification def`) for design→test; reserve `derive` and `refine` for textual relationships.
**Source:** OMG `Verification Case Definition Example.sysml`, validation `8-Requirements.sysml`.
**MEMO rule:** the four core links — Mitigates, Satisfies, Verifies, Allocates — each have a precise SysML keyword (or `connection def`) backing. Don't model them as plain comments.

### A3 · `connection def` for relationships that can carry attributes (e.g. `Causation`, `Mitigates`).
**Source:** OMG `Model Library Example.sysml`:
```sysml
abstract connection def Causation :> Occurrences::HappensBefore {
    end [*] ref cause : Situation;
    end [*] ref effect : Situation;
}
```
**MEMO rule:** MEMO `Mitigates`, `DerivesFrom`, `Realises` are `connection def`s in `memo::core::relationships`, with attributes (e.g. `attribute mitigationStrength : RuleStrengthKind`).

---

## 12. Cause & Effect rules (CE)

### CE1 · Cause and effect modelled with `event occurrence` and `connection def Causation`.
**Source:** OMG `MedicalDeviceFailure.sysml` (medical-relevant!):
```sysml
part medicalDevice {
    part battery {
        event occurrence depleted;
        event occurrence cannotBeCharged;
    }
    event occurrence deviceFails;
    ref patient {
        event occurrence therapyDelayed;
    }
    #multicausation connection {
        end #cause ::> battery.depleted;
        end #cause ::> battery.cannotBeCharged;
        end #effect ::> deviceFails;
    }
    #causation connect deviceFails to patient.therapyDelayed;
}
```
**MEMO rule:** MEMO Hazard chains use the same shape. Bowtie diagrams are visualised cause-effect graphs; FTA is a multicausation tree.

### CE2 · Probability/severity attached as attributes on the cause / failure parts.
**Source:** OMG `Model Library Example.sysml`:
```sysml
abstract occurrence def Cause { attribute probability : Real; }
abstract occurrence def Failure { attribute severity : Level; }
```
**MEMO rule:** ISO 14971 severity/probability live on the `Hazard` and `HazardousSituation` parts as attributes; MEMO does not invent a parallel risk-scoring mechanism.

---

## 13. Quantities & Units rules (Q)

### Q1 · No bare `Real` for physical quantities.
**Source:** OMG corpus uses `:> ISQ::mass`, `MassValue`, etc. GfSE `Domain.sysml` violation: `attribute warpSpeed : Real // AU/s`. The comment-as-unit anti-pattern is a real-world leak.
**MEMO rule:** every physical quantity is `:> ISQ::<dimension>` or typed as a Quantity-library type (`MassValue`, `LengthValue`, …). `Real` reserved for dimensionless ratios.
**Lint:** Q1.

### Q2 · Compound units inline: `[N * m]`, `[ml / h]`, `[bpm]`.
**Source:** OMG `VehicleUsages.sysml` `T1 = 10.0 [N * m];`.

### Q3 · Use `MeasurementReferences` for non-SI scales (e.g. NYHA class, Glasgow Coma Scale, AAMI risk acceptability).
**Source:** OMG imports `MeasurementReferences::*` in `VehicleDefinitions.sysml`.
**MEMO rule:** clinical scales register as `MeasurementReferences` extensions in `memo::core::clinical_scales`.

---

## 14. Library hygiene rules (L)

### L1 · `library package` for reusable libraries; `abstract` usages for slots downstream files specialise.
**Source:** OMG `Model Library Example.sysml`:
```sysml
library package 'Model Library Example' {
    abstract occurrence def Situation;
    abstract occurrence situations : Situation[*] nonunique;
    abstract occurrence def Cause { attribute probability : Real; }
    abstract occurrence causes : Cause[*] nonunique :> situations;
}
```
**MEMO rule:** `memo::core::*` declares `library package` and uses `abstract` on the usage slots that downstream `memo::arch::*` and project models bind concrete versions to. Don't put concrete usages in a library.

### L2 · Pair every domain library with a Semantic Metadata file that exposes it as user keywords.
**Source:** OMG ships `Model Library Example` together with `Semantic Metadata Example`:
```sysml
metadata def situation :> SemanticMetadata {
    :>> baseType = situations meta SysML::Usage;
}
```
And the `User Keyword Example` then uses `#situation`, `#cause`, etc.
**MEMO rule:** for every part-def library MEMO ships, a sibling file `<lib>_metadata.sysml` registers `#tag` keywords. This is what makes `#hazard`, `#mitigation`, `#essentialPerformance` legitimate user-keyword extensions rather than freeform tags.
**Lint:** L2.

### L3 · `nonunique` on multi-end abstract usages — element identity is positional.
**Source:** OMG `Model Library Example.sysml` `abstract occurrence situations : Situation[*] nonunique;`.
**MEMO rule:** abstract occurrence collections in `memo::core::*` are `nonunique`. Don't impose uniqueness at the library layer.

---

## 15. Documentation rules (DC)

### DC1 · `doc /* … */` immediately after the element header, before any nested member.
**Source:** every OMG and GfSE file. Example from GfSE `Domain.sysml`:
```sysml
#moe minimumProfit : Real {
    doc /* Definition: …
         * Relevance: …
         * Optimization: …
         */
}
```
**MEMO rule:** use multi-line `doc` for non-trivial elements; one-line `doc` only when the doc literally fits on one line. Comments (`//` and `/* */`) are for code-author notes, not for design rationale.

### DC2 · Separators are blank lines, not banner-style `// === …` blocks.
**Source:** OMG corpus is consistently terse. GfSE Domain.sysml uses `// VALUES`, `// PARTS` block comments — borderline acceptable.
**MEMO rule:** banners allowed only as single-line `// PART DEFINITIONS` markers between sections, and only for files >200 lines.

---

## 16. Rule book → MEMO architecture mapping

| Rule | Maps to platform.md |
|---|---|
| P1, P2, P5 | §2 R1 R2 R8 |
| P3, L1, L3 | §5.1 (`memo::core::*` is a library) |
| L2, M3, M4 | §5.1 (`memo::core::stereotypes`) — newly proposed sibling package |
| N3, N4 | §2 R4 (id format) |
| D1, D5 | §1 principle 4 (def/usage split) |
| Q1, S2, Q3 | §2 R5 (units) |
| I1, I2, I3, I4 | §2 R6 (ports + ExchangeItem); fresh-arch P7 (Ports/IBD phase) |
| R1–R7 | DHF compiler (B11) needs satisfy/verify chains for ISO 14971 + IEC 62304 |
| V1–V6 | §5.3 (one-view-per-file uses these forms) |
| A1–A3 | §5.1 (`memo::core::relationships`) |
| CE1, CE2 | §6 §10.2 (Risk views — bowtie / FTA) |

The platform.md already names these patterns; this rule book is the authoritative how-to.

---

## 17. Lint catalogue summary (machine-checkable)

```
P1   one package per file, name ↔ filename
P2   private import default
P3   library packages declare `library package`
P5   filesystem path ↔ namespace
N3   id literal in <'…'> with format <KIND>-<DOMAIN>-<NNN>
D1   no `… def` of an ontology kind in projects/
D2   :> for specialise, redefines for override, :>> for bind
D3   explicit multiplicity when ≠ 1
D5   ref part for non-owned references
Q1   no bare Real for physical quantities
M3   every #tag must be a registered metadata def :> SemanticMetadata
L2   every part-def library has a sibling Semantic Metadata file
```

`memo lint --rule <id>` runs each. CI gates the full set on every PR that touches `ontology/**` or `projects/**`.

---

## 18. Worked end-to-end MEMO example

Below: a single Hazard kind, fully compliant with all rules above. Copy-and-paste skeleton for new ontology authors.

> **Note on package syntax in the examples below.** For brevity these snippets write the
> namespace as `library package memo::arch::risk { … }`. Per **P1**, the actual authored form
> **nests** the segments — `package memo { package arch { library package risk { … } } }` —
> because the strict grammar rejects qualified package *declarations*. The body content is
> identical; only the wrapping differs.

### 18.1 Library package — `memo::arch::risk` (definitions + abstract usages)

```sysml
// ontology/arch/risk.sysml
library package memo::arch::risk {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    private import memo::core::relationships::*;
    private import ScalarValues::*;
    private import ISQ::*;

    part def HazardousSituation :> TraceableElement {
        attribute exposureFrequency : Real;        // dimensionless rate per use
    }

    part def Hazard :> TraceableElement {
        doc /* An actual or potential source of harm — ISO 14971:2019 §3.4.
             * Severity is a property of the hazard's worst-case Harm,
             * not of the Hazard itself. */

        attribute initialSeverity     : SeverityKind;
        attribute initialProbability  : ProbabilityKind;
        attribute residualSeverity    : SeverityKind;
        attribute residualProbability : ProbabilityKind;

        ref part hazardousSituation : HazardousSituation [1..*];
        ref part associatedHarm     : Harm              [1..*];
    }

    part def Harm :> TraceableElement {
        attribute severity : SeverityKind;
    }

    part def Mitigation :> TraceableElement {
        doc /* A risk-control measure per ISO 14971 §7. */
    }

    abstract part hazards    : Hazard    [*] nonunique;
    abstract part mitigations: Mitigation[*] nonunique;
}
```

### 18.2 Sibling stereotype file — `memo::arch::risk::stereotypes`

```sysml
// ontology/arch/risk_metadata.sysml
library package memo::arch::risk::stereotypes {
    private import memo::arch::risk::*;
    private import Metaobjects::SemanticMetadata;

    metadata def hazard      :> SemanticMetadata { :>> baseType = hazards     meta SysML::Usage; }
    metadata def mitigation  :> SemanticMetadata { :>> baseType = mitigations meta SysML::Usage; }
}
```

### 18.3 Project usage — `memo::projects::infusion_pump::risk`

```sysml
// projects/infusion-pump/sysml/risk.sysml
package memo::projects::infusion_pump::risk {
    private import memo::arch::risk::*;
    private import memo::arch::risk::stereotypes::*;
    private import memo::core::enumerations::*;

    #hazard <'HAZ-INF-001'> fluidOverInfusion : Hazard {
        doc /* Excessive fluid delivered to the patient because of a runaway
             * pump motor. Worst-case harm: fluid overload, hypertension, death. */

        :>> initialSeverity     = SeverityKind::catastrophic;
        :>> initialProbability  = ProbabilityKind::occasional;
        :>> residualSeverity    = SeverityKind::catastrophic;
        :>> residualProbability = ProbabilityKind::improbable;
    }

    #mitigation <'MIT-INF-001'> motorWatchdogTimer : Mitigation {
        doc /* A 100 ms watchdog timer halts pump motor on lost heartbeat. */
    }

    connection : Mitigates connect motorWatchdogTimer to fluidOverInfusion;
}
```

### 18.4 View — `memo::profile::views::risk::matrix` (already shown in platform.md §5.3, repeated here using `expose` form):

```sysml
// ontology/profile/views/risk/risk_matrix.sysml
package memo::profile::views::risk::matrix {
    private import memo::profile::views::core::*;
    private import memo::profile::viewpoints::default_viewpoints::*;
    private import memo::arch::risk::stereotypes::*;

    view def RiskMatrixView :> DiagramView {
        attribute :>> diagramType = "matrix";
        attribute :>> presentationKind = { PresentationKind::riskTable };
        filter @hazard or @mitigation;
        render asMatrix;
    }

    view <'VIEW-RISK-MATRIX'> riskMatrixView : RiskMatrixView {
        expose memo::projects::**[@hazard or @mitigation];
        viewpoint :>> riskViewpoint;
    }
}
```

Compliance summary for §18: P1 P2 P3 P5 N3 D1 D2 D3 D5 I1 I3 R1 V3 V4 V6 M1 M3 M4 L2 Q1 — all rules satisfied. Use this skeleton for every new ontology layer + project usage pair.

---

## 19. What the corpus does NOT support — and MEMO must therefore add

Studied corpus deliberately omits:

| Concern | OMG / GfSE coverage | MEMO must add |
|---|---|---|
| Regulatory clause traceability (ISO 14971 §6.3 → element) | none — corpus is generic | `memo::process::compliance::<standard>` parts as `:> StandardClause` with `attribute clauseRef` |
| Lifecycle on every part | only on documents | `attribute lifecycleState : LifecycleStateKind` on `TraceableElement` |
| Post-market (PMS, vigilance, FSCA) | none | `memo::process::pms` package |
| SBOM | none | `memo::arch::sbom` package |
| Privacy (DPIA depth) | none | `memo::arch::privacy` package |
| Usability per IEC 62366-1 | none | `memo::arch::usability` package |
| Clinical evidence chain | partial (Requirements only) | `memo::arch::clinical_evidence` with `IntendedUseClaim → ClinicalQuestion → Study → Endpoint → Evidence` chain |

These are the seven additions identified in the principal-systems-engineer critique (platform.md §16). Rule book scope = "how to do SysML right". Domain scope = those seven packages. Both ship together.

---

## 20. Cross-check with deepwiki §7 (example-models page)

deepwiki summary (already fetched) calls out: library imports, definition/usage pattern, stereotyped relationships (`#causation`, `#derivation`), metadata application (`@CausationMetadata`), part-then-usage layout, and that examples use standard libraries across multiple files. Every one of these is captured by rules above (P2, D1, M2, M3, M4, P5, L1). No conflict; rule book is consistent with deepwiki guidance and adds enforcement detail.

---

## 21. Maintenance

Owner: ontology reviewer. Update process:
1. Find a missing pattern in OMG release > 2026.x, GfSE main, or FiBO2SysMLv2 main.
2. Add a numbered rule with source citation (`Source: <file>:<lines>`).
3. If the rule is lint-checkable, add to §17.
4. Update §18 worked example if the rule changes the canonical skeleton.
5. Bump `memo::manifest::release.sysmlRulebookVersion`.

---

## 22. FiBO2SysMLv2 — ontology-library practice (production reference)

**Why this section exists.** OMG corpus = pedagogical examples. GfSE = community demos. **FiBO2SysMLv2 is the only production-grade SysML v2 ontology library publicly available** that ships as a `.kpar` artefact, integrates a real-world reference ontology (FIBO from EDM Council), and documents an end-to-end build/publish path. MEMO ontology is a direct analogue (medical-device ontology vs financial ontology) — patterns transfer. Where FiBO conflicts with rules in §1–§14, this section names the conflict and resolves it.

**Source paper:** `paper_FiBO_SysMLv2_en.md` — Hugo Ormo, NTT DATA, "From an AI-Assisted SysMLv2 Model to a Domain-Integrated Reference Architecture". Quoted as Paper §X below.

### 22.1 Configuration Item (CI) aggregator pattern (FB1) — **NEW**

**Source:** every domain area in `FiBO2SysMLv2_Project/`. Example `FiBO_FND_Parties.sysml`:
```sysml
// CI Aggregator (public re-export)
package FIBO_FND_Parties {
  doc/* Configuration Item (CI) package for FIBO_FND_Parties and its exported model elements. */
  public import Parties::*;
}

package Parties {
  // … real content here …
}
```
Larger CI like `FiBO_FND_Law.sysml` aggregates 5 sub-packages:
```sysml
package FIBO_FND_Law {
  doc/* Configuration Item (CI) package … */
  public import JurisdictionPackage::*;
  public import LegalCapacityPackage::*;
  public import LegalCorePackage::*;
  public import LegalAgreementsPackage::*;
  public import LegalContractsPackage::*;
}
```
**Paper §2.1:** *"Each CI encapsulates a well-defined domain and publicly re-exports referenced packages. Provides clear ownership, versionable baselines, controlled dependencies, incremental extensibility."*

**MEMO rule FB1:** every domain area ships a top-level **CI aggregator package** that does only `doc` + `public import` of internal sub-packages. Naming: `MEMO_<AREA>_<TOPIC>` upper-snake (`MEMO_ARCH_RISK`, `MEMO_PROCESS_ISO14971`, `MEMO_PROFILE_VIEWS_RISK`). Internal sub-packages stay PascalCase (`Hazards`, `Mitigations`, `RiskControls`).

**MEMO directory layout (revised):**
```
ontology/arch/
├── MEMO_ARCH_Risk.sysml          ← CI aggregator + Hazards + Mitigations + RiskControls + Harms
├── MEMO_ARCH_Cybersecurity.sysml ← CI aggregator + Threats + Vulnerabilities + Assets + …
├── MEMO_ARCH_LogicalStructure.sysml
└── …
```

**Conflict with P1:** §1 P1 said "one package per file". FB1 supersedes for **CI aggregator files**: one CI per file, multiple internal packages allowed. Pure library files (`memo::core::common`) keep one-package-per-file.
**Lint:** FB1.

### 22.2 Sysand project manifest (FB2) — **NEW**

**Source:** `FiBO2SysMLv2_Project/.project.json`:
```json
{
  "name": "FiBO2SysMLv2",
  "description": "A SysMLv2 representation of the Financial Industry Business Ontology …",
  "version": "0.0.2",
  "license": "MIT",
  "maintainer": ["Hugo Ormo <…>", "Max Cramer <…>"],
  "topic": ["Ontology", "Financial Industry", "EDM Council", "FiBO"],
  "usage": [
    { "resource": "urn:kpar:semantic-library" },
    { "resource": "urn:kpar:systems-library" },
    { "resource": "urn:kpar:metadata-library" },
    { "resource": "urn:kpar:requirement-derivation-library" },
    { "resource": "urn:kpar:quantities-and-units-library" }
  ]
}
```
**MEMO rule FB2:** every shippable ontology or methodology package carries a `.project.json` declaring `name`, `version`, `license`, `maintainer[]`, `topic[]`, and `usage[]` listing every external SysML library URN it consumes (`semantic-library`, `systems-library`, `metadata-library`, `requirement-derivation-library`, `quantities-and-units-library`, plus MEMO-specific package URNs such as `urn:kpar:memo-sysml-base`, `urn:kpar:memo-ontology`, and `urn:kpar:memo-methodology-default`). Replaces the planned `memo.package.yaml` as release metadata — adopt Sysand's existing format instead of inventing one.

This **supersedes ADR-1-8** for ontology packages. Device-project format (`memo.config.yaml`) unchanged.
**Lint:** FB2.

### 22.3 Sysand lock file (FB3) — **NEW**

**Source:** `FiBO2SysMLv2_Project/sysand-lock.toml`:
```toml
lock_version = "0.2"
[[project]]
name = "FiBO2SysMLv2"
version = "0.0.2"
exports = [ "AccountingEquity", "Addresses", "Agents", "Agreements", … ]
```
**MEMO rule FB3:** drop the planned bespoke `memo.lock.yaml`. Use `sysand-lock.toml` (Sysand-generated, lockfile schema v0.2). `memo lock` shells `sysand build` and commits the resulting toml.

**Supersedes** rule §14 R1 risk mitigation ("Lockfile schema bump") — Sysand owns the schema; MEMO doesn't.
**Lint:** FB3 (CI gate: lockfile reflects current `.sysml` exports).

### 22.4 `.kpar` package as deliverable (FB4) — **NEW**

**Source:** Paper §2.5–§2.6: *"`sysand info` (metadata and project resolution) and `sysand build` (package build) form the reproducible publishing path. … The package artifact `FiBO2SysMLv2-0.0.2.kpar` was generated."*

**MEMO rule FB4:** ontology releases ship as `.kpar` via Sysand. CI pipeline:
```
sysand info               # validate metadata
sysand build              # produce memo-ontology-<version>.kpar
sysand publish            # push to registry (TBD)
```
Published artifacts follow the L0/L1/L2 split: `memo-sysml-base-<v>.kpar`, `memo-ontology-<v>.kpar`, and methodology packages such as `memo-methodology-default-<v>.kpar` — all shipped from the `memo-sysmlv2` repo (see [ADR-1-17](../decisions/adr/ADR-1-17-three-repo-split.md)). `memo-cli` consumes them as URN dependencies in its own `.project.json`.

### 22.5 `part def` vs `item def` — actor / processed semantics (FB5) — **NEW** (resolves §4 S1 ambiguity)

**Source:** Paper §3: *"All elements follow the principle: **Parts act or process · Items are processed or transferred**"*. Confirmed across `FiBO_FND_Parties.sysml` (`part def Party`), `FiBO_FND_Agreements.sysml` (`item def Agreement`, `item def Commitment`).

**MEMO rule FB5:** apply the same principle. Re-classify the MEMO ontology:

| Concept | Was (feedback / v3 plan) | Should be (FB5) | Reason |
|---|---|---|---|
| `Hazard` | `part def` | `item def` | Hazards are *observed/recorded*, not actors |
| `HazardousSituation` | `part def` | `item def` | Same |
| `Harm` | `part def` | `item def` | Same |
| `Mitigation` | `part def` | **stays `part def`** | Mitigations *act* (motor watchdog, alarm, software check) — performed by a system part |
| `RiskControl` | `part def` | `item def` | Documented control plan — processed |
| `Requirement` | `requirement def` | unchanged | SysML reserved kind |
| `Threat` | `part def` | `item def` | Recorded threat |
| `Vulnerability` | `part def` | `item def` | Recorded |
| `TrustBoundary` | `part def` | `item def` | Boundary marker |
| `Asset` | `part def` | **stays `part def`** | Asset *holds value, processes data* |
| `Patient` / `Clinician` / `User` | `part def` | unchanged `part def` | Actors |
| `Pump`, `Motor`, `Sensor`, `Software unit` | `part def` | unchanged `part def` | Processing components |
| `TherapyCommand`, `Telemetry`, `PrescriptionOrder` | `item def` | unchanged | Transferred items |
| `DesignReview`, `CAPA`, `ChangeRequest` | `part def` | `item def` | Process artefacts |
| `ControlledArtifact` (DHF doc) | `part def` | `item def` | Document — processed |

**Impact:** every `part def Hazard` in v3 plan / feedback package becomes `item def Hazard`. Significant correction. Update platform.md §16 critique item — list "FB5 reclassification" as P1 work alongside the namespace migration.

### 22.6 `specializes` keyword preferred over `:>` for ontology (FB6) — **NEW**

**Source:** every FiBO file uses `specializes`:
```sysml
item def Contract specializes Agreement { … }
item def NaturalPerson specializes Person { }
item def DependentParty specializes Party { … }
```
OMG corpus uses `:>` everywhere. Both forms parse; `specializes` is the long form, `:>` the symbolic shorthand.

**MEMO rule FB6:** in **ontology layers** (`memo::core::*`, `memo::arch::*`, `memo::process::*`) use `specializes`. Reads natively to non-SysML reviewers (regulators, clinical engineers). In **profile + view** layers (`memo::profile::*`) `:>` allowed because audience is tooling-oriented.

**Conflict with §3 D2:** D2 said use `:>`. FB6 partially supersedes for ontology files only. Update D2 lint to allow either; per-layer policy enforced by FB6 lint.

### 22.7 Multiplicity always explicit, even `[1..1]` and `[0..1]` (FB7) — **NEW** (strengthens §3 D3)

**Source:** every FiBO `item def`/`part def` declares cardinality on every attribute:
```sysml
attribute partyName: PartyName[0..*];
attribute description: String[0..1];
attribute commitment: Commitment[1..*];
attribute effectiveDate: Date[0..1];
```
Comes from OWL roots — owl:minCardinality / maxCardinality always specified.

**MEMO rule FB7:** every `attribute`, `ref part`, `item` and `part` member declares an explicit multiplicity. `[1..1]` for required-single, `[0..1]` for optional, `[0..*]` for optional-many, `[1..*]` for required-many. No bare un-multiplied features in ontology files.
**Lint:** FB7.

### 22.8 `enum def` with named members (FB8) — **NEW**

**Source:** `FiBO_FND_Parties.sysml`:
```sysml
enum def PartyRelationshipKind {
    doc/* classification of relationships that may exist between parties */
    enum ParentSubsidiary;
    enum Affiliate;
    enum Counterparty;
    enum GuarantorGuaranteed;
    enum AgentPrincipal;
    enum EmployerEmployee;
    enum CustomerSupplier;
    enum RelatedParty;
    enum Other;
}
```
**MEMO rule FB8:** prefer `enum def Foo { enum Bar; enum Baz; }` over `attribute … : Foo[*]` style for closed value sets. Use the OMG `attribute kind : FooKind` only for set-valued tags (where multiple kinds apply at once).

`memo::core::enumerations` adopts FB8 form for: `ConcernKind`, `CriticalityKind`, `LifecycleStateKind`, `WorkflowStageKind`, `AudienceKind`, `RuleStrengthKind`, `PresentationKind`, `ViewOutputKind`, `SeverityKind`, `ProbabilityKind`.

### 22.9 Reusable constraints library file (FB9) — **NEW**

**Source:** `FiBO_FND_Constraints.sysml`:
```sysml
package FIBO_FND_Constraints {
  doc/* Configuration Item (CI) package … */
  private import ScalarValues::*;
  constraint def NonNegativeInteger { in n : Integer; n >= 0 }
  constraint def PositiveInteger    { in n : Integer; n > 0 }
  constraint def NonNegativeReal    { in x : Real;    x >= 0.0 }
  constraint def Between0And1       { in x : Real;    x >= 0.0 and x <= 1.0 }
  constraint def PercentBetween0And100 { in x : Real; x >= 0.0 and x <= 100.0 }
}
```
**MEMO rule FB9:** ship `memo::core::constraints` with reusable predicates: `NonNegativeReal`, `Between0And1`, `PercentBetween0And100`, `ProbabilityValue` (`Between0And1` aliased), `RiskScoreInRange`, `ValidISOClause` (regex check), `IDFormatValid` (matches `<KIND>-<DOMAIN>-<NNN>`). Every quantitative constraint in `memo::arch::*` references a `memo::core::constraints` def — no inline constraint duplication.

### 22.10 Don't reify what SysML already provides (FB10) — **NEW**

**Source:** `FiBO_FND_Relations.sysml`:
```sysml
package Relations {
  doc/* relation semantics are intentionally provided by KerML/SysML native
        language constructs (e.g., dependency, specialization, redefinition,
        subsetting, typing, usage). This package serves as a CI anchor only
        and does not reify language-level relations as domain items. */
}
```
**MEMO rule FB10:** before declaring a `connection def` for a "relationship", check whether SysML already provides the link:
- `satisfy` for requirement-to-design → use `satisfy`, not a `Satisfies` connection.
- `verify` (inside `verification def`) for verification → use built-in.
- `allocate` for logical-to-physical → use `allocate`, not a `LogicalToPhysical` connection.
- Subsetting / specialisation → use `specializes` / `:>`.
- Owns / contains → use `part` (composite) vs `ref part` (reference).

`connection def` is justified only when the link **carries attributes** (e.g. `Mitigates` carries `mitigationStrength`, `effectivenessRationale`, `verificationLink`) or has **multiplicity > 2** (multicausation). MEMO `connection def Mitigates`, `connection def Causation` qualify. Generic `Refines`, `DerivesFrom` → use SysML built-ins.

**Conflict with §11 A2 / A3:** A3 listed Mitigates/DerivesFrom/Realises as `connection def`s. FB10 narrows: keep Mitigates (attributes) + Causation (n-ary); drop Refines/Realises (use `subsets` or `:>`).

### 22.11 Agentic-governance role separation (FB11) — **NEW**

**Source:** Paper §2.4: *"Method Steward — methodological consistency of ontology mapping. Syntax Steward — syntactic correctness, language conformance, parser compatibility. This separation prevents methodological errors from being masked by syntactic correctness — and vice versa."*

**MEMO rule FB11:** ontology PRs require two distinct reviewers:
- **Method Steward** (medical-domain owner, e.g. clinical engineering lead): signs off on FB5 actor/item classification, on regulatory clause coverage, on closure-rule semantics. Owns §16 critique gaps.
- **Syntax Steward** (SysML tooling owner): signs off on §17 lint pass, OMG round-trip (`memo check --sysml-compat`), `sysand build` success, FB7 multiplicity completeness.

`CODEOWNERS` for `ontology/**`:
```
ontology/  @method-steward @syntax-steward
```
Both required-reviewers; PR cannot merge with one approval. AI-generated changes (Claude-assisted ontology edits) explicitly require both — Paper §4.2: *"AI assistance is not a replacement for methodology, but a multiplier."*

### 22.12 Generated structure documentation (FB12) — **NEW**

**Source:** `docs/model-structure.md` + `docs/model-structure.json` regenerated from SysML AST by `scripts/generate-model-index.ps1`. Per Paper §2.5: *"automated central model structure documentation generation from SysMLv2 sources."*

**MEMO rule FB12:** ship `memo arch-doc` CLI command (B12-extension). Walks parsed `memo::*` registry, emits:
- `docs/model-structure.md` — human-readable namespace tree, every package + every part def with its `doc` string.
- `docs/model-structure.json` — machine-readable index for the docs site, IDE plugins, ontology viewer.
- Stale-check CI: regenerate; fail if `git diff` non-empty.

Replaces hand-curated docs with deterministic output of B11/B12. Every package gets a `doc/* … */` enforced by FB12 (no undocumented ontology packages reach release).

### 22.13 File-level quality gates (FB13) — **NEW**

**Source:** Paper §2.5: *"cleanup of parser-critical artifacts (e.g. UTF-8 BOM in SysML files), removal of empty placeholder definitions and closure of open type references for a stable build baseline."*

**MEMO rule FB13:** ontology CI must enforce:
- **No UTF-8 BOM.** `memo lint --rule FB13a`.
- **No empty `def`s.** `part def Foo;` with no body and no `:> Bar` is rejected unless explicitly marked `abstract` (per L1) or `// PLACEHOLDER OK — issue #NNN` with open issue link.
- **No dangling type references.** Every `: TypeRef` must resolve in the import graph; `memo lint --rule FB13c`.
- **Lockfile fresh.** `sysand-lock.toml` regenerated and committed; CI fails on stale lock.

### 22.14 Domain-area README (FB14) — **NEW**

**Source:** `FiBO2SysMLv2_Project/FiBO Foundations FND/README.md` — lightweight per-domain pointer to central docs.

**MEMO rule FB14:** every CI directory ships a `README.md` with: 1-paragraph scope, list of CI files, link to `docs/model-structure.md` anchor. No content duplication; pointer-only.

### 22.15 Ontology-as-data philosophy (FB15) — **PRINCIPLE**

**Source:** Paper §4.1: *"Ontologies are not just semantic context, but the foundation for actionable models. Only an explicit ontology makes models domain-precise, machine-interpretable, and therefore executable and verifiable. Without ontological grounding, models often remain documentation-like; with ontology, they become robust specification artifacts."*

**MEMO principle FB15** (no lint — design discipline):
- Ontology is **the system**, not metadata about the system.
- Tool (`memo-architect`) is the wrapper; the SysML files in `@memoarchitect/ontology` and the active methodology package are the truth.
- Every UI feature, every CLI command, every DHF section ultimately resolves to a query against the ontology AST. No business logic outside the ontology + view descriptors.
- Reinforces platform.md §1 principle 1 ("Ontology is SysML, not YAML") and the "SysML-as-Source-of-Truth" memory marker (`feedback_sysml_ground_truth.md`).

### 22.16 FiBO patterns → MEMO architecture mapping

| FB rule | Maps to platform.md |
|---|---|
| FB1 (CI aggregator) | §4 repo layout — `MEMO_ARCH_*.sysml` files; revises §5.2 one-view-per-file (views still 1:1; ontology layers go CI-aggregator) |
| FB2 (`.project.json`) | §0 namespace + §13 ADR-1-11 — replaces `memo.package.yaml`; new ADR-1-19 ".project.json + sysand-lock.toml supersede ADR-1-8 for ontology packages" |
| FB3 (sysand-lock) | §13 ADR-1-19 |
| FB4 (.kpar deliverable) | §12 phased plan — add P-FB step "Sysand integration" between P2 and P3 |
| FB5 (part vs item) | **revises §16 critique** — promote to P1 work alongside namespace migration; significant ontology re-classification |
| FB6 (specializes vs :>) | §2 R3 — split per-layer |
| FB7 (explicit multiplicity) | §2 new R-rule R11 |
| FB8 (enum def members) | §5.1 — `memo::core::enumerations` rewrite |
| FB9 (constraints lib) | §5.1 — new `memo::core::constraints` package |
| FB10 (no reified relations) | §5.1 — narrows `memo::core::relationships` to attribute-bearing or n-ary connections |
| FB11 (Method + Syntax Stewards) | §17 critique #11 (architect) + §16 ownership — concrete CODEOWNERS rule |
| FB12 (generated docs) | new B12-extension CLI command `memo arch-doc` |
| FB13 (file gates) | §15 acceptance — adds BOM/empty-def/dangling-ref/lock-fresh gates |
| FB14 (domain README) | §4 repo layout |
| FB15 (ontology-as-data) | §1 guiding principles — already aligned, FiBO confirms |

### 22.17 New ADRs from FB rules

| ADR | Title | Status |
|---|---|---|
| **ADR-1-19** | Adopt Sysand `.project.json` + `sysand-lock.toml` for ontology packages (supersedes `memo.package.yaml` portion of ADR-1-8) | Proposed |
| **ADR-1-20** | Ontology releases ship as `.kpar` via Sysand build | Proposed |
| **ADR-1-21** | CI aggregator pattern (`MEMO_<AREA>_<TOPIC>` packages) | Proposed |
| **ADR-1-22** | `part def` = actor / processor; `item def` = processed/transferred — re-classify Hazard, Harm, Threat, Document, etc. | **Proposed (HIGH IMPACT)** |
| **ADR-1-23** | Method Steward + Syntax Steward review separation for ontology PRs | Proposed |
| **ADR-1-24** | `memo arch-doc` regenerates `docs/model-structure.{md,json}` deterministically | Proposed |

### 22.18 Updated lint catalogue (additions to §17)

```
FB1   CI aggregator file: doc/* */ + public import only; internal sub-packages allowed
FB2   ontology package ships .project.json with name/version/license/usage[]
FB3   sysand-lock.toml fresh on every PR
FB5   actor types use part def; processed types use item def (per §22.5 table)
FB6   ontology layers use specializes; profile/views may use :>
FB7   every attribute/ref part has explicit multiplicity ([0..*] / [1..1] / …)
FB13a no UTF-8 BOM in .sysml files
FB13b no empty `def Foo;` without :> Bar or abstract or placeholder marker
FB13c no dangling type references
```

### 22.19 Worked example — revised under FB rules

```sysml
// ontology/arch/MEMO_ARCH_Risk.sysml

// CI aggregator — public re-export
package MEMO_ARCH_Risk {
  doc/* Configuration Item (CI) package for memo arch risk and its exported model elements.
        Covers ISO 14971:2019 risk-management ontology — hazards, harms, mitigations, risk controls. */
  public import Hazards::*;
  public import Harms::*;
  public import Mitigations::*;
  public import RiskControls::*;
}

// =====================================================================
package Hazards {
  private import ScalarValues::*;
  private import memo::core::common::*;
  private import memo::core::enumerations::*;
  private import memo::core::constraints::*;

  item def Hazard specializes TraceableElement {
    doc/* Actual or potential source of harm — ISO 14971:2019 §3.4.
          Hazards are recorded/observed; they do not act. Modelled as item. */
    attribute initialSeverity     : SeverityKind     [1..1];
    attribute initialProbability  : ProbabilityKind  [1..1];
    attribute residualSeverity    : SeverityKind     [0..1];
    attribute residualProbability : ProbabilityKind  [0..1];
    attribute hazardousSituation  : HazardousSituation [1..*];
    attribute associatedHarm      : Harm             [1..*];
  }

  item def HazardousSituation specializes TraceableElement {
    doc/* Circumstance in which people, property or environment are exposed to one or more hazards. ISO 14971 §3.5. */
    attribute exposureFrequency : Real [0..1];
    assert constraint validExposure : Between0And1 { in x = exposureFrequency; }
  }
}

// =====================================================================
package Harms {
  private import memo::core::common::*;
  private import memo::core::enumerations::*;

  item def Harm specializes TraceableElement {
    doc/* Injury or damage to the health of people, or damage to property or environment. ISO 14971 §3.3. */
    attribute severity : SeverityKind [1..1];
  }
}

// =====================================================================
package Mitigations {
  private import memo::core::common::*;

  // Mitigations ACT — they perform watchdog, alarm, software check.
  // Therefore part def, not item def.
  part def Mitigation specializes TraceableElement {
    doc/* Risk-control measure per ISO 14971 §7. A mitigation is a system part that performs control activity. */
    attribute mitigationStrength : RuleStrengthKind [1..1];
  }
}

// =====================================================================
package RiskControls {
  private import memo::core::common::*;

  // RiskControl is the documented plan; the Mitigation is what acts.
  item def RiskControl specializes TraceableElement {
    doc/* Documented risk-control plan referencing one or more mitigations. ISO 14971 §7.4. */
    attribute mitigation : Mitigations::Mitigation [1..*];
    attribute verificationLink : String [0..1];   // ID of verification case
  }
}
```

Compliance with FB1 + FB2 + FB5 + FB6 + FB7 + FB8 + FB9 + FB13 + L2 (separate stereotype file). MEMO `MEMO_ARCH_Risk.sysml` ships alongside `MEMO_ARCH_Risk_metadata.sysml` registering `#hazard`, `#harm`, `#mitigation`, `#riskControl` semantic-metadata defs.

### 22.20 Open questions raised by FiBO study

1. **Are `Requirement`s parts or items?** SysML reserved `requirement def` sidesteps the choice. MEMO keeps `requirement def` for ISO-clause-traceable requirements; FB5 doesn't apply.
2. **Are `DesignReview`, `CAPA`, `ChangeRequest` items or parts?** They are activities (someone performs a review). SysML offers `action def` — possibly a third bucket. Likely classification: `action def DesignReview` (the activity) + `item def DesignReviewRecord` (the document produced). Worth resolving before ADR-1-22 is accepted.
3. **Is FIBO `urn:kpar:requirement-derivation-library` available for MEMO?** Should `memo-ontology` `usage[]` include it for `derive` chains in cybersecurity threat modelling? Investigate during P2.
4. **Does `sysand publish` support a private MEMO registry?** Needed for proprietary device projects. Investigate during P-FB.

These four go into the architecture backlog; not blockers for ADR adoption but must be answered before P2 lands.
