# MEMO — Execution Plan (three-wave release · Sonnet-sized sessions)

**Status:** Draft v2 (replaces v1).
**Date:** 2026-04-25.
**Audience:** Claude Sonnet running in this repo. Each session is one PR, one user request, one chapter of work. Designed for ~2–4 hours of Sonnet attention.
**Inputs merged:** `fresh-architecture-plan.md` v3 (1198 lines, 29 ADRs, principle 14 = three-wave release, principle 15 = modular web by feature flag) · `sysmlv2-rulebook.md` (1181 lines: OMG + GfSE + FiBO patterns) · `architecture-blocks.drawio` · GitLab live milestones (61 open issues).

**Three waves, ship-order strict:**

```
W1 — ONTOLOGY    (SysML library — usable in SysON / SysIDE / Sysand · consumed as .kpar)
   ↓
W2 — CLI         (memo command — headless, scriptable, CI-friendly)
   ↓
W3 — WEB TOOL    (memo-architect — modular per feature flag, incremental release)
```

Each wave **must be releasable on its own**. W1 ships first because adoption is easiest with a pure SysML library that any compliant tool can read. W2 ships next so CI pipelines and reviewers can use MEMO without UI. W3 ships last and ships **incrementally** — Tab 1 alpha, then Tab 2 alpha, then per-tool, per-renderer.

---

## 1. Current state — what's actually in the tree (recap)

| Package | Status | LOC | Notes |
|---|---|---|---|
| `packages/core/` | live | ~13k | builder.ts 27k; composer/ empty (reserved) |
| `packages/cli/` | live | 8k | 24 commands; dev-server.ts 45k god-file |
| `packages/web/` | live | 27k | App.tsx 6-mode shell; DiagramCanvas.tsx 52k; CatalogExplorer.tsx 63k; ExplorerPanel 91k; model-store 40k |
| `packages/ontology-arch/` | live | sysml + zip | Apollo-11 layout; pre-`memo::` namespace |
| `packages/ontology-process/` | live | sysml + zip | regulatory standards |
| `packages/medical-modeling-profile/` | live | YAML only | empty `sysml/` — viewpoints not yet SysML |
| `examples/{gpca,infusion,irrigation}-pump/` | live | sysml | 3 examples |

Tests: 346+ green. GitLab: 61 open across 15 milestones.

---

## 2. Wave assignment — which v3 phase belongs to which wave

| v3 phase | Wave | Why |
|---|---|---|
| **P0** physical separation | W1 | foundation for every wave |
| **P1** namespace `memo::*` | W1 | ontology files use the namespace |
| **P2** core ontology | W1 | the library |
| **P3** viewpoints + views as SysML | W1 | part of the library |
| **P-FB** Sysand integration + part/item reclass | W1 | `.kpar` ship is the W1 deliverable |
| **P10** methodology templates | W1 | archetypes ship with the library |
| **P-EX** examples cleanup | W1 | examples are part of the package release |
| **P7** ports + interfaces + IBD + sysml-compat | W1+W2 | SysML grammar belongs to W1; CLI compat gate is W2 |
| **P6** consistency rules from SysML | W2 | CLI-evaluable; UI consumption later |
| **P9** DHF compiler descriptor-driven | W2 | CLI emits docs |
| **P11** CLI parity audit | W2 | CLI-defining work |
| **P-IMPORT** OWL · EA · Cameo · AADL · LSP | W2 | CLI tools |
| **P-DOC** docs restructure + manuals | spans W1, W2, W3 | docs each wave's surface as it ships |
| **P4** Renderer Dispatcher | W3 | web rendering |
| **P5** Four-tab UI | W3 | web shell |
| **P8** Medical-specific renderers | W3 | per-renderer module — feature-flagged |
| **P-MEDWB** medical workbenches | W3 | feature-flagged |
| **P-SCEN** scenarios + diff | W3 | feature-flagged |
| **P-COMM** plugin system + element libs + automotive + aerospace | W3 | community-extension surface |
| **P-MULTI** cloud + collab | post-W3 | future wave (W4) |

Total: **133 sessions**; W1 = 32, W2 = 25, W3 = 76 (60 prior + 16 W3.P-MIRO).

---

# WAVE 1 — Ontology release (`@memo/ontology-base` as `.kpar`)

**Deliverable:** `memo-base-1.0.0.kpar` package consumable in **SysON · SysIDE · Sysand**. Contains: pure OMG SysML v2 definitions of all kinds, viewpoints, views, templates, modules, archetypes, examples. **No app code dependency.** Usable standalone.

**Ship criteria for W1:**
- [ ] `sysand info` resolves metadata for `memo-base`.
- [ ] `sysand build` produces `memo-base-1.0.0.kpar`.
- [ ] Eclipse SysON opens the package; every part-def visible.
- [ ] SysIDE opens the package; round-trip parses and saves unchanged.
- [ ] OMG pilot parser green on every `.sysml` file (`memo check --sysml-compat`).
- [ ] All 9 OMG SysML libraries (`ScalarValues`, `ISQ`, `SI`, `Quantities`, `Time`, `Views`, `VerificationCases`, `CauseAndEffect`, `Metaobjects`) referenced by URN; nothing copied.
- [ ] `gpca-pump` example loads, parses, validates without web app.
- [ ] Public release notes + migration guide from prior `@memo/ontology-arch`/`process`/`profile`.

### W1.P0 — Physical separation (5 sessions)

| Session | Scope | Files |
|---|---|---|
| **S0.1** | Move `packages/core` → `apps/core`. Update workspace. | `pnpm-workspace.yaml`, `turbo.json`, `apps/core/**`, all `tsconfig.json` |
| **S0.2** | Move `packages/cli` → `apps/cli`. | `apps/cli/**`, workspace |
| **S0.3** | Move `packages/web` → `apps/web`. | `apps/web/**`, workspace |
| **S0.4** | Move ontology packages → `ontology/memo-base/{arch,process,profile}/`. | `ontology/memo-base/**` |
| **S0.5** | `examples/*` → `projects/*`. | `projects/**`, doc refs |

Acceptance every session: `pnpm install && pnpm run build && pnpm run test` green.

### W1.P1 — Namespace introduction (3 sessions)

| Session | Scope |
|---|---|
| **S1.1** | Codemod `ontology/memo-base/arch/sysml/**` → `package memo::arch::<layer>::<file>`. Codemod script `scripts/codemod-namespace.ts` (commit). |
| **S1.2** | Same for `ontology/memo-base/process/sysml/**` → `memo::process::compliance::*` + `memo::process::methodology::*`. |
| **S1.3** | Lint rules R1/P1/P5/P2 added to `apps/core/src/validator/sysml-lint.ts`. CI gates. |

### W1.P2 — Core ontology (4 sessions)

| Session | Scope |
|---|---|
| **S2.1** | `memo::core::common` — `IdentifiedElement`, `TraceableElement`, `DocumentedElement`, `LayerElement`, `ExchangeItem`. `library package`. |
| **S2.2** | `memo::core::enumerations` — FB8 form (`enum def Foo { enum Bar; }`); ports YAML enums to SysML. |
| **S2.3** | `memo::core::relationships` — only attribute-bearing or n-ary as `connection def` (FB10). |
| **S2.4** | `memo::core::constraints` — `NonNegativeReal`, `Between0And1`, `RiskScoreMonotonic`, etc. |

### W1.P3 — Viewpoints + views as SysML (8 sessions)

| Session | Scope |
|---|---|
| **S3.1** | `memo::profile::viewpoints::core` — `Viewpoint`, `ViewRule`. |
| **S3.2** | `memo::profile::views::core` — `View`, `DiagramView`, `DocumentBackedView`, `ViewSelectionQuery`. |
| **S3.3** | Migrate `memo.viewpoints.yaml` → `memo::profile::viewpoints::default_viewpoints` (codemod). |
| **S3.4** | `apps/core/src/ontology/methodology-registry.ts` reads viewpoints from SysML. YAML deprecation warning. |
| **S3.5** | One file per arch view (×11): context BDD, logical BDD/IBD, decomposition tree, software BDD, software safety class tree, hardware BDD/BOM, action flow, state transition, req table. |
| **S3.6** | One file per risk view (×6): overview BDD, matrix, 5×5, bowtie, residual heatmap, fault tree. |
| **S3.7** | Security/privacy/clinical/DHF view files (×10). |
| **S3.8** | `memo::profile::views::index.sysml` aggregator + `memo arch-doc` regenerator. |

### W1.P10 — Templates (3 sessions)

| Session | Scope |
|---|---|
| **S10.1** | Move `profiles/{minimal,standard,full}.yaml` → SysML `Archetype` parts under `memo::profile::methodology::profiles::*`. |
| **S10.2** | Add device-class archetypes: `samd`, `connected`, `monitoring`, `infusion_pump`, `blank`. |
| **S10.3** | Rewrite `apps/cli/src/commands/init.ts` — descriptor-driven. Split into `init-wizard`, `archetype-loader`, `template-writer`. |

### W1.P-FB — Sysand integration + reclassification (8 sessions)

| Session | Scope |
|---|---|
| **SFB.1** | Drop `memo.package.yaml`; add `.project.json` (FB2) with `usage[]` URNs. |
| **SFB.2** | Drop `memo.lock.yaml`; adopt `sysand-lock.toml` (FB3). |
| **SFB.3** | CI step `sysand build` → `dist/memo-base-<v>.kpar`. |
| **SFB.4** | CI-aggregator pattern (FB1) — `MEMO_<AREA>_<TOPIC>.sysml` files; `public import` only. |
| **SFB.5** | Reclassify `Hazard`/`Harm`/`Threat`/etc. `part def` → `item def` (FB5). HIGH IMPACT — coordinate with method steward. |
| **SFB.6** | Replace `:>` with `specializes` in ontology layers (FB6); profile keeps `:>`. |
| **SFB.7** | Enforce explicit multiplicity (FB7) — lint + repair. |
| **SFB.8** | CODEOWNERS — Method Steward + Syntax Steward both required for `ontology/**`. |

### W1.P7 (ontology slice) — SysML grammar prep for round-trip (2 sessions)

| Session | Scope |
|---|---|
| **S7.1** | Extend `memo-sysml.langium` with `port def`, `interface def`, `connect`, `flow`, `~`. |
| **S7.3** | Migrate `memo::arch::logical_interfaces` to use `port def` + `interface def`. |

(`S7.2` builder support, `S7.4` IBD renderer, `S7.5` CI gate move to W2/W3.)

### W1.P-EX — Examples cleanup (3 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **SEX.1** | Make GPCA Pump default; remove irrigation; trim infusion. | #87, #106, #107 |
| **SEX.2** | Add CriSys source refs to GPCA. | #108 |
| **SEX.3** | GPCA cybersecurity 70% → 90%. | #109 |

### W1.P-DOC.1 — Docs for W1 (1 session)

| Session | Scope |
|---|---|
| **SDOC.W1** | `docs/src/users/ontology-quickstart.md` — SysON/SysIDE/Sysand consumption, `.kpar` install, namespace overview, archetype catalogue. Tag W1 release. |

### W1 freeze + release (1 session)

**SREL.W1** — Tag `memo-base-v1.0.0`. Build `.kpar`. Publish to public registry (or GitLab generic-package). Run SysON open-test on macOS + Linux + Windows. Cut release notes. Announce.

**Total W1: 32 sessions.**

---

# WAVE 2 — CLI release (`memo` command)

**Deliverable:** `@memo/cli` v1.0 — headless, scriptable, CI-friendly. Reads any `memo-base@1.0.0`-pinned project. Validates · lints · checks consistency · builds DHF · imports external models · runs as VS Code language server. **No web dependency.**

**Ship criteria for W2:**
- [ ] `memo init --archetype <id>` scaffolds a working project for every archetype.
- [ ] `memo dev` runs without web bundle (headless mode, JSON RPC over stdio).
- [ ] `memo validate · rules check · lint · check --sysml-compat` all support `--format json|junit|text`.
- [ ] `memo dhf build --template <id>` produces all six DHF document classes from `gpca-pump` byte-identical to a golden file.
- [ ] `memo import` handles OWL, EA `.qea`, Cameo `.mdzip`, Sysand `.kpar`.
- [ ] `memo export --view <id>` and `memo export --all` emit SVG/PNG/CSV/HTML/JSON.
- [ ] VS Code extension `memo-language-server` available on marketplace; opens any `.sysml` file with completion + hover + diagnostics.
- [ ] CI templates for GitLab + GitHub published.

### W2.P7 — SysML compat + builder ports (3 sessions)

| Session | Scope |
|---|---|
| **S7.2** | Builder + Model Registry: `owner`, `ownedPorts`, `portSpec`, source/target port IDs. |
| **S7.5** | `memo check --sysml-compat` runs OMG pilot parser; CI gate. |
| **S7.6** | New: `memo round-trip --tool syson|syside` test harness — read SysML, write SysML, diff. |

### W2.P6 — Consistency rules (6 sessions)

| Session | Scope |
|---|---|
| **S6.1** | Add `ConsistencyRule` part-def to `memo::profile::viewpoints::core`. |
| **S6.2** | Migrate `memo.rules.yaml` rules to SysML (codemod). |
| **S6.3** | Add C2 coverage rules per regulatory standard (×9). |
| **S6.4** | Add C3 lifecycle, C4 cross-layer, C5 quantitative rule packs. |
| **S6.5** | Refactor rule engine (B6 + B6a Constraint Interpreter). |
| **S6.6** | CLI: `memo rules list/check/explain/coverage`. |

### W2.P9 — DHF compiler descriptor-driven (5 sessions)

| Session | Scope |
|---|---|
| **S9.1** | Move `dhf/*` → `apps/core/src/composer/`. |
| **S9.2** | `DocumentBackedView` defs per regulatory document (×6). |
| **S9.3** | Rewrite compiler — descriptor walk; remove custom queries. |
| **S9.4** | One adapter per `DocumentViewKind` (RMF, SDD, CER, Cyber, DPIA, DHF). |
| **S9.5** | Audit chain — `id`, `version`, source SysML hash on every section. |

### W2.P11 — CLI parity audit + JSON/JUnit (3 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **S11.1** | Audit doc + fill gaps. | — |
| **S11.2** | `--format json|junit` on validate, rules, lint. | #32 |
| **S11.3** | CI templates GitLab/GitHub. | #33 |

### W2.P-IMPORT — Imports + LSP (5 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **SIMP.1** | OWL/JSON-LD/SysAnd → SysML (writes to `memo::ext::imported::*`). | #49 |
| **SIMP.2** | Sparx EA `.eapx`/`.qeax` → SysML. | #47 |
| **SIMP.3** | Cameo/MagicDraw `.mdzip` → SysML. | #48 |
| **SIMP.4** | SysML v2 ↔ AADL bridge. | #88 |
| **SIMP.5** | VS Code language-server packaging (`vsce`). | #46 |

### W2.P-DOC.2 — Docs for W2 (2 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **SDOC.W2.1** | User Manual — every CLI command + config option + workflow. | #94 |
| **SDOC.W2.2** | CI integration guide. | #33 |

### W2 freeze + release (1 session)

**SREL.W2** — Tag `memo-cli-v1.0.0`. Publish to npm. VS Code extension to marketplace. Run on `gpca-pump` end-to-end (init → dev → validate → rules → dhf build → export). Tutorial video.

**Total W2: 25 sessions.**

---

# WAVE 3 — Web tool release (`memo-architect`, modular feature flags)

**Deliverable:** `@memo/web` v0.1+ — incremental, feature-flagged, modular. Ships in **rolling alpha → beta → ga** per module per ADR-1-29.

**Ship criteria for W3 v0 (alpha):**
- [ ] Tab 1 (🏗 Architecture / SysML editor) GA.
- [ ] Tab 4 shell (🛠 Tools) shell GA — empty grid + Plugin Manager.
- [ ] Tab 2 (🎨 Diagramming) alpha behind `VITE_FEATURE_DIAGRAMMING` — BDD renderer only.
- [ ] Tab 3 (📄 DHF) alpha behind `VITE_FEATURE_DHF` — read-only document preview.
- [ ] All other features (renderers beyond BDD; tools; workbenches; importers in UI) behind individual flags, default off.
- [ ] Disabled-flag fallbacks (no throws; greyed labels).
- [ ] WS bridge per-tab subscription with delta DTOs.

**Ship criteria for W3 v1.0 (GA):**
- [ ] All four tabs GA.
- [ ] Renderers BDD, IBD, AFD, Matrix, Table, Tree GA.
- [ ] Bowtie, FTA, STPA, Heatmap, 5×5, BR-delta, Claim Chain, Evidence Matrix, PIA, DHF I/O, DFD, SW Safety Tree behind individual flags (alpha or beta).
- [ ] Tools DSM, FMEA, Trace Matrix, Coverage, Consistency, Lint, Diff, Impact, SBOM, FMEA Importer, FIBO Library, EA Importer, Risk Calc, Rule Explainer, Codemod, Plugin Manager — at least 50% GA.
- [ ] Workbenches (Usability, Risk, Software, Evidence) at least alpha.

### W3.P-MOD — Module + flag infrastructure (4 sessions)

| Session | Scope |
|---|---|
| **SMOD.1** | `memo::profile::modules::core` SysML — `FeatureModule` part-def. |
| **SMOD.2** | `apps/web/src/shell/feature-loader.ts` — module manifest reader + lazy bundle loader; reads env + workspace + localStorage. |
| **SMOD.3** | `@memo/web-module-api` package — TS types for `WebFeatureModule`. |
| **SMOD.4** | CLI: `memo features list/enable/disable/promote`. Reads/writes `memo.config.yaml` flags. |

### W3.P5 (web shell) — Top bar + four-tab routing (3 sessions)

| Session | Scope |
|---|---|
| **S5.1** | `apps/web/src/shell/{TopBar,App}.tsx` — four-tab nav + project selector + lint badge + gate state + compile status. |
| **S5.7** | Per-tab WS subscription — `apps/web/src/store/ws-client.ts` rewrite; delta DTOs. |
| **S5.9** | Retire 6-mode shell — delete ModeSwitcher, CatalogExplorer; clean App.tsx. |

### W3.P5 (Tab 1) — Architecture (3 sessions)

| Session | Scope | Module |
|---|---|---|
| **S5.2** | `apps/web/src/features/architecture/` — Model Explorer + Monaco editor + Properties form. Default-on (always-loaded). | `architecture` |
| **S5.2b** | Live Langium LSP wiring; bottom-bar compile status. | `architecture` |
| **S5.10** | Onboarding tour pointing at four tabs; what-next panel. | `architecture` |

### W3.P4 — Renderer Dispatcher (4 sessions)

| Session | Scope | Module |
|---|---|---|
| **S4.1** | `apps/core/src/renderer/dispatcher.ts` + `RendererPlan` type. | (core) |
| **S4.2** | BDD renderer in `apps/web/src/features/renderers/bdd/` — extracted from DiagramCanvas. Default-on flag. | `renderers/bdd` |
| **S4.3** | IBD, AFD, Decomposition Tree renderer modules. Each its own folder + flag. | `renderers/{ibd,afd,tree}` |
| **S4.4** | Matrix + Table renderer modules. | `renderers/{matrix,table}` |

### W3.P5 (Tab 2) — Diagramming (3 sessions)

| Session | Scope | Module |
|---|---|---|
| **S5.3** | `apps/web/src/features/diagramming/` — Catalog + Split Editor (canvas + view source) + bidirectional sync. Flag `VITE_FEATURE_DIAGRAMMING`. | `diagramming` |
| **S5.4a** | View-type controls: bdd, ibd, afd, matrix, table. | `diagramming` |
| **S5.4b** | View-type controls: tree, bowtie, fta, stpa, heatmap, pkg. | `diagramming` |

### W3.P5 (Tab 3) — DHF (2 sessions)

| Session | Scope | Module |
|---|---|---|
| **S5.5a** | `apps/web/src/features/dhf/` — Product Selector + Document Catalog + Document Workspace + Section Index. Read-only first; flag `VITE_FEATURE_DHF`. | `dhf` |
| **S5.5b** | Build buttons (PDF / MD / stamp version) wired to B11 over WS. GitLab #137, #138, #140 partial close. | `dhf` |

### W3.P5 (Tab 4 shell) — Tools (2 sessions)

| Session | Scope | Module |
|---|---|---|
| **S5.6a** | `apps/web/src/features/tools/` — grid view + drawer + parametersSchema-driven form. Reads `memo::profile::tools::*`. | `tools` |
| **S5.6b** | Plugin Manager — install/remove/enable user tools. Resolves drop-file extensibility surface for UI. | `tools/plugin-manager` |

### W3.P5 (extensibility) — Drop-file (1 session)

| Session | Scope |
|---|---|
| **S5.8** | `memo::ext::<vendor>::*` namespace; B4 loader scans `ontology/<vendor>/`; auto-register catalogs. ADR-1-28. |

### W3.P8 — Medical-specific renderers (12 sessions, one per renderer module)

Each session creates one feature module under `apps/web/src/features/renderers/<id>/` with its own flag. Module = renderer plan + control set component + tests.

| Session | Renderer module | Flag | GitLab |
|---|---|---|---|
| **S8.1** | Risk 5×5 grid | `VITE_FEATURE_RENDERER_RISK55` | #142 |
| **S8.2** | Bowtie (risk + threat) | `VITE_FEATURE_RENDERER_BOWTIE` | #142 |
| **S8.3** | Fault Tree | `VITE_FEATURE_RENDERER_FTA` | — |
| **S8.4** | Residual heatmap | `VITE_FEATURE_RENDERER_HEATMAP` | #142 |
| **S8.5** | Benefit-risk delta | `VITE_FEATURE_RENDERER_BR_DELTA` | — |
| **S8.6** | Software safety-class tree | `VITE_FEATURE_RENDERER_SW_SAFETY_TREE` | #143 |
| **S8.7** | Clinical claim chain | `VITE_FEATURE_RENDERER_CLAIM_CHAIN` | — |
| **S8.8** | Clinical evidence matrix | `VITE_FEATURE_RENDERER_EVIDENCE_MATRIX` | — |
| **S8.9** | Privacy impact matrix | `VITE_FEATURE_RENDERER_PIA_MATRIX` | — |
| **S8.10** | DHF I/O matrix | `VITE_FEATURE_RENDERER_DHF_IO` | — |
| **S8.11** | STPA control structure | `VITE_FEATURE_RENDERER_STPA` | — |
| **S8.12** | Data flow diagram | `VITE_FEATURE_RENDERER_DFD` | — |

### W3.P-TOOL — Tool modules (12 sessions, one per tool)

Each session creates `apps/web/src/features/tools/<id>/` + matching SysML `Tool` part declaration.

| Session | Tool module | Flag | GitLab |
|---|---|---|---|
| **STL.1** | DSM Analysis | `VITE_FEATURE_TOOL_DSM` | #30 |
| **STL.2** | FMEA Builder | `VITE_FEATURE_TOOL_FMEA` | #16, #17 |
| **STL.3** | Trace Matrix N×N | `VITE_FEATURE_TOOL_TRACE` | #10, #11 |
| **STL.4** | Coverage Map | `VITE_FEATURE_TOOL_COVERAGE` | — |
| **STL.5** | Consistency Checker (C1–C9 dashboard) | `VITE_FEATURE_TOOL_CONSISTENCY` | #31 |
| **STL.6** | Lint Runner | `VITE_FEATURE_TOOL_LINT` | — |
| **STL.7** | Diff Viewer | `VITE_FEATURE_TOOL_DIFF` | #39, #79 |
| **STL.8** | Impact Analyzer | `VITE_FEATURE_TOOL_IMPACT` | — |
| **STL.9** | SBOM Importer | `VITE_FEATURE_TOOL_SBOM` | — |
| **STL.10** | FMEA Importer (Excel CSV) | `VITE_FEATURE_TOOL_FMEA_IMPORT` | — |
| **STL.11** | FIBO Library reuse | `VITE_FEATURE_TOOL_FIBO` | — |
| **STL.12** | EA Importer (UI wrapper of CLI) | `VITE_FEATURE_TOOL_EA_IMPORT` | — |
| **STL.13** | Risk Calc (ALARP) | `VITE_FEATURE_TOOL_RISK_CALC` | — |
| **STL.14** | Rule Explainer | `VITE_FEATURE_TOOL_RULE_EXPLAIN` | — |
| **STL.15** | Namespace Codemod runner | `VITE_FEATURE_TOOL_CODEMOD` | — |

### W3.P-MIRO — Miro-like canvas engine (16 sessions, ADR-1-30/31/32)

**Goal:** build the engine described in v3 §9 (E1–E12). Powers Tab 2. Reference baseline: Eclipse SysON's General/Interconnection Views, Tom Sawyer's layout suite, Miro's spatial UX.

**Sequencing:** SMIRO.1–4 are foundation (canvas + nodes + edges + layout). SMIRO.5–9 are interaction (selection, palette, drag, slash, hotkeys). SMIRO.10–11 are annotations. SMIRO.12–13 are split-edit reconciler — the technical moat. SMIRO.14–16 are validation overlay, export, command stack. **SMIRO.1 must precede every other Tab-2 session.**

| Session | Block | Scope | Files | Acceptance |
|---|---|---|---|---|
| **SMIRO.1** | E1 CanvasCore (foundation) | ReactFlow base + infinite canvas; pan, zoom (0.1×–4×), marquee select, grid, rulers, mini-map, viewport persisted to view file. | `apps/web/src/features/diagramming/engine/canvas-core/{Canvas,Viewport,MiniMap,Grid}.tsx` | Open `riskMatrixView` → pan/zoom/lasso work; reload preserves viewport. 60 fps with 100 nodes. |
| **SMIRO.2** | E1 (snap + guides) | Snap-to-grid (8/16/32 px), alignment guides (Miro-style smart spacing), distribute, align-edges. | `…engine/canvas-core/{Snap,AlignmentGuides}.ts` | Drag two nodes — alignment guides appear; snap toggle in toolbar. |
| **SMIRO.3** | E2 NodeRegistry | Per-`(elementKind, diagramType)` React component registry. Plugin-loaded (ADR-1-28). Per-node port slots (IBD-style). LOD rendering for zoom-out. | `…engine/node-registry/{registry,defaultNodes,portSlots,lod}.ts(x)` | BDD nodes show name + kind icon; IBD nodes show port slots; zoom < 50% renders simplified shapes. |
| **SMIRO.4** | E3 EdgeRouter | Three modes: orthogonal port-aware (default for ports), bezier (default non-port), smoothstep (succession/accept). Bend-point editor. Obstacle avoidance. | `…engine/edge-router/{router,orthogonal,bezier,smoothstep,bendPoints}.ts` | IBD interface edge routes orthogonally between two ports; mid-point drag adds bend; obstacle node forces re-route. |
| **SMIRO.5** | E4 LayoutEngine (worker) | Move ELK to Web Worker. 5 algorithms (hierarchical, orthogonal, circular, force, tree) selectable per view. Incremental layout (only changed nodes). | `…engine/layout/{layout-worker.ts, algorithms/*.ts, incremental.ts}` | 1k-node layout < 300 ms; main-thread frame budget < 16 ms during layout. |
| **SMIRO.6** | E4 (pin/unpin + auto-fit) | Per-element `pin/unpin`. Pinned nodes preserved on re-layout. Auto-fit-to-content button. Layout direction (TB/LR/BT/RL) per view. | `…engine/layout/{pinning,autoFit}.ts(x)` | Pin a hazard node, change layout algorithm — pinned position preserved. |
| **SMIRO.7** | E5 SelectionModel | Single, multi, marquee, group, by-kind, by-rule. Alignment guides on multi-select. Distribute, smart spacing. Keyboard nav. Cut/copy/paste/duplicate preserving relationships. | `…engine/selection/{model,marquee,group,clipboard,keyboard}.ts(x)` | Select 5 hazards; copy-paste creates new with relationships intact; arrow keys move selected. |
| **SMIRO.8** | E6 InteractionLayer (palette + drag) | Drag from view-controls palette · drag from Model Explorer (Tab 1) · drag from search results · drop hooks per node kind. | `…engine/interaction/{paletteDrag,explorerDrag,searchDrag,dropHooks}.ts(x)` | Drag a Hazard def from explorer → drops as `#hazard <id> : Hazard {…}` in active project file. |
| **SMIRO.9** | E6 (slash + hotkeys + context menu) | Slash-command quick-add (`/hazard X` creates Hazard inline); hotkeys (B/R/M/?); context menu per element. | `…engine/interaction/{slashCommand,hotkeys,contextMenu}.ts(x)` | Type `/hazard fluid-overinfusion` on canvas → creates Hazard part + connects to current selection if applicable. |
| **SMIRO.10** | E7 AnnotationLayer (sticky + frame) | Sticky notes (yellow/pink/green/blue), frames/sections (group + collapse). Saved as `attribute annotations[*]` in view file. | `…engine/annotations/{Sticky,Frame}.tsx`, ontology: extend `views::core` (ADR-1-31) | Add a sticky note; reload — note persists in view file `.sysml`. |
| **SMIRO.11** | E7 (pen + arrow + image + text) | Freehand pen (smoothing), free arrows (annotations distinct from semantic edges), images (paste/drop), text labels. | `…engine/annotations/{Pen,Arrow,Image,Text}.tsx` | Paste image from clipboard onto canvas; saved into view file as base64 + bbox; round-trip clean. |
| **SMIRO.12** | E8 SyncEngine (visual → SysML) | Visual edits classified layout-only vs structural. Layout writes to view file `layoutHint`/`positions`. Structural emits WS commands. ADR-1-32. | `…engine/sync/{classify,emit,toLayoutHint,toStructural}.ts` | Move a node → only `positions` array updates in view file; rename → ontology source updates. |
| **SMIRO.13** | E8 (SysML → visual) | Source edit → Langium re-parse → AST diff → minimal canvas patch (preserve pinned positions, selection follows id). Conflict policy: source wins; toast offers undo. | `…engine/sync/{onSourceChange,diff,patch,conflict}.ts` | Edit source pane to add a Hazard — appears on canvas without losing pinned layout. |
| **SMIRO.14** | E9 ValidationOverlay | Inline B6 ConsistencyRule decorators (red squiggle / yellow halo / green check). Hover → remediation hint + regulatory ref + jump-to-rule. | `…engine/validation/{Overlay,Decorator,Tooltip}.tsx` | Unmitigated hazard renders red squiggle; hover shows ISO 14971 §7.1 + remediation hint. |
| **SMIRO.15** | E11 ExportEngine | SVG (vector), PNG (1×/2×/4×), PDF (vector page), Markdown (textual + image), textual SysML round-trip (re-emit current view file with state). | `…engine/export/{svg,png,pdf,md,sysmlRoundTrip}.ts` | `memo export --view <id> --format svg` and Tab 2 export buttons produce identical files. |
| **SMIRO.16** | E12 CommandStack | Per-diagram undo/redo (50-step). Macros (record-replay). Optional history pinned to view file `attribute history[*]`. | `…engine/commands/{stack,macro,history}.ts` | 50-deep undo works; macro records 5 ops, replays on different selection. |

CollabPresence (E10) deferred to W4 (SMUL.4).

### W3.P-MEDWB — Medical workbenches (4 sessions)

| Session | Module | Flag | GitLab |
|---|---|---|---|
| **SMW.1** | Workflow defs in medical config. | `VITE_FEATURE_WB_WORKFLOWS` | #41 |
| **SMW.2** | Usability Cockpit (IEC 62366). | `VITE_FEATURE_WB_USABILITY` | #141 |
| **SMW.3** | Risk Workbench (ISO 14971 chain). | `VITE_FEATURE_WB_RISK` | #142 |
| **SMW.4** | Software Lifecycle (IEC 62304) + Evidence linking. | `VITE_FEATURE_WB_SOFTWARE`, `VITE_FEATURE_WB_EVIDENCE` | #143, #144 |

### W3.P-SCEN — Scenario editor + diff (4 sessions)

| Session | Module | Flag | GitLab |
|---|---|---|---|
| **SSC.1** | Scenario editor base. | `VITE_FEATURE_SCEN_EDITOR` | #37, #73 |
| **SSC.2** | Element-link tool inside scenarios. | `VITE_FEATURE_SCEN_EDITOR` | #37 |
| **SSC.3** | Model diff core. | `VITE_FEATURE_TOOL_DIFF` | #39, #79 |
| **SSC.4** | Diff renderer in Tab 4. | `VITE_FEATURE_TOOL_DIFF` | — |

### W3.P-COMM — Plugin system + libs + domains (4 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **SCM.1** | Plugin system formalisation — `@memo/plugin-api` package; load order; conflict resolution. | #50 |
| **SCM.2** | Reusable element libraries — `@memo/lib-*` standard components. | #51 |
| **SCM.3** | `@memo/automotive` (ISO 26262) under `memo::ext::automotive::*`. | #56 |
| **SCM.4** | `@memo/aerospace` (DO-178C) under `memo::ext::aerospace::*`. | #57 |

### W3.P-DOC.3 — Docs for W3 (3 sessions)

| Session | Scope | GitLab |
|---|---|---|
| **SDOC.W3.1** | Restructure docs Users vs Devs (#90); user web-tool guide. | #90 |
| **SDOC.W3.2** | Developer Manual: extension dev, plugin authoring, module manifest format. | #95 |
| **SDOC.W3.3** | Hidden features: LLM commands, env vars, advanced flags. | #96 |

### W3 freeze + release per module (rolling, 1 release session per ga promotion)

**SREL.W3.<module>** — Each time a module promotes to GA: cut release notes for that module, flip `defaultEnabled = true` in its SysML manifest, bump `since`, bump `memo-base` version if SysML changed.

**Total W3: 76 sessions** (60 + 16 W3.P-MIRO).

---

## 3. Three-wave dependency graph

```
W1 ONTOLOGY (32 sessions)
   │
   │ (must release before W2 starts; W2 pins memo-base@1.0.0)
   ▼
W2 CLI (25 sessions)
   │
   │ (must release before W3 GA; W3 alpha can start in parallel after W1 ships)
   ▼
W3 WEB TOOL (60 sessions, modular)
   ├── module: shell/architecture (alpha 4 weeks after W2)
   ├── module: diagramming        (alpha + 2)
   ├── module: dhf                (alpha + 2)
   ├── module: tools shell        (alpha + 2)
   ├── modules: renderers (×12)   (rolling alpha → beta → ga)
   ├── modules: tools (×15)       (rolling)
   ├── modules: workbenches (×4)  (rolling)
   └── modules: scenarios + diff  (rolling)
```

Critical path through wave foundations: **S0.1 → S0.4 → S1.1 → S1.2 → S2.1 → S3.1 → S3.4 → SFB.5 → SREL.W1 → S7.5 → S6.1 → S9.3 → SREL.W2 → SMOD.1 → S5.1 → S4.1 → S4.2 → SREL.W3.shell.** ≈ 18 sessions on critical path; remaining 99 parallelisable across waves.

---

## 4. Per-wave critical-path callouts

### W1 callouts
1. **P0 (5 sessions) is a quiet-week.** No concurrent feature PRs.
2. **SFB.5 (part/item reclass) is HIGH IMPACT.** Coordinate Method Steward. Don't run during Web work.
3. **S3.4 (B5 reads SysML, not YAML) is the cut point.** YAML deprecated for two phases.
4. **`.kpar` ship requires Sysand toolchain** — smoke test on macOS, Linux, Windows before SREL.W1.

### W2 callouts
5. **W1 must be tagged `memo-base-v1.0.0` before W2 starts.** CLI consumes the package via URN; floating dep is forbidden.
6. **S7.5 (sysml-compat CI gate) blocks every later PR.** Land it early in W2 so subsequent ontology edits can't regress round-trip.
7. **VS Code LSP (SIMP.5) is the public-facing dev-experience win** — prioritise over EA/Cameo importers.

### W3 callouts
8. **SMOD.1–4 (module + flag infra) must land before any Tab module ships.** Without it, every feature merges into the main bundle and the rolling-alpha promise collapses.
9. **S5.7 (per-tab WS subscription) is needed before any tab handles 50k-element projects.** Land alongside Tab 1.
10. **Tab 2 split-edit (S5.3) is the technical moat.** Schedule extra time; bidirectional SysML ↔ visual sync is non-trivial.
11. **Per-renderer modules (S8.x) are independent.** Run in parallel by different sessions when ontology and dispatcher are stable.
12. **Disabled-flag fallback must never throw.** Acceptance tested on every renderer/tool module.
13. **W3.P-MIRO foundation (SMIRO.1–4) blocks all Tab 2 quality.** Without canvas + nodes + edges + worker layout, every later renderer feels janky. Land all four before SMIRO.5+ or any S8 medical renderer requires Tab 2 polish.
14. **SMIRO.12–13 (split-edit reconciler) is the highest-risk session in W3.** Visual ↔ SysML round-trip with conflict resolution. Spike before scheduling. Fallback policy: source wins; canvas rebases.
15. **ELK in worker (SMIRO.5) is required to hit Tom Sawyer-class perf.** Don't skip; don't run ELK on main thread "for now" — that path doesn't end well at 10k nodes.

---

## 5. Per-session checklist (for Sonnet)

```
[ ] Read fresh-architecture-plan.md sections referenced.
[ ] Read sysmlv2-rulebook.md rules referenced.
[ ] Read CURRENT files listed in Files: column before editing.
[ ] If W3 module: declare both SysML manifest part AND TS module.ts.
[ ] If new feature flag: register in apps/web/.env.example with default state.
[ ] Make minimal change satisfying Acceptance.
[ ] Add/update tests; assert ≥ existing test count.
[ ] Run pnpm run build && pnpm run test until green.
[ ] CLI/builder change: cd projects/<x> && memo dev sanity check.
[ ] Update CHANGELOG.md and affected docs.
[ ] Commit to main: <wave>.<phase>.<session>: <change> (#<gitlab-issue>)
[ ] Close GitLab issue via glab if listed.
[ ] If new architectural decision: ADR draft in docs/src/developers/adr/.
```

---

## 6. Open questions blocking specific sessions

| Blocker | Affects | Resolution path |
|---|---|---|
| Is `urn:kpar:requirement-derivation-library` redistributable? | SFB.1 `.project.json` `usage[]` | Investigate license; fallback: replicate locally as `memo::core::derivation`. |
| Does `sysand publish` support a private registry? | SFB.3 | Test on hosted Sysand; fallback to GitLab generic-package registry. |
| Can Langium parse OMG SysML v2 `port def` natively? | S7.1 grammar | Spike before scheduling. |
| Should `Requirement` reclassify to `item def` per FB5? | SFB.5 | Decide before SFB.5 lands; document in ADR-1-22. |
| Where does `memo arch-doc` write generated docs site? | S3.8 + SDOC | `docs/generated/` vs separate site repo. |
| What's the public registry for `memo-base.kpar`? | SREL.W1 | Sysand cloud vs GitLab generic vs npm. Decide before SREL.W1. |
| Module API surface (`@memo/web-module-api`) — what's its v1 contract? | SMOD.3 | Spike before SMOD.3; lock for W3 v0. |

Resolve before the dependent session starts.

---

## 7. Roadmap sync — spec ↔ GitLab reconciliation

**Goal:** GitLab is source of truth for state (open / in-progress / closed); this `execution-plan.md` is source of truth for scope (what should exist). A `memo roadmap-sync` utility reconciles the two.

### 7.1 Mapping convention (binding)

| Spec entity | GitLab entity |
|---|---|
| Wave (W1, W2, W3, W4) | scoped label `wave::1-ontology` · `wave::2-cli` · `wave::3-web-v0` · `wave::3-web-v1` · `wave::4-cloud-collab` |
| Phase (W1.P0, W1.P1, …) | **Milestone** named `W1.P0 Physical Separation`, `W1.P1 Namespace`, …, with description containing the phase intro and a link to its section in this file |
| Session (S0.1, SMIRO.3, …) | **Issue** in that milestone, titled `S0.1 — <one-line scope>`, body = scope + files + acceptance + tests + spec links |
| Cross-reference | Issue body links to (a) spec section anchor (b) sysmlv2-rulebook rules (c) ADR ids |

**Scoped labels (free-tier-friendly):**
- `wave::1-ontology` `wave::2-cli` `wave::3-web-v0` `wave::3-web-v1` `wave::4-future`
- `phase::P0` … `phase::P-MIRO` (matches execution plan)
- `kind::sonnet-session` (every session-issue carries this)
- `risk::high-impact` (e.g. SFB.5 part/item reclass)
- `blocks::critical-path` (callouts §4)

### 7.2 Milestone catalogue (deterministic)

`memo roadmap-sync` produces these milestones from this file. Names must match exactly.

#### Wave 1 — Ontology release

```
W1.P0  Physical separation
W1.P1  Namespace introduction
W1.P2  Core ontology
W1.P3  Viewpoints + Views as SysML
W1.P10 Templates
W1.P-FB Sysand integration + part/item reclass
W1.P7-onto SysML grammar prep (port def / interface def)
W1.P-EX Examples cleanup
W1.P-DOC.1 W1 docs
W1.SREL Wave 1 release
```

#### Wave 2 — CLI release

```
W2.P7  SysML compat + builder ports
W2.P6  Consistency rules from SysML
W2.P9  DHF compiler descriptor-driven
W2.P11 CLI parity audit + JSON/JUnit
W2.P-IMPORT Imports + LSP
W2.P-DOC.2 W2 docs
W2.SREL Wave 2 release
```

#### Wave 3 — Web tool release

```
W3.P-MOD  Module + flag infrastructure
W3.P5-shell Web shell + four-tab routing
W3.P5-tab1 Architecture tab (SysON-like editor)
W3.P-MIRO Miro-like canvas engine (E1–E12)
W3.P4    Renderer Dispatcher
W3.P5-tab2 Diagramming tab
W3.P5-tab3 DHF tab
W3.P5-tab4 Tools tab
W3.P5-ext Drop-file extensibility
W3.P8    Medical-specific renderers
W3.P-TOOL Tool modules
W3.P-MEDWB Medical workbenches
W3.P-SCEN Scenarios + diff
W3.P-COMM Plugin system + libs + domains
W3.P-DOC.3 W3 docs
W3.SREL.v0 Wave 3 v0 release (alpha)
W3.SREL.v1 Wave 3 v1 release (GA)
```

#### Wave 4 — Future

```
W4.P-MULTI Cloud + collab + comments
```

**Total milestones: 35.** Each contains 1-N issues, one per Sonnet session in that phase.

### 7.3 `memo roadmap-sync` command

```bash
memo roadmap-sync --dry-run [--strict]
memo roadmap-sync --apply
memo roadmap-sync --verify        # CI gate
memo roadmap-sync --close-stale   # close GitLab issues whose session was removed from spec
```

**Inputs:** `docs/src/developers/architecture/execution-plan.md` (this file), `glab` CLI authenticated for `somesh_sandbox/memo`.

**Algorithm:**
1. **Parse spec** — markdown reader extracts every `### W*.P*` heading + every session row (`| **S<id>** | … |`) within. Emits in-memory model `{ milestones: [{name, description, sessions: [{id, title, scope, files, acceptance, tests, gitlab}]}] }`.
2. **Fetch GitLab** — `glab milestone list --output json` + `glab issue list --milestone <m> --output json` for every milestone.
3. **Diff** — three sets:
   - `missing-in-gitlab` (spec has, GitLab does not) — create.
   - `missing-in-spec` (GitLab has, spec does not) — flag for human; `--close-stale` closes with comment "Superseded by execution-plan.md v2".
   - `present-in-both` — update title/body/labels if drift; never override state (open/closed).
4. **Apply** — invoke `glab` for each delta. Rate-limit aware (1 req/s). Idempotent.
5. **Verify** — emit non-zero exit code if any delta exists; used in CI to block merges that desync spec from GitLab.

**Issue body template:**
```markdown
> **Source of truth:** [`execution-plan.md` §<phase>](../../docs/src/developers/architecture/execution-plan.md#<anchor>)
> **Architecture:** [`fresh-architecture-plan.md` §<n>](../../docs/src/developers/architecture/fresh-architecture-plan.md#<anchor>)
> **Rules:** [`sysmlv2-rulebook.md` <rule-ids>](../../docs/src/developers/architecture/sysmlv2-rulebook.md)
> **ADRs:** ADR-<n>, ADR-<m>
> **Wave label:** ~"wave::<n>"
> **Auto-managed by:** `memo roadmap-sync`. Manual edits will be overwritten on next sync.

## Scope
<from spec>

## Files
<from spec>

## Acceptance
<from spec>

## Tests
<from spec>

## Architecture refs
- §X — ...
- Rule R<n> — ...
```

**State semantics:**
- Spec adds session → sync creates issue (open).
- Spec removes session → sync flags; with `--close-stale` closes as "superseded".
- Issue closed in GitLab + still in spec → sync leaves closed (work done; spec entry frozen for history).
- Issue body manually edited in GitLab → on next sync, body is reset to template; manual review comments preserved (separate timeline).

**Initial migration (one-shot):**
- Existing 61 open issues mapped via 1-1 table to new sessions where possible (curated by hand, committed at `docs/src/developers/architecture/issue-migration.md`); others closed with comment linking to the new issue.
- Existing milestones (Phase A/B/D/E/F/G/J/K/N0–N5/C2/M45/M75/M76/M77/N-ONTO) closed with comment "Superseded by W1/W2/W3/W4 wave structure".

### 7.4 CI gate

```yaml
roadmap_sync_check:
  stage: validate
  script:
    - memo roadmap-sync --verify
  rules:
    - changes:
        - docs/src/developers/architecture/execution-plan.md
```

PR that edits `execution-plan.md` must run `memo roadmap-sync --apply` and push the resulting GitLab state before merge. Sync itself produces no repo-file diff (state lives in GitLab); CI verifies no drift.

### 7.5 Backwards compatibility for existing roadmap scripts

`scripts/show-roadmap.sh` (already wired to `pnpm run roadmap`) updated to read the new milestones. Phase summary now grouped by `wave::` label first, then milestone. Old `Phase A/B/D/...` queries fall through to a one-line "superseded — see W1/W2/W3" message until milestones are deleted.

---

## 8. Done criteria for each wave

### W1 done
- [ ] `memo-base-1.0.0.kpar` published; downloadable.
- [ ] SysON · SysIDE · OMG pilot all open the package round-trip.
- [ ] Every `.sysml` declares `memo::*` package.
- [ ] CI gates: `sysand build`, `memo check --sysml-compat`, `memo lint`, BOM/empty-def/dangling-ref/lock-fresh — all green.
- [ ] All FB rules satisfied (`.project.json`, `sysand-lock.toml`, CI aggregator, FB5 reclass, FB6 specializes, FB7 multiplicity).
- [ ] `gpca-pump` example loads and validates standalone in SysON.
- [ ] Migration guide from prior `@memo/ontology-arch`/`process`/`profile` to `memo-base`.

### W2 done
- [ ] `@memo/cli` v1.0 on npm.
- [ ] VS Code extension on marketplace.
- [ ] All CLI commands have `--format json|junit|text`.
- [ ] DHF compiler descriptor-driven; six DHF document classes from `gpca-pump` byte-identical to golden files.
- [ ] OWL · EA · Cameo · AADL · Sysand importers green on canonical samples.
- [ ] CI templates published for GitLab + GitHub.
- [ ] User Manual published.

### W3 v0 (alpha) done
- [ ] Tab 1 GA · Tab 4 shell GA · Tabs 2/3 alpha behind flags.
- [ ] Renderer BDD GA; others behind flags.
- [ ] SMOD.1–4 module + flag infra in place; disabled-flag fallback never throws.
- [ ] `memo features list/enable/disable` works.
- [ ] Per-tab WS subscription live.
- [ ] Onboarding tour points at four tabs.

### W3 v1.0 (GA) done
- [ ] All four tabs GA.
- [ ] Renderers BDD/IBD/AFD/Matrix/Table/Tree GA.
- [ ] All medical renderers + tools at least beta.
- [ ] All workbenches at least alpha.
- [ ] All 61 GitLab issues closed.
- [ ] `architecture-blocks.drawio` matches code (`memo arch-check` clean).
- [ ] 346+ tests still pass; renderer + view + rule + composer + module test floors met.
