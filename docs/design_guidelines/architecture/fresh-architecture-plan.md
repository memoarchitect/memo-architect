# MEMO — Fresh Architecture Plan (v3)

**Status:** Draft. Supersedes v2 (`md::` prefix) and the descriptor-only plan in `diagram-subsystem-audit.md`.
**Date:** 2026-04-24.
**Drivers:**
- Feedback package (`feedback/`) as the canonical ontology shape.
- `diagram-subsystem-audit.md` §10B (physical separation), §8 (views under viewpoints).
- CLAUDE.md product model (Layer 2 ontology / Layer 3 tool).
- OMG SysML v2 domain-library conventions (Systems-Modeling/SysML-v2-Release).
- GfSE community model conventions (GfSE/SysML-v2-Models).
- HuggingFace `sysmlv2research/source_raw` corpus — informs naming patterns.

**Verdict of current design:** ontology mixed with app code; diagrams rendered without a SysML source; process vs arch not separated in UI; UI-only features not reachable from CLI; Apollo-style namespace prefix `md::` reads as "Markdown" not "Medical Device" — replace with **`memo::`** (consistent with the product/repo name and `@memo/*` pnpm packages).

**Companion artefact:** `architecture-blocks.drawio` — seven-tab block model (hierarchy, namespace map, core subsystems, UI tabs, data flow, quality attributes, dependency graph).

---

## 0. Namespace decision (replaces v2)

| v2 (feedback shape) | v3 (this plan) | Rationale |
|---|---|---|
| `md::core::*` | `memo::core::*` | "md" collides with Markdown and is opaque; "memo" matches product name (Medical Engineering Modelling Ontology) and the `@memo/*` package scope already used in monorepo |
| `md::architecture::*` | `memo::arch::*` | Shorter; "arch" aligns with `ontology-arch` package name and Architecture tab |
| `md::compliance::*` + `md::methodology::*` | `memo::process::*` (with sub-packages `compliance`, `methodology`) | Single mental model: Process tab = process ontology |
| `md::viewpoints::*`, `md::views::*` | `memo::profile::viewpoints::*`, `memo::profile::views::*` | Groups everything that belongs to **medical-modeling-profile** under one root |
| `md::examples::gpca::*` | `memo::projects::gpca::*` | Project models live at top level — symmetrical with filesystem layout |

`memo::` is the **only** root namespace. Every SysML file in MEMO declares a package under it. Third-party tools see one well-known namespace.

Namespace tree:

```
memo
├── core
│   ├── common               (IdentifiedElement, TraceableElement, …)
│   ├── enumerations         (ConcernKind, WorkflowStageKind, …)
│   └── relationships        (SemanticLink, Mitigates, Satisfies, …)
├── arch                     (Architecture tab)
│   ├── context · requirements · functions
│   ├── logical_structure · logical_interfaces
│   ├── behavior · constraints
│   ├── software_structure · hardware_structure · physical_interfaces
│   ├── risk · cybersecurity · privacy · assurance
│   └── ros_extension        (ROS 2 middleware kinds — opt-in)
├── process                  (Process tab — DHF source)
│   ├── compliance::artifacts
│   ├── compliance::iso14971 · iec62304 · iso13485 · iso14155 · iec60601 · iec81001_5_1 · iso27701 · cfr820 · eu_mdr
│   ├── methodology::core · gates · patterns · profiles · rules · workflow
│   └── methodology::dhf
├── profile                  (medical-modeling-profile — cross-cutting)
│   ├── viewpoints::core · default_viewpoints
│   ├── views::core · document_views
│   ├── views::arch::*       (one view per file, mirrors arch layers)
│   ├── views::risk::*  views::security::*  views::privacy::*
│   ├── views::dhf::*
│   └── rules::*             (ViewRule parts; replaces memo.rules.yaml)
├── projects                 (device models)
│   ├── infusion_pump
│   ├── irrigation_pump
│   └── gpca
└── manifest                 (release info, lock metadata)
```

---

## 1. Guiding principles (v3)

1. **Ontology is SysML, not YAML.** Kinds, relationships, viewpoints, views, closure rules and templates live in `.sysml` files under `memo::`. YAML side-cars hold only tool-specific hints (rendering colours, cache paths, ontology lock).
2. **Pure OMG SysML v2 — round-trip with SysON, SysIDE, OMG pilot.** Every `.sysml` file parses unchanged in third-party tools. CI gate: `memo check --sysml-compat` runs the OMG pilot grammar on every file.
3. **Domain-library extension pattern.** `memo::core::*` is the local kernel. Domain layers (`memo::arch`, `memo::process`) extend it via specialisation (`:>`), not modification — same shape OMG uses for `Cause and Effect`, `Requirement Derivation` libraries.
4. **Definition / usage split.** `part def Hazard { … }` once in the ontology; every project says `part fluidOverInfusion : Hazard { … }`. No bare blocks.
5. **One SysML view file = one diagram.** Each renderable diagram has a `DiagramView` or `DocumentBackedView` part in its own `.sysml` file under `memo::profile::views::*`. The renderer reads the descriptor, never invents a diagram.
6. **Three top-level concerns, three top-level directories.** `apps/` (tool code), `ontology/` (SysML + side-cars), `projects/` (device models). No cross-concern imports at filesystem level.
7. **Two ontologies, two tabs.** `ontology-arch` → **Architecture** tab (what the system IS). `ontology-process` → **Process** tab (what the project DOES; DHF). Meet only in the QMSR document bundle.
8. **Directory = layer (Apollo-11).** `sysml/<layer>/<file>.sysml` derives the layer.
9. **CLI-first. UI is a thin client over the compiler.** Every UI action has a CLI command of equal power. UI calls compiler endpoints; never owns model mutation.
10. **`private import` is the default.** Public re-exports only at deliberate boundaries (`memo::core::*` exposes its base types; everything else uses `private import` to keep linkage explicit).
11. **Usability before features.** Every new UI capability ships behind a clear task→tab mapping (§8). If a user can't predict which tab to click, the design is wrong, not the user.
12. **Modularity as scaffolding.** Apps, ontology, projects, profile, tools all evolve on independent release cycles via package boundaries and SysML namespace discipline.
13. **Extensibility by drop-file.** Third parties extend MEMO by dropping `.sysml` files (ontologies, viewpoints, views, document templates, consistency rules, tool declarations) into well-known directories. No recompile of `memo-architect` should be needed for a new domain.
14. **Three-wave release.** Ship in this order, each wave stable before the next: **W1 ontology** (SysML library + `.kpar`, consumable in SysON / SysIDE / Sysand), **W2 CLI** (`memo` command, headless), **W3 web tool** (`memo-architect`, behind feature flags). Each wave usable on its own. Web is the last wave because it's the most expensive surface and the least essential for adoption — a regulator can read SysON; a CI pipeline can call CLI.
15. **Modular web by feature flag.** Every web feature (tab, renderer, tool, workbench, importer) is a self-contained module behind a flag (ADR-1-29). Module = SysML manifest + TypeScript registration + lazy bundle. Disabled = not downloaded. Lets the web app land Tab 1 in week 1, Tab 2 in week 4, a single new renderer in week 6, without merging unfinished UI into the main bundle.

---

## 2. SysML v2 best-practice rules adopted in MEMO

Distilled from the OMG release, GfSE community models, and the feedback package corpus. These are normative for every `.sysml` file in `ontology/` and `projects/`.

| # | Rule | Example | Enforcement |
|---|---|---|---|
| R1 | Every package declares one concern. File name = trailing namespace segment (`risk.sysml` ↔ `package memo::arch::risk`). | `package memo::arch::risk { … }` | Lint: `memo lint --rule R1` |
| R2 | Use `private import memo::…::*;` at top of every file. Public re-export only inside `memo::core::*` and the profile root. | `private import memo::core::common::*;` | Lint R2 |
| R3 | Use `:>` to specialise; never duplicate base attributes. | `part def Hazard :> TraceableElement { … }` | Parser type-check |
| R4 | Every concrete element has a stable `attribute id` literal. Format: `<KIND>-<DOMAIN>-<NNN>` (e.g. `HAZ-INF-001`). | `attribute id = "HAZ-INF-001";` | `memo validate` |
| R5 | Quantities use `attribute … : ScalarValues::<unit>` from the OMG quantity library. No bare `Real`. | `attribute flowRate : SI::ml_per_h;` | Lint R5 (planned) |
| R6 | `ExchangeItem` parts carry data on every interface flow. No untyped flows. | `ref content : ExchangeItem;` | Type-check |
| R7 | Relationships declared as `connection def` (e.g. `Mitigates`) — not as bare element references. | `connection def Mitigates { … }` | Parser |
| R8 | Views never live inside ontology layers; they live in `memo::profile::views::*`. | one file per view | Path-lint |
| R9 | Stereotype/metadata uses SysML metadata blocks, not comments. | `metadata def CritKind { … }` | Lint R9 |
| R10 | Manifest part `memo::manifest::release` declares package version, dependency pins, and SysML library version. | feedback shape | `memo lock` reads it |

R5–R6 are enforced incrementally (warnings → errors in P6).

---

## 3. Diagnosis — why the current design is mixed

| Symptom | Root cause |
|---|---|
| `ontology-arch/` and `web/` share `packages/` root | No physical separation; pnpm workspace forces app-release cycle on ontology |
| `memo.viewpoints.yaml` owns viewpoints, `memo.rules.yaml` owns rules | Ontology concepts modelled as YAML, not SysML — not portable to SysON |
| Diagrams emitted by hardcoded loop in `dev.ts:166-178` | No SysML source; generator invents diagrams from viewpoint YAML |
| `DiagramCanvas.tsx` ignores `diagramType` | No view descriptor to dispatch on |
| DHF compiler uses custom query engine per document | Process ontology exists but is not wired as the data source |
| Traceability rendered as flat BDD trees | Traceability has no dedicated `View` kind (Matrix/Table/Overlay) |
| 6 UI modes (catalog / diagram / dsm / actionflow / scenario / ontology) | Mix of arch + process + tool views; no arch-vs-process separation |
| UI-only features (matrix presets in `TraceabilityMatrix.tsx`) | No CLI surface; UI owns logic |
| `md::` prefix in feedback corpus | Reads as Markdown; not the product name |

---

## 4. Target repo layout

```
memo-architect/                            ← Layer 3 tool repo
├── apps/                                  ← TypeScript, no SysML
│   ├── core/                              ← parser, builder, validator, compiler, methodology loader
│   ├── cli/                               ← every feature invokable here
│   └── web/                               ← thin client over core
├── ontology/                              ← SysML + side-car YAML only
│   └── memo-base/                         ← git subtree from memo-base repo (Layer 2)
│       ├── core/                          ← memo::core::*
│       ├── arch/                          ← memo::arch::*
│       ├── process/                       ← memo::process::*
│       ├── profile/                       ← memo::profile::* (viewpoints, views, rules)
│       └── manifest/                      ← memo::manifest::release
├── projects/                              ← device models (was examples/)
│   ├── infusion-pump/                     ← memo::projects::infusion_pump
│   ├── irrigation-pump/
│   └── gpca/
└── tools/
    └── ontology-viewer/                   ← standalone read-only viewer
```

`apps/` imports nothing from `ontology/` or `projects/` at build time. Ontology loaded at runtime via filesystem.

---

## 5. Ontology shape — feedback-package style with `memo::` namespace

### 5.1 Namespace map (canonical)

| Namespace | Role | Concrete files |
|---|---|---|
| `memo::core::common` | Base types: `IdentifiedElement`, `TraceableElement`, `DocumentedElement`, `LayerElement`, `ExchangeItem` | `ontology/memo-base/core/common.sysml` |
| `memo::core::enumerations` | All enums: `ConcernKind`, `CriticalityKind`, `LifecycleStateKind`, `WorkflowStageKind`, `AudienceKind`, `RuleStrengthKind`, `PresentationKind`, `ViewOutputKind` | `core/enumerations.sysml` |
| `memo::core::relationships` | `SemanticLink`, `Mitigates`, `Satisfies`, `Verifies`, `Allocates`, `Refines`, `DerivesFrom` | `core/relationships.sysml` |
| `memo::arch::<layer>` | Per-layer part defs (what the system IS) | `arch/<layer>.sysml` |
| `memo::process::compliance::artifacts` | `ControlledArtifact` + regulatory work products | `process/compliance/artifacts.sysml` |
| `memo::process::compliance::<standard>` | One package per regulation | `process/compliance/iso14971.sysml`, … |
| `memo::process::methodology::<concern>` | Methodology libraries + rules + workflow | `process/methodology/*.sysml` |
| `memo::profile::viewpoints::core` | `Viewpoint`, `ViewRule` part defs | `profile/viewpoints/core.sysml` |
| `memo::profile::viewpoints::default_viewpoints` | One part per viewpoint: `contextViewpoint`, `riskViewpoint`, … | `profile/viewpoints/default_viewpoints.sysml` |
| `memo::profile::views::core` | `View`, `DiagramView`, `DocumentBackedView`, `ViewSelectionQuery` | `profile/views/core.sysml` |
| `memo::profile::views::<concern>::<view>` | **One file per concrete view** | `profile/views/<concern>/<view>.sysml` |
| `memo::profile::rules` | `ViewRule` instances (closure rules) | `profile/rules/*.sysml` |
| `memo::manifest::release` | Package version + SysML library pin | `manifest/release.sysml` |
| `memo::profile::tools::*` | `Tool` part defs — Tab 4 grid registry; each tool declares parametersSchema, viewKind, regulatoryRef[] | `profile/tools/*.sysml` |
| `memo::process::methodology::dhf::templates::*` | `DocumentBackedView def` per regulatory document (RMF, SDD, CER, Cyber Assmt, DPIA, DHF, custom) — Tab 3 Add-Document picker | `process/methodology/dhf/templates/*.sysml` |
| `memo::ext::<vendor>::*` | User-supplied ontology / viewpoint / view / template / tool / rule extensions; auto-loaded by B4 | `ontology/<vendor>/**` |

### 5.2 One-view-per-file layout

```
ontology/memo-base/profile/views/
├── arch/
│   ├── context_block_diagram.sysml          ← contextBlockDiagramView : DiagramView
│   ├── logical_architecture_bdd.sysml
│   ├── logical_architecture_ibd.sysml
│   ├── logical_decomposition_tree.sysml
│   ├── software_bdd.sysml
│   ├── software_safety_class_tree.sysml
│   ├── software_unit_verification_matrix.sysml
│   ├── hardware_bom_table.sysml
│   ├── hardware_bdd.sysml
│   ├── action_flow_view.sysml
│   ├── state_transition_view.sysml
│   └── req_table.sysml
├── risk/
│   ├── risk_overview_bdd.sysml
│   ├── risk_matrix.sysml                    ← Hazard × Mitigation
│   ├── risk_matrix_5x5.sysml                ← severity × probability
│   ├── risk_bowtie.sysml
│   ├── residual_risk_heatmap.sysml
│   └── fault_tree.sysml
├── security/
│   ├── threat_bowtie.sysml
│   ├── stpa_control_structure.sysml
│   ├── data_flow_diagram.sysml
│   └── threat_scenario_matrix.sysml
├── privacy/
│   └── privacy_impact_matrix.sysml
├── clinical/
│   ├── clinical_claim_chain.sysml
│   └── clinical_evidence_matrix.sysml
└── dhf/
    ├── dhf_io_matrix.sysml
    ├── essential_performance_list.sysml
    └── ifu_claims_map.sysml
```

### 5.3 Example: one view file (rewritten in `memo::` namespace)

```sysml
// ontology/memo-base/profile/views/risk/risk_matrix.sysml
package memo::profile::views::risk::matrix {
    private import memo::profile::views::core::*;
    private import memo::profile::viewpoints::default_viewpoints::*;
    private import memo::core::enumerations::*;

    part riskMatrixView : DiagramView {
        attribute id = "VIEW-RISK-MATRIX";
        attribute name = "RiskMatrixView";
        attribute title = "Risk Traceability Matrix (Hazard × Mitigation)";
        attribute outputKind = { ViewOutputKind::matrix };
        attribute presentationKind = { PresentationKind::riskTable };
        attribute diagramType = "matrix";
        attribute autoPopulate = true;
        attribute documentUsage = { "RMF", "QMSR" };

        part selectionQuery : ViewSelectionQuery {
            attribute id = "QRY-RISK-MATRIX";
            attribute includeElementKinds = { "Hazard", "Mitigation", "RiskControl" };
            attribute includeRelationshipKinds = { "mitigates" };
            attribute includeLayers = { "risk" };
            attribute includeConcerns = { ConcernKind::safety };
            attribute selectionExpression = "kind in [Hazard, Mitigation] and relType = mitigates";
            attribute rationaleText = "Populate Hazard × Mitigation traceability for ISO 14971 closure.";
        }

        part viewpoint :> riskViewpoint;
    }
}
```

### 5.4 Arch vs Process mapping

| Ontology | Tab | Namespace | Contents |
|---|---|---|---|
| `ontology-arch` | Architecture | `memo::arch::*` | context, requirements, functions, logical_structure, logical_interfaces, behavior, software_structure, hardware_structure, physical_interfaces, constraints, risk, cybersecurity, privacy, assurance, ros_extension |
| `ontology-process` | Process (→ DHF) | `memo::process::*` | `compliance::*` (ISO 14971, IEC 62304, ISO 13485, ISO 14155, IEC 60601, IEC 81001-5-1, ISO 27701, 21 CFR 820, EU MDR) + `methodology::*` (workflow, gates, patterns, profiles, rules, dhf) |
| `medical-modeling-profile` | Cross-cutting | `memo::profile::*` | viewpoints, views, queries, closure rules, templates |

The two tabs render from different viewpoint sets but share the same core model. DHF bundle merges both.

---

## 6. Quality attributes (ISO/IEC 25010 view) — priority-ordered

**Top-3 priorities (drive every design call):**
1. **Usability** — modeller knows where to go, finds it in one click, never lost.
2. **Modularity** — system decomposes into pieces that ship and evolve independently.
3. **Extensibility** — third parties drop in their own ontologies, viewpoints, views, document templates, and tools without recompiling MEMO.

The rest follow.

| Pri | Attribute | Target | How v3 design hits it |
|---|---|---|---|
| **1** | **Usability — task→tab mapping** | Modeller picks the right tab in ≤1 s for any task ("create a part", "render a hazard matrix", "export DHF", "run DSM"). | Four-tab UI (§8): 🏗 Architecture (model edit) · 🎨 Diagramming (view edit) · 📄 DHF (assemble) · 🛠 Tools (analyses). One tab per concern; no overlap. |
| **1** | **Usability — split-edit** | Diagramming users see code and visual together; either side editable; bidirectional sync. | Tab 2 split editor (§8.2). Visual on top, SysML view source bottom; ELK layout deterministic so layout-only edits write back to `layoutHint`/`styleHint` only. |
| **1** | **Usability — view-type-aware controls** | Right pane controls match active diagramType (BDD palette, matrix row/col picker, bowtie cause/threat slots, FTA gate buttons). | Renderer Dispatcher (B8) declares per-`diagramType` control schema; Tab 2 right pane consumes it. |
| **1** | **Usability — continuous compile** | Compile errors visible within 200 ms of keystroke (like an IDE for code). | Langium LSP + debounced incremental compile in B1/B2/B3; Tab 1 bottom bar; cross-tab badges. |
| **1** | **Usability — CLI parity** | Every UI action runnable from terminal. | Rule §9; PR checklist enforces. |
| **1** | **Usability — discoverability of catalogs** | Diagrams, documents, tools all live in browsable catalogs; search + group + filter. | Tab 2 Diagram Catalog · Tab 3 Document Catalog · Tab 4 Tools grid. All catalogs auto-populate from SysML registries, no manual list. |
| **2** | **Modularity — coupling** | No app code imports ontology; no ontology code imports app. | Filesystem split (§4) + lint rule (no `apps/**` ↔ `ontology/**` imports). |
| **2** | **Modularity — per-tab ship** | Each UI tab is self-contained shell over a per-tab WS subscription. Tab can be replaced without touching others. | §8.5 cross-tab invariants. |
| **2** | **Modularity — change cost** | Adding new diagram type = 1 renderer file + 1 view file + 1 control schema + 1 test. | Renderer Dispatcher (B8). |
| **2** | **Modularity — block dependency direction** | All edges point toward registries (B3, B5). No cycles. CI lint enforces. | §7.3 dependency graph. |
| **3** | **Extensibility — user ontology** | Drop `.sysml` file under `memo::ext::<vendor>::*` → loaded, indexed, palette and explorer pick it up. No recompile. | B4 Ontology Loader scans `ontology/`; B3 indexes any `memo::*` namespace. |
| **3** | **Extensibility — user viewpoint** | Drop `.sysml` `part : Viewpoint` → appears in Tab 2 catalog filter. | B5 Methodology Registry. |
| **3** | **Extensibility — user view = user diagram** | Drop `.sysml` `part : DiagramView` → appears in Tab 2 catalog as one diagram. | One-view-per-file rule + B8 dispatch. |
| **3** | **Extensibility — user document template** | Drop `.sysml` `part def : DocumentBackedView` → appears in Tab 3 "Add Document" picker. | `memo::process::methodology::dhf::templates::*` discovery. |
| **3** | **Extensibility — user tool** | Drop `.sysml` `part : Tool` (+ optional `<Tool>.tool.ts` plugin) → appears in Tab 4 grid. | `memo::profile::tools::*` registry + plugin loader (ADR-1-26). |
| **3** | **Extensibility — user ConsistencyRule** | Drop `.sysml` `part : ConsistencyRule` → engaged in Tab 4 Consistency Checker + bottom-bar badges. | B6 Rule Engine indexes. |
| 4 | **Functional — completeness** | Every regulator-expected diagram reachable. | One `DiagramView` per kind under `memo::profile::views::*`; B8 dispatcher. |
| 4 | **Functional — correctness** | DHF byte-identical between CLI and UI. | Same B5 + B7 + B9 pipeline. |
| 5 | **Performance — render** | < 200 ms for 5 000-element; < 2 s for 50 000-element. | Indexed in-memory registry (B3); ELK once per view; per-tab subscription avoids storms. |
| 5 | **Performance — parse** | < 1 s incremental rebuild on save. | Langium incremental + chokidar in B14. |
| 6 | **Compatibility — SysML round-trip** | OMG pilot · SysON · SysIDE parse every file unchanged. | Pure OMG SysML v2; CI gate `memo check --sysml-compat`. |
| 6 | **Compatibility — versioning** | Ontology majors don't break pinned projects. | `memo::manifest::release` + `sysand-lock.toml`; two-repo split. |
| 7 | **Reliability — determinism** | Same model + same view → identical output. | Pure functions in B2/B5/B7/B9; layout hash test in CI. |
| 7 | **Reliability — isolation** | Broken project fails its project, not the tool. | B4 sandboxes per project. |
| 8 | **Security — audit chain** | Every DHF artefact carries `id`, `version`, source SysML hash. | `DocumentBackedView.lifecycleState` + manifest hash. |
| 9 | **Portability — pure SysML** | Ontology usable in tools that never heard of MEMO. | YAML side-cars optional; ontology stands alone; `.kpar` ship. |
| 9 | **Portability — repo split** | `memo-base` lives without `memo-architect`. | Two-repo split (ADR-1-9). |

---

## 7. Block architecture (companion drawio Tab 3)

```
                                   ┌────────────────────────────────────────┐
                                   │              USER / OPERATOR           │
                                   └──┬──────────────────┬─────────────────┬─┘
                                      │                  │                 │
                                      │ CLI             UI                 │ DHF output
                                      ▼                  ▼                 ▲
┌───────────────────────┐    ┌────────────────┐    ┌──────────────┐    ┌───┴────┐
│  apps/cli             │    │  apps/web      │    │ apps/core    │    │ docs/  │
│  memo init            │───▶│  Arch tab      │◀──▶│  compiler    │───▶│ DHF    │
│  memo dev             │    │  Process tab   │ WS │  (the brain) │    │ MD/PDF │
│  memo validate        │    │  DHF bundle    │    └──────┬───────┘    └────────┘
│  memo export          │    └────────────────┘           │
│  memo matrix          │◀───────────────────────────────┤
│  memo dhf build       │                                │ read
└───────┬───────────────┘                                ▼
        │ FS read                              ┌─────────────────────┐
        └─────────────────────────────────────▶│  ontology/ + projects/ │
                                               │     (SysML + YAML)   │
                                               └─────────────────────┘
```

### 7.1 Subsystem block map (inside `apps/core`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 apps/core                                   │
│  ┌───────────┐   ┌────────────┐   ┌────────────┐   ┌────────────────────┐   │
│  │ B1 Parser │──▶│ B2 Builder │──▶│ B3 Model   │◀──│ B4 Ontology Loader │   │
│  │ (Langium) │   │ (AST→DTO)  │   │  Registry  │   │ (package + lock)   │   │
│  └───────────┘   └────────────┘   └─────┬──────┘   └────────────────────┘   │
│                                         │                                   │
│           ┌─────────────────────────────┼─────────────────────────────┐     │
│           ▼                             ▼                             ▼     │
│  ┌────────────────┐          ┌─────────────────┐           ┌─────────────┐  │
│  │ B5 Methodology │          │ B6 Rule Engine  │           │ B7 View     │  │
│  │  Registry      │─────────▶│ (closure rules  │──────────▶│  Resolver   │  │
│  │ (Viewpoints +  │          │  → decorators)  │           │ (query →    │  │
│  │  Views + Queries)         └─────────────────┘           │  elements)  │  │
│  └───────┬────────┘                                        └──────┬──────┘  │
│          ▼                                                        ▼         │
│  ┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐   │
│  │ B8 Renderer     │────────▶│ B9 Layout Engine│────────▶│ B10 Export   │   │
│  │  Dispatcher     │         │ (ELK: BDD, IBD, │         │ (SVG, CSV,   │   │
│  └─────────────────┘         │  AFD, Matrix,   │         │  HTML, JSON) │   │
│                              │  Table, Tree)   │         └──────────────┘   │
│                              └─────────────────┘                            │
│  ┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐   │
│  │ B11 DHF Compiler│◀────────│ B12 Document    │◀────────│ B13 Template │   │
│  │ (viewpoint +    │         │  Templates      │         │  Registry    │   │
│  │  process arts)  │         │ (Markdown/PDF)  │         │ (archetypes) │   │
│  └────────┬────────┘         └─────────────────┘         └──────────────┘   │
│           │                                                                 │
│           └─▶ B14 Dev Server (Vite + chokidar + WebSocket)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Block responsibilities and dependencies

| # | Block | Responsibility | Depends on | Replaces (current) |
|---|---|---|---|---|
| B1 | Parser | Langium AST for OMG SysML v2 subset | — | `apps/core/src/grammar/*` |
| B2 | Builder | AST → `MemoElement[]` + `MemoRelationship[]` + `owner/ownedPorts` | B1 | `apps/core/src/model/builder.ts` |
| B3 | Model Registry | In-memory index by id, kind, layer, relationship | B2 | `kind-registry.ts` + `relationship-registry.ts` (broadened) |
| B4 | Ontology Loader | Loads `ontology/memo-base/**` + `projects/<id>/**`; enforces `memo.lock.yaml`; merges profile + project | B1, B2 | partial: today in `dev.ts`, no lock |
| B5 | Methodology Registry | Indexes `Viewpoint`, `View`, `ViewSelectionQuery`, `ViewRule` from `memo::profile::*` | B3, B4 | replaces YAML viewpoint loader |
| B6 | Rule Engine | Evaluates `ViewRule` instances; emits `Decorator[]` per element id | B3, B5 | `rule-engine.ts` (rules from SysML not YAML) |
| B7 | View Resolver | Executes a view's `selectionQuery` → element + relationship slice | B3, B5 | inverted from `TraceabilityMatrix.tsx` |
| B8 | Renderer Dispatcher | Picks renderer plan from `diagramType` + `presentationKind` | B5, B7 | NEW — replaces `DiagramCanvas` switch |
| B9 | Layout Engine | Per view kind: BDD, IBD, AFD, Matrix, Table, Tree, Bowtie, FaultTree, PIA | B8 | wires existing layout fns |
| B10 | Export | Headless output: SVG / PNG / CSV / HTML / JSON | B9 | `export.ts` extended |
| B11 | DHF Compiler | Walks `memo::process::*` + viewpoint output → document sections | B5, B7, B9, B12 | `document-compiler.ts` rewritten |
| B12 | Document Templates | Markdown + PDF templates per `DocumentViewKind` | B11 | existing templates |
| B13 | Template Registry | `memo init` archetype scaffolds (SaMD, connected, monitoring, infusion-pump, blank) — one `memo.template.yaml` per archetype | B5, B4 | `templates/` formalised |
| B14 | Dev Server | Chokidar watch → rebuild → WS broadcast DTO | all | `dev.ts` (unchanged surface) |

### 7.3 Dependency graph (no cycles)

```
B1 → B2 → B3 → B4 → B5 → B6, B7
B5 + B7 → B8 → B9 → B10
B5 + B7 + B9 + B12 → B11
B4 + B5 → B13
B14 composes B1–B10
```

All edges point toward registries (B3, B5). No block reaches around the graph.

---

## 8. UI block architecture (apps/web) — four-tab redesign

**Why redesign.** Earlier iterations (6 ad-hoc modes; then 3 tabs Architecture/Process/DHF) conflated **modelling** (creating/editing parts) with **diagramming** (presenting parts as views) with **documents** (publishing) with **tools** (analyses). User feedback: confusing. Fix: separate the four concerns into four tabs, each with role-appropriate UX. Same underlying SysML + ontology — different shells.

**Quality priorities (revised, applied here):**
1. **Usability** (top) — modeller knows where to go for each task; one click to switch tasks; no hidden modal state.
2. **Modularity** — each tab is a self-contained shell that subscribes to a scoped slice of `apps/core`. Tab can ship independently.
3. **Extensibility** — user ontologies, user views, user tools, user document templates all drop in as `.sysml` / `.template.sysml` files; auto-registered, no recompile of `apps/web`.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  apps/web                                                                        │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Top bar:   [ 🏗 Architecture ] [ 🎨 Diagramming ] [ 📄 DHF ] [ 🛠 Tools ] │  │
│  │  + project / product selector  + global search  + lint badge  + gate state │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Per-tab shell (4 distinct UIs over the same SysML model + ontology)             │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  WebSocket bridge to apps/core (B14)                                     │    │
│  │  — per-tab subscription (delta DTOs)                                     │    │
│  │  — every user action → command → B3/B4 mutate; broadcast result          │    │
│  │  — UI never touches filesystem directly                                  │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Tab 1 — 🏗 Architecture (SysML modelling, SysON-like)

**Purpose.** Single source of truth for **creating and editing** ontology kinds and project parts. Pure SysML editing with live compile. Modelled on Eclipse SysON / SysIDE conventions so users familiar with those tools feel at home.

```
┌───────────────────┬─────────────────────────────────────────────┬──────────────────┐
│ Model Explorer    │  SysML Source Editor                        │  Properties      │
│  ▾ memo::core     │  ┌──────────────────────────────────────┐   │   id           │
│  ▾ memo::arch     │  │  package memo::projects::pump::risk{│   │   name         │
│    ▾ risk         │  │    item def Hazard …                 │   │   doc          │
│      Hazards      │  │    #hazard <'HAZ-INF-001'> over… {   │   │   severity     │
│      Mitigations  │  │       :>> initialSeverity = …        │   │   probability  │
│  ▸ memo::process  │  └──────────────────────────────────────┘   │   …            │
│  ▾ projects       │  ─ split-pane (optional inline preview) ─   │                │
│    ▸ pump         │  ┌──────────────────────────────────────┐   │  Decorators    │
│  + add part       │  │  [auto-generated tree preview]       │   │   from B6      │
│  + import .sysml  │  └──────────────────────────────────────┘   │                │
└───────────────────┴─────────────────────────────────────────────┴──────────────────┘
   Bottom bar:  [ Live compile · 0 errors · 3 warnings ]   [ memo lint badge ]
```

**Behaviour:**
- Left pane = **Model Explorer** scoped to `memo::*` namespace tree; expand to ontology kinds + project usages.
- Centre pane = **SysML source editor** (Monaco + Langium LSP). Authoritative; this is where elements are born.
- Optional **split inline preview** (toggle) — auto-tree of the file's top-level part. Read-only. Click element in preview → cursor jumps to source.
- Right pane = **Properties** for selected element (form editor that emits SysML edits — equivalent power, lower barrier for non-coders).
- Decorators panel — current B6 ConsistencyRule status for selected element; click → jump to rule definition.
- Bottom bar = **continuous compile status** (Langium LSP, debounced ~200 ms — like a code editor for code).
- "+ add part" wizard scaffolds a usage from any def reachable by name search.
- "+ import .sysml" drops a file into project tree; loader picks it up.

**Forbidden in this tab:** view-rendering controls, document-emission controls, tool dialogs. Keeping the tab pure makes the modelling job obvious.

### 8.2 Tab 2 — 🎨 Diagramming (Miro-like, view-driven)

**Purpose.** **One diagram = one `DiagramView` SysML part = one rendered visual**. Authors browse a catalog of available views, open one, and edit the underlying SysML view file plus the rendered visual side-by-side. Layout-only changes don't mutate the source ontology — they live in the view file.

```
┌────────────────────────┬───────────────────────────────────────┬────────────────────┐
│ Diagram Catalog        │   Split editor                        │  View controls     │
│  ▾ Architecture views  │  ┌─────────────────────────────────┐  │  (view-type-aware)│
│    Context BDD         │  │  Visual canvas (Miro-style)     │  │                  │
│    Logical BDD         │  │  pan / zoom / lasso             │  │  for BDD:         │
│    Logical IBD         │  │                                 │  │   palette: parts  │
│    Software BDD        │  │  [drag · drop · wire]           │  │   composition →   │
│  ▾ Risk views          │  │                                 │  │   layout: ELK     │
│    Risk Matrix [tbl]   │  └─────────────────────────────────┘  │                  │
│    Bowtie               │  ─── split (drag divider) ──────────  │  for IBD:         │
│    Fault Tree          │  ┌─────────────────────────────────┐  │   port wiring     │
│    Residual Heatmap    │  │  SysML view source              │  │   interface lib   │
│  ▾ Security views      │  │  package memo::profile::views…{│  │                  │
│  ▾ DHF views           │  │    view def riskMatrixView : …  │  │  for matrix:      │
│  + create view         │  │       expose memo::projects::**│  │   row/col picker  │
│  ▸ user views          │  │       filter @hazard            │  │   cell formatter  │
│                        │  │  }                              │  │   row/col freeze  │
│  search: ____________  │  └─────────────────────────────────┘  │                  │
│  filter: viewpoint ▾   │  bidirectional sync (text ↔ visual)   │  for bowtie:      │
│                        │                                       │   cause column    │
│                        │                                       │   threat column   │
│                        │                                       │   mitigation slot │
└────────────────────────┴───────────────────────────────────────┴────────────────────┘
   Bottom bar:  [ render plan: matrix ]  [ rule decorators: 2 warnings ]  [ export ▾ ]
```

**Behaviour:**
- Left = **Diagram Catalog**. Lists every `DiagramView` and `DocumentBackedView` part visible in the active project's resolved namespace. Tree grouped by viewpoint (context / risk / security / privacy / clinical / dhf / user). Filter by `Viewpoint.stage`. Search by id/name/doc. Built-in views from `memo::profile::views::*`; user-authored views (under `memo::projects::<id>::views::*` or `ontology/<vendor>/views/*`) appear in their own group.
- "+ create view" wizard — prompts: `diagramType` (bdd / ibd / afd / matrix / table / tree / bowtie / fta / stpa / heatmap / pkg), source viewpoint, selection query — generates a new `.sysml` view file under the project's view dir. View immediately appears in catalog.
- Centre = **split editor**. Top: Miro-style visual canvas (ReactFlow + ELK; pan, zoom, lasso, drag, wire). Bottom: SysML source for that view file (Monaco). Drag the divider; either pane can be hidden. **Bidirectional sync:** edits in either pane re-render the other. Source is authoritative on conflict (last save wins, reconciler diff-merges). Deterministic layout (B9) means visual edits that mutate layout-only attributes write back to the view file's `layoutHint`/`styleHint` attributes — no other ontology data touched.
- When `diagramType ∈ { matrix, table }`, canvas renders as a **table** (rows × cols) with appropriate cell formatters (severity → colour gradient, count → bar). Same split-edit pattern; SysML view source is the truth.
- Right = **view controls**, **scoped to active view's diagramType**. Different palette per type:
  - `bdd` → part / item palette filtered by `Viewpoint.allowedElementKinds`; composition-edge tool.
  - `ibd` → port + interface palette; conjugation toggle; flow declaration helper.
  - `matrix` → row-axis / col-axis pickers (element kind), cell expression editor.
  - `bowtie` → "left causes / right consequences / centre hazard / barriers" form.
  - `fta` → gate-type buttons (AND, OR, NOT), event-type buttons (basic, intermediate, top).
  - `stpa` → controller / controlled-process slots, control-action / feedback link tool.
  - `heatmap` → severity × probability axis configuration, residual-vs-initial overlay toggle.
  - `tree` → hierarchy-edge tool, depth limit slider.
- Bottom bar = render plan + rule decorators + export menu (svg/png/csv/html/json).
- **No element creation in this tab** — only view authoring. New parts? Switch to Architecture tab. This separation is the usability win.

### 8.3 Tab 3 — 📄 DHF (document-bundle assembly)

**Purpose.** Assemble regulatory document bundles from descriptors. Each document = a `DocumentBackedView` SysML part with a prepopulated template. Organise by product when the workspace ships multiple devices.

```
┌─────────────────────┬────────────────────────────────────────────┬────────────────┐
│ Product Selector    │   Document Workspace                       │  Section index │
│  ▾ Pump family      │   ┌───────────────────────────────────────┐│  1 Scope       │
│    ▸ infusion-pump   │   │   Risk Management File (ISO 14971)   ││  2 Plan        │
│    ▸ irrigation-pump│   │   v0.3 · draft · last build 2 min ago ││  3 Hazards     │
│  ▾ Monitoring       │   │                                       ││  4 Analysis    │
│    ▸ vital-monitor  │   │  [section-by-section preview, edit]   ││  5 Controls    │
│  + add product       │   │                                       ││  6 Residual    │
│                     │   │   pulled-in views:                    ││  7 BR Eval     │
│  Document Catalog   │   │     · Risk Matrix (live)              ││  8 Approvals   │
│  + add document ▾   │   │     · Hazard Bowtie (live)            ││                │
│   ┌──────────────┐  │   │     · Residual Heatmap (live)         ││  Status:       │
│   │ Risk Mgmt    │  │   │   linked artefacts:                   ││   blocker: 0   │
│   │ Software DD  │  │   │     · DesignReview-2026-04-10         ││   error:   0   │
│   │ Clin Eval    │  │   │     · CAPA-2025-117 (closed)          ││   warning: 1  │
│   │ Cybersec     │  │   │                                       ││                │
│   │ DPIA         │  │   └───────────────────────────────────────┘│  [ build PDF ] │
│   │ DHF          │  │   tabs:  [ Outline ][ Live preview ]       │  [ build MD  ] │
│   │ + custom     │  │         [ Source view ][ History ]         │  [ stamp v0.4 ]│
│   └──────────────┘  │                                            │                │
└─────────────────────┴────────────────────────────────────────────┴────────────────┘
```

**Behaviour:**
- Left top = **Product Selector** when project tree contains `memo::projects::*` siblings (multi-device workspace). Switching product re-scopes loaded namespace — same UI, different data.
- Left bottom = **Document Catalog**. "Add Document" opens picker listing every `DocumentBackedView def` reachable in `memo::process::methodology::dhf::templates::*` (Risk Mgmt File, Software Design Description, Clinical Evaluation Report, Cybersecurity Risk Assessment, Data Protection Impact Assessment, Design History File, plus user-authored templates). Click → instantiates `<doc> : <Template> { … }` part in `projects/<id>/dhf/<doc>.sysml` with template defaults (sections, viewpoint refs, expected artefacts). Document appears in workspace.
- Centre = **Document Workspace**. Section-by-section editable preview with **live-pulled views** (matrix renderings inline, bowties inline, heatmaps inline) + **linked artefact list** (DesignReviews, CAPAs, ChangeRequests). Authors edit narrative cells; non-narrative cells (rendered views, computed tables, signatures) are read-only — generated by B11 every render. Tabs across the top: Outline · Live preview · Source view (raw SysML) · History (version stamps, hashes).
- Right = **Section index** (jump-to-anchor) + **gate status** (counts of blocker / error / warning ConsistencyRules engaged at `release_gate`) + **build buttons**.
- "build PDF/MD" calls B11/B12 with template + active project model. Output written to `projects/<id>/dhf/out/`. Each build stamps `version`, `lifecycleState`, source-SysML hash on every section.
- "stamp v0.4" advances `lifecycleState` per gate rules (C7 must pass; B6 enforces).

**Templates are SysML.** Each prepopulated template is a `DocumentBackedView def` with predefined `selectionQuery[*]`, `documentUsage[*]`, expected sections (as nested `DocumentSection` parts), and required `regulatoryRef[*]`. Adding a new template = author a new `.sysml` template file + drop in `memo::process::methodology::dhf::templates::*`. Auto-discovered.

### 8.4 Tab 4 — 🛠 Tools (analyses + workflows in a grid)

**Purpose.** Anything that is not "model" or "diagram" or "document" lives here. Dedicated entry points for analyses and bulk workflows that have non-trivial parameter forms.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Tools  (grid view — group: All · Analysis · Imports · Quality · Migration)      │
│                                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ DSM Analysis │ │ FMEA Builder │ │ Trace Matrix │ │ Coverage Map │  ANALYSIS   │
│  │  cluster &   │ │  hazard →    │ │  any kind ×  │ │  by standard │             │
│  │  partition   │ │  failure     │ │  any kind    │ │              │             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Consistency  │ │ Lint Runner  │ │ Diff Viewer  │ │ Impact Anal. │  QUALITY    │
│  │ Checker (C1– │ │ (R-rules +   │ │  baseline →  │ │  rule change │             │
│  │  C9 dashboard)│ │  FB-rules)   │ │  current     │ │  blast radius│             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ SBOM Importer│ │ FMEA Importer│ │ FIBO/FIBO-x  │ │ EA → memo    │  IMPORTS    │
│  │  CycloneDX   │ │  Excel CSV   │ │  Library     │ │  EA QEA      │             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Risk Calc    │ │ Rule Explain │ │ Namespace    │ │ Plugin Mgr   │  MIGRATION  │
│  │  ALARP eval  │ │  (regulatory │ │  Codemod     │ │  install /   │  / ADMIN    │
│  │              │ │   trace)     │ │  md → memo   │ │  remove      │             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                                  │
│  + register custom tool                                              search: ___ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Tools are **first-class registry entries** under `memo::profile::tools::*` (new namespace). Each tool = a SysML `part def Tool { attribute kind, parametersSchema, viewKind, regulatoryRef[*] }`. Catalog auto-discovers.
- Click a tool → opens **tool drawer** with that tool's parameter form (driven by `parametersSchema`), a "run" action, and a result region. Result region uses **Renderer Dispatcher (B8)** to display in whatever view kind the tool prefers (DSM → matrix; Coverage → table-with-decorators; Diff → side-by-side tree).
- Tools are stateless invocations on the model — output may be rendered as a transient view, or saved as a new permanent view in `memo::projects::<id>::views::*`.
- **Custom tools.** "+ register custom tool" = drop a `<Tool>.sysml` declaration + (optional) a renderer plugin (`<Tool>.tool.ts`) in `apps/web/plugins/`. Plugin registry (see ADR-1-26) loads at startup. No recompile of `apps/web` core.

### 8.5 Cross-tab invariants

| Invariant | Why it matters |
|---|---|
| **Source of truth = SysML AST.** Tabs 1/2/3/4 all read/write through `apps/core` (B3/B4). UI never holds parallel state. | If user edits in Tab 1, every other tab's open view re-renders within 200 ms. |
| **Continuous compile.** Langium LSP runs on every keystroke (debounced). Errors surface in Tab-1 bottom bar, render-decorator dots in Tab-2 catalog, gate-status in Tab-3 right pane, "rules failed" badges in Tab-4 cards. Same way IDEs surface compile errors across editor / problems panel / file tree. | Saves vs. compile-on-build cycles; keeps users honest about model validity. |
| **Per-tab WS subscription.** Each tab subscribes to a slice (Tab 1 = current file's element tree; Tab 2 = current view + its slice; Tab 3 = current document's sections + linked artefacts; Tab 4 = on-demand only). Reduces re-render storm. | See architect critique §18 #2. |
| **No tab owns mutation.** UI emits commands; B3/B4 mutate model. Both succeed: every tab re-derives. Both fail: tab shows error, no rollback dance. | Keeps tabs simple. |
| **One CLI command per UI action** (rule §9). | Tabs are convenience over the ontology + compiler; the compiler is the product. |

### 8.6 Tab membership by `Viewpoint.stage` (Tab 2 catalog grouping)

| Stage (`WorkflowStageKind`) | Tab 2 catalog group |
|---|---|
| `context`, `requirements`, `architecture`, `interfaces`, `behavior` | Architecture views |
| `risk` | Risk views |
| `cybersecurity` | Security views |
| `privacy` | Privacy views |
| `verification`, `evidence` | Verification views |
| `clinical` | Clinical views |
| `documents` | DHF views |
| `user` (extension) | User views |

(Different from earlier 3-tab plan: tab is no longer chosen by stage — the **catalog grouping inside Tab 2** is.)

### 8.7 Extensibility surface (top-3 quality attribute)

| Extension type | Mechanism | Tab affected |
|---|---|---|
| User ontology layer | `ontology/<vendor>/<area>.sysml` declares `package memo::ext::<vendor>::<area>` (or any namespace under `memo::ext::`); B4 loader picks it up at load | Tab 1 (Model Explorer shows it); Tab 2 (palette includes any `part def` it adds) |
| User viewpoint | `.sysml` file with `part : Viewpoint`; B5 indexes | Tab 2 (catalog filter) |
| User view (= one diagram) | `.sysml` file with `part : DiagramView`; B5 indexes; B8 dispatches by `diagramType` | Tab 2 (catalog entry, one diagram per file) |
| User document template | `.sysml` file with `part def : DocumentBackedView` carrying section structure | Tab 3 (Add Document picker) |
| User tool | `.sysml` declaration `part : Tool` + (optional) `<Tool>.tool.ts` UI plugin | Tab 4 (grid card) |
| User ConsistencyRule | `.sysml` part `: ConsistencyRule` (see §14) | Tab 4 (Consistency Checker), bottom-bar badges, gate status |

No core code change for any of the above. **Drop file → restart `memo dev` → it appears.** Plugin manager (Tab 4 → Plugin Mgr) lists what's installed and provides remove/update.

### 8.8 Feature flags + modular feature loading (ADR-1-29)

**Why.** Three-wave release sequence (see `execution-plan.md`): Wave 1 ships ontology (`.kpar`) for SysON/SysIDE; Wave 2 ships CLI; Wave 3 ships web tool. Each web feature must ship independently behind a flag so the web app can land Tab 1 in week 1, Tab 2 in week 4, a single tool in week 6, etc., without merging unfinished UI into the main bundle.

**Design.** Every web feature is a **module** declared by a SysML `Module` part **and** a TypeScript registration. Module manifest in SysML; runtime code in `apps/web/src/features/<id>/`. Loader pulls only modules whose flag is on.

#### 8.8.1 Module manifest (SysML)

```sysml
// ontology/memo-base/profile/modules/<id>.sysml
package memo::profile::modules::<id> {
    private import memo::profile::modules::core::*;

    part <id>Module : FeatureModule {
        attribute id              = "<id>";
        attribute name            = "Human-readable";
        attribute flag            = "VITE_FEATURE_<ID_UPPER>";
        attribute defaultEnabled  = false;
        attribute releaseStage    = ReleaseStageKind::beta;   // alpha | beta | ga | deprecated
        attribute owns            = { /* tabs, tools, renderers, routes provided */ };
        attribute requires        = { /* other modules this depends on */ };
        attribute regulatoryRef   = { /* clauses this enables */ };
        attribute since           = "0.4.0";
    }
}
```

`memo::profile::modules::core` defines:
```sysml
part def FeatureModule :> DocumentedElement {
    attribute id              : String [1..1];
    attribute flag            : String [1..1];   // env var name
    attribute defaultEnabled  : Boolean [1..1];
    attribute releaseStage    : ReleaseStageKind [1..1];
    attribute owns            : String [*];      // FQNs of contributed elements
    attribute requires        : String [*];      // module ids
    attribute since           : String [1..1];   // semver of first ship
}
```

#### 8.8.2 Module registration (TypeScript)

```ts
// apps/web/src/features/diagramming/module.ts
import type { WebFeatureModule } from '@memo/web-module-api';

export const diagrammingModule: WebFeatureModule = {
    id: 'diagramming',
    flag: 'VITE_FEATURE_DIAGRAMMING',
    defaultEnabled: false,
    routes: [{ path: '/diagramming', component: () => import('./DiagrammingTab') }],
    tabs: [{ id: 'diagramming', label: '🎨 Diagramming', icon: 'palette', order: 20 }],
    renderers: [],   // diagramType modules registered separately under features/renderers/*
    tools: [],
};
```

`apps/web/src/shell/feature-loader.ts` reads every `features/*/module.ts`, checks each module's `flag` against `import.meta.env`, and registers only enabled ones.

#### 8.8.3 Module taxonomy

```
apps/web/src/features/
├── shell/                  ← always-on; top bar, layout, WS bridge
├── architecture/           ← Tab 1 (SysON-like editor) — ships GA in Wave 3 v0
├── diagramming/            ← Tab 2 (Miro split-edit) — ships behind VITE_FEATURE_DIAGRAMMING
├── dhf/                    ← Tab 3 (document workspace) — flag VITE_FEATURE_DHF
├── tools/                  ← Tab 4 (tool grid shell) — flag VITE_FEATURE_TOOLS
├── renderers/              ← per-diagramType bundles; each its own flag
│   ├── bdd/                  VITE_FEATURE_RENDERER_BDD          (default ON)
│   ├── ibd/                  VITE_FEATURE_RENDERER_IBD          (flag, P7 lands first)
│   ├── matrix/               VITE_FEATURE_RENDERER_MATRIX
│   ├── bowtie/               VITE_FEATURE_RENDERER_BOWTIE
│   ├── fta/                  VITE_FEATURE_RENDERER_FTA
│   ├── stpa/                 VITE_FEATURE_RENDERER_STPA
│   ├── heatmap/              VITE_FEATURE_RENDERER_HEATMAP
│   ├── tree/                 VITE_FEATURE_RENDERER_TREE
│   ├── table/                VITE_FEATURE_RENDERER_TABLE
│   └── …                    one folder per renderer
├── tools/                  ← per-tool bundles
│   ├── dsm/                  VITE_FEATURE_TOOL_DSM
│   ├── fmea/                 VITE_FEATURE_TOOL_FMEA
│   ├── trace-matrix/         VITE_FEATURE_TOOL_TRACE
│   ├── coverage-map/         VITE_FEATURE_TOOL_COVERAGE
│   ├── consistency-checker/  VITE_FEATURE_TOOL_CONSISTENCY
│   ├── lint-runner/          VITE_FEATURE_TOOL_LINT
│   ├── diff-viewer/          VITE_FEATURE_TOOL_DIFF
│   ├── impact-analyzer/      VITE_FEATURE_TOOL_IMPACT
│   ├── sbom-importer/        VITE_FEATURE_TOOL_SBOM
│   ├── fmea-importer/        VITE_FEATURE_TOOL_FMEA_IMPORT
│   ├── fibo-library/         VITE_FEATURE_TOOL_FIBO
│   ├── ea-importer/          VITE_FEATURE_TOOL_EA_IMPORT
│   ├── risk-calc/            VITE_FEATURE_TOOL_RISK_CALC
│   ├── rule-explainer/       VITE_FEATURE_TOOL_RULE_EXPLAIN
│   ├── namespace-codemod/    VITE_FEATURE_TOOL_CODEMOD
│   └── plugin-manager/       VITE_FEATURE_TOOL_PLUGIN_MGR
└── workbenches/            ← P-MEDWB
    ├── usability-cockpit/    VITE_FEATURE_WB_USABILITY
    ├── risk-workbench/       VITE_FEATURE_WB_RISK
    ├── software-workbench/   VITE_FEATURE_WB_SOFTWARE
    └── evidence-linking/     VITE_FEATURE_WB_EVIDENCE
```

Each module is a **separate bundle** (Vite dynamic import). Disabled = not downloaded. `architecture/`, `shell/`, and `renderers/bdd/` ship enabled-by-default in Wave 3 v0.

#### 8.8.4 Where flags resolve

Three sources, last wins:
1. **Build-time** — `import.meta.env.VITE_FEATURE_<NAME>` set in `.env.<stage>` (`.env.alpha`, `.env.beta`, `.env.ga`).
2. **Workspace** — `memo.config.yaml` `features: { diagramming: true, fta: false }` (per-project override). Loaded via WS at startup.
3. **Runtime user toggle** — Tab 4 → Plugin Manager → "Lab features" panel. Stored in localStorage. Last wins. Disabled defaults: greyed-out tab labels with "Coming in v0.5" tooltip, never throws.

Resolution order documented in `apps/web/src/shell/feature-loader.ts`. Telemetry (B15 Diagnostics) records which features each session uses → drives release-promotion decisions (alpha → beta → ga).

#### 8.8.5 Backwards compatibility

A disabled module's contributions (renderers, tools, tabs) **must be silently absent** — never throw, never break navigation. Catalog and grid filter to enabled modules. Every renderer call goes through the dispatcher (B8); unknown `diagramType` → fallback "renderer not enabled" placeholder card with link to enable.

#### 8.8.6 SysML registry side

Same `FeatureModule` SysML parts feed CLI (`memo features list`, `memo features enable <id>`, `memo features disable <id>`) so feature flags are versioned alongside ontology — projects pinned to `memo-base@1.2` get the feature manifest of that version.

### 8.9 New ADRs

**ADR-1-26 — Four-tab UI:** Architecture, Diagramming, DHF, Tools. Replaces 3-tab proposal.
**ADR-1-27 — Tab 2 split-edit** (visual ↕ SysML view source, bidirectional sync).
**ADR-1-28 — Drop-file extensibility** (`memo::ext::<vendor>::*` auto-registers).
**ADR-1-29 — Feature flags + modular feature loading** (this section). Drivers: incremental web release, three-wave shipping, per-renderer/per-tool flag granularity.

---

## 9. Miro-like diagramming engine for SysML v2 (Tab 2 detailed)

**Why this section.** Tab 2 (§8.2) said "Miro-like split-edit" in one paragraph. That's not enough to build. This section specifies the diagramming engine that powers Tab 2, drawing on **Eclipse SysON** (general view + interconnection view, Sirius Web) and **Tom Sawyer Perspectives** (graph layout + large-model perf), then layering Miro-class user-experience patterns (infinite canvas, sticky notes, frames, freehand, snap-to-grid, mini-map, multi-cursor) on top.

**Reference baseline:**
- **SysON** — General View renders any SysML v2 elements as graph; Interconnection View renders parts + ports + connections (= IBD). Built on Sirius Web (nodes/edges, palette, auto-layout, pin/unpin, helper lines, SVG export, customisable tools per element/background, GraphQL+WS). 8-week release cycle. Capella interop target. Customisable via SysML v2 libraries.
- **Tom Sawyer** — graph layout suite: hierarchical, orthogonal, circular, symmetric, tree, force-directed. Drill-down. Multiple integrated views over the same data. Large-graph performance (incremental layout, view culling).
- **Miro** UX patterns — infinite zoomable canvas, sticky-notes, freehand pen, frames/sections, comments, real-time cursors, slash-command quick-add, keyboard navigation, copy/paste between boards, image embed, mini-map, presentation mode.

MEMO blends all three: **SysON's SysML v2 fluency + Tom Sawyer's layout + Miro's spatial freedom and collaboration UX**.

### 9.1 Engine block decomposition

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  apps/web/src/features/diagramming/engine/                                     │
│                                                                                │
│   ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────────────┐ │
│   │ E1 CanvasCore      │  │ E2 NodeRegistry    │  │ E3 EdgeRouter          │ │
│   │ pan / zoom / lasso │  │ per-kind renderer  │  │ orthogonal · bezier ·  │ │
│   │ multi-select       │  │ per-diagramType    │  │ smoothstep · port-aware│ │
│   │ snap · grid · ruler│  │ shape library      │  │ obstacle avoidance     │ │
│   │ mini-map · viewport│  │ port slots         │  │ bend-point editor      │ │
│   └─────────┬──────────┘  └──────────┬─────────┘  └────────────┬────────────┘ │
│             │                        │                          │              │
│             └─────────┬──────────────┴──────────────┬──────────┘              │
│                       ▼                              ▼                         │
│   ┌────────────────────────────┐    ┌──────────────────────────────────────┐  │
│   │ E4 LayoutEngine            │    │ E5 SelectionModel                    │  │
│   │ ELK incremental + manual   │    │ marquee · group · alignment guides   │  │
│   │ pin/unpin · per-node       │    │ keyboard nav · clipboard             │  │
│   │ "Tom Sawyer mix": hier ·   │    └──────────────────────────────────────┘  │
│   │  orthogonal · circular ·   │                                               │
│   │  force · tree              │    ┌──────────────────────────────────────┐  │
│   └────────────────────────────┘    │ E6 InteractionLayer                  │  │
│                                     │ palette drag · explorer drag · slash │  │
│   ┌────────────────────────────┐    │ context menu · hotkeys · drop hooks  │  │
│   │ E7 AnnotationLayer         │    └──────────────────────────────────────┘  │
│   │ sticky notes · frames ·    │                                               │
│   │ freehand pen · arrows ·    │    ┌──────────────────────────────────────┐  │
│   │ images · text labels       │    │ E8 SyncEngine (split-edit reconciler)│  │
│   │ saved as DiagramView       │    │ visual edit  → AST diff → SysML write│  │
│   │ AnnotationGroup attribute  │    │ SysML edit   → AST diff → re-render  │  │
│   └────────────────────────────┘    │ layout-only  → layoutHint/styleHint  │  │
│                                     │ structural   → ontology source       │  │
│   ┌────────────────────────────┐    └──────────────────────────────────────┘  │
│   │ E9 ValidationOverlay       │                                               │
│   │ inline B6 decorators       │    ┌──────────────────────────────────────┐  │
│   │ red squiggles · halo       │    │ E10 CollabPresence (W3 v2)           │  │
│   │ remediationHint tooltips   │    │ Yjs CRDT · cursors · selection       │  │
│   └────────────────────────────┘    │ ghost broadcast over WS              │  │
│                                     └──────────────────────────────────────┘  │
│   ┌────────────────────────────┐    ┌──────────────────────────────────────┐  │
│   │ E11 ExportEngine           │    │ E12 CommandStack                     │  │
│   │ SVG · PNG · PDF · MD ·     │    │ undo/redo · transaction · macro      │  │
│   │ textual SysML round-trip   │    │ persisted to view file as history    │  │
│   └────────────────────────────┘    └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Block responsibilities

| # | Block | Responsibility | Built on | New code (Sonnet sessions) |
|---|---|---|---|---|
| **E1** | CanvasCore | Infinite canvas with pan, zoom (0.1×–4×), marquee select, snap-to-grid, rulers, mini-map, viewport persistence. | ReactFlow `<ReactFlow/>` + custom controls | SMIRO.1, SMIRO.2 |
| **E2** | NodeRegistry | Map `(elementKind, diagramType)` → React node component. Loaded via plugin (ADR-1-28); per-renderer modules (ADR-1-29). Each node carries `ports[]` slot definitions for IBD-style port rendering. | Plain React + drop-file plugin loader | SMIRO.3 |
| **E3** | EdgeRouter | Three modes: orthogonal (default for ports), bezier (default for non-port relationships), smoothstep (default for `succession`/`accept`). Port-aware obstacle avoidance. Bend-point editor (drag intermediate points). | ELK port routing + custom React layer | SMIRO.4 |
| **E4** | LayoutEngine | Auto-layout with **5 algorithm choices** (matching Tom Sawyer): `hierarchical` (BDD/decomposition), `orthogonal` (IBD with ports), `circular`, `force` (organic spread), `tree`. Per-element `pin/unpin`. Incremental: layout only newly-added/changed nodes; existing positions preserved. | ELK web worker (off main thread) | SMIRO.5, SMIRO.6 |
| **E5** | SelectionModel | Single, multi, marquee, group, by-kind, by-rule (e.g. "select all unmitigated hazards"). Alignment guides, distribute, smart spacing (Miro-style). Keyboard nav (arrow keys, tab, esc). Clipboard ops (cut/copy/paste/duplicate) preserving relationships and styles. | Zustand selection store | SMIRO.7 |
| **E6** | InteractionLayer | Drag from palette · drag from Model Explorer (Tab 1) · drag from search results · slash-command quick-add (`/hazard X` creates Hazard inline) · context menu · hotkeys (`B` BDD pen, `R` requirement, `M` mitigation, `?` help) · drop-hooks per node kind. | DnD-kit + custom command system | SMIRO.8, SMIRO.9 |
| **E7** | AnnotationLayer | Sticky notes (yellow/pink/green), frames/sections (group nodes; rename collapses), freehand pen (smoothing), arrows (annotations distinct from semantic edges), images (paste/drop), text labels. Saved in the `DiagramView` SysML file under `attribute annotations[*] : Annotation`. **Annotations never affect ontology semantics** — pure presentation. | tldraw / excalidraw embed; saved as JSON in view file | SMIRO.10, SMIRO.11 |
| **E8** | SyncEngine | The technical moat. Visual edit → diff against AST → categorise: **layout-only** (writes back to view file's `layoutHint`/`styleHint`/positions array) **vs structural** (writes back to source ontology in `memo::projects::*`/`memo::arch::*`). Source SysML edit → re-parse view → diff with current canvas → minimal patch (preserve user-pinned positions). Conflict policy: source wins; visual surfaces "rebased" toast. | Custom + Langium AST | SMIRO.12, SMIRO.13 |
| **E9** | ValidationOverlay | B6 ConsistencyRule decorators rendered inline: red squiggle on rule violation, yellow halo on warning, green check on satisfied required-rule. Hover → remediationHint + regulatoryRef + "jump to rule" link. | Layered SVG over canvas | SMIRO.14 |
| **E10** | CollabPresence | Multi-user cursors, selection halos, name tags. Yjs CRDT for canvas state diffs (separate from SysML — SysML is single-writer per file via WS lock). | Yjs + y-websocket | SMUL.4 (W4) |
| **E11** | ExportEngine | SVG (vector), PNG (raster, 1× / 2× / 4×), PDF (vector page), Markdown (textual + image), and **textual SysML round-trip** (re-emit the view file with current visual state). | dom-to-svg + jsPDF | SMIRO.15 |
| **E12** | CommandStack | Per-diagram undo/redo (50-step depth). Macros (record-replay batch ops). Optional history pinned to view file as `attribute history[*] : Command` for audit (hidden by default). | Immer + Zustand | SMIRO.16 |

### 9.3 Layout strategy per diagramType (matches Tom Sawyer)

| diagramType | Default layout | Manual edits |
|---|---|---|
| `bdd` | hierarchical (top-down composition tree) | drag → pin |
| `ibd` | orthogonal port-aware (Sirius's interconnection view) | port slot drag → re-route |
| `afd` | hierarchical swim-lane | swim-lane drag preserves rank |
| `decomposition` | tree | depth slider |
| `bowtie` | hand-laid 5-column (causes / barriers / hazard / barriers / consequences) | columns fixed, vertical free |
| `fta` | tree (top-down) | gate node drag preserves children |
| `stpa` | hierarchical (controllers above processes) | feedback edges always upward |
| `heatmap` | grid (severity × probability cells) | no manual move; cell clicks |
| `matrix` | table grid | no canvas move; cell editor |
| `table` | table | column reorder |
| `tree` | tree | drag-to-reparent |
| `pkg` | nested boxes | drag-to-reparent |
| `dfd` | force | trust-boundary frames preserved |

Layout chosen by `DiagramView.diagramType` lookup; user can override via "Layout" menu.

### 9.4 Split-edit reconciliation (E8 detail)

The hardest piece. Pseudo-flow:

```
USER edits canvas (drag, link, delete, rename)
   ↓
E12 CommandStack records command(s)
   ↓
E8 SyncEngine.applyCommand(cmd):
   ├─ kind ∈ { move, resize, pin, restyle }   → LAYOUT-ONLY
   │   write to memo::profile::views::…sysml: attribute layoutHint += { id, x, y, w, h }
   │   ontology source untouched
   │
   ├─ kind ∈ { addNode, removeNode, addEdge, removeEdge, rename, setAttr } → STRUCTURAL
   │   determine target file:
   │     part already in project? → write to projects/<id>/sysml/...
   │     ontology kind? → reject; surface "Switch to Tab 1 to edit ontology"
   │     view-local annotation? → write to view file under `annotations[*]`
   │
   └─ emit WS command create-element / link / set-attr
       → apps/core (B3/B4) mutates SysML AST
       → returns DTO + new layout
       → E1 re-renders only diff'd nodes (E2 reuses existing components)

USER edits SysML view source (Monaco bottom pane)
   ↓
Langium LSP debounces → re-parses
   ↓
E8 SyncEngine.onSourceChange(newAST):
   diff(currentAST, newAST) = patch
   apply patch to canvas:
     pinned positions preserved
     unpinned re-laid via E4 incremental
     selection follows id
   ↓
E1 re-renders

CONFLICT (rare; only if source edited externally during canvas edit):
   source wins. canvas state rebased. toast notifies user with "Undo last canvas edit?" option.
```

### 9.5 SysML extensions to support Miro-like view files

`memo::profile::views::core` gets new attributes (additive, backward-compatible):

```sysml
part def DiagramView :> View {
    attribute diagramType    : String [1..1];
    attribute layoutHint     : String [0..1];     // existing
    attribute styleHint      : String [0..1];     // existing
    attribute layoutAlgorithm: LayoutAlgorithmKind [0..1];   // NEW: hierarchical/orthogonal/circular/force/tree
    attribute layoutDirection: LayoutDirectionKind [0..1];   // NEW: TB/LR/BT/RL
    attribute viewport       : Viewport [0..1];              // NEW: persisted pan + zoom
    attribute positions      : NodePosition [*];             // NEW: per-element x/y/w/h/pinned
    attribute annotations    : Annotation [*];               // NEW: sticky notes, frames, pen, images, arrows
    attribute history        : CanvasCommand [*];            // NEW: optional audit trail
}

item def Viewport       { attribute zoom: Real; attribute centerX: Real; attribute centerY: Real; }
item def NodePosition   { attribute elementId: String; attribute x: Real; attribute y: Real; attribute w: Real; attribute h: Real; attribute pinned: Boolean; }
item def Annotation     { attribute kind: AnnotationKind; /* sticky | frame | pen | arrow | image | text */
                          attribute geometry: String; attribute payload: String; attribute author: String; attribute createdAt: String; }
item def CanvasCommand  { attribute timestamp: String; attribute author: String; attribute opKind: String; attribute payload: String; }

enum def LayoutAlgorithmKind { enum hierarchical; enum orthogonal; enum circular; enum force; enum tree; enum manual; }
enum def LayoutDirectionKind { enum TB; enum LR; enum BT; enum RL; }
enum def AnnotationKind      { enum sticky; enum frame; enum pen; enum arrow; enum image; enum text; }
```

These are pure SysML; they round-trip to SysON / SysIDE without semantic loss. Other tools simply ignore unknown attributes.

### 9.6 Toolbar layout (per-canvas, Miro-pattern)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Canvas top toolbar:                                                        │
│   ←/→ undo/redo  ·  + element  ·  ↗ link  ·  ✎ pen  ·  ▢ frame  ·  ★ sticky│
│   ⊞ grid  ·  ⌖ snap  ·  ⌗ ruler  ·  📷 mini-map  ·  layout ▾ (5 algos)     │
│   🔍 zoom · 100% · ⤢ fit · ⛶ full-screen                                    │
│   👥 collab cursors (W4)                                                    │
│                                                                             │
│  Canvas bottom-left: viewport coords + zoom %                               │
│  Canvas bottom-right: mini-map (collapsible)                                │
│  Canvas right edge: zoom slider                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.7 Performance budget (matches Tom Sawyer)

| Project size | Target | Strategy |
|---|---|---|
| 100 nodes | 60 fps pan/zoom | basic React render |
| 1 000 nodes | 30 fps pan/zoom; layout < 300 ms | virtualisation (off-viewport hidden) |
| 10 000 nodes | layout < 2 s; 30 fps | ELK web worker; quad-tree culling; LOD-rendering (simplified shapes when zoomed out) |
| 50 000 nodes | layout < 8 s; 15 fps with LOD | progressive rendering; "fish-eye" focus mode; explicit `expand` to drill down |

ELK runs in a Web Worker (E4); main thread never blocks > 16 ms.

### 9.8 Comparison with reference tools

| Capability | SysON | Tom Sawyer | Miro | MEMO Tab 2 (target) |
|---|---|---|---|---|
| SysML v2 fluency | ✓ native | partial | — | ✓ native |
| Infinite canvas | partial | partial | ✓ | ✓ |
| Auto-layout (5+ algos) | basic (Sirius) | ✓ flagship | basic | ✓ via ELK + dispatch |
| Port-aware routing | ✓ (Interconnection View) | ✓ | — | ✓ |
| Drag from palette | ✓ | ✓ | ✓ | ✓ |
| Annotations (sticky/frame/pen) | — | — | ✓ flagship | ✓ |
| Bidirectional text round-trip | ✓ | ✓ | — | ✓ flagship |
| Live multi-user cursors | — (planned) | — | ✓ | W4 |
| Mini-map | — | partial | ✓ | ✓ |
| Slash command | — | — | ✓ | ✓ |
| Keyboard-driven | partial | ✓ | partial | ✓ |
| SVG/PNG/PDF export | ✓ SVG | ✓ all | ✓ all | ✓ all |
| ConsistencyRule overlay | — (validation tab) | — | — | ✓ flagship |
| Custom shapes per kind | ✓ via Sirius | ✓ | ✓ | ✓ via plugin (ADR-1-28) |

Where MEMO leads: **bidirectional SysML round-trip + ConsistencyRule overlay** are the two SysML+regulator-aware features no general-purpose canvas has.

### 9.9 New ADRs

**ADR-1-30 — Miro-like canvas engine** with E1–E12 block decomposition, ELK in worker, ReactFlow base.
**ADR-1-31 — Annotations stored in `DiagramView` SysML** as `attribute annotations[*]` (round-tripable; non-semantic).
**ADR-1-32 — Layout-only edits write to `layoutHint`/`positions`; structural edits to source ontology.** No layout pollution of ontology.

---

## 10. CLI surface — every UI action has a command

| UI action | CLI equivalent | Block(s) |
|---|---|---|
| New project via wizard | `memo init --archetype samd --class II --profile standard` | B13, B4 |
| Open project | `memo dev` | B14 |
| View a diagram | `memo view <viewId>` | B5, B7, B9 |
| Render any DiagramView | `memo export --view <viewId> --format svg|png` | B10 |
| Render all views | `memo export --all` | B10 |
| Trace matrix | `memo matrix --rows Hazard --cols Mitigation --rel mitigates` | B7, B9 |
| Validate rules | `memo validate` | B6 |
| Add element | `memo add part --kind Hazard --name …` | writes SysML → B2/B3 reload |
| Link | `memo link --src <id> --rel mitigates --tgt <id>` | writes SysML |
| DHF build | `memo dhf build --template RMF` | B11, B12 |
| Lock ontology version | `memo lock --profile medical@1.0.0` | B4 |
| SysON/SysIDE compat | `memo check --sysml-compat` | B1 |
| Compile new view | `memo view create --kind matrix --rows X --cols Y` | writes new view file |
| Lint ontology | `memo lint --rule R1,R2,…` | B1, B4 |
| Model diff | `memo diff <a> <b>` | B3 |
| Impact of rule change | `memo impact --rule CR-MED-001` | B6 |

**Rule:** no UI feature ships without a CLI counterpart. PR template enforces.

---

## 11. Feature → block → file mapping

### 10.1 Architecture-tab features

| Feature | SysML source | Renderer | CLI |
|---|---|---|---|
| Context diagram | `memo::profile::views::arch::context_block_diagram` | BDD | `memo export --view context-bdd` |
| Logical BDD | `…views::arch::logical_architecture_bdd` | BDD-composition | `memo export --view log-bdd` |
| Logical IBD | `…views::arch::logical_architecture_ibd` | IBD-nested | `memo export --view log-ibd` |
| Software decomposition | `…views::arch::software_bdd` | tree | `memo export --view sw-tree` |
| Hardware BOM | `…views::arch::hardware_bom_table` | table | `memo export --view hw-bom --format csv` |
| Package tree | auto from `PackageRegistry` | pkg | `memo export --view pkg-tree` |
| Action flow | `…views::arch::action_flow_view` | AFD | `memo export --view afd` |
| Requirement table | `…views::arch::req_table` | table | `memo export --view req-table --format csv` |

### 10.2 Process / risk / compliance features

| Feature | SysML source | Renderer | CLI |
|---|---|---|---|
| Hazard × Mitigation | `…views::risk::risk_matrix` | matrix | `memo matrix --rows Hazard --cols Mitigation --rel mitigates` |
| Risk 5×5 | `…views::risk::risk_matrix_5x5` | grid | `memo export --view risk-55` |
| Bowtie | `…views::risk::risk_bowtie` | bowtie | `memo export --view risk-bowtie` |
| Fault tree | `…views::risk::fault_tree` | FTA | `memo export --view fault-tree` |
| Residual heatmap | `…views::risk::residual_risk_heatmap` | heatmap | `memo export --view residual-risk` |
| Threat bowtie | `…views::security::threat_bowtie` | bowtie | `memo export --view threat-bowtie` |
| STPA | `…views::security::stpa_control_structure` | control structure | `memo export --view stpa` |
| Data flow | `…views::security::data_flow_diagram` | IBD + TrustBoundary | `memo export --view dfd` |
| Privacy impact | `…views::privacy::privacy_impact_matrix` | matrix | `memo export --view pia` |
| Clinical claim chain | `…views::clinical::clinical_claim_chain` | tree | `memo export --view clin-chain` |
| DHF I/O | `…views::dhf::dhf_io_matrix` | matrix | `memo export --view dhf-io` |

### 10.3 DHF / regulatory features

| DHF document | Viewpoints | Process artefacts | Renderer |
|---|---|---|---|
| Risk Management File (ISO 14971) | `riskViewpoint` | `RiskManagementPlan`, `HazardAnalysisActivity`, `ResidualRiskEvaluation`, `BenefitRiskAssessment` | B11 |
| Software Design Description (IEC 62304) | `softwareViewpoint` | `SoftwareLifecyclePlan` | B11 |
| Clinical Evaluation Report (ISO 14155) | `clinicalEvidenceViewpoint` | `ClinicalEvaluationPlan` | B11 |
| Cybersecurity Assessment (IEC 81001-5-1) | `cybersecurityViewpoint` | `ThreatModel`, `CybersecurityAssessment` | B11 |
| Privacy Impact Assessment (ISO 27701) | `privacyViewpoint` | `DPIA` | B11 |
| Design History File (ISO 13485 / 21 CFR 820) | `qmsDhfViewpoint` | `DesignInput`, `DesignOutput`, `DesignVerification`, `DesignValidation`, `DesignReview`, `CAPA` | B11 |

Each document = `DocumentBackedView` in SysML + `renderMarkdown(view, model)` adapter in B11.

---

## 12. Data flow for one rendered view

```
CLI: memo export --view risk-matrix-view
 │
 ├─▶ B4 Ontology Loader  ── ontology/memo-base/** + projects/<id>/**
 │      │
 │      ▼
 │   B1 Parser ──▶ B2 Builder ──▶ B3 Model Registry
 │                                   │
 │                                   ├─▶ B5 Methodology Registry
 │                                   │     (memo::profile::views::risk::matrix)
 │                                   ▼
 │                                B6 Rule Engine ──▶ decorators
 │                                   │
 │                                   ▼
 │                                B7 View Resolver  (selectionQuery → slice)
 │                                   │
 │                                   ▼
 │                                B8 Renderer Dispatcher  (matrix)
 │                                   │
 │                                   ▼
 │                                B9 Layout Engine  (matrix layout)
 │                                   │
 │                                   ▼
 │                                B10 Export  (HTML + CSV)
 ▼
risk-matrix-view.html + .csv
```

Web flow identical except B10 replaced by React render of the layout plan, streamed over WebSocket.

---

## 13. Phased execution plan

| Phase | Scope | ADR |
|---|---|---|
| **P0 — Physical separation** | `packages/{core,cli,web}` → `apps/{core,cli,web}`; `packages/{ontology-arch,ontology-process,medical-modeling-profile}` → `ontology/memo-base/...`; `examples/*` → `projects/*`. Update workspace + tsconfig + docs. | ADR-1-17 |
| **P1 — Namespace migration** | `md::*` → `memo::*` across all SysML, with codemod. Re-export shim during migration; remove in P5. | ADR-1-11 |
| **P2 — Feedback-style core ontology** | `memo::core::common`, `memo::core::enumerations`, `memo::core::relationships` ported from feedback. Move `ontology-arch/sysml/` into `memo::arch::*`. Move process into `memo::process::*`. | — |
| **P3 — Viewpoints and Views as SysML** | `memo::profile::viewpoints::core` + `memo::profile::views::core` part defs. Migrate `memo.viewpoints.yaml` → SysML viewpoints. One `.sysml` per diagram under `memo::profile::views::*`. B5 reads SysML, not YAML. | ADR-1-12 |
| **P4 — Renderer Dispatcher** | B8 dispatches on `diagramType`. Wire existing layouts behind the dispatcher. B10 ships headless export. CLI `memo export --view <id>` and `--all`. | ADR-1-14 |
| **P5 — Four-tab UI** | Collapse 6 modes → 🏗 Architecture · 🎨 Diagramming · 📄 DHF · 🛠 Tools (§8). Tab 1 SysON-like SysML editor with live LSP compile. Tab 2 Miro-like split-edit (visual + SysML view source) with view-type-aware controls. Tab 3 product-organised document workspace with prepopulated templates. Tab 4 tool grid with parametersSchema-driven drawer. Drop-file extensibility for ontology / viewpoint / view / template / tool / rule (ADR-1-28). | ADR-1-26, ADR-1-27, ADR-1-28 |
| **P6 — Rules and decorators from SysML** | `ViewRule` parts replace `memo.rules.yaml`. Removed YAML rules in this phase. | ADR-1-13 |
| **P7 — Ports + Interfaces + IBD** | Grammar: `port def`, `interface def`. Model: `owner`, `ownedPorts`, `portSpec`, `sourcePortId`, `targetPortId`. SysON/SysIDE round-trip enforced. | ADR-1-18 |
| **P8 — Medical-specific renderers** | Bowtie, FTA, STPA, 5×5, residual heatmap, benefit-risk bar, SW safety class tree, clinical claim chain, PIA matrix, DHF I/O matrix, essential performance list, IFU map. One renderer + one view + one test each. | — |
| **P9 — DHF compiler on descriptors** | B11 walks `memo::process::*` + viewpoint output. One adapter per `DocumentViewKind`. Retire custom per-document queries. | ADR-1-15 |
| **P10 — Methodology templates** | Archetypes as `DocumentedElement` parts in `memo::process::methodology::profiles`. `memo init` reads archetype → scaffolds sysml + config + DHF skeleton + viewpoints + closure rules. | — |
| **P11 — CLI parity audit** | Every UI action audited; gaps filled. UI → WebSocket only; never mutates filesystem. | ADR-1-16 |

---

## 14. ADR catalogue

| ADR | Title | Status |
|---|---|---|
| ADR-1-1 | Monorepo with Turborepo + pnpm | Accepted |
| ADR-1-2 | Langium for SysML grammar | Accepted |
| ADR-1-3 | ELK.js for layout | Accepted |
| ADR-1-4 | Zustand for store | Accepted |
| ADR-1-5 | Tailwind v4 + design tokens | Accepted |
| ADR-1-6 | Three-tier ontology split (`core`, `medical`, `profile`) | Superseded by ADR-1-10 |
| ADR-1-7 | Apollo-11 directory = layer | Accepted |
| ADR-1-8 | Two-format config contract (`memo.config.yaml` vs `memo.package.yaml`) | Accepted |
| ADR-1-9 | Two-repo split (`memo-base` + `memo-architect`, git subtree) | Accepted |
| ADR-1-10 | Collapse 9 ontology packages → `ontology-arch` + `ontology-process` | Accepted |
| **ADR-1-11** | **`memo::` namespace replaces `md::`** | **Proposed (P1)** |
| **ADR-1-12** | **Viewpoints and Views are SysML, not YAML** | **Proposed (P3)** |
| **ADR-1-13** | **`ViewRule` SysML parts replace `memo.rules.yaml`** | **Proposed (P6)** |
| **ADR-1-14** | **Renderer Dispatcher (B8) — one descriptor → one diagram** | **Proposed (P4)** |
| **ADR-1-15** | **DHF compiler is descriptor-driven (`DocumentBackedView`)** | **Proposed (P9)** |
| **ADR-1-16** | **CLI parity rule — no UI feature without CLI** | **Proposed (P11)** |
| **ADR-1-17** | **Three-directory split: `apps/`, `ontology/`, `projects/`** | **Proposed (P0)** |
| **ADR-1-18** | **Pure OMG SysML v2 round-trip with SysON / SysIDE** | **Proposed (P7)** |

ADR-1-19 to ADR-1-24 — see `sysmlv2-rulebook.md` §22.17 (FiBO-derived: Sysand `.project.json`, `.kpar` ship, CI-aggregator pattern, part/item reclassification, Method+Syntax Steward review, generated structure docs).

| ADR | Title | Status |
|---|---|---|
| **ADR-1-25** | **`ConsistencyRule` taxonomy (9 classes), all SysML, all alongside ontology** | **Proposed (P6)** |
| **ADR-1-26** | **Four-tab UI: Architecture · Diagramming · DHF · Tools — replaces 3-tab plan** | **Proposed (UI redesign phase)** |
| **ADR-1-27** | **Tab 2 split-edit: visual canvas + SysML view source, bidirectional sync** | **Proposed (UI redesign phase)** |
| **ADR-1-28** | **Drop-file extensibility: user ontologies/viewpoints/views/templates/tools/rules auto-register; no recompile** | **Proposed (P5)** |
| **ADR-1-29** | **Feature flags + modular feature loading — three-wave release (ontology → CLI → web), per-feature module bundles, per-flag enable** | **Proposed (W3)** |
| **ADR-1-30** | **Miro-like canvas engine (E1–E12) — ReactFlow + ELK in worker; SysON + Tom Sawyer + Miro pattern blend** | **Proposed (W3.P-MIRO)** |
| **ADR-1-31** | **Annotations stored in `DiagramView` SysML as `attribute annotations[*]` — round-tripable, non-semantic** | **Proposed (W3.P-MIRO)** |
| **ADR-1-32** | **Layout-only edits → `layoutHint`/`positions`; structural edits → ontology source. No layout pollution of ontology** | **Proposed (W3.P-MIRO)** |

---

## 15. Consistency rules — placed alongside ontology

**Why this section exists.** The plan elsewhere talks about "closure rules" as one of many things the Rule Engine (B6) evaluates. Reality: closure rules are the smallest of nine classes of consistency obligation MEMO must enforce. **All nine classes live in SysML alongside the ontology, not in app code.** Same principle as FB15 (ontology-as-data) — if the rule is about the model, it lives with the model.

### 14.1 Nine rule classes

| Class | What it checks | Example | Where it lives | SysML form |
|---|---|---|---|---|
| **C1 Structural closure** | Every X has at least one Y | "Every Hazard has at least one Mitigation" · "Every Requirement has at least one VerificationCase" | `memo::profile::rules::structural::*` | `ConsistencyRule` part with `selectionExpression` + `minimum` |
| **C2 Coverage** | Every standard clause is addressed by ≥ 1 element | "ISO 14971 §6.3 has at least one `:> StandardClause` referent" · "Every IEC 62304 Class C unit has unit-level VerificationCase" | `memo::process::compliance::<std>::coverage::*` | `requirement def` with `require constraint` |
| **C3 Lifecycle** | Element state transitions obey gates | "Hazard cannot reach `lifecycleState::released` without DesignReview record" · "SoftwareUnit cannot reach `released` if open CAPA exists" | `memo::profile::rules::lifecycle::*` | `state def` + transition guards (SysML native) |
| **C4 Cross-layer** | Multi-layer references resolve | "If `LogicalComponent` allocated to `SoftwareUnit`, both must exist and Class must agree" · "Every `port def` consumed has a producer" | `memo::profile::rules::cross_layer::*` | `assert constraint` over registry slice |
| **C5 Quantitative** | Numeric invariants | "residualSeverity ≤ initialSeverity" · "benefitRiskScore ≥ acceptabilityThreshold" · "exposureFrequency ∈ [0,1]" | `memo::core::constraints::*` (reusable) + applied per-element with `assert constraint` | `constraint def` + `assert constraint <name> : <Def> { in … = …; }` |
| **C6 Document** | DHF integrity | "DHF cannot release with any open CAPA" · "RMF requires HazardAnalysisActivity for every Hazard" · "PMS plan required for Class IIb+" | `memo::process::methodology::dhf::rules::*` | `requirement def` with `subject : DocumentBackedView` |
| **C7 Methodology gate** | Phase exit blocks | "Design phase exit blocked if any required clause unaddressed" · "Verification phase exit blocked if any C1 rule unsatisfied" | `memo::process::methodology::gates::*` | `state def WorkflowGate` with `transition` guards |
| **C8 Versioning / lock** | Pinned ontology version satisfies project semver | "Project pins `memo-base@^1.2`; refuse load on 2.0" | `memo::manifest::release` | `attribute compatibilityRange : SemverRange` + loader check |
| **C9 Stakeholder / audience** | Every Concern has typed stakeholder; every viewpoint has audience | "Concern frames ≥ 1 stakeholder of `AudienceKind`" | `memo::profile::rules::audience::*` | `require constraint` inside `concern { … }` |

### 14.2 Common kind: `ConsistencyRule`

Add to `memo::profile::viewpoints::core` (next to `ViewRule`):

```sysml
package memo::profile::viewpoints::core {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

    enum def RuleCategoryKind {
        enum structural;
        enum coverage;
        enum lifecycle;
        enum crossLayer;
        enum quantitative;
        enum document;
        enum gate;
        enum versioning;
        enum audience;
    }

    enum def RuleSeverityKind {
        enum advisory;       // decorator only
        enum warning;        // CI yellow
        enum error;          // CI fail
        enum blocker;        // gate cannot transition
    }

    part def ConsistencyRule specializes ViewRule {
        attribute category          : RuleCategoryKind  [1..1];
        attribute severity          : RuleSeverityKind  [1..1];
        attribute scope             : String[*];        // element kinds rule applies to
        attribute selectionExpression : String [0..1];  // declarative pattern
        attribute formalConstraintRef : String [0..1];  // FQN of `constraint def` to evaluate
        attribute minimumCount      : Integer [0..1];   // for "at least N" rules
        attribute maximumCount      : Integer [0..1];   // for "at most N" rules
        attribute appliesAtGate     : String [0..*];    // gate IDs that block on this rule
        attribute remediationHint   : String [0..1];   // what authors should do
        attribute regulatoryRef     : String [0..*];    // ISO/IEC clauses driving the rule
    }
}
```

Every consistency rule is a `part <id> : ConsistencyRule { … }`. Renderer Dispatcher (B8) gets a new view kind `RulesDashboardView` that lists all rules + status per project.

### 14.3 Where each class lives — namespace map

```
ontology/memo-base/profile/rules/
├── MEMO_PROFILE_Rules.sysml                 ← CI aggregator (FB1)
├── structural/                              ← C1
│   ├── hazards.sysml          (Hazard ⇒ ≥1 Mitigation, ≥1 Harm, ≥1 HazardousSituation)
│   ├── requirements.sysml     (Requirement ⇒ ≥1 VerificationCase, ≥1 satisfy link)
│   ├── mitigations.sysml      (Mitigation ⇒ ≥1 Hazard back-link, ≥1 verification)
│   ├── threats.sysml          (Threat ⇒ ≥1 CyberMitigation, ≥1 Asset)
│   └── interfaces.sysml       (port producer ⇒ ≥1 consumer)
├── lifecycle/                                ← C3
│   ├── hazard_lifecycle.sysml
│   ├── requirement_lifecycle.sysml
│   └── software_unit_lifecycle.sysml
├── cross_layer/                              ← C4
│   ├── allocation_resolution.sysml
│   ├── interface_consistency.sysml
│   └── safety_class_propagation.sysml        (Function class C ⇒ all units class ≥ B)
├── quantitative/                             ← C5 (rule defs; constraint defs in memo::core::constraints)
│   ├── risk_score_monotonic.sysml            (residualSeverity ≤ initialSeverity)
│   ├── benefit_risk_threshold.sysml
│   └── probability_in_range.sysml
├── audience/                                 ← C9
│   └── concern_stakeholders.sysml
└── index.sysml                               ← aggregator

ontology/memo-base/process/compliance/<std>/coverage/   ← C2 (per standard)
├── iso14971_clause_coverage.sysml            (every §X.Y has ≥1 part with clauseRef)
├── iec62304_clause_coverage.sysml
└── …

ontology/memo-base/process/methodology/dhf/rules/        ← C6
├── dhf_integrity.sysml
├── rmf_completeness.sysml
└── pms_required_class_iib.sysml

ontology/memo-base/process/methodology/gates/            ← C7
├── design_phase_exit.sysml
├── verification_phase_exit.sysml
└── release_gate.sysml

ontology/memo-base/manifest/                              ← C8
└── release.sysml                                        (compatibilityRange + checked at load)
```

### 14.4 Worked example — one rule of each class

```sysml
// ─── C1 Structural closure ───
package memo::profile::rules::structural::hazards {
    private import memo::profile::viewpoints::core::*;
    private import memo::core::enumerations::*;

    part <'CR-STRUCT-HAZ-001'> hazardMustHaveMitigation : ConsistencyRule {
        doc/* Every hazard MUST have at least one linked Mitigation per ISO 14971 §7.1. */
        attribute :>> category = RuleCategoryKind::structural;
        attribute :>> severity = RuleSeverityKind::error;
        attribute :>> scope = { "Hazard" };
        attribute :>> selectionExpression = "kind = Hazard and count(connected[Mitigates]) = 0";
        attribute :>> minimumCount = 1;
        attribute :>> remediationHint = "Add a Mitigation and link via `connection : Mitigates connect <mitigation> to <hazard>`.";
        attribute :>> regulatoryRef = { "ISO 14971:2019 §7.1" };
    }
}

// ─── C2 Coverage ───
package memo::process::compliance::iso14971::coverage {
    private import memo::profile::viewpoints::core::*;

    part <'CR-COV-14971-6.3'> riskAnalysisDocumented : ConsistencyRule {
        doc/* ISO 14971 §6.3 (Risk Analysis) must be addressed by ≥1 element with clauseRef = "ISO 14971:2019 §6.3". */
        attribute :>> category = RuleCategoryKind::coverage;
        attribute :>> severity = RuleSeverityKind::error;
        attribute :>> selectionExpression = "exists e : e.clauseRef contains 'ISO 14971:2019 §6.3'";
        attribute :>> minimumCount = 1;
        attribute :>> appliesAtGate = { "release_gate" };
        attribute :>> regulatoryRef = { "ISO 14971:2019 §6.3" };
    }
}

// ─── C3 Lifecycle ───
package memo::profile::rules::lifecycle::hazard_lifecycle {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

    state def HazardLifecycleStates {
        first identified;
        state identified;
        state analysed;
        state controlled;
        state verified;
        state released;
        transition identified_to_analysed
            first identified accept HazardAnalysedSignal then analysed;
        transition controlled_to_verified
            first controlled accept HazardVerifiedSignal then verified;
        transition verified_to_released
            first verified accept HazardReleasedSignal then released
            require constraint {
                doc /* No hazard releases without DesignReview record. */
                exists dr : DesignReview such that dr.subject = self and dr.outcome = approved
            };
    }
}

// ─── C4 Cross-layer ───
package memo::profile::rules::cross_layer::safety_class_propagation {
    private import memo::profile::viewpoints::core::*;

    part <'CR-XL-SC-001'> safetyClassPropagation : ConsistencyRule {
        doc/* If a Function carries IEC 62304 class C, every SoftwareUnit allocated from it must be class B or C. */
        attribute :>> category = RuleCategoryKind::crossLayer;
        attribute :>> severity = RuleSeverityKind::error;
        attribute :>> selectionExpression =
            "forall f : Function where f.iec62304Class = C : forall u : allocatedUnits(f) : u.iec62304Class in {B, C}";
        attribute :>> regulatoryRef = { "IEC 62304:2006/AMD1:2015 §5.3" };
    }
}

// ─── C5 Quantitative ───
package memo::core::constraints::risk {
    private import memo::core::enumerations::*;

    constraint def RiskScoreMonotonic {
        in initial : SeverityKind;
        in residual : SeverityKind;
        residual <= initial
    }
}
package memo::profile::rules::quantitative::risk_score_monotonic {
    private import memo::profile::viewpoints::core::*;

    part <'CR-QNT-001'> residualNoWorseThanInitial : ConsistencyRule {
        doc/* Residual severity must not exceed initial severity (mitigations cannot make things worse). */
        attribute :>> category = RuleCategoryKind::quantitative;
        attribute :>> severity = RuleSeverityKind::blocker;
        attribute :>> scope = { "Hazard" };
        attribute :>> formalConstraintRef = "memo::core::constraints::risk::RiskScoreMonotonic";
    }
}

// ─── C6 Document ───
package memo::process::methodology::dhf::rules::dhf_integrity {
    private import memo::profile::viewpoints::core::*;

    part <'CR-DOC-001'> noOpenCapaAtRelease : ConsistencyRule {
        doc/* DHF cannot release while any CAPA is in state != closed. */
        attribute :>> category = RuleCategoryKind::document;
        attribute :>> severity = RuleSeverityKind::blocker;
        attribute :>> scope = { "DesignHistoryFile" };
        attribute :>> selectionExpression = "count(CAPA where lifecycleState != closed) = 0";
        attribute :>> appliesAtGate = { "release_gate" };
        attribute :>> regulatoryRef = { "21 CFR 820.100", "ISO 13485:2016 §8.5.2" };
    }
}

// ─── C7 Methodology gate ───
package memo::process::methodology::gates::release_gate {
    private import memo::core::common::*;

    part def ReleaseGate :> WorkflowGate {
        doc/* Release gate: blocks if any blocker-severity ConsistencyRule fails. */
        attribute exitCriteriaRules : String [*] = {
            "memo::profile::rules::structural::*",
            "memo::process::compliance::*::coverage::*",
            "memo::process::methodology::dhf::rules::*"
        };
        attribute blockOnSeverity : RuleSeverityKind [1..*] = { RuleSeverityKind::error, RuleSeverityKind::blocker };
    }
}

// ─── C8 Versioning ───
package memo::manifest::release {
    part memoBaseRelease {
        attribute packageVersion : String = "1.2.0";
        attribute compatibilityRange : String = "^1.0";   // semver — projects pinning ^1.0 accept this
        attribute sysmlLibraryVersion : String = "2026-04-01";
    }
}

// ─── C9 Audience ───
package memo::profile::rules::audience::concern_stakeholders {
    private import memo::profile::viewpoints::core::*;

    part <'CR-AUD-001'> concernNeedsStakeholder : ConsistencyRule {
        doc/* Every Concern declares ≥1 stakeholder typed against AudienceKind. */
        attribute :>> category = RuleCategoryKind::audience;
        attribute :>> severity = RuleSeverityKind::warning;
        attribute :>> scope = { "Concern" };
        attribute :>> selectionExpression = "kind = Concern and count(stakeholder where stakeholder.audience in AudienceKind::*) = 0";
        attribute :>> minimumCount = 1;
    }
}
```

### 14.5 How rules are evaluated — block updates

The Rule Engine (B6) gets richer:
- **B6 input:** Model Registry (B3) + ConsistencyRule index from B5 + active gate from B7 (if any).
- **B6 output:** `RuleEvaluation[]` — per (rule, target-element) pair: `{ ruleId, elementId, status: pass|fail|na, severity, message, remediationHint, regulatoryRef[] }`.
- **B6 dispatch:** rule's `category` + `formalConstraintRef`/`selectionExpression` selects evaluator:
  - `formalConstraintRef` → invoke SysML `constraint def` interpreter.
  - `selectionExpression` → declarative pattern matcher (parses MEMO query DSL).
  - `appliesAtGate` non-empty → engaged only when that gate is active.

Add **B6a Constraint Interpreter** sub-block (in core diagrams Tab 3) for SysML `constraint def` evaluation. Pure function; deterministic.

CLI:
```
memo rules list                            # all ConsistencyRule parts in registry
memo rules check                           # evaluate all; exit non-zero on error/blocker
memo rules check --gate release_gate       # only rules engaged by gate
memo rules explain CR-STRUCT-HAZ-001       # docs + remediationHint + regulatoryRef
memo rules coverage --standard iso14971    # which §clauses are/aren't covered
```

`memo dhf build` automatically runs `memo rules check --gate release_gate` and refuses to emit if any blocker fires.

### 14.6 ViewRule vs ConsistencyRule

`ViewRule` (existing, from feedback shape) governs **what shows in a view**. `ConsistencyRule` (new) governs **whether the model is valid**. They specialise the same `part def` (`ConsistencyRule :> ViewRule`) so view machinery (decorators, B6 → renderers) works for both, but the categorisation matters:

| | ViewRule | ConsistencyRule |
|---|---|---|
| Purpose | filter/decorate elements in a view | enforce model invariant |
| Failure mode | element decorated (yellow halo) | gate blocked / CI red |
| Lives in | `memo::profile::rules::view_rules::*` | `memo::profile::rules::<class>::*` + `memo::process::*::rules::*` |
| Severity | always advisory | advisory / warning / error / blocker |
| Bound to | view descriptor | (optionally) workflow gate |

### 14.7 Updates to other sections of this plan

- **§5.1 namespace map** — add row: `memo::profile::rules::*` (split into `structural`, `lifecycle`, `cross_layer`, `quantitative`, `audience`); add `memo::process::*::rules::*` (per-standard coverage + DHF integrity); add `memo::process::methodology::gates::*`.
- **§7.2 block table** — B6 responsibility expanded; new B6a Constraint Interpreter; rules sourced from `memo::profile::rules::*` AND `memo::process::*::rules::*` AND `memo::process::methodology::gates::*`.
- **§9 CLI** — add `memo rules list / check / explain / coverage`.
- **§12 phased plan** — extend P6 ("Rules and decorators from SysML"): scope grows from "ViewRule" to "ViewRule + ConsistencyRule classes C1–C9". Rename phase: **P6 — Consistency rules from SysML (C1–C9 + decorators)**.
- **§13 ADR catalogue** — add **ADR-1-25 ConsistencyRule taxonomy (9 classes), all SysML, all alongside ontology**.
- **§16 critique** — gate-enforcement gap (item 7 in SysE critique) now resolved by C7 + C3 working together.

### 14.8 Acceptance criteria additions

- [ ] All nine consistency-rule classes exist as SysML packages under `memo::profile::rules::*` and `memo::process::*::rules::*`.
- [ ] `memo rules check --gate release_gate` blocks DHF emission when any C1–C7 blocker rule fails.
- [ ] Every regulatory clause in ISO 14971, IEC 62304, ISO 13485, ISO 14155, IEC 60601, IEC 81001-5-1, ISO 27701, 21 CFR 820, EU MDR has at least one C2 coverage rule.
- [ ] `memo rules coverage --standard <std>` reports 100% coverage for the released `memo-base`.
- [ ] Every `WorkflowGate` declares `exitCriteriaRules` and is enforced by B6+B7.
- [ ] `ConsistencyRule.regulatoryRef` non-empty for every C2/C6/C7 rule (auditor-traceable).

---

## 16. Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Namespace migration `md::*` → `memo::*` breaks every external reference, lockfile, document hash | Codemod + dual-namespace transition window (P1–P5); lockfile schema bump |
| 2 | Closure-rule migration changes rule identifiers → breaks `memo.lock.yaml` | Migration codemod; lockfile v2 |
| 3 | One-view-per-file → hundreds of small SysML files | `memo::profile::views::index.sysml` aggregator; editor support via fully qualified imports |
| 4 | `port def` / `interface def` may not parse in current Langium grammar | P7 gated on SysON round-trip tests; feature flag `buildMemoModel.enablePortDef` |
| 5 | Two-repo split + git subtree protocol overhead | Automate via `scripts/subtree-sync.ts`; ADR-1-9 |
| 6 | Third-party tools may ignore `memo::profile::*` | Fine — ontology still parses as pure SysML; profile is opt-in |
| 7 | CLI parity audit blocks UI-only quick wins | Policy, not technical; PR checklist |
| 8 | Ontology growth (~118 kinds today, ~250 projected) hurts UI palette UX | Palette scoped to active view (see §8); `Viewpoint.allowedElementKinds` filter |

---

## 17. Acceptance criteria (definition of done for v3)

- [ ] `apps/`, `ontology/`, `projects/` are disjoint directories; no cross-concern imports.
- [ ] Every `.sysml` file under `memo::*` (no `md::*`).
- [ ] `memo check --sysml-compat` green on every `.sysml` file against OMG pilot, SysON, SysIDE.
- [ ] Every diagram in the UI is backed by a `part … : DiagramView` in a `.sysml` file under `memo::profile::views::*`.
- [ ] `memo.viewpoints.yaml` and `memo.rules.yaml` removed.
- [ ] `memo export --all` emits every view; byte-identical output to UI render.
- [ ] DHF compiler produces all six document classes from `memo::process::*` + viewpoints; no hand-coded per-document queries.
- [ ] UI has exactly three top-level tabs: Architecture, Process, DHF.
- [ ] Every UI action passes through a documented CLI command.
- [ ] 346+ tests still pass; new tests cover each renderer and the `memo::profile::views::*` registry.
- [ ] `architecture-blocks.drawio` matches code (lint script `memo arch-check` parses both and diffs).

---

## 18. Critique — Principal Systems Engineer review

Stance: medical device CTO sign-off. Asking: can a regulator audit this? Can a clinical engineer use it?

### What works

- **ISO 42010 alignment is real.** Viewpoint → View → Model mirrors §5.5 of the standard; not a paint job.
- **Two-ontology split is a strong move.** The "what the system IS" / "what the project DOES" cut matches how QMSR auditors actually read the DHF — they want one folder of evidence per regulation, and `memo::process::compliance::<standard>` delivers that without the audit team having to reverse-engineer your ontology.
- **`DocumentBackedView` as the QMSR primitive.** Auditors don't read SysML; they read PDFs. Treating the deliverable PDF as a first-class model element with `version`, `lifecycleState`, `documentUsage` is the right level of formalisation for traceability into the DHF.
- **Risk modelling depth.** Hazard + Mitigation + RiskControl + ResidualRisk + BenefitRiskAssessment — the v3 ontology covers ISO 14971:2019 §5–§9 cleanly. Bowtie, FTA, residual heatmap give safety engineers familiar artefacts.
- **Cybersecurity is a peer concern, not a bolt-on.** IEC 81001-5-1 reviewers will look for `Threat`, `Vulnerability`, `CyberRisk`, `TrustBoundary`, `STPA control structure` — all present.

### What concerns me

1. **No usability validation viewpoint.** IEC 62366-1 (Application of Usability Engineering) is implied nowhere. SaMD submissions get rejected on usability files more than on safety. Add `memo::arch::usability` (use specifications, hazardous use scenarios, formative + summative reports) and a `usabilityViewpoint`. Without it the DHF is incomplete for FDA Class II+ submissions.
2. **Post-market surveillance and CAPA are present in name only.** `CAPA` is one bullet in §10.3. EU MDR Annex III demands a structured PMS plan, PSUR, trend analysis. Real medical-device modelling needs `memo::process::pms` with `PMSPlan`, `PMCFStudy`, `Vigilance`, `FieldSafetyCorrectiveAction` — and viewpoints to render them. Today the design is heavy on pre-market and thin on post-market.
3. **No software bill of materials (SBOM) primitive.** IEC 81001-5-1 §C.2 and FDA cybersecurity guidance now mandate SBOM. `SOUP` (software of unknown provenance) is partly there via IEC 62304, but `SBOMComponent`, `CVE`, `Vendor`, `LicenseDeclaration` are not modelled. Add `memo::arch::sbom`.
4. **Clinical evidence workflow underspecified.** `clinicalEvidenceViewpoint` and `ClinicalEvaluationPlan` exist; the gap is in *how evidence flows from claim to clinical study to PMCF*. ISO 14155 reviewers want a chain: `IntendedUseClaim → ClinicalQuestion → Study → Endpoint → Evidence → ClaimSatisfaction`. Today only `clinical_claim_chain` exists. Decompose it.
5. **Requirement classification is flat.** `Requirement` is a single kind. Regulators distinguish: User Need, Product Requirement, Design Input, Design Output, Verification Requirement, Validation Requirement. Without this, design controls (21 CFR 820.30) traceability is awkward and FDA will write deficiencies. Specialise: `part def UserNeed :> Requirement`, `part def DesignInput :> Requirement`, etc.
6. **Lifecycle state is on documents but not on parts.** A `Hazard` discovered post-launch versus pre-launch has different obligations. Add `attribute lifecycleState : LifecycleStateKind` to `TraceableElement` so any part can report when it entered the model and at what gate.
7. **Workflow gates are listed (`methodology::gates`) but not enforced.** A SysE expects design reviews to *block* further progression until exit criteria are met. The plan does not say how `memo validate` fails when a gate is open. Make `WorkflowGate` block: `validate` must red-light if `currentGate.exitCriteria` includes unsatisfied closure rules.
8. **Risk-benefit is not modelled across versions.** Re-design changes residual risk. The model needs to compare residual risk between versions; today there's no version-pair view. Add `risk_delta_view` and `BenefitRiskDelta` to `memo::profile::views::risk`.
9. **Privacy is one matrix.** ISO 27701 / GDPR DPIA needs lawful basis, data subject categories, retention, transfers. Expand `memo::arch::privacy` from "one PIA matrix" to a real privacy ontology (DataElement, DataSubject, ProcessingPurpose, LawfulBasis, RetentionPolicy, CrossBorderTransfer).
10. **No traceability matrix between ontology and standards clauses.** Reviewer-facing question: "Show me where you address ISO 14971 §6.3." Add `memo::process::compliance::<standard>` parts to be `:> StandardClause` with `attribute clauseRef`, then auto-generate a `clauseCoverageMatrix` view.

### Verdict

The architecture is the strongest baseline I've seen in the medical SysML space, but it is a **safety-and-software** model with usability, post-market and SBOM gaps. Close those before claiming "regulator-ready". Severity: items 1, 2, 3 are blockers for a full submission story.

---

## 19. Critique — Principal Software Architect review

Stance: ten-year code health. Asking: who pays the maintenance bill?

### What works

- **Filesystem cut at three concerns** (apps/ ontology/ projects/) is the single best decision in the doc. It lets ontology and tool ship on different release cycles. ADR-1-17 should be locked in P0 before anything else moves.
- **Block dependency graph has no cycles.** Confirmed by §7.3 and the dispatcher pattern. This is rare; protect it with a CI lint that fails on `apps/core/B(n)` reaching upward in the graph.
- **Renderer Dispatcher (B8) is the right shape** for "N diagram types" growth. New diagrams = new file, no edits to a switch statement somewhere far away.
- **Two-repo subtree split** matches how `pdfjs-dist` and Babel handle library + tool. Subtree is awkward but better than submodule for this use case.
- **CLI parity rule** is a controllable invariant. Cheap to enforce, expensive to retrofit if dropped.

### What concerns me

1. **In-memory model registry will hit a wall.** B3 holds the entire merged model in memory. `gpca-pump` is already 500+ elements; a real hospital-suite project will be 50 000+. Streaming, indexing, and a persistent cache layer are not in the plan. Action: add B3a (persistent index, e.g. SQLite or LMDB) before P8 lands; keep the in-memory path as a façade.
2. **B14 dev-server broadcasts whole DTOs over WebSocket.** Re-render storm on every file save. With 50 k elements and 30 views, every save sends ~MBs. Need: per-view subscriptions; delta DTOs (`{ added, removed, changed }`); decorator diffs separate from element diffs. Specify the protocol now or it bakes in.
3. **Langium is a constraint, not a feature.** OMG SysML v2 is a moving target; the OMG pilot grammar is large and doesn't fit Langium's strengths. P7 (`port def`/`interface def`) is the early warning. Plan B: a thin `@memo/sysml-parser` wrapper that can switch backends to the OMG pilot ANTLR or Eclipse Xtext-as-a-service if Langium falls behind. Don't couple all of B1–B2 to Langium AST shapes — define a stable internal AST.
4. **B5 + B6 + B7 may share too much.** Methodology Registry, Rule Engine, View Resolver all walk the same model, all index by element id, all consume the same `selectionQuery`. Watch for accidental coupling — a refactor that touches one will touch all three. Either fuse them into a single QueryService with three façades, or insist on a single shared `Selector` type with a pure interpreter.
5. **No story for incremental compilation.** `memo dev` is "watch + rebuild". For 50k elements, full rebuild is unacceptable. Need: hash-keyed incremental layer (per file → per element → per view). This is hard. Schedule it explicitly, do not ship "dev mode" without it.
6. **Plugin / extension surface is undefined.** The plan says "ontology is opt-in" but does not define how a third party publishes a new viewpoint, renderer, or DHF document type. Without an extension contract, MEMO becomes a fork-or-die ecosystem. Define `MemoPlugin` (renderer, viewpoint pack, document template) interface in P4 alongside B8.
7. **DHF compiler is described in three lines.** "Walks `memo::process::*` + viewpoint outputs → document sections" elides the hard parts: variable substitution, cross-references, table-of-figures, page numbering, redaction for IP-protected sections. Mark P9 as a multi-quarter project, not a phase.
8. **YAML side-cars remain.** `memo.rendering.yaml`, `memo.lock.yaml`, `memo.template.yaml`, `memo.config.yaml` — at least four. The principle is "ontology is SysML"; the implementation still leaks to YAML for tool-only concerns. Decide explicitly: (a) accept YAML for tool concerns and document the boundary, or (b) move tool config to TS files (`memo.config.ts`) for type safety. Today it sits in between.
9. **No observability/telemetry block.** Production tools need: `which view took how long`, `which rule fired N times`, `which file failed parse`. Add B15 `Diagnostics` block — emits structured logs and metrics from B1–B11. Without it, perf regressions are invisible.
10. **Test pyramid is implicit.** "346+ tests" is mentioned but the plan doesn't say what's covered: parser fuzz, renderer pixel tests, DHF golden files, end-to-end CLI tests, ontology lint? Specify test categories per phase, with floor numbers.
11. **Migration story for `md::*` → `memo::*` is a single bullet.** This will touch every file in `memo-base` and `feedback/`, every test, every example, every doc page. ADR-1-11 needs a migration runbook with: codemod script, deprecation period, dual-namespace shim, removal date, lockfile bump procedure.
12. **Docs are an output, not an input.** No mention of ADR/RFC ownership, design-doc lifecycle, generated reference. Recommend: docs site builds from `memo::*` parsed AST (the ontology *is* the reference); ADRs in `docs/adr/` reviewed via PR. Already done partially (CLAUDE.md links). Make explicit.

### Verdict

The architecture is well-factored and the dependency direction is right. The risks are operational: scaling beyond the example pumps, the Langium dependency, and the unspecified extension surface. Items 1, 2, 3, 5 are the real long-term debts — schedule them or pay later.

---

## 20. What changes immediately vs what waits

**Immediate (P0–P3):** physical separation, namespace migration to `memo::`, feedback-style core ontology, viewpoints + views as SysML, one-file-per-view.

**Medium (P4–P7):** renderer dispatcher, three-tab UI, rules from SysML, ports/IBD.

**Later (P8–P11):** medical renderers, DHF rewrite, methodology templates, CLI parity closeout.

P0–P3 alone deliver the physical, semantic, and naming separation requested. P4 onward is pure follow-through.
