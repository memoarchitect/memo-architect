# Functional layer

**The question:** what does the system do, in what order, and which part is
responsible for each function?

Functions describe transformation—inputs become outputs—without saying what
hardware or code does the work. Keeping them separate from components lets you
reason about behavior first, and then check that every function has an owner.

![Functional layer](../../images/modeling/layer-functional.svg)

1. **Functions** — `SystemFunction` for what the system as a whole does;
   `ComponentFunction` for what one component does. Give each a trigger, an output
   description, a concern and a criticality.
2. **Functional exchanges** — items passed between functions through pins
   (`in` / `out` parameters). A `FunctionalTransfer` is a flow of an item from one
   function's output to another's input.
3. **Functional flow** — a `FunctionalFlow` orders functions into a chain for a
   scenario, with successions, decisions and parallel branches.
4. **Allocation** — SysML's `allocate` gives each function a responsible
   logical component, software module or hardware element.

Behavior beyond ordering lives here too: a `StateMachine` for modes,
`ModeConfiguration` for what is active in each mode, and `Contract`,
`BehaviorProperty` and constraint definitions (for example
`MaxResponseTimeConstraint`) for properties a verification case can check.

## Kinds

| Kind | Use it for |
|---|---|
| `SystemFunction`, `ComponentFunction` | A transformation the system or a component performs. |
| `FunctionalFlow` | An ordered chain of functions for one scenario. |
| `FunctionalTransfer` | An item flowing from one function to another. |
| `ActivityAction`, `ActivityFlow` | Lower-level activities inside a function. |
| `StateMachine`, `ModeConfiguration` | Modes and what each mode enables. |
| `Contract`, `BehaviorProperty`, `TimingConstraint` | Assume/guarantee contracts and temporal properties. |

## Relationships

| Relationship | Meaning |
|---|---|
| `#ModelingMetadata::Refinement dependency from … to …` | The component function realizes the system function. |
| `allocate … to …` (native) | This element is responsible for this function. |
| `flow … from … to …` (native) | This item flows between these pins. |
| `succession` / `first … then …` (native) | This action follows that one. |
| `satisfy` (native) | This function satisfies this requirement. |

## Example

```sysml
action fnEnforceLimits : SystemFunction {
    @MemoIdentity { :>> providedId = "FUNC-006"; :>> label = "EnforceDoseLimits"; }
    attribute :>> trigger = "patient bolus request or clinician square bolus command";
    attribute :>> outputDescription = "Bolus authorized or rejected against lockout interval and hourly maximum";
    attribute :>> criticality = CriticalityKind::catastrophic;
}

action fnCommandPump : SystemFunction {
    @MemoIdentity { :>> providedId = "FUNC-007"; :>> label = "CommandPumpMotor"; }
    in flowCommandIn : InterfaceItem;
}

allocate infusionDeliveryFlow.acquireSensors to gpcaDevice.gpcaDeviceSensors;
```

## In Architect

Choose a system in **Working on**, then open **Functional** from the method map.
Choose a system in **Working on**. The page has four tabs:

- **Overview**: how many functions the system has, how many are allocated, how many
  say what they must do, the flows, and the next steps the method asks for.
- **Functional tree**: the system's functions, each with its id and where it is
  allocated. Select one to see what it must do, the functions it breaks down into,
  where it is allocated, the component functions that realize it, the flows and
  activities that use it, and the requirements it satisfies. **All properties** opens
  the properties panel. Switch from **Tree** to **Visual** for a block definition
  diagram (BDD) of the selected function's decomposition.
- **Functional flows**: create a named flow and choose its ordered steps from the
  system functions. The flow is drawn as a strip of steps, each with where its
  function is allocated; reorder or remove steps with the sequence controls.
  **Visual** opens the flow's activity diagram for branches and richer behavior.
- **Allocation**: allocate functions one at a time (pick or drag a function onto a
  target, or use the form), or see every function against every target in the
  **Matrix**, with the coverage below it.

A system function is allocated to a system, a system of systems or a logical
component, and may be allocated to more than one. A system is allocated to through
its usage, because SysML allocates between features. The method lists the kinds a
function may go to, and the ontology's relationship rules decide what is legal.

A component function realizes a system function and is allocated to exactly one
software or hardware component. In **Realized by**, create a component function and
choose its component in one operation, or link an existing one. The model then holds
a native refinement from the component function to the system function and an
allocation from the component function to the component.

**A system with no function tree.** A system's functions are the tree it is given.
When it has none, the page offers the trees already allocated to it and the trees no
system has: choosing one writes a `FunctionalRoot` from the system to the tree's top
function, and nothing is copied or moved. Or start a new tree, which creates the top
function and places the functions already allocated to the system under it as
references.

- A **function flow diagram** (`ffd`) and an **activity diagram** (`act`, `afd`)
  are [action flow views](../views/action-flow.md).
- A **state machine diagram** (`stm`) is a
  [state transition view](../views/state-transition.md).
- A **function allocation** grid (`alloc`) shows which element owns each
  function. See [Grid views](../views/grid.md).

## Review checklist

- Does every function have a single, named responsible element?
- Are the items exchanged between functions named and typed, not just arrows?
- Are safety functions (monitoring, shutdown) modeled as functions in their own
  right, so they can be allocated to independent parts?
