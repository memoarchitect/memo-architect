# Ontology Rearchitecture — Master Architecture Document

**Milestone:** `N-ONTO` (GitLab)
**Status:** Planned — 4 execution sessions
**Author of intent:** Somesh Kashyap (session captured 2026-04-18)
**Purpose:** Canonical specification for the ontology rearchitecture. All four execution sessions reference this document; each session's GitLab issue links back here for full context.

> When asked to "work on milestone N-ONTO" or "work on Session N of N-ONTO", Claude should read this document first, then the specific session's issue description, then the referenced code.

---

## 1. Vision

Move the MEMO ontology from a proliferated class hierarchy toward an **OWL-style, minimal-class, attribute-rich ontology** that is:

- **Arcadia-aligned** in its layers (OA, SA, LA, HA, SW, IF, REQ, VERIF), with **nested sub-layers** via directory hierarchy (Apollo-11 pattern).
- **Single-source-of-truth SysML**: kinds, relationships, and inheritance are derived from `.sysml` files; no parallel hierarchies, no domain packages redeclaring core types.
- **Requirements-rigorous**: one `Requirement` base class; the rigor of a requirement is expressed through `category`, `type`, `source`, and — most importantly — a `text` attribute that conforms to **EARS syntax** authored per **SOPHIST templates**.
- **Reuse-first**: both on the SysML side (every domain kind `:>` a core kind, no redefinition) and on the React/UI side (the in-app ontology viewer reuses existing ReactFlow nodes, edges, and toolbar components from the diagram view).

The current codebase partially satisfies these principles but has three significant violations that this milestone resolves:

1. **Duplicate ontology packages** under `packages/ontology-extensions/` (`medical-risk`, `medical-safety`, `medical-ops`, `medical-cyber`, `medical-sw`, `medical-clinical`, `medical-usability`) redeclare content already present in `ontology-medical/`, `ontology-iec62304/`, `ontology-cybersecurity/`, `ontology-medical-clinical-trial/`. This is an "extend-don't-duplicate" violation.
2. **Requirement class proliferation**: 50+ `requirement def` across 20+ files, many are redundant subclasses of `Requirement` that add nothing beyond a name. OWL-style would collapse most of these to attribute values on a single `Requirement`.
3. **Layer naming and mixing**: `Physical` should be `Hardware` (DHF / IEC 60601 terminology). `System` and `Subsystem` currently live in `logical.sysml` but are system-analysis concepts, not logical. `Purpose` should nest under `operational/` as a sub-layer rather than being a peer top-level layer.

---

## 2. Architectural Principles (binding)

These principles hold across every session. When a session-level decision conflicts with a principle, the principle wins.

### P1 — OWL-style minimal-class ontology

A new class is justified only if **at least one** of the following is true:

1. It introduces distinct structural attributes (more than a label).
2. It is referenced by a regulatory standard by name (e.g., IEC 62304 `SOUPItem`, ISO 14971 `Hazard`) and must surface with that exact name in compliance output.
3. It participates in a distinct relationship class in the ontology (it is the domain or range of relations not applicable to the parent).

Otherwise: use an attribute on the parent class. `FunctionalRequirement`, `TechnicalRequirement`, `SystemRequirement` — where they differ only in intent/category — become `Requirement { category: Functional | Technical | System }`, not subclasses.

> "Think OWL" — classes encode essence, attributes encode variation. A proliferation of near-identical subclasses is a smell.

### P2 — Extend-don't-duplicate (no parallel hierarchies)

Every `part def X` or `requirement def X` in a non-core package **must** either:

- `:> SomeCoreType` (extend an existing core or upstream kind), OR
- be genuinely novel (nothing equivalent exists upstream) and declare `part def X { … }` at the appropriate upstream layer, NOT redeclare it locally.

If you find yourself writing `part def Hazard { … }` in two packages, one of them is wrong. Domain packages extend; they do not redefine.

**Automated check** (to be added in Session 3): `pnpm run ontology:lint` that fails if two `part def` / `requirement def` declarations share a simple name across packages without an `:>` relationship linking them.

### P3 — Apollo-11 directory pattern, with nested sub-layers

- First directory under `sysml/` = **top-level Arcadia layer**
- Deeper directories = **sub-classifications** within that layer (for readability / navigation, not for semantic layer change)

Examples:

```
sysml/operational/purpose/business.sysml        → layer=operational, sub=purpose/business
sysml/operational/workflow/care-pathway.sysml   → layer=operational, sub=workflow
sysml/software/runtime/ros-nodes.sysml          → layer=software, sub=runtime
```

The layer is `operational` for all three operational files regardless of depth. Sub-directories aid cognitive navigation but do not add architecture layers.

### P4 — EARS + SOPHIST for requirement text

Every `Requirement` carries a `text : String` attribute. Authors are expected to write it in one of five **EARS templates**:

| Template | Form |
|---|---|
| Ubiquitous | "The `<system>` **shall** `<behaviour>`." |
| Event-driven | "**When** `<trigger>`, the `<system>` **shall** `<behaviour>`." |
| State-driven | "**While** `<state>`, the `<system>` **shall** `<behaviour>`." |
| Optional feature | "**Where** `<feature included>`, the `<system>` **shall** `<behaviour>`." |
| Unwanted behaviour | "**If** `<condition>`, **then** the `<system>` **shall** `<behaviour>`." |

**SOPHIST** contributes the modal-verb discipline (`shall` = obligation, `will` = statement of fact about environment, `should` = recommendation) and the template-placeholders method (placeholders identified, typed, and sourced from a glossary).

Session 2 delivers:

- An optional `text : String` attribute on `Requirement` with linting guidance (not hard validation — authors can override).
- A `syntaxStyle : EARSTemplate` attribute (enum: `Ubiquitous | EventDriven | StateDriven | Optional | Unwanted | FreeForm`).
- A VS Code snippet pack and a CLI `memo req new` interactive prompt that produces a compliant stub.

### P5 — Reuse React/UI components

The in-app ontology viewer (Session 4) must reuse, not recreate:

- `packages/web/src/views/ontology/OntologyPackageNode.tsx` — package swim-lane node
- `packages/web/src/views/ontology/sysml-edge-styles.ts` — SysML-aware edge styling
- `packages/web/src/views/ontology/RelationshipOverlay.tsx` — overlay for relationship viz
- `packages/web/src/views/ontology/OntologyDecompositionDiagram.tsx` — the top-level ReactFlow canvas
- The diagram view's zoom/pan/fitView utilities
- The existing Zustand `model-store` — extended, not forked

Any new component introduced in Session 4 must have a justification captured in the session's PR description ("could not reuse `<X>` because …").

### P6 — `tools/ontology-viewer/` is shelved

The standalone ontology viewer at `tools/ontology-viewer/` (or `tools/app/`) is **not** in scope. Users access the ontology through the main app's existing "ontology" mode. This supersedes Part 7 of the original spec and aligns with Phase C2.

---

## 3. Target Layer Structure

| Layer | Arcadia name | Directory | Purpose | Sub-layers (example) |
|---|---|---|---|---|
| **OA** | Operational Analysis | `sysml/operational/` | Actors, missions, clinical workflows, care pathways, needs, **purpose/business goals** | `purpose/`, `workflow/`, `actors/` |
| **SA** | System Analysis | `sysml/system/` | System boundary, system functions, system actors, external systems | `boundary/`, `function/` |
| **LA** | Logical Architecture | `sysml/logical/` | Logical components, architecture decisions, quality attributes, exchange items | `components/`, `decisions/` |
| **HA** | **Hardware** Architecture (renamed from Physical) | `sysml/hardware/` | Hardware components, processors, buses, deployment nodes, electrical / mechanical | `compute/`, `communication/` |
| **SW** | Software Architecture | `sysml/software/` | Software element hierarchy (SEI ADD/SAM + AADL-aligned), runtime processes, threads, data stores, connectors, firmware | `runtime/`, `structure/` |
| **IF** | Interfaces | `sysml/interfaces/` | AADL-aligned ExchangeItem + Port | — |
| **REQ** | Requirements | `sysml/requirements/` | Single `Requirement` base + category enum (see §4) | — |
| **VERIF** | Verification | `sysml/verification/` | Verification cases and results | — |

**Deltas from current state:**

- `sysml/system/` — **create**; move `System`, `Subsystem` from `logical.sysml`
- `sysml/physical/` → `sysml/hardware/` — **rename** (directory + package name)
- `sysml/purpose/` → `sysml/operational/purpose/` — **move/nest** (Purpose is an OA sub-layer, not a peer top-level layer)
- `sysml/analysis/`, `sysml/functional/` — **audit**; if they extend OA or SA concepts, nest under the appropriate layer; if genuinely novel, keep as peers with a documented rationale in this file

### 3.1 Layer-to-directory resolution rule

A file at `packages/<pkg>/sysml/<layer>[/<sub>]*/<name>.sysml` is classified into the architecture layer named by the first path segment after `sysml/`. Nested directories are ignored for layer assignment.

The `KindRegistry` (per CLAUDE.md Phase 7-8) must be updated to use this rule. Existing flat-directory assumptions in the registry are replaced with a "first-segment" extraction.

---

## 4. Requirement Ontology (target shape)

### 4.1 One base class

```sysml
package MEMO_Ontology_Core_Requirements {

    enum def RequirementCategory {
        enum Stakeholder;       // user need, business goal
        enum System;             // system-level shall
        enum Functional;         // function must perform
        enum NonFunctional;      // quality attribute
        enum Technical;          // implementation constraint
        enum Interface;          // interface contract
        enum Regulatory;         // from a standard/regulation
        enum Safety;             // safety goal / essential performance
        enum Security;           // cybersecurity control
        enum Clinical;           // clinical claim / performance claim
        enum Constraint;         // design constraint
        enum Specification;      // downstream spec derived from a requirement
    }

    enum def EARSTemplate {
        enum Ubiquitous;
        enum EventDriven;
        enum StateDriven;
        enum Optional;
        enum Unwanted;
        enum FreeForm;
    }

    enum def RequirementModality {
        enum Shall;      // obligation
        enum Will;       // statement of fact
        enum Should;     // recommendation
        enum May;        // permission
    }

    requirement def Requirement {
        attribute reqId : String;
        attribute title : String;
        attribute text : String;               // EARS-conformant statement
        attribute category : RequirementCategory;
        attribute syntaxStyle : EARSTemplate;
        attribute modality : RequirementModality;
        attribute priority : String;           // "must" | "should" | "could" (MoSCoW)
        attribute status : String;             // "draft" | "approved" | "verified"
        attribute rationale : String;
        attribute source : String;             // stakeholder, standard clause, etc.
    }
}
```

### 4.2 What goes away

These become attribute values on `Requirement`, **not** subclasses:

- `StakeholderNeed` → `Requirement { category = Stakeholder }`
- `SystemRequirement` → `Requirement { category = System }`
- `FunctionalRequirement` → `Requirement { category = Functional }`
- `TechnicalRequirement` → `Requirement { category = Technical }`
- `InterfaceRequirement` → `Requirement { category = Interface }`
- `MissionRequirement` → `Requirement { category = Stakeholder, source = "Mission" }`
- `UserNeed` → `Requirement { category = Stakeholder, source = "User" }`
- `SoftwareRequirement` → `Requirement { category = Technical, source = "Software" }` (or use a `domain` attribute)
- `HardwareRequirement` → `Requirement { category = Technical, source = "Hardware" }`
- `OtherRequirement` → delete (always redundant)
- `CybersecurityRequirement`, `AuthenticationRequirement`, `AuthorizationRequirement`, `AuditLogRequirement` → `Requirement { category = Security, topic = "Auth*" }`
- `Specification`, `MissionSpecification`, `FunctionSpecification`, `SystemSpecification`, `DesignSpecification` → `Requirement { category = Specification, scope = <enum> }`
- `UserInterfaceRequirement` → `Requirement { category = Interface, domain = "UI" }`
- `UseError` → **keep** (P1-exception: referenced by IEC 62366 by name)
- `VariantConstraint` → `Requirement { category = Constraint }` with additional product-line attributes

### 4.3 What stays as a named subclass (P1 exceptions)

These survive because a regulatory standard names them and they must surface in compliance output:

- `RegulatoryRequirement :> Requirement` — catch-all for standard-derived requirements
- `IntendedUse :> Requirement { category = Regulatory }` — FDA-required artifact
- `DesignInput :> RegulatoryRequirement` — 21 CFR 820.30(c)
- `DesignOutput :> RegulatoryRequirement` — 21 CFR 820.30(d) (if it exists)
- `Hazard`, `HazardousSituation`, `Harm`, `Risk`, `RiskControl` — ISO 14971 named artifacts
- `FailureMode`, `FailureCause`, `FailureEffect`, `TopEvent`, `FaultTreeContributor` — FMEA/FTA named artifacts
- `EssentialPerformance`, `BasicSafety`, `SafetyGoal` — IEC 60601 named artifacts
- `SOUPItem` — IEC 62304 named artifact (already `:> SoftwareModule` — preserve)
- `ClinicalClaim`, `ClinicalPerformanceClaim`, `ClinicalSafetyClaim` — EU MDR / clinical evaluation named artifacts

These exceptions should be **justified inline** with a comment citing the standard clause:

```sysml
// Named by IEC 14971 §3.1 — surfaces in Risk Management File
requirement def Hazard :> Requirement { ... }
```

### 4.4 EARS authoring workflow (P4 applied)

Session 2 delivers:

- **VS Code snippet pack** at `tools/vscode-ears-snippets/`:
  - Typing `ears-u` → ubiquitous template with cursor placeholders
  - `ears-e` → event-driven
  - `ears-s` → state-driven
  - `ears-o` → optional-feature
  - `ears-un` → unwanted-behaviour
- **CLI command**: `memo req new --template event` produces a stub
- **Lint rule** (warning only, not error): `pnpm run ontology:lint` flags `Requirement` entries whose `text` does not match any EARS template regex AND whose `syntaxStyle ≠ FreeForm`

---

## 5. Duplications to Resolve

Session 1 eliminates these. For each duplicate, the resolution is "delete the extension copy, ensure the canonical copy exists in the authoritative package, update all references".

| Duplicate (delete) | Authoritative (keep) | Notes |
|---|---|---|
| `packages/ontology-extensions/medical-risk/sysml/risk/risk-analysis.sysml` | `packages/ontology-medical/sysml/risk/risk-analysis.sysml` | Identical content |
| `packages/ontology-extensions/medical-risk/sysml/risk/risk-management.sysml` | `packages/ontology-medical/sysml/risk/risk-management.sysml` | Identical content |
| `packages/ontology-extensions/medical-safety/sysml/safety/safety-essential-performance.sysml` | `packages/ontology-medical/sysml/safety/safety-essential-performance.sysml` | Identical content |
| `packages/ontology-extensions/medical-ops/sysml/operations/medical-development.sysml` | `packages/ontology-medical/sysml/operations/medical-development.sysml` | Identical content |
| `packages/ontology-extensions/medical-cyber/sysml/cybersecurity/cybersecurity-interoperability.sysml` | `packages/ontology-cybersecurity/sysml/cybersecurity/cybersecurity.sysml` | Overlapping content; merge novel pieces into authoritative, delete rest |
| `packages/ontology-extensions/medical-sw/sysml/software-lifecycle/software-lifecycle.sysml` | `packages/ontology-iec62304/sysml/software-lifecycle/software-lifecycle.sysml` | The authoritative copy already has `SOUPItem :> SoftwareModule`; extensions copy redeclares as bare `part def` — delete |
| `packages/ontology-extensions/medical-clinical/sysml/clinical/clinical-evaluation.sysml` | `packages/ontology-medical-clinical-trial/sysml/clinical-trial/clinical-evaluation.sysml` | Identical content |
| `packages/ontology-extensions/medical-usability/sysml/design-control/design-control.sysml` | `packages/ontology-medical/sysml/design-control/design-control.sysml` | Overlapping — merge novel attributes into authoritative, delete rest |

**Additional deletions:**

- `packages/ontology-extensions/medical-dhf/` — audit; if content is already in `ontology-qms/` or `ontology-medical/`, delete; otherwise determine correct authoritative home
- `packages/ontology-extensions/medical-privacy/` — audit; likely belongs in a new `ontology-privacy` package or folds into `ontology-cybersecurity`

**Kept (not duplicates — they are true extensions of core types with novel content):**

- `packages/ontology-extensions/platform-core/`
- `packages/ontology-extensions/analysis-advanced/`
- `packages/ontology-extensions/logical-advanced/`
- `packages/ontology-extensions/operational-advanced/`
- `packages/ontology-extensions/physical-advanced/` → rename to `hardware-advanced/` per P3
- `packages/ontology-extensions/requirements-advanced/` — audit against §4; probably shrinks significantly once Specification classes collapse

---

## 6. Session Breakdown

Each session is scoped to land on `main` as a single logical PR / commit group. Sessions execute serially (2 depends on 1, 3 depends on 1, 4 depends on 3 for drawio generator but can proceed in parallel with 2).

### Session 1 — Ontology Core Rearchitecture

**GitLab issue:** `#S1-onto-core-rearch` (link from milestone)

**Scope:**

1. **Create `sysml/system/system.sysml`**; move `System`, `Subsystem` out of `logical.sysml`. Add `SystemOfInterest`, `SystemBoundary`, `ExternalSystem`, `SystemActor` per original spec §2.
2. **Rename `sysml/physical/` → `sysml/hardware/`**; rename package `MEMO_Ontology_Core_Physical` → `MEMO_Ontology_Core_Hardware`. Add `HardwareComponent`, `Processor`, `Bus`, `DeploymentNode` per original spec §3. Update `index.sysml` import, rendering config, all downstream imports.
3. **Refactor `software.sysml`** — root class renamed `Software` → `SoftwareElement`. Add `SoftwareSystem`, `SoftwareThread`, `SoftwareDataStore`, `SoftwareConnector` per original spec §4. Preserve `SoftwareComponent`, `SoftwareModule`, `SoftwareLayer`, `Firmware`. Add comments linking each class to its SEI ADD/SAM and AADL analogue.
4. **Nest `sysml/purpose/` under `sysml/operational/purpose/`** (P3). Update package references.
5. **Audit `sysml/analysis/` and `sysml/functional/`**: determine correct layer; nest or keep with rationale in this master doc (append to §3).
6. **Delete duplicate extension packages** per §5 table. For each, verify the authoritative copy contains all novel attributes before deleting; migrate any unique content into the authoritative copy first.
7. **Grep verification**: `grep -r "part def Library" packages/` → empty; `grep -r "MEMO_Ontology_Core_Physical" packages/` → empty.
8. **Update `KindRegistry`** to use first-segment layer resolution (P3.1).
9. **Build + tests pass**: `pnpm run build && pnpm run test`. If an example project breaks (`examples/infusion-pump`, `examples/irrigation-pump`), fix its references.

**Out of scope for Session 1:** Requirements consolidation (Session 2), diagram generator (Session 3), UI changes (Session 4).

**Acceptance criteria:**

- [ ] `sysml/system/system.sysml` exists; `System` and `Subsystem` moved
- [ ] `sysml/physical/` renamed to `sysml/hardware/`
- [ ] `HardwareComponent`, `Processor`, `Bus`, `DeploymentNode` present
- [ ] `software.sysml` uses `SoftwareElement` root with the full AADL/SEI set
- [ ] `sysml/purpose/` moved under `sysml/operational/purpose/`
- [ ] No standalone `Library` kind (grep returns empty)
- [ ] All duplicate extension packages from §5 table are deleted; authoritative copies retain any unique attributes from the duplicates
- [ ] `ontology-extensions/physical-advanced/` renamed to `hardware-advanced/`
- [ ] `pnpm run build && pnpm run test` pass
- [ ] `examples/*` projects build

---

### Session 2 — Requirements Ontology (OWL + EARS + SOPHIST)

**GitLab issue:** `#S2-onto-requirements`

**Scope:**

1. **Core `requirements.sysml`** updated to the target shape in §4.1 (new `RequirementCategory` enum with 12 values, new `EARSTemplate` enum, new `RequirementModality` enum, consolidated `Requirement` with `text`, `syntaxStyle`, `modality`, `source` attributes).
2. **Delete collapsed subclasses** per §4.2 across every package.
3. **Keep exceptions** per §4.3 with inline standard-clause comments.
4. **Migrate example projects** (`examples/infusion-pump`, `examples/irrigation-pump`, any template under `medical-modeling-profile/templates/`) to instantiate `Requirement` with the correct `category` attribute instead of using a dedicated subclass.
5. **VS Code snippet pack** at `tools/vscode-ears-snippets/` with 5 EARS templates.
6. **CLI**: `memo req new --template <ubi|event|state|opt|unwanted>` prompt-based scaffolder (in `packages/cli`).
7. **Optional lint** (`pnpm run ontology:lint` — may be implemented here or deferred to Session 3): warn when a `Requirement` entry's `text` doesn't match any EARS template regex and `syntaxStyle ≠ FreeForm`.

**Acceptance criteria:**

- [ ] Only one `requirement def Requirement` exists in all core + domain packages (grep check)
- [ ] 12 requirement-category values cover all previously-named-subclass use cases
- [ ] Exceptions in §4.3 are preserved with standard-clause comments
- [ ] Example projects instantiate `Requirement` (not `FunctionalRequirement` etc.) with correct category
- [ ] VS Code snippet pack installed and documented
- [ ] `memo req new` CLI command produces a compliant stub
- [ ] `pnpm run build && pnpm run test` pass

---

### Session 3 — Diagram Auto-Generation + drawio UX + Ontology Lint

**GitLab issue:** `#S3-diagram-ontology-generator`

**Scope:**

1. **New generator command** `pnpm run diagram:ontology` (wire into `packages/cli` as `memo diagram ontology` OR into a new `tools/diagram-gen/` package).
2. **Parse all `.sysml`** under `packages/ontology-*/sysml/` via the existing Langium parser (reuse — do not fork).
3. **Extract `part def X :> Y`** and `requirement def X :> Y` inheritance relationships.
4. **Build cross-package inheritance graph**: a kind in `ontology-medical` / `ontology-iec62304` / `ontology-qms` / `ontology-cybersecurity` / `ontology-medical-clinical-trial` that transitively `:>` a type defined in `ontology-core` gets a cross-package `«extends»` edge in the "Tracing" draw.io layer.
5. **Emit `docs/likec4/memo-ontology-architecture.generated.drawio`** with:
   - Swim-lane per package (outer group)
   - Sub-lane per architecture layer (OA/SA/LA/HA/SW/IF/REQ/VERIF)
   - Uniform element boxes (160 × 22)
   - `link` attribute on every node → relative path to source `.sysml` file
   - All `«extends»` and inheritance edges placed in a named `<mxLayer name="Tracing">` (hidden by default)
   - Orthogonal edge routing, 3px parallel offset, no crossings within a swim-lane
6. **Overlap check**: after generation, bounding-box intersection test; fail the build if any two nodes' rectangles intersect.
7. **Legend note** in the generated drawio: "View → Layers → Tracing to show inheritance."
8. **Ontology lint** (if not done in Session 2): `pnpm run ontology:lint`
   - Fails on P2 violation (duplicate names across packages without `:>` link)
   - Warns on P4 violation (non-EARS requirement text)
   - Warns on OWL anti-pattern (a `part def X :> Y { }` with no new attributes — likely should fold into `Y` with a category attribute)
9. **Replace the hand-maintained** `docs/likec4/memo-ontology-architecture.drawio` with the generated file (preserve historical file as `.drawio.bkp` then delete).

**Acceptance criteria:**

- [ ] `pnpm run diagram:ontology` runs without errors
- [ ] Generated drawio has zero overlapping cells (automated test)
- [ ] Every node has a `link` attribute pointing to its `.sysml` file
- [ ] Tracing layer hidden by default; toggling reveals cross-package inheritance
- [ ] `pnpm run ontology:lint` passes on current (post-S2) codebase
- [ ] `docs/likec4/memo-ontology-architecture.drawio` is now the generated output

---

### Session 4 — In-App Ontology Viewer Enhancement

**GitLab issue:** `#S4-in-app-viewer` (links to existing Phase C2 milestone for context continuity)

**Scope:**

1. **Reuse existing components** (P5):
   - `OntologyDecompositionDiagram.tsx` is the canvas — enhance, don't replace
   - `OntologyPackageNode.tsx` is the swim-lane node — enhance for click-to-zoom
   - `sysml-edge-styles.ts` is the edge registry — add `extends` edge style here
   - `RelationshipOverlay.tsx` handles relationship overlays
2. **Click-to-zoom behaviour**:
   - Click package swim-lane header → `fitView({ nodes: <all nodes in package>, duration: 400, padding: 0.2 })`
   - Click element node → `fitView({ nodes: [id], duration: 300, padding: 0.3 })`
   - Escape or back button → `fitView({ padding: 0.1 })` full zoom-out
3. **"Show Tracing" toolbar toggle**:
   - Zustand store: add `hiddenEdgeTypes: EdgeType[]` to model-store
   - Default: `['extends']` (tracing hidden)
   - Toolbar button toggles `extends` in/out of the set
   - `OntologyDecompositionDiagram` filters edges by this set before passing to ReactFlow
4. **Layout**:
   - ELK `elk.direction: RIGHT`
   - `elk.layered.nodePlacement.strategy: BRANDES_KOEPF`
   - Reuse existing ELK config in diagram view; extend with a named preset "ontology-swimlane" if needed
5. **Source-file deep-link**: right-click element node → "Open source" → opens corresponding `.sysml` file in VS Code (via `vscode://file/…` URL) or triggers the existing `ws-client.ts` file-open event
6. **Integration with Phase C2 work**: confirm no conflicts with the 8 open issues in Phase C2. If any Phase C2 issue now blocks or duplicates Session 4 scope, close/merge them with reference to this session.

**Acceptance criteria:**

- [ ] No new React components introduced without a "why reuse didn't work" justification in the PR description
- [ ] Clicking a package header zooms to the package
- [ ] Clicking an element zooms to the element
- [ ] Tracing edges hidden by default, toggle works
- [ ] Right-click → Open source works in dev and in the web preview
- [ ] Existing Phase C2 issues audited and either resolved or explicitly out-of-scope

**Out of scope for Session 4:**

- Building `tools/ontology-viewer/` (shelved — P6)
- Ontology editing (read-only viewer)

---

## 7. Execution Conventions

- **Branch:** `main` (trunk-based per CLAUDE.md). No feature branches.
- **Commits:** One logical commit per session (or a small group). Reference the session number and issue: `Session 1 (N-ONTO): rename Physical → Hardware layer (#<issue>)`
- **Milestone progress:** update the GitLab milestone's description as each session lands. Close the milestone issue when its session's acceptance criteria are met.
- **Tests:** `pnpm run build && pnpm run test` at the end of each session. If example projects break, fix them before closing.
- **Docs:** if an architectural decision in a session deviates from this master doc, edit the master doc in the same commit.

---

## 8. References

- CLAUDE.md — Phase 7-8 (SysML-as-source-of-truth), Phase 9 (ontology locking), Phase 12 (ontology viewer)
- ADR-1-6 — Three-tier ontology split
- ADR-1-8 — Project format contract
- Original session prompt (2026-04-18) captured at the top of this file
- SOPHIST Requirements Engineering — https://www.sophist.de/
- EARS (Easy Approach to Requirements Syntax) — Mavin et al., 2009
- Arcadia method (Capella) — https://www.eclipse.org/capella/
- Apollo-11 SysML v2 reference — https://github.com/airbus/apollo-11-sysml-v2
- SysML v2 ↔ AADL release — https://github.com/Systems-Modeling/SysML-v2-AADL-Release
- SEI CMU Software Architecture — ADD/SAM/CBAM vocabulary
- Phase C2 GitLab milestone — in-app ontology viewer revamp (Session 4 coordinates with this)
