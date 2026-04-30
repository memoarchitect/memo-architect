# MEMO Architecture Audit — Methodology Support for Medical Device Modeling (SysON-aligned)

**Status:** Draft architecture audit. No code changes yet.
**Author:** Principal architect pass, 2026-04-21 (expanded 2026-04-22 to full-architecture scope).
**Scope:** `packages/core`, `packages/web`, `packages/medical-modeling-profile`, `packages/ontology-arch`, `packages/ontology-process`, `packages/cli`, DHF compiler, templates, viewpoint engine, rule engine.
**Reference:** Eclipse SysON (cloned at `/Users/someshkashyap/sandbox/syson`) — studied for its methodology / representation-description layer.
**Problem (verbatim, original framing):** *Current auto-diagrams only render traceability as diagrams — useless. Traceability should be shown the SysON way (matrices, tables, overlays — not standalone trees). Auto-models should emit real component diagrams: nested IBDs with interfaces/ports, proper decomposition trees, BDDs with composition, activity flows — not thin traceability trees.*
**Problem (expanded):** *The diagram bug is a symptom. The disease is that MEMO has no methodology layer. Viewpoints, closure rules, kind registry, renderers, templates, DHF compiler, and palette all exist as islands. SysON — even as a general-purpose SysML v2 tool — has a richer medical-grade-compatible methodology surface than MEMO, which is purpose-built for medical. This audit widens scope: the whole architecture (not just the diagram pipeline) needs a descriptor + provider methodology layer explicitly framed around ISO 14971, IEC 62304, ISO 13485, ISO 14155, IEC 60601, ISO/IEC 81001-5-1, ISO 27701, FDA 21 CFR 820, EU MDR.*

---

## TL;DR

1. **Diagram renderer tier is broken.** `diagramType` (bdd / ibd / req / risk / pkg / act / afd / par / ucd) is today a **badge**, not a renderer. `DiagramCanvas` dispatches only on `properties.layoutStyle`. Every `diagramType` collapses to the same flat graph. Nested-IBD renderer (`computeIBDLayout`) is implemented and unused. Matrix + Table renderers exist as modes, not as first-class view kinds.
2. **Viewpoint layer is a filter, not a methodology.** `memo.viewpoints.yaml` declares *which elements are visible*; it does **not** declare *how to represent them, what tools to offer, what templates to scaffold, or what criteria to decorate*. That is exactly the surface SysON calls *representation description* / *methodology support*.
3. **Medical methodology is encoded as data only.** 35 closure rules in `memo.rules.yaml`, 11 architecture layers in ontology-arch, 8 regulatory standards in ontology-process, 5 device templates in `medical-modeling-profile/templates/`, 18 DHF document types — and **none of them share a common descriptor shape**. Every subsystem invents its own YAML schema and its own evaluator.
4. **SysON shows the pattern.** SysON uses a provider-based descriptor model (`IViewDescriptionProvider`, `IRepresentationDescriptionProvider`, `ToolSectionDescription`, metaclass → compartments map, metaclass → node/edge rules, AQL expressions for decorators) to bind SysML v2 metaclasses to node/edge/tool behaviour. Same pattern, JSON/YAML-based, scales to medical methodology.
5. **Target: a single Methodology Layer** — ViewDescriptors, ToolDescriptors, MethodologyTemplates, DecoratorRules — that viewpoints, diagrams, tables, matrices, trees, palettes, auto-emission, DHF compilation, and validation all consume. Medical specifics (FMEA/FTA/STPA, DHF matrix, risk-acceptability traffic-lights, benefit–risk decorators, IFU evidence chain) plug in as descriptor instances, not custom subsystems.
6. **Physical separation + tool compatibility.** Ontology, projects, and app code are mixed in one `packages/` tree today (ontology-arch, ontology-process, medical-modeling-profile sit alongside core/cli/web; device projects sit in `examples/`). Every `.sysml` must be **openable unchanged in Eclipse SysON, SysIDE, and any other OMG-compliant SysML v2 tool** — no MEMO-specific grammar tokens, no MEMO metadata embedded in SysML bodies. MEMO-specific concerns live in `memo.*.yaml` side-cars only. This is the precondition for ecosystem portability and for the two-repo split (ADR-1-10 platform strategy).
7. **Two-tab UX split — Architecture vs Process.** MEMO is not one modeling surface; it is two. **Architecture tab** = needs + system architecture (IntendedUse, requirements, logical/software/hardware decomposition, interfaces, ports) — no process artefacts, no activity diagrams, no audit-trail views. **Process tab** = lifecycle activities + work products (RiskManagementPlan, HazardAnalysisActivity, SoftwareLifecyclePlan, ClinicalEvaluationPlan, DesignReview, CAPA) — activity/flow diagrams live here, not in architecture. The split mirrors the ontology (ontology-arch ↔ Architecture tab, ontology-process ↔ Process tab) and the two sides meet only in the **QMSR/DHF document bundle**, which joins architecture viewpoints + process viewpoints into Markdown document templates (per FDA 21 CFR Part 820 QMSR final rule aligning to ISO 13485:2016, effective 2026-02-02).

Conclusion: MEMO has the data and the ELK hooks for real BDD / IBD / ACT / matrix rendering and the ontology+rules backbone for medical methodology — but the pipeline stops halfway in **every** subsystem: kinds → viewpoint-filtered flat graph → badge; rules → text violations; templates → `cp -r`; DHF → custom query engine. **The gap is the Methodology Layer.** Diagram descriptor dispatch is the first (and highest-leverage) incarnation of it.

---

## 0. Framing — why "methodology" is the actual spec

MEMO's one-liner is *"SysML v2 tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010"*. That is a methodology claim, not a rendering claim. Medical-device modeling is a methodology: a defined set of viewpoints (risk, software, clinical, privacy, security, QMS), a defined set of relationships (mitigates, verifies, satisfies, producesEvidence), a defined set of work products (DHF sections, risk management file, clinical evaluation report), and a defined set of criteria (every hazard mitigated, every software unit verified, every risk residually acceptable, every requirement satisfied).

What makes a methodology-grade tool different from a generic modeler:

| Dimension | Generic modeler | Methodology-grade tool |
|---|---|---|
| Canvas | "Draw anything" | "Under Risk Viewpoint, draw this matrix with these axes and this decorator." |
| Palette | All kinds visible | Palette scoped to *active view's* legitimate kinds |
| Validation | Syntactic | Closure rules bound to regulatory clauses; violations visible *in* the view |
| Templates | Empty project | Scaffolds per device archetype + regulatory class |
| Outputs | Screenshots | DHF-ready artefacts per regulatory section |
| Extension | "Write a plugin" | "Add a ViewDescriptor / ToolDescriptor / TemplateDescriptor" |

SysON reaches the right-hand column for generic SysML v2. MEMO must reach it for medical. The two things MEMO has that SysON does not — a *medical* ontology (arch + process) and a *rule engine* — remain trapped behind a generic viewpoint filter and a broken diagram renderer. The architecture rework is to land them in a shared descriptor layer.

---

## 1. SysON methodology layer — what to learn

Eclipse SysON is Obeo's open-source SysML v2 workbench (Sirius-Web based). Key findings from the cloned source (`/Users/someshkashyap/sandbox/syson`):

### 1.1 Descriptor-provider pattern

SysON uses **Java service providers** registered via Spring `@Service`:

- `IViewDescriptionProvider` — registers what views exist and under which preconditions
  — `backend/views/syson-common-view/src/main/java/org/eclipse/syson/common/view/api/IViewDescriptionProvider.java:35-76`
- `IRepresentationDescriptionProvider` — builds each representation (diagram / table / tree) programmatically via Sirius `ViewBuilders` / `DiagramBuilders` / `TableBuilders` at runtime
  — `backend/views/syson-standard-diagrams-view/src/main/java/org/eclipse/syson/standard/diagrams/view/SDVDiagramDescriptionProvider.java:143-350`

Every representation is a first-class descriptor. The canvas is selected by the descriptor, not a global switch. Nodes, edges, containers, ports, compartments, palettes, decorators are bound *in the descriptor* to SysML metaclasses via `EClass` references and AQL expressions.

Snippet (SDVDiagramDescriptionProvider.java, 149-234):
```java
public static final List<EClass> DEFINITIONS = List.of(
    SysmlPackage.eINSTANCE.getActionDefinition(),
    SysmlPackage.eINSTANCE.getAllocationDefinition(),
    // ... 15 more
);
public static final Map<EClass, List<EReference>> COMPARTMENTS_WITH_LIST_ITEMS = Map.ofEntries(
    Map.entry(SysmlPackage.eINSTANCE.getActionDefinition(),
        List.of(SysmlPackage.eINSTANCE.getElement_Documentation(),
                SysmlPackage.eINSTANCE.getDefinition_OwnedItem(),
                SysmlPackage.eINSTANCE.getDefinition_OwnedAction())),
    // ...
);
```

### 1.2 Built-in representation kinds (5)

| Kind | What it renders | File |
|---|---|---|
| SDV (Standard Diagram View) | All definitions/usages, packages, annotations | `SDVDiagramDescriptionProvider.java` |
| AFV (Action Flow View) | ActionUsage/ActionDefinition subtree, swim-laned | `ActionFlowViewDiagramDescriptionProvider.java` |
| ITV (Interconnection View) | ConnectionUsage, InterfaceUsage, PortUsage (IBD equivalent) | `InterconnectionViewDiagramDescriptionProvider.java` |
| STM (State Transition View) | StateDefinition/StateUsage/Transitions | `StateTransitionViewDiagramDescriptionProvider.java` |
| RTV (Requirements Table View) | Requirement rows × (name, id, docs) columns | `RTVTableDescriptionProvider.java:40-111` |

Plus the SysON Explorer — a programmatic tree description
— `SysONExplorerTreeDescriptionProvider.java:38-81`.

### 1.3 Palette / tools per descriptor

Palette is bound per `NodeDescription` via `NodePalette` + `ToolSection`s. Dispatch is a visitor on EClass:

```java
// DefinitionNodeDescriptionProvider.java:130-133
@Override
protected List<NodeToolSection> getToolSections(NodeDescription nodeDescription,
                                                IViewDiagramElementFinder cache) {
    return new SDVNodeToolSectionSwitch(cache, this.getAllNodeDescriptions(cache))
        .doSwitch(this.eClass);
}
```

Tool sections are declared by intent, not by diagram:

```java
// SDVDiagramDescriptionProvider.java:236-298
public static final ToolSectionDescription REQUIREMENTS_TOOL_SECTION =
    new ToolSectionDescription(ToolConstants.REQUIREMENTS, List.of(
        ConcernUsage, SatisfyRequirementUsage, RequirementUsage,
        ConstraintUsage, ConstraintDefinition));
public static final ToolSectionDescription STRUCTURE_TOOL_SECTION =
    new ToolSectionDescription(ToolConstants.STRUCTURE, List.of(
        AttributeUsage, ConnectionDefinition, InterfaceUsage, ItemUsage,
        PartUsage, PortUsage, ReferenceUsage));
```

40+ individual tool providers (`AcceptActionNodeToolProvider`, `PortUsageBorderNodeDescriptionProvider`, `ParameterCompartmentNodeToolProvider`, …) under `nodeactions/`. Each is one provider per metatype × variant.

### 1.4 Tables, trees, matrices

- **Table** (RTV) — `RowDescription.semanticCandidates` (AQL) × `ColumnDescriptions` × `CellDescriptions` (textfield / dropdown / read-only). Sorted/filtered via AQL.
- **Tree** (Explorer) — `TreeDescription` with children / parent / label / icon AQL expressions. Label fragments stack (short name, type, library indicator, read-only badge).
- **No native matrix yet** in SysON open-source — this is actually a gap that *MEMO* has already filled (`TraceabilityMatrix.tsx` with 5 presets).

### 1.5 Templates / methodology scaffolds

SysON does **not** ship explicit "methodology templates" as first-class objects. Methodology is embedded in descriptor logic (preconditions: "only on ViewUsage"; default compartments per metaclass). There is no SysON equivalent of "Software-as-Medical-Device starter kit".

**MEMO already does templates (5 archetypes in `packages/medical-modeling-profile/templates/`) better than SysON.** This is a differentiator to keep and formalise.

### 1.6 Docs

- `doc/content/modules/user-manual/pages/concepts.adoc:1-67` — Project / Model / Representation / Library; no "methodology" section.
- `doc/content/modules/developer-guide/pages/extend.adoc:1-9` — explicit statement: *"The platform enables the contribution of new specific views and the specific methodologies implementation"*.

### 1.7 Takeaway for MEMO

| SysON pattern | MEMO translation |
|---|---|
| Java provider + `@Service` | YAML/JSON descriptor files + a registry loader |
| `EClass` reference | SysML construct + kind name (we already parse this) |
| AQL expressions | Closure-rule predicate syntax we already have; extend with path language |
| Compile-time safety | Runtime validation with Zod (or similar) on descriptor files |
| 100+ provider classes | ~10 descriptor YAMLs per profile (medical profile ships the bulk; user project adds deltas) |

MEMO can get 80% of SysON's methodology surface with 10% of the code volume, because kinds and relationships come from SysML parsing, not hand-written metamodel references, and our audience is bounded (medical devices, not arbitrary SysML modeling).

---

## 2. Current-state map — every auto-generated view type today

All auto-diagrams originate in `rebuildProject` at [packages/cli/src/commands/dev.ts:143-239](../../../packages/cli/src/commands/dev.ts). The same DTO is shared with `memo export` via `modelToDTO` (export.ts:78, 120).

| # | Auto view | Generator | What it actually shows | Verdict |
|---|---|---|---|---|
| 1 | Per-layer "Layer" BDD | `dev.ts:166-178` — one diagram per non-empty `model.elementsByLayer` entry | Every element in the layer rendered by `computeLayout` (flat ELK layered graph). `diagramType: 'bdd'` is a label only. | **Rework** — becomes real BDD (composition tree) or drop in favour of viewpoint-declared views. Current output is "all elements in layer" soup. |
| 2 | Viewpoint-declared BDD (risk, safety, software, hw, ros, privacy, security) | `dev.ts:179-197` pulls `vp.diagrams[]` from [memo.viewpoints.yaml](../../../packages/medical-modeling-profile/memo.viewpoints.yaml) | Kind-filtered union rendered by `computeLayout`. Example: `diag-risk-chain` shows all `Hazard`/`Mitigation`/`VerificationCase`+edges on one flat canvas. | **Rework** — should emit matrix + BDD(composition) + traceability-overlay as **separate views** under the same viewpoint. |
| 3 | Viewpoint-declared REQ (`diag-clinical-evidence`, `diag-dhf`) | same path | Flat graph of requirement + evidence elements joined by `satisfies` / `verifies`. | **Kill as standalone** — replace with requirement **table** + traceability matrix. SysON RTV is a table. |
| 4 | "Risk" diagram (`diag-risk-chain`) | same path, `diagramType: 'risk'` | Identical to flat BDD. No risk-specific semantics (no initiating event funnel, no bowtie). | **Rework** — collapse into safety viewpoint; add bowtie / fault-tree view as distinct renderers. |
| 5 | User-created diagrams | `dev.ts:212-223` loads `.memo/user-diagrams.json` | User picks kind + viewpoint; elementIds optionally pin subset; still flat. | **Keep interface, rework rendering** — dispatch on `diagramType`. |
| 6 | `__model` pseudo-viewpoint | `dev.ts:173` | Used for "all elements in layer" autos; bypasses viewpoint filter. | **Kill** — replace with explicit "Full Model" viewpoint or with a package tree. |
| 7 | FBS decomposition (`layoutStyle: 'fbs'`) | `computeFBSLayout` in [layout.ts:690+](../../../packages/web/src/views/layout.ts), dispatched at `DiagramCanvas.tsx:381-391` | Function-Behavior-Structure tree, interactive expand/collapse. Real renderer. | **Keep + generalise** — rename to "decomposition tree" view kind; unify with composition tree. |
| 8 | Decomposition/Containment (`properties.layoutStyle`) | `computeDecompositionLayout` + `computeContainmentLayout` at layout.ts:442 / 540 | Real nested boxes or hierarchical tree from `composedOf`/`aggregation`. | **Keep and promote** — closest thing to real IBD. Feed the `diagramType='ibd'` path here. |
| 9 | ActionFlow (mode, not auto-diagram) | [ActionFlowDiagram.tsx:28-59](../../../packages/web/src/views/ActionFlowDiagram.tsx) + `computeActionFlowLayout` at layout.ts:804 | Swim lanes by `allocatedTo`, ports on action nodes, succession+flow edges. Solid AFD. | **Keep** — expose as a view kind, not a top-level mode. Auto-emit AFD per action-heavy package. |
| 10 | DSM / Traceability matrix (mode) | [TraceabilityMatrix.tsx](../../../packages/web/src/views/TraceabilityMatrix.tsx), [DSMView.tsx](../../../packages/web/src/views/DSMView.tsx) | Real matrix with presets. Not wired as a diagram-type or overlay. | **Keep, promote to first-class view kind** — emit auto-matrix per traceability-heavy viewpoint. |
| 11 | Scenario / ActivityDiagram | [ScenarioEditor.tsx](../../../packages/web/src/views/ScenarioEditor.tsx) | Separate mode. | **Keep, reclassify as view kind.** |
| 12 | ComputeIBDLayout (nested compound ELK) | [layout.ts:231](../../../packages/web/src/views/layout.ts) | Fully functional nested-box renderer. | **Wire it up** — unused today (grep returns zero callers). This is the missing nested-IBD renderer. |

**Summary:** generator tier emits `{ id, name, diagramType, viewpointId, elementIds }` — enough metadata for a smart renderer. Renderer tier is broken: `DiagramCanvas` ignores `diagramType`. Nested-IBD, matrix, table, AFD, package-tree renderers exist as islands and are never selected by auto-diagram emission.

---

## 3. Current-state map — the rest of the methodology surface

Everything below is NOT in the diagram subsystem but is part of the same methodology gap.

### 3.1 Viewpoints — `packages/medical-modeling-profile/memo.viewpoints.yaml` (347 lines)

9 standards-aligned viewpoints:

| Viewpoint | Standard | Kinds | Relationships | Auto-diagram today |
|---|---|---|---|---|
| `risk-overview` | ISO 14971 | Hazard → HazardousSituation → Harm → Risk → Mitigation | identifies, leadsTo, causes, mitigates | `diag-risk-chain` (flat BDD) |
| `safety-view` | IEC 60601 | Hazard → Mitigation → VerificationCase → Evidence | mitigates, verifies, producesEvidence | `diag-safety-mitigation` (flat BDD) |
| `software-view` | IEC 62304 | SoftwareComponent → SoftwareModule → VerificationCase → Evidence | composedOf, verifies, producesEvidence | `diag-sw-decomposition` (flat BDD) |
| `security-view` | IEC 81001-5-1 | ThreatScenario → Asset → Control → SecurityRequirement | threatensAsset, mitigatesThreat, protectsAsset | `diag-cybersecurity-trace` (flat BDD) |
| `privacy-view` | ISO 27701 | DataCategory → ProcessingActivity → RetentionRule → DPIA | processesData, governs | `diag-privacy-governance` (flat BDD) |
| `clinical-evidence-view` | ISO 14155 | IntendedUse → ClinicalPerformanceClaim → ClinicalEvaluationReport → BenefitRiskAssessment | claimsForUse, supportsClinicalClaim, evaluatesClinicalClaim | `diag-clinical-evidence` (flat REQ) |
| `hardware-view` | — | HardwareComponent → HardwareAssembly → SoftwareComponent | composedOf, deployedOn | `diag-hw-bom` (flat BDD) |
| `ros-view` | — | ROSNode → ROSTopic → ROSService | flow, connectsVia | `diag-ros-topology` (flat BDD) |
| `qms-dhf-view` | ISO 13485 / FDA 21 CFR 820 | DesignInput → DesignOutput → DesignVerification → DesignValidation | satisfies, verifies, validates | `diag-dhf` (flat REQ) |

Every viewpoint emits exactly one diagram of exactly one type. Every diagram is the same flat ELK-layered render. **Every one of these should emit 2-4 views (BDD + IBD + Matrix + Table + Decorator-overlay), selected by descriptor.**

### 3.2 Closure rules — `packages/medical-modeling-profile/memo.rules.yaml` (423 lines, 35 rules)

Rule shapes:
- `requireRelationship` (31) — every X has relationship R to some Y (optionally with multiplicity)
- `conditionalRequireRelationship` (4) — if X.attr = V, require R

Relationships touched (30+): composedOf, dependency, allocatedTo, derives, deployedOn, mitigates, causes, leadsTo, identifiesRisk, hasFailureMode, contributesTo, satisfies, verifies, producesEvidence, plansRiskManagement, assessesResidualRisk, weighsAgainstBenefit, concludesOverallResidualRisk, monitorsPostMarket, threatensAsset, exploitsVulnerability, mitigatesThreat, protectsAsset, addressesSecurityReq, processesData, governs, flow, connectsVia, claimsForUse, supportsClinicalClaim, plansClinicalEvaluation, evaluatesClinicalClaim.

Evaluation: [packages/core/src/validator/rule-engine.ts:34-79](../../../packages/core/src/validator/rule-engine.ts) — `evaluateClosureRules()` dispatches per rule type, returns `{severity, message, entityId, ruleId}`. Violations are text only. **Rules never surface in a view.**

Methodology gap: every closure rule is *also* a declarative description of a matrix (X rows × Y cols) and *also* a decorator (cell red if rule violated; green otherwise). Same data, three uses.

### 3.3 Ontology — `packages/ontology-arch` + `packages/ontology-process`

- **ontology-arch** (11 layers, 118+ kinds) — operational / functional / logical / software / hardware / behavioral / verification / safety / security / privacy / software-extension (ROS). Medical-specific kinds live in safety/security/privacy/verification. Apollo-11 pattern: directory = layer. Parser: `KindRegistry` + `RelationshipRegistry` discover from SysML AST ([kind-registry.ts:64](../../../packages/core/src/model/kind-registry.ts), [relationship-registry.ts:59](../../../packages/core/src/model/relationship-registry.ts)).
- **ontology-process** (10 standards) — ISO 14971, IEC 62304, IEC 60601, ISO 13485, ISO 14155, ISO 27001/27701, FDA 21 CFR 820, EU MDR, common. Defines *work products* (RiskManagementPlan, RiskManagementReport, ResidualRiskEvaluation, BenefitRiskAssessment, …) and *process activities* (HazardAnalysisActivity, …).

Split is clean: arch = what the system IS; process = what work the project DOES. ADR-1-10. Current gap: process kinds are not yet fully wired into viewpoints / DHF sections.

### 3.4 Templates / `memo init` — `packages/medical-modeling-profile/templates/`

5 archetypes:
- `samd/` — Software as Medical Device
- `connected-device/` — IoT / cybersecurity-focused
- `monitoring-device/` — vitals / bedside
- `infusion-pump/` — drug delivery
- `blank/` — minimal shell

`memo init` wizard ([packages/cli/src/commands/init.ts:50-81](../../../packages/cli/src/commands/init.ts)) prompts archetype + regulatory class (I/II/III) + profile (minimal/standard/full). Template is copied and package name regex-replaced. No methodology binding beyond file copy.

**Gap:** archetype does not declare *which* viewpoints, *which* closure rules, *which* DHF sections, *which* view descriptors are applicable. A Class III SaMD should open with pre-scaffolded risk + clinical + cybersecurity viewpoints and a filled-in DHF skeleton; today it just has copied files.

### 3.5 DHF compiler — `packages/core/src/dhf/`

`DhfConfig` schema ([dhf-config.ts:1-45](../../../packages/core/src/dhf/dhf-config.ts)) declares org / phase / standards / per-document enable / approvers / risk matrix (severity levels × probability levels × acceptability threshold). 18 document types (registry in `document-registry.d.ts`). Compiler pipeline: `query-engine` → `template-engine` → `document-compiler`.

**Gap:** DHF queries are hand-coded per document template. They should be *descriptor-derived* from the same viewpoint / rule / matrix descriptors that the UI consumes. A DHF "Risk Analysis" section is the ISO-14971 viewpoint's Matrix descriptor rendered to Markdown + tables. Today it's a separate query pipeline.

### 3.6 UI modes — `packages/web/src/App.tsx:48-68`

Today: 6 tabs (catalog / diagram / actionflow / dsm / scenario / ontology). Switch on `activeView.type`. Each mode is a top-level component. No view descriptor, no palette per descriptor.

Target (Phase 10, not implemented): Left = Model Explorer + View Explorer; Center = unified canvas; Right = properties; Toolbar = tools + Create View. This audit treats Phase 10 as the **UI face of the methodology layer**, not a separate rework.

### 3.7 Config schemas

| File | Scope | Purpose |
|---|---|---|
| `memo.config.yaml` | Device project | Monolithic: projectName, projectType, extends (profile), optional ontologies. ADR-1-8. |
| `memo.package.yaml` | Ontology / profile package | Identity: name, version, type, extends, license, tags. |
| `memo.rendering.yaml` | Ontology package | Layer colours / icons. |
| `memo.rules.yaml` | Profile package | Closure rules. |
| `memo.viewpoints.yaml` | Profile package | Viewpoints + thin diagrams[]. |
| `memo.dhf.yaml` | Device project | DHF customisation + risk matrix. |
| `memo.lock.yaml` | Device project | Ontology version lock. |

**7 schemas. No shared descriptor shape.** Proposed: add `memo.views.yaml`, `memo.tools.yaml`, `memo.templates.yaml`, `memo.decorators.yaml` — or better, collapse into a single `memo.methodology.yaml` whose sections parallel ViewDescriptor / ToolDescriptor / TemplateDescriptor / DecoratorDescriptor. Keep rules and viewpoints separate for back-compat.

### 3.8 Existing "descriptor-like" code

- `KindRegistry` / `RelationshipRegistry` — parse SysML AST into registries. Closest thing to a descriptor today. Binds kind → layer (via directory).
- `DIAGRAM_TYPE_META` ([constants.ts:181-191](../../../packages/web/src/constants.ts)) — diagram type → {code, label, fullName, color}. A badge table, not a renderer binding.
- No palette descriptor. No tool descriptor. No template descriptor. No decorator descriptor.

---

## 4. SysON gap analysis — what SysON ships, MEMO lacks (diagrams subset preserved)

| Capability | SysON | MEMO today | Gap |
|---|---|---|---|
| **Representation descriptor pattern** — declarative binding of metaclass → view kind → node/edge/container style | Yes; Java provider + `@Service` + Sirius View DSL. | Partial: `memo.viewpoints.yaml` declares *which elements are visible*, not *how to render*. `DIAGRAM_TYPE_META` is a colour/badge table. | Need **ViewDescriptor** schema: diagramKind + nodeRules + edgeRules + containerRules + layoutHint. |
| **BDD with composition + specialisation** | Tree of `part def` with `composedOf`, `specializes`, multiplicities on edges. | Flat `computeLayout`. | Emit composition-first BDD; hide traceability edges; show multiplicities. |
| **Nested IBD with ports on boundary** | Parts-within-parts, ports on owning part's frame, `interface def` binds pairs of ports, connectors drawn port-to-port. | `computeIBDLayout` exists (layout.ts:231) but no callsite. `Port`/`Interface` are `part def`, not `port def` / `interface def`. Flow endpoints are string tails on `MemoRelationship.sourceEnd`. | Elevate Port to SysML `port def`; add `MemoElement.owner` + `ownedPorts[]`; wire `computeIBDLayout`; render ports as ReactFlow `Handle`s (pattern proven in `ActionFlowNode.tsx`). |
| **Part tree / decomposition tree** | Structural tree rooted at top-level part def. | `computeDecompositionLayout` + `DecompositionNode` already do this; not auto-emitted. | Auto-emit a Part Tree per top-level `part def`. |
| **Action flow view** | Actions connected, typed input/output parameters, often swim-laned. | `ActionFlowDiagram` + `ActionFlowNode` already swim lanes + ports + succession. Strong. | Reclassify as a declared view kind; auto-emit for packages with ≥ 2 `ActionUsage`s. |
| **Requirement table (RTV)** | RowDescription + ColumnDescriptions + CellDescriptions, sortable/filterable. | `TabularView.tsx` (17 KB) exists but not in auto-diagram emission; 5 hardcoded presets in `TraceabilityMatrix.tsx`. | Auto-emit a REQ Table per requirement-heavy package; kill flat "req diagram". |
| **Traceability matrix** | Not shipped in SysON open-source. | `TraceabilityMatrix.tsx` with presets. Not a view kind. | Promote Matrix to first-class. Auto-emit one Matrix per closure rule spanning two kinds. **MEMO is ahead of SysON here; don't regress.** |
| **Overlay traceability on IBD/BDD** | SysON supports decorators / highlighting. | Not implemented. Trace edges drawn inline on flat canvas. | Add overlay layer in `DiagramCanvas`; toggle trace-edge visibility per type; floating legend. |
| **Palette / tools per descriptor** | `ToolSection` × `NodeDescription` × EClass switch; 40+ tool providers. | Global palette; no per-view scoping. | `memo.tools.yaml`: per-view toolSections (Requirements, Structure, Behavior, Risk, Clinical, Security, Privacy). Creation tools dispatched on kind. |
| **State machine view** | Yes — state def + transition. | Zero. | Out of scope for Phase 19; Phase 25+. |
| **Use-case diagram** | Yes — actors + usecases. | `UCD` meta exists ([constants.ts:185](../../../packages/web/src/constants.ts)), no renderer. | Trivial given Actor/UseCase kinds in operational layer. |
| **Parametric (PAR)** | Yes — constraint blocks with binding connectors. | `PAR` meta exists, no renderer. | Nice-to-have; depends on `ConstraintDefinition` elements. |
| **Package diagram (PKG)** | Yes — package tree with import arrows. | `pkg` meta present in viewpoints YAML, no renderer. | Straightforward; `PackageRegistry` already exposes tree. |
| **Methodology templates** | **Not shipped.** | 5 archetypes (samd, connected-device, monitoring-device, infusion-pump, blank) + 3 profiles (minimal/standard/full). | **MEMO ahead.** Formalise as `TemplateDescriptor` — archetype declares applicable viewpoints, rules, DHF sections, view descriptors, risk matrix. |
| **Regulatory methodology (ISO 14971 / IEC 62304 / ISO 13485 / ISO 14155 / IEC 60601 / IEC 81001-5-1 / ISO 27701 / 21 CFR 820 / EU MDR)** | **Not shipped — SysON is domain-agnostic.** | 9 viewpoints, 35 closure rules, 118+ kinds in ontology-arch, 8 standards in ontology-process, 18 DHF doc types. | **MEMO ahead. The whole point.** Expose as descriptors so new standards plug in without code changes. |

---

## 5. Target architecture — the Methodology Layer

Single layer, four descriptor families, one loader, shared across CLI / web / DHF / validator. Lives in the app tree (post-Phase-19 layout):

```
apps/core/src/methodology/
    schema.ts           # Zod schemas for all descriptor families
    loader.ts           # merges profile + project descriptors into MethodologyDTO
    registry.ts         # indexes descriptors by id, kind, viewpoint, rule
    binding.ts          # kind → descriptors resolver (what applies to this element?)
    evaluator.ts        # runs decorators over the model (rule → decorator pipeline)
```

Reads descriptor YAML files from `ontology/memo-base/medical-modeling-profile/` (never from inside `.sysml`). Consumed by:
- `apps/cli/src/commands/dev.ts` — auto-diagram emission from descriptors, not hardcoded loops
- `apps/cli/src/commands/export.ts` — headless export per descriptor
- `apps/cli/src/commands/validate.ts` — closure rules as DecoratorDescriptor predicates
- `apps/cli/src/commands/init.ts` — TemplateDescriptor selection
- `apps/web/src/store/model-store.ts` — `viewDescriptors`, `toolDescriptors`, `decoratorDescriptors` carried on DTO
- `apps/web/src/views/DiagramCanvas.tsx` — dispatch on descriptor.layoutStrategy, not `layoutStyle`
- `apps/core/src/dhf/document-compiler.ts` — DHF sections are descriptor renders to Markdown

Third-party tools (SysON, SysIDE) open `ontology/memo-base/**` and `projects/**` directly as SysML libraries; they never need `apps/`. MEMO-specific descriptors remain invisible to them but do not break parsing.

### 5.1 ViewDescriptor

Schema (expanded from original §4):

```yaml
# memo.views.yaml — part of medical-modeling-profile; user project may add/override
viewDescriptors:
  - id: bdd-composition
    diagramKind: bdd
    layoutStrategy: composition-tree
    primaryNodeKinds: [ "construct: part" ]
    primaryEdgeTypes: [ composedOf, aggregation, specialization ]
    hiddenEdgeTypes: [ traceTo, satisfies, verifies, mitigates ]
    nodeRenderer: partNode
    edgeRenderer: compositionEdge
    multiplicity: edgeLabel         # show 0..*, 1..1 on edges
    autoEmit:
      trigger: "viewpoint.visibleKinds has any part-construct kind and ≥1 composedOf in slice"
      scope: "per top-level part"

  - id: ibd-nested
    diagramKind: ibd
    layoutStrategy: elk-hierarchical-ports
    primaryNodeKinds: [ "construct: part" ]
    primaryEdgeTypes: [ connectsVia, flow ]
    portKinds: [ "construct: port" ]
    containerRule: parent-of
    elkOptions:
      hierarchyHandling: INCLUDE_CHILDREN
      portConstraints: FIXED_SIDE
      portAlignment: DISTRIBUTED
    autoEmit:
      trigger: "any part has ≥1 port or ≥1 connectsVia"
      scope: "per top-level composite part"

  - id: trace-matrix
    diagramKind: matrix
    rowKinds: [<configurable>]
    colKinds: [<configurable>]
    relationshipTypes: [<configurable>]
    cellRenderer: relationshipBadge
    decorators: [ closure-coverage ]
    autoEmit:
      trigger: "closure rule requireRelationship(X → Y)"
      scope: "per rule"

  - id: req-table
    diagramKind: table
    primaryNodeKinds: [Requirement, SecurityRequirement, PrivacyRequirement, DesignInput, DesignOutput]
    columns:
      - { type: attr,     key: name,        width: 250 }
      - { type: attr,     key: reqId,       width: 150 }
      - { type: attr,     key: text,        width: 400 }
      - { type: rel-list, rel: satisfies,   direction: incoming, label: "Satisfied by" }
      - { type: rel-list, rel: verifies,    direction: incoming, label: "Verified by" }
      - { type: rel-list, rel: derives,     direction: outgoing, label: "Derived from" }
      - { type: rule,     ruleId: CR-MED-015, label: "Traceable?", cellRenderer: checkmark }
    autoEmit:
      trigger: "viewpoint.visibleKinds intersects [Requirement, DesignInput, DesignOutput]"
      scope: "per viewpoint"

  - id: afd
    diagramKind: afd
    layoutStrategy: swim-lane
    laneAttribute: allocatedTo         # descriptor-configurable, not hardcoded
    primaryNodeKinds: [ "construct: action" ]
    primaryEdgeTypes: [ flow, succession ]
    autoEmit:
      trigger: "≥ 2 ActionUsage in slice"
      scope: "per containing action def"

  - id: package-tree
    diagramKind: pkg
    layoutStrategy: package-registry
    source: PackageRegistry
    edgeTypes: [ imports ]
    autoEmit:
      trigger: "always"
      scope: "per root package"

  # Medical-specific descriptors (see §6)
  - id: risk-bowtie
    diagramKind: bowtie
    ...
  - id: fault-tree
    diagramKind: fta
    ...
  - id: stpa-control-structure
    diagramKind: stpa
    ...
  - id: dhf-matrix
    diagramKind: matrix
    preset: dhf-io
    ...
```

A Viewpoint in `memo.viewpoints.yaml` then declares which `viewDescriptors` it uses (replacing today's thin `diagrams: [{ diagramType, elementIds }]` list):

```yaml
viewpoints:
  - id: risk-overview
    standard: ISO 14971
    views:
      - descriptor: trace-matrix
        overrides: { rowKinds: [Hazard], colKinds: [Mitigation], relationshipTypes: [mitigates] }
      - descriptor: bdd-composition
        overrides: { primaryNodeKinds: [Hazard, Risk, Mitigation] }
      - descriptor: risk-bowtie
      - descriptor: req-table
        overrides: { primaryNodeKinds: [RiskControl] }
```

### 5.2 ToolDescriptor — palette per view / per kind

Mirrors SysON's `ToolSectionDescription`:

```yaml
# memo.tools.yaml
toolSections:
  - id: risk-tools
    label: Risk
    applicableIn: [bdd-composition, trace-matrix, risk-bowtie]
    tools:
      - id: create-hazard
        kind: Hazard
        layer: safety
      - id: create-mitigation
        kind: Mitigation
        layer: safety
      - id: link-mitigates
        relationship: mitigates

  - id: clinical-tools
    label: Clinical
    applicableIn: [req-table, trace-matrix]
    tools:
      - id: create-clinical-claim
        kind: ClinicalPerformanceClaim
      - ...

  - id: structure-tools
    label: Structure
    applicableIn: [bdd-composition, ibd-nested, package-tree]
    tools:
      - id: create-part
        kind: SystemUsage
      - id: create-port
        kind: PortUsage
      - id: create-interface
        kind: InterfaceDefinition
      - id: connect-via
        relationship: connectsVia
```

Store binding: `selectedViewDescriptor → applicable tool sections → render palette`. Single palette implementation; data-driven.

### 5.3 MethodologyTemplate — archetype as descriptor

Replace bare `cp -r` template with a descriptor:

```yaml
# packages/medical-modeling-profile/templates/samd/memo.template.yaml
template:
  id: samd
  label: Software as Medical Device
  regulatoryClass: [II, III]
  appliesTo:
    viewpoints: [risk-overview, software-view, clinical-evidence-view, security-view, privacy-view, qms-dhf-view]
    rules:
      include: [CR-MED-007, CR-MED-008, CR-MED-009]       # IEC 62304 SW safety class rules
      exclude: [CR-MED-*-HW-ONLY]
    dhfSections: [design-input, design-output, risk-management, software-architecture, clinical-evaluation, cybersecurity]
    riskMatrix: iso-14971-default-5x5
  scaffold:
    sysmlFiles: [starter.sysml, risk-starter.sysml, software-starter.sysml]
    configFiles: [memo.config.yaml, memo.dhf.yaml, memo.lock.yaml]
```

`memo init` wizard outputs: (a) scaffold files, (b) a `memo.methodology.yaml` referencing the template, (c) pre-filled DHF skeleton.

### 5.4 DecoratorDescriptor — rules meet views

Closure rules today produce text. DecoratorDescriptors bind rule-violation to visual decorator on any view kind:

```yaml
# memo.decorators.yaml
decorators:
  - id: mitigation-coverage
    ruleId: CR-MED-001         # every Hazard requires a mitigates relationship
    severity: error
    encoding:
      node:
        whenViolating: { border: "2px solid red", badge: "⚠ unmitigated" }
        whenPassing:   { border: "1px solid green" }
      matrixCell:
        whenViolating: { fill: "#ffdddd" }
        whenPassing:   { fill: "#ddffdd" }
      table:
        addColumn: { label: "Mitigated?", value: passing ? "✓" : "✗" }

  - id: residual-risk-acceptable
    ruleId: CR-MED-015
    severity: error
    encoding:
      node:
        whenViolating: { border: "2px dashed red", badge: "Unacceptable residual" }
```

Decorator evaluator runs once per model rebuild; result is a `Map<elementId, Decorator[]>` attached to DTO; every view descriptor pulls from it.

### 5.5 Loader + merge semantics

Precedence: profile (medical-modeling-profile) → project (`memo.config.yaml` extends). Project descriptors override by `id`; additive for lists. Lock file records profile version + descriptor hash; CI guards against drift (already done for ontology; extend).

---

## 6. Medical-methodology-specific views — what SysON doesn't ship

These view descriptors are medical-methodology-specific and have no SysON analogue. They are instances of the descriptor pattern, not separate subsystems.

### 6.1 ISO 14971 Risk Management

| Descriptor | Rendering | Input |
|---|---|---|
| `risk-bowtie` | Threats (left) → Top event (centre) → Consequences (right), barriers on edges | Hazard + causes + mitigates + Harm |
| `fault-tree` | FTA gates (AND/OR) with FaultTreeNode hierarchy | `FaultTreeNode` (ontology-arch/safety) |
| `risk-matrix-5x5` | Severity × probability grid; elements placed by attributes; acceptability zones coloured from `memo.dhf.yaml.riskMatrix` | Risk with severity, probability attributes |
| `residual-risk-heatmap` | Per-mitigation before/after bar | Risk + ResidualRiskEvaluation |
| `benefit-risk-scale` | Benefit vs residual risk bars | BenefitRiskAssessment |

### 6.2 IEC 62304 Software Lifecycle

| Descriptor | Rendering |
|---|---|
| `sw-safety-class-tree` | Decomposition tree coloured by safety class (A/B/C) per SoftwareComponent attribute |
| `sw-unit-verification-matrix` | SoftwareUnit × VerificationCase matrix; closure rule CR-MED-008 coverage |
| `soup-inventory` | Table of SOUP items with mitigations + clinical-risk decorator |

### 6.3 ISO 14155 Clinical

| Descriptor | Rendering |
|---|---|
| `clinical-claim-chain` | IntendedUse → ClinicalPerformanceClaim → ClinicalEvidence → ClinicalEvaluationReport, one tree per claim |
| `clinical-evidence-matrix` | Claim × Evidence matrix |

### 6.4 IEC 81001-5-1 / ISO 27701 Security + Privacy

| Descriptor | Rendering |
|---|---|
| `stpa-control-structure` | Hierarchical control structure with control/feedback loops |
| `threat-bowtie` | Threat → Asset → Control bowtie |
| `data-flow-diagram` | DFD with trust boundaries (IBD with container kind = TrustBoundary) |
| `privacy-impact-matrix` | DataCategory × ProcessingActivity matrix; GDPR-lawful-basis decorator |

### 6.5 ISO 13485 / FDA 21 CFR 820 DHF

| Descriptor | Rendering |
|---|---|
| `dhf-io-matrix` | DesignInput × DesignOutput × Verification × Validation matrix (the canonical DHF traceability table) |
| `design-review-gantt` | Design review timeline (requires review date attribute) |
| `corrective-action-tree` | CAPA hierarchy |

### 6.6 IEC 60601 / ISO 14971-Common

| Descriptor | Rendering |
|---|---|
| `essential-performance-list` | Table of EssentialPerformance claims + verification evidence |
| `ifu-claims-map` | IntendedUse + IndicationsForUse + Contraindications tabular view |

Each of these is ~50-100 lines of descriptor YAML + a thin renderer. Collectively they constitute MEMO's **medical methodology differentiator** and map 1:1 to DHF sections — same descriptor, two outputs (interactive view + compiled DHF PDF section).

---

## 7. Traceability redesign — kill standalone trees

**Principle:** traceability is a *relation*, not an *entity class*. It should never be the primary content of a view. It belongs in matrices, tables, and overlays on structural diagrams.

### Three surfaces, three uses:

1. **Matrix view (primary)** — rows × cols of two kinds joined by a relationship set.
   - Generator input: `{ rowKind[], colKind[], relationshipTypes[] }`.
   - Already implemented as a mode ([TraceabilityMatrix.tsx](../../../packages/web/src/views/TraceabilityMatrix.tsx) — 5 presets at lines 17-58). Promote to a declared view kind `matrix`.
   - Auto-emission rule: for every closure rule of shape `requireRelationship(entity=X, relatedKinds=[Y...])` in [memo.rules.yaml](../../../packages/medical-modeling-profile/memo.rules.yaml), emit a Matrix view with X on rows and Y on cols.
2. **Table view with link columns** — single primary kind (e.g. Requirement) with clickable columns per related kind.
   - `TabularView.tsx` has most of this plumbing. Add per-kind link columns sourced from `relationshipsByType`. Add `rule` column type for decorator-sourced columns.
3. **Overlay on BDD/IBD** — toggleable edge layer, dims structural edges, highlights the trace edges for the selected relationship type. Pure frontend; does not change the model.
   - Integration point: `DiagramCanvas` already computes edges in [layout.ts:106-138](../../../packages/web/src/views/layout.ts); add a `traceOverlayTypes: Set<string>` store field; filter/restyle edges accordingly.

### Kill list

- Auto-emission of "traceability tree diagrams" (items 1, 2, 4 in §2) as the *only* representation of trace chains.
- The `diagramType: 'risk'` case when it just means "hazard-mitigation tree on a flat canvas." Replace with Matrix + BDD(structural) + `risk-bowtie` descriptor (§6.1).
- Per-layer "Layer" BDD when the layer is a traceability layer (verification, iso-14971, iso-14155, iso-13485, etc.) — use Matrix instead.

---

## 8. Viewpoint → View → Diagram model

Follow ISO 42010 (Viewpoint = concerns+rules, View = viewpoint applied to the model, Diagram = one concrete representation under a view) *and* SysON's descriptor pattern.

```
Methodology (bundle of descriptors) ← medical-modeling-profile
  └── Viewpoint (concerns, stakeholders, standard)    ← memo.viewpoints.yaml
        └── View (filtered slice)                      ← derived at build time
              └── ViewDescriptor[] (representation)    ← memo.views.yaml
                    ├── BDD (composition)              ← part def + composedOf
                    ├── IBD (nested + ports)           ← part def + port def + connectors
                    ├── Table (tabular)                ← any kind-set
                    ├── Matrix (traceability)          ← two kind-sets + edge types
                    ├── AFD (action flow)              ← action def + flow + succession
                    ├── Tree (decomposition)           ← any containment relationship
                    ├── Overlay (decorator)            ← on top of BDD/IBD
                    ├── Bowtie / FTA / STPA            ← medical-specific
                    └── DHF Matrix                     ← the canonical traceability grid

Plus orthogonal:
  ToolDescriptor[] (palette per view)
  DecoratorDescriptor[] (rules as overlays)
  TemplateDescriptor[] (archetype scaffolds)
```

### Concrete binding scheme (kind + relationship → view kind)

| Dominant kind in slice | Dominant relationships | Auto-emit view kind(s) |
|---|---|---|
| `part def` (SystemUsage, LogicalComponent, HardwareComponent, SoftwareComponent...) | `composedOf`, `aggregation` | **BDD(composition)** + **IBD(nested)** + **Tree** |
| `part def` with `port def` owned | `exposesInterface`, `connectsVia`, `flow` | **IBD with ports** + **BDD** |
| `action def` / `ActionUsage` | `succession`, `flow` | **AFD** |
| `requirement def` | `satisfies`, `derives`, `refines` | **Table** + **Matrix** |
| Safety kinds (Hazard, Risk, Mitigation, FailureMode) | `mitigates`, `causes`, `leadsTo`, `contributesTo` | **Matrix** + **Bowtie** + **FaultTree** + **RiskMatrix** |
| ClinicalClaim + Evidence | `claimsForUse`, `supportsClinicalClaim` | **Clinical-claim-chain** + **Matrix** |
| Privacy/Security (DataCategory, ThreatScenario, Control) | `threatensAsset`, `mitigatesThreat`, `classifiesData` | **Matrix** + **IBD** (TrustBoundary containers) + **STPA** |
| DesignInput/DesignOutput | `satisfies`, `verifies` | **DHF-IO-Matrix** + **Table** |
| Package / PackageRegistry | `imports` | **PKG** |
| `state def` (future) | `transition` | **STM** |

### Closure rule → view/decorator binding

| Closure rule shape | Auto-emitted view kind | Auto-emitted decorator |
|---|---|---|
| `requireRelationship(X → Y)` | **Matrix** X×Y | Node border red on violation |
| `requireAttribute(X, attr=A)` | **Table** of X with A column | Column cell red if empty |
| `requireContainment(X, Y)` | **BDD(composition)** X → Y | Missing-child badge |
| `requirePort(X, kind=K)` | **IBD** rooted at X | Missing-port badge |
| `requireFlow(X, Y)` | **AFD** scoped to common action parent | Missing-flow warning |
| `conditionalRequireRelationship(if X.attr=V, R)` | Matrix filtered | Conditional decorator |

Every closure rule thus auto-emits (a) a diagram that IS the rule's visual test, (b) a decorator that marks violations on any view that surfaces the kind. Validation and visualisation become the same pipeline. SysON has an analogous "criteria → decorator" pattern.

---

## 9. Nested IBD spec

### SysML v2 shape to support

```sysml
part def InfusionPump {
    part pump : Pump {
        port fluidIn  : FluidPort;
        port fluidOut : FluidPort;
    }
    part controller : Controller {
        port cmdOut : CommandPort;
        port sensorIn : SensorPort;
    }
    connect pump.sensorOut to controller.sensorIn;
    interface def PumpControl { ... }
}
```

### Model changes

[packages/core/src/model/semantic.ts](../../../packages/core/src/model/semantic.ts) currently has no parent/port ownership:

```ts
// ADD:
export interface MemoElement {
    ...
    /** Qualified id of owning part, if any (for nested IBD). */
    owner?: string;
    /** Port ids owned by this element (populated for part constructs). */
    ownedPorts?: string[];
    /** Port-specific metadata (populated when construct === 'port'). */
    portSpec?: { direction: 'in'|'out'|'inout'; type?: string; interfaceDef?: string; };
}

export interface MemoRelationship {
    ...
    /** Resolved port element ids (replaces/augments sourceEnd/targetEnd strings). */
    sourcePortId?: string;
    targetPortId?: string;
}
```

### Builder changes

[packages/core/src/model/builder.ts:330-335](../../../packages/core/src/model/builder.ts) already extracts `PortUsage`. Extend to:

1. When a `PortUsage` is inside a `PartUsage`, set its `owner` to the enclosing part's id.
2. When a `ConnectionUsage` of type `ConnectsVia` or `Flow` references `parentPart.portName`, resolve to `sourcePortId` / `targetPortId` instead of keeping only string ends.
3. Add `interface def` support alongside `part def` / `connection def` in grammar. Interface defs become a new `construct: 'interface'` kind; `exposesInterface` edges reference them.

### Rendering

- Dispatch in `DiagramCanvas.tsx:381-440`: when `selectedDiagram.diagramType === 'ibd'` AND model has structural composition, call `computeIBDLayout` at [layout.ts:231](../../../packages/web/src/views/layout.ts).
- `computeIBDLayout` feeds ELK with `hierarchyHandling: 'INCLUDE_CHILDREN'` (already set at layout.ts:250).
- Port rendering: for each node whose element has `ownedPorts`, pre-compute port positions on node boundary using ELK `portConstraints: FIXED_SIDE` and `port.side` (LEFT for `in`, RIGHT for `out`, TOP/BOTTOM for `inout`). Emit ELK `ports[]` on the parent node child; ELK returns port coordinates.
- ReactFlow: extend `DiagramInteractiveNode` (or introduce `PartNode`) to render `<Handle>` elements at ELK-returned port coordinates. `ActionFlowNode` ([ActionFlowNode.tsx](../../../packages/web/src/views/ActionFlowNode.tsx)) already does this for action parameters — port reuse pattern.
- Connector edges: route from `sourcePortId` Handle → `targetPortId` Handle. ReactFlow `Edge.sourceHandle` / `targetHandle` carries the port id.

### Layout strategy (ELK)

```js
{
  'elk.algorithm': 'layered',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',      // already set
  'elk.portConstraints': 'FIXED_SIDE',              // NEW
  'elk.portAlignment.default': 'DISTRIBUTED',       // NEW
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.spacing.portPort': '20',                     // NEW
  'elk.spacing.portsSurrounding': '[top=8,left=8,bottom=8,right=8]',  // NEW
}
```

---

## 10. DHF compiler — descriptor-driven regeneration

[packages/core/src/dhf/document-compiler.ts](../../../packages/core/src/dhf/document-compiler.ts) today walks a custom query engine per 18 document templates. Every DHF document is essentially a methodology view rendered to Markdown:

| DHF document | Descriptor used |
|---|---|
| Risk Management File | viewpoint `risk-overview` → { `trace-matrix` (hazard × mitigation), `risk-matrix-5x5`, `residual-risk-heatmap`, `benefit-risk-scale` } rendered to Markdown |
| Software Architecture | viewpoint `software-view` → { `bdd-composition`, `sw-safety-class-tree`, `sw-unit-verification-matrix` } |
| Clinical Evaluation Report | viewpoint `clinical-evidence-view` → { `clinical-claim-chain`, `clinical-evidence-matrix` } |
| Cybersecurity Risk Management | viewpoint `security-view` → { `stpa-control-structure`, `threat-bowtie`, `trace-matrix` } |
| Design Input/Output Traceability | viewpoint `qms-dhf-view` → `dhf-io-matrix` |
| Privacy Impact Assessment | viewpoint `privacy-view` → { `privacy-impact-matrix`, `data-flow-diagram` } |
| … | … |

**Target:** DHF compiler accepts a `methodology-to-document-mapping.yaml` (one row per document, declaring which viewpoints + descriptors feed which section). Each descriptor has a `renderMarkdown(data): string` alongside its web renderer. Removes 90% of query-engine hand-coding; adds new DHF sections by adding descriptor instances.

Risk matrix config in `memo.dhf.yaml` is promoted into a `RiskMatrixDescriptor` used both by UI (risk-matrix-5x5 view) and by DHF risk-section renderer.

---

## 10B. Physical separation — ontology / projects / app — and SysON/SysIDE compatibility

### 10B.1 Problem — three concerns mashed into one tree

Today:

```
packages/
  core/                       ← app: parser, builder, validator, DHF compiler
  cli/                        ← app: CLI commands
  web/                        ← app: React UI
  ontology-arch/              ← ONTOLOGY (should not be here)
  ontology-process/           ← ONTOLOGY (should not be here)
  medical-modeling-profile/   ← ONTOLOGY/PROFILE (should not be here)
examples/
  infusion-pump/              ← PROJECT (should not be here)
  irrigation-pump/            ← PROJECT (should not be here)
  gpca-pump/                  ← PROJECT (should not be here)
```

Three orthogonal concerns share one directory and one `pnpm` workspace graph. App releases force ontology republishes. Project content lives under a misnamed `examples/` folder. Nothing can be handed to a third-party tool (SysON, SysIDE, SysML-v2 Jupyter kernel, OMG pilot API server) without first detaching MEMO-specific scaffolding.

ADR-1-10 already plans a **two-repo split** (`memo-base` for ontology, `memo-architect` for tool). This audit raises the bar: even *inside one repo*, the three concerns must live in three top-level directories with no cross-concern imports at the filesystem level.

### 10B.2 Target layout

```
memo-architect/                          ← root of the tool repo (Layer 3)
├── apps/                                ← APP CODE (TypeScript, no SysML)
│   ├── core/                            ← parser, builder, validator, DHF compiler, methodology loader
│   ├── cli/                             ← CLI entry
│   └── web/                             ← React UI
├── ontology/                            ← ONTOLOGY (pure OMG SysML v2 + side-car YAML)
│   ├── memo-base/                       ← git subtree from memo-base repo (Layer 2)
│   │   ├── ontology-arch/
│   │   │   ├── memo.package.yaml
│   │   │   ├── memo.rendering.yaml
│   │   │   └── sysml/                   ← nothing but .sysml files
│   │   │       ├── operational/
│   │   │       ├── functional/
│   │   │       ├── logical/
│   │   │       ├── software/
│   │   │       ├── hardware/
│   │   │       ├── behavioral/
│   │   │       ├── verification/
│   │   │       ├── safety/
│   │   │       ├── security/
│   │   │       ├── privacy/
│   │   │       ├── relationships/
│   │   │       └── index.sysml
│   │   ├── ontology-process/
│   │   │   ├── memo.package.yaml
│   │   │   └── sysml/
│   │   │       ├── iso-14971/
│   │   │       ├── iec-62304/
│   │   │       └── ...
│   │   └── medical-modeling-profile/
│   │       ├── memo.package.yaml
│   │       ├── memo.rules.yaml
│   │       ├── memo.viewpoints.yaml
│   │       ├── memo.views.yaml                ← NEW (Phase 19)
│   │       ├── memo.tools.yaml                ← NEW (Phase 22)
│   │       ├── memo.decorators.yaml           ← NEW (Phase 20)
│   │       ├── templates/
│   │       │   ├── samd/
│   │       │   │   ├── memo.template.yaml
│   │       │   │   ├── memo.config.yaml       ← project scaffold
│   │       │   │   └── sysml/
│   │       │   ├── connected-device/
│   │       │   └── ...
│   │       └── sysml/                          ← profile-owned SysML (viewpoint defs etc.)
│   └── third-party/                     ← optional: other OMG SysML libraries a user imports
├── projects/                            ← PROJECT CODE (user device models)
│   ├── infusion-pump/
│   │   ├── memo.config.yaml
│   │   ├── memo.dhf.yaml
│   │   ├── memo.lock.yaml
│   │   └── sysml/                       ← pure OMG SysML v2, imports ontology packages
│   ├── irrigation-pump/
│   └── gpca-pump/
├── tools/
│   └── ontology-viewer/                 ← standalone read-only viewer (Phase 12)
└── docs/
```

Constraints enforced by layout:

- `apps/` imports **nothing** from `ontology/` or `projects/` at build time. App reads SysML files at runtime via filesystem, not via ESM imports.
- `ontology/` imports **nothing** from `apps/`. Pure data.
- `projects/` imports **nothing** from `apps/`. Imports `ontology/` at SysML-level via `import MEMO_Ontology_Arch_Safety::*;`.
- `pnpm` workspace only covers `apps/**`. Ontology is not an npm package graph concern.
- Git subtree `ontology/memo-base/` is a sync boundary (ADR-1-10 protocol). Changes land in the `memo-base` repo first, then subtree-pulled here.

### 10B.3 SysON / SysIDE compatibility — rules for every `.sysml` file

The grammar at `apps/core/src/grammar/memo-sysml.langium` (293 lines) is a *subset* of OMG SysML v2, not a superset. Current SysML files (e.g. [safety.sysml:1-76](../../../packages/ontology-arch/sysml/safety/safety.sysml)) use:

- `package`, `part def`, `attribute`, `enum def`, `connection def`, `part`, `port` — **all standard OMG SysML v2**.
- `connection def` with `end` declarations — standard.
- No stereotypes, no `#annotation`, no MEMO-specific tokens — **good**.

**Hard rules going forward:**

| Rule | Rationale | Enforcement |
|---|---|---|
| Every `.sysml` file must parse with the OMG SysML v2 pilot parser **and** SysIDE **and** SysON | Ecosystem portability | CI step `pnpm test:sysml-compat` runs all three parsers on every `.sysml` file in `ontology/` and `projects/`. Blocks PR on failure. |
| MEMO-specific metadata (layer label, renderer hints, closure-rule tags) **never** appears inside `.sysml` | MEMO tags would break third-party tools | Lint: grep any `#memo:*` / custom annotation patterns in SysML → fail |
| Layer derivation stays **Apollo-11 pattern** — directory path → layer, not an in-file tag | Already the convention; reinforces externality of layer concept | Already enforced by `KindRegistry.deriveLayer(path)` |
| Cross-file references use fully qualified `import Namespace::Name;` only | No relative paths, no implicit package context | Lint rule in CI |
| Package names match directory path (`MEMO_Ontology_Arch_Safety` ↔ `sysml/safety/`) | Tool-agnostic predictable resolution | Lint rule |
| No extensions to Langium grammar that widen beyond OMG | Parser compat | Grammar change PRs require explicit review + OMG pilot round-trip test |
| SysML is a **serialization format**, not a config container | Prevents creep of app-specific data | Policy + lint |

### 10B.4 Grammar strategy — Langium vs OMG

Current Langium grammar is hand-written, partial, and drifts from OMG without notice. Options:

1. **Keep Langium, gate against OMG** (recommended) — Langium stays for speed + in-memory AST + LSP features. Every grammar change is validated against a stored corpus of OMG-pilot `.sysml` files; CI fails if the MEMO parser accepts something OMG rejects or vice versa.
2. **Replace with OMG pilot parser** — higher fidelity, slower, Java-based, heavier dependency. Out of scope for Phase 19-27.
3. **Dual parse** — MEMO for editor/UI, OMG pilot for CI validation. Phase 26+ if ecosystem pressure justifies.

Phase 21 (port def + interface def grammar work) must land option 1 before shipping. Grammar additions must be verified against SysIDE + SysON test fixtures.

### 10B.5 Side-car config as the MEMO extension point

Everything MEMO-specific goes through `memo.*.yaml` files *next to* the SysML, never inside:

| File | Scope | Read by |
|---|---|---|
| `memo.package.yaml` | Ontology/profile package identity | Loader |
| `memo.rendering.yaml` | Layer colours / icons | Web renderer |
| `memo.rules.yaml` | Closure rules | Validator + decorator evaluator |
| `memo.viewpoints.yaml` | Viewpoints | Auto-diagram emitter |
| `memo.views.yaml` (NEW) | ViewDescriptors | Renderer dispatch + DHF |
| `memo.tools.yaml` (NEW) | ToolDescriptors | Palette |
| `memo.decorators.yaml` (NEW) | DecoratorDescriptors | View overlay |
| `memo.template.yaml` (NEW) | MethodologyTemplate | `memo init` |
| `memo.config.yaml` | Project identity | Loader |
| `memo.dhf.yaml` | DHF customisation | DHF compiler |
| `memo.lock.yaml` | Ontology version lock | Loader guard |

A third-party tool opening a MEMO ontology package sees: (a) the SysML, parseable standalone; (b) a set of YAML side-cars it can ignore. The package remains useful in SysON as a SysML library even if the tool does not understand any `memo.*.yaml`.

### 10B.6 Project packaging — makes a project portable

A project directory under `projects/` is a self-contained bundle:

```
projects/infusion-pump/
├── memo.config.yaml        ← declares: profile=medical-modeling-profile@1.x, archetype=samd, class=II
├── memo.dhf.yaml           ← risk matrix, org info
├── memo.lock.yaml          ← frozen ontology versions
└── sysml/
    ├── index.sysml
    ├── architecture/
    ├── requirements/
    ├── risk/
    ├── software/
    └── clinical/
```

Opening `projects/infusion-pump/` in SysON: SysON sees a SysML library with imports resolvable against its own copy of `ontology/memo-base/medical-modeling-profile/sysml/` (user has to copy or mount the profile). Rendering differs (SysON shows SDV, MEMO shows view descriptors), but the underlying model is one shared source of truth.

### 10B.7 Migration impact

Renames / moves (breaking, one commit, automated codemod):

| Old path | New path |
|---|---|
| `packages/core` | `apps/core` |
| `packages/cli` | `apps/cli` |
| `packages/web` | `apps/web` |
| `packages/ontology-arch` | `ontology/memo-base/ontology-arch` |
| `packages/ontology-process` | `ontology/memo-base/ontology-process` |
| `packages/medical-modeling-profile` | `ontology/memo-base/medical-modeling-profile` |
| `examples/infusion-pump` | `projects/infusion-pump` |
| `examples/irrigation-pump` | `projects/irrigation-pump` |
| `examples/gpca-pump` | `projects/gpca-pump` |

Updates required:
- `pnpm-workspace.yaml` — workspace globs restrict to `apps/**`
- `turbo.json` — pipeline task scopes
- `tsconfig.json` path aliases — `@memo/core` → `apps/core/src` etc.
- `scripts/` — any hardcoded path references
- Docs — every `packages/` mention in ADRs, overview, architecture docs
- Git subtree remote config — `ontology/memo-base/` subtree pulls from `memo-base` repo

This is a big rename but a shallow one. Zero logic changes. One PR, one codemod script, one `pnpm install` after. Do it before Phase 19 so descriptor work lands in the clean layout.

---

## 11. Migration plan — phased, each shippable

Next phase numbering continues from CLAUDE.md (Phases 1-18 + two-ontology refactor complete; next = Phase 19).

### Phase 19 — Physical separation + SysON/SysIDE compatibility gate (foundation, no feature work)
- **Rename tree** per §10B.7:
  - `packages/{core,cli,web}` → `apps/{core,cli,web}`
  - `packages/{ontology-arch,ontology-process,medical-modeling-profile}` → `ontology/memo-base/...`
  - `examples/*` → `projects/*`
- **Update** `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `scripts/**`, all ADRs, architecture docs, CLAUDE.md, CI config.
- **Add** `pnpm test:sysml-compat` — parses every `.sysml` under `ontology/` and `projects/` with:
  (a) MEMO Langium parser, (b) OMG SysML v2 pilot parser (Java, via docker or JVM), (c) SysIDE parser. Fails PR on mismatch.
- **Add** lint: reject any MEMO-specific annotations inside `.sysml` (`#memo:*`, stray TypeScript-style comments, etc.). SysML content must be pure OMG SysML v2.
- **Add** CI fixture: take one project (infusion-pump), open headless in SysON build, assert package resolves and at least one SDV renders. Small but proves portability.
- **Docs:** ADR-1-17 *"Physical separation + ecosystem compatibility"*. Update `platform-strategy.md` to show new tree.
- **No model, no renderer, no schema changes.** Pure structural refactor. Ships in one PR.

### Phase 20 — ViewDescriptor + renderer dispatch (no model changes)
- **Add** `memo.views.yaml` schema + loader in `packages/medical-modeling-profile` and `packages/core/src/methodology/loader.ts`.
- **Add** `ViewDescriptorDTO` to [semantic.ts](../../../packages/core/src/model/semantic.ts) alongside `DiagramDTO`.
- **Dispatch** in `DiagramCanvas.tsx:378-443` on `selectedDiagram.diagramType`:
  - `bdd` → new `computeBDDLayout` (composition-first, hides trace edges)
  - `ibd` → existing `computeIBDLayout` (wire it up, flag-gated until Phase 21 model changes land)
  - `matrix` → render `TraceabilityMatrix` inside `DiagramCanvas` shell
  - `table` → render `TabularView` inside shell
  - `afd` → render `ActionFlowDiagram` inside shell
  - `pkg` → new `computePackageLayout` from `PackageRegistry`
  - default → existing flat `computeLayout` (unchanged fallback)
- **CLI parity:** `memo export --diagram <id>` emits one file per diagram using the same descriptor + format flag (`--format svg|png|json|csv|html`). Extend [export.ts](../../../packages/cli/src/commands/export.ts) with `exportDiagramCommand`; use a headless ELK run + an SVG emitter per view kind (Matrix→HTML table, Table→CSV+HTML, IBD/BDD/AFD→SVG from ReactFlow-less ELK output).
- **Breaking change:** `memo.viewpoints.yaml` `diagrams[].diagramType` values must match a declared `viewDescriptor.id`. Legacy values keep working via a fallback descriptor.
- **No Zustand changes** required for this phase.

### Phase 21 — Traceability redesign + DecoratorDescriptor v1
- **Kill** auto-emission of per-layer BDDs for traceability layers (verification, iso-*). Replace with auto-emitted Matrix per closure rule of shape `requireRelationship(X → Y)`.
- **Add** `traceOverlayTypes: Set<string>` to Zustand store; wire to `DiagramCanvas` edge styling (dim non-overlay edges, highlight overlay edges).
- **Remove** the `activeView: { type: 'traceability' }` as a standalone mode; the TraceabilityMatrix becomes rendered via the matrix diagramKind under its own viewpoint.
- **Add** DecoratorDescriptor schema + evaluator; implement node-border + matrix-cell + table-column encodings for CR-MED-001, CR-MED-015 as the pilot set.
- **Store shape changes:**
  ```ts
  traceOverlayTypes: Set<string>;
  toggleTraceOverlay: (relType: string) => void;
  decoratorsById: Map<string, Decorator[]>;   // elementId → decorators
  // REMOVE activeView.type === 'traceability'
  ```
- **Breaking:** any user workspace with `activeView.type === 'traceability'` resets to `dashboard`.

### Phase 22 — Ports + nested IBD (model + grammar changes, SysON-compat gated)
- **Grammar:** add `port def` and `interface def` to [packages/core/src/grammar/memo-sysml.langium](../../../packages/core/src/grammar/memo-sysml.langium). Today `Port`/`Interface` are `part def` shims in [logical.sysml:1-21](../../../packages/ontology-arch/sysml/logical/logical.sysml); rewrite to use new constructs.
- **Semantic:** add `owner`, `ownedPorts`, `portSpec` to `MemoElement`; `sourcePortId`, `targetPortId` to `MemoRelationship`.
- **Builder:** update `extractUsage` to set `owner`; resolve dot-notation ends to port ids (update `resolveFlowConnection` at [builder.ts:608-644](../../../packages/core/src/model/builder.ts)).
- **Renderer:** new `PartNode` with boundary ports; wire `computeIBDLayout` with port constraints (§9).
- **Compat gate:** grammar additions (`port def`, `interface def`) must round-trip through SysON + SysIDE. `pnpm test:sysml-compat` must stay green. If OMG pilot rejects, adjust grammar, do not ship a MEMO-private dialect.
- **Breaking:** ontology-arch `Port` / `Interface` part defs disappear; any downstream model using them as `part` must migrate to `port def` / `interface def`. Run `memo validate` against infusion-pump/gpca-pump after change; auto-migrate with codemod `memo codemod port-def`.

### Phase 23 — Closure-rule-driven auto-diagram + ToolDescriptor v1
- **Generator:** extend `rebuildProject` at [dev.ts:165-197](../../../packages/cli/src/commands/dev.ts) with a `closureRulesToDiagrams` step that reads `memo.rules.yaml` and emits Matrix/Table/BDD descriptors per §8.
- **Kill list in one commit:** remove the per-layer BDD fallback (dev.ts:166-178). Ship only viewpoint-declared + closure-rule-derived diagrams.
- **CLI parity:** `memo export --all` emits every auto-diagram headless.
- **Add** `memo.tools.yaml` schema + per-descriptor palette rendering. Replace App.tsx global palette with view-scoped palette.

### Phase 24 — Table + Package + UCD renderers + MethodologyTemplate v1
- **TabularView** promoted to `diagramKind: 'table'`; supports rule-sourced columns.
- **PackageDiagram** — new renderer from `PackageRegistry`.
- **UCD** — minimal (actor circle + usecase ellipse + association lines); requires Actor/UseCase kinds already present in operational layer.
- **Formalise templates.** Add `memo.template.yaml` per archetype; `memo init` wizard loads TemplateDescriptor and applies scaffold + viewpoint + rule + DHF subset.

### Phase 25 — Medical-specific descriptors (ISO 14971 + IEC 62304)
- **risk-bowtie** renderer.
- **fault-tree** renderer (gate + node recursion).
- **risk-matrix-5x5** renderer driven by `memo.dhf.yaml.riskMatrix`.
- **residual-risk-heatmap** renderer.
- **benefit-risk-scale** renderer.
- **sw-safety-class-tree** renderer.
- **sw-unit-verification-matrix** via the matrix descriptor; no new renderer.

### Phase 26 — Medical-specific descriptors (clinical + security + privacy + DHF)
- **clinical-claim-chain** renderer.
- **stpa-control-structure** renderer.
- **threat-bowtie** reuses risk-bowtie with different kinds.
- **data-flow-diagram** with TrustBoundary containers.
- **privacy-impact-matrix** via matrix descriptor.
- **dhf-io-matrix** as first-class preset.
- **essential-performance-list** + **ifu-claims-map** tables.

### Phase 27 — DHF compiler descriptor-driven
- Rewrite `document-compiler` around ViewDescriptor → Markdown adapter per view kind.
- `methodology-to-document-mapping.yaml` replaces hand-coded per-document queries.
- All 18 DHF document types reimplemented as descriptor composites.

### Phase 28 — State machine + Parametric (nice-to-have)
- `state def` + `transition` to grammar, ontology-arch, renderer.
- Parametric renderer for `ConstraintDefinition` + binding connectors.

---

## 12. Zustand store shape changes (consolidated)

```ts
// Phase 19 — no store changes (pure filesystem rename + CI)

// Phase 20 — ADD
interface ModelState {
  viewDescriptors: ViewDescriptorDTO[];
  // No behavioural changes; descriptors arrive via model DTO like viewpoints do today.
}

// Phase 21 — ADD
interface ModelState {
  traceOverlayTypes: Set<string>;
  toggleTraceOverlay: (relType: string) => void;
  decoratorsById: Map<string, Decorator[]>;
}
// Phase 21 — REMOVE
type ActiveView = ... // drop `{ type: 'traceability' }` arm

// Phase 22 — ADD (derived from model DTO extensions; no new store field)
// MemoElement.owner, ownedPorts, portSpec and MemoRelationship.sourcePortId/targetPortId
// flow automatically through `setModel`.

// Phase 23 — ADD
interface ModelState {
  toolDescriptors: ToolDescriptorDTO[];
  activePaletteTools: ToolDescriptor[];   // derived from selectedViewDescriptor
}

// Phase 24 — ADD
interface ModelState {
  methodologyTemplate?: TemplateDescriptorDTO;
}
```

---

## 13. Risks + open questions

| # | Risk / Question | Mitigation |
|---|---|---|
| R1 | `memo.viewpoints.yaml` is already in use by infusion-pump, irrigation-pump, gpca-pump. Removing `auto: true` per-diagram semantics may invalidate user layouts in `.memo/layouts/*.yaml`. | Keep `auto` field as descriptor hint; migration regenerates descriptors from existing `diagramType` values before dropping the old path. |
| R2 | Langium grammar for `port def` / `interface def` is non-trivial. Current [memo-sysml.langium](../../../packages/core/src/grammar/memo-sysml.langium) uses `PartUsage`+`PortUsage`; `port def` support may require regeneration of `packages/core/src/language/generated/` artefacts. | Phase 22 is self-contained; gate with a feature flag in `buildMemoModel` and keep the `part def Port` shim until all ontology packages migrated. Must pass `pnpm test:sysml-compat` before merge. |
| R3 | Closure-rule-driven auto-emission could generate dozens of matrices — UI overload. | Group auto-diagrams under viewpoint in ExplorerPanel; collapsed by default. Add `hideFromExplorer: true` flag in rule → view binding. |
| R4 | ReactFlow handle-to-handle routing for IBD connectors may fight ELK port positioning on reflow. | Use ELK-computed port coordinates as ReactFlow `Handle` `position` override; don't let ReactFlow auto-place. `ActionFlowNode` pattern proves this works. |
| R5 | Headless SVG emission without a browser is non-trivial. ReactFlow is DOM-bound. | CLI export: skip ReactFlow entirely; emit SVG from ELK output directly via a thin SVG writer per diagramKind (BDD/IBD/AFD). Matrix/Table emit HTML + CSV. |
| R6 | SysON uses EMF-backed Sirius; MEMO uses plain JSON + Zustand. Some descriptor semantics (ownedElements, acceleo expressions) don't translate. | Keep MEMO descriptors *declarative but static* — no runtime expressions in Phase 20. Turing-complete layer later, if justified. |
| R7 | DHF compiler rewrite (Phase 27) is high-risk: existing customers depend on exact document structure. | Keep old compiler behind `memo.dhf.yaml.useDescriptorPipeline: false` flag through Phase 27-28; deprecate later. |
| R8 | Medical-specific descriptors (bowtie / FTA / STPA / risk-matrix) are non-trivial renderers. | Scope Phase 25-26 tightly; each descriptor = one renderer + one YAML + one unit test. Land one at a time. |
| R9 | 3 descriptor schemas (views / tools / decorators) + 4 existing configs (rules / viewpoints / rendering / package) is a lot. | Consider collapsing into `memo.methodology.yaml` by Phase 24; keep separate files for ADR-1-8 compatibility where schemas are stable. |
| R10 | Regulatory classes differ by jurisdiction (US 21 CFR 820 vs EU MDR vs Japan PMDA vs China NMPA). | TemplateDescriptor.regulatoryClass is an open set; jurisdictional templates layer over the standards baseline. Phase 24+ concern. |
| R11 | Renaming `packages/` → `apps/` + `ontology/` + `projects/` (Phase 19) touches every import, every doc, every CI script. One bad path breaks the build. | Automate with a single codemod (`scripts/migrate-layout.ts`); run on a clean branch; CI must pass before merge; roll back via git revert if needed. Schedule during a quiet milestone. |
| R12 | `pnpm test:sysml-compat` needs a Java/JVM dependency for the OMG pilot parser. Adds CI time + complexity. | Run the compat job nightly + on ontology/ and projects/ PRs only; skip on app-only changes. Cache the Docker image. |
| R13 | SysIDE may not have a headless CLI mode; cannot script a smoke-parse. | Fall back to the SysIDE language server in `--validate` mode, or compare AST JSON with OMG pilot only. SysIDE equivalence can be manual-review until tooling matures. |
| R14 | Third-party tools may reject constructs MEMO emits (e.g. custom viewpoint syntax in viewpoint.sysml). | Restrict profile-owned SysML to standard `viewpoint def` / `view def` per OMG. If OMG has no equivalent, leave the concept in YAML, not SysML. |
| Q1 | Should `diagramType: 'risk'` survive, or merge into `matrix` + `bdd` + `risk-bowtie`? | **Recommend:** deprecate `risk` in Phase 20; replace with explicit view kinds. |
| Q2 | Is the `__model` pseudo-viewpoint still needed after auto-emission is closure-rule-driven? | Likely not. Kill in Phase 22. |
| Q3 | Do AFD swim lanes belong in the descriptor, or stay a hardcoded `laneAttribute: allocatedTo`? | Descriptor field; different profiles may swim by different attribute. |
| Q4 | `TraceabilityMatrix.tsx` has its own model-store access and 5 hardcoded presets. Does it accept external descriptor input? | Phase 20 refactor needed: accept `{ rowKinds, colKinds, relationshipTypes }` props; preserve preset list as presets-over-descriptors. |
| Q5 | Grammar change in Phase 21 may require bumping `@memo/ontology-arch` version and propagating via git subtree to `memo-architect`. | Follow ADR-1-10 migration protocol; subtree pull after ontology lock bumped. |
| Q6 | Should MethodologyTemplate live in `medical-modeling-profile` or in a new `memo-templates` package? | Start in profile (Phase 23); extract to its own package if third-party archetypes emerge. |
| Q7 | How does descriptor precedence interact with multi-profile projects (e.g. medical + ROS + custom)? | Loader uses `extends` chain same as ontology. Later descriptors override earlier by `id`. Document in ADR. |
| Q8 | SysON uses AQL; MEMO closure rules use a simpler predicate form. Is AQL worth adopting for decorator expressions? | Defer. Start with typed predicate language; upgrade if needed in Phase 26. |

---

## 14. ADR candidates spawned by this audit

- **ADR-1-11** *Methodology Layer* — descriptor families (view / tool / decorator / template), loader, merge semantics, relationship to rules + viewpoints.
- **ADR-1-12** *View Descriptors* — YAML schema, renderer dispatch contract, CLI export parity.
- **ADR-1-13** *Port and Interface as first-class SysML constructs* — grammar + model changes, migration path for ontology-arch. SysON/SysIDE round-trip required.
- **ADR-1-14** *DecoratorDescriptor — closure rules as visual decorators* — rule → view contract, severity encoding, cross-view consistency.
- **ADR-1-15** *MethodologyTemplate — device archetypes as first-class* — wizard integration, template precedence, locking.
- **ADR-1-16** *DHF compiler on descriptors* — document-to-descriptor mapping, regulatory section coverage matrix.
- **ADR-1-17** *Physical separation + ecosystem compatibility* — `apps/` vs `ontology/` vs `projects/` split; SysON/SysIDE/OMG-pilot parse gate; side-car-only MEMO metadata policy; git subtree boundary between `ontology/memo-base/` and the `memo-base` repo. **Prerequisite for every other ADR in this list — land first.**

---

## Appendix A — Evidence index (MEMO)

- Auto-diagram emitter: [packages/cli/src/commands/dev.ts:143-239](../../../packages/cli/src/commands/dev.ts)
- Headless export: [packages/cli/src/commands/export.ts:57-177](../../../packages/cli/src/commands/export.ts)
- Renderer dispatch (the broken piece): [packages/web/src/views/DiagramCanvas.tsx:378-443](../../../packages/web/src/views/DiagramCanvas.tsx)
- Flat fallback layout: [packages/web/src/views/layout.ts:26-141](../../../packages/web/src/views/layout.ts)
- Unused nested-IBD layout: [packages/web/src/views/layout.ts:231-319](../../../packages/web/src/views/layout.ts)
- Decomposition layout: [packages/web/src/views/layout.ts:442-540](../../../packages/web/src/views/layout.ts)
- Action-flow layout (solid): [packages/web/src/views/layout.ts:804+](../../../packages/web/src/views/layout.ts)
- Semantic model: [packages/core/src/model/semantic.ts:22-163](../../../packages/core/src/model/semantic.ts)
- Builder port/flow handling: [packages/core/src/model/builder.ts:330-335, 608-644](../../../packages/core/src/model/builder.ts)
- Ontology Port/Interface as part def: [packages/ontology-arch/sysml/logical/logical.sysml:1-21](../../../packages/ontology-arch/sysml/logical/logical.sysml)
- Relationship ontology: [packages/ontology-arch/sysml/relationships/relationships.sysml](../../../packages/ontology-arch/sysml/relationships/relationships.sysml)
- Closure rules: [packages/medical-modeling-profile/memo.rules.yaml](../../../packages/medical-modeling-profile/memo.rules.yaml)
- Closure-rule engine: [packages/core/src/validator/rule-engine.ts:34-79](../../../packages/core/src/validator/rule-engine.ts)
- Viewpoints + diagrams: [packages/medical-modeling-profile/memo.viewpoints.yaml](../../../packages/medical-modeling-profile/memo.viewpoints.yaml)
- Traceability matrix: [packages/web/src/views/TraceabilityMatrix.tsx:17-58](../../../packages/web/src/views/TraceabilityMatrix.tsx)
- Traceability panel (side list): [packages/web/src/components/TraceabilityPanel.tsx:26-69](../../../packages/web/src/components/TraceabilityPanel.tsx)
- Diagram-type meta (badge table): [packages/web/src/constants.ts:181-191](../../../packages/web/src/constants.ts)
- Store shape: [packages/web/src/store/model-store.ts:133-296](../../../packages/web/src/store/model-store.ts)
- Kind registry: [packages/core/src/model/kind-registry.ts:1-100](../../../packages/core/src/model/kind-registry.ts)
- Relationship registry: [packages/core/src/model/relationship-registry.ts:1-80](../../../packages/core/src/model/relationship-registry.ts)
- DHF config: [packages/core/src/dhf/dhf-config.ts:1-45](../../../packages/core/src/dhf/dhf-config.ts)
- DHF compiler: [packages/core/src/dhf/document-compiler.ts](../../../packages/core/src/dhf/document-compiler.ts)
- `memo init`: [packages/cli/src/commands/init.ts:50-81](../../../packages/cli/src/commands/init.ts)
- App mode switch: [packages/web/src/App.tsx:48-68](../../../packages/web/src/App.tsx)
- Templates: [packages/medical-modeling-profile/templates/](../../../packages/medical-modeling-profile/templates/)

## Appendix B — Evidence index (SysON, `/Users/someshkashyap/sandbox/syson`)

- View provider interface: `backend/views/syson-common-view/src/main/java/org/eclipse/syson/common/view/api/IViewDescriptionProvider.java:35-76`
- SDV diagram descriptor: `backend/views/syson-standard-diagrams-view/src/main/java/org/eclipse/syson/standard/diagrams/view/SDVDiagramDescriptionProvider.java:143-350`
- AFV descriptor: `backend/views/syson-standard-diagrams-view/.../ActionFlowViewDiagramDescriptionProvider.java:33-62`
- ITV (IBD-equivalent) descriptor: `.../InterconnectionViewDiagramDescriptionProvider.java:33-62`
- STM descriptor: `.../StateTransitionViewDiagramDescriptionProvider.java`
- RTV (table) descriptor: `.../RTVTableDescriptionProvider.java:40-111`
- Explorer tree descriptor: `.../SysONExplorerTreeDescriptionProvider.java:38-81`
- Tool section switch pattern: `.../SDVNodeToolSectionSwitch.java:13-63`
- Definition node tool dispatch: `.../DefinitionNodeDescriptionProvider.java:130-133`
- Concepts doc: `doc/content/modules/user-manual/pages/concepts.adoc:1-67`
- Extensibility doc: `doc/content/modules/developer-guide/pages/extend.adoc:1-9`
