# Feedback Ontology Replace — Handoff

**Branch:** `feedback-ontology-replace`
**Baseline tag:** `pre-feedback-ontology-replace` (commit `00b798a`)
**Latest commit on branch:** Phase D4 — DHF tab driven by methodology bindings
**Status:** Phases 0–D4 complete. Build green. Prototype boots on gpca-pump with the new methodology pin. Dashboard sidebar shows session-local recently-visited feed. Diagrams sidebar shows methodology viewpoints (RiskManagementView VP-001, SoftwareArchitectureView VP-002) above the legacy viewpoint tree. Model Explorer drops the `views` layer (and `viewpoints`/`methodology`/`manifest`) — sidebar now Architecture/Core/Undefined only. DHF sidebar gains a "Methodology DHF" section above the legacy hard-coded groups, sourced from `methodology.folders[*].parts['DhfDocumentBinding']` (DHF-001 RMP through DHF-005 V&V Plan); clicking a binding either opens the existing doc or creates one from the matching built-in template. D5 + authoring app (Phase E) pending.

---

## Why this branch exists

User received an external reference SysML drop in `feedback/` (the "v12" methodology direction — viewpoints/views as first-class libraries, cybersecurity as a peer architecture layer, item-def reclassification of Hazard/Threat, etc.).

Decision: **replace** existing ontology with the feedback drop, exactly. Only allowed mutation = `md` → `memo` namespace + filename rename. Then make build + prototype stable on the new ontology. Iterate UI + methodology-as-data later.

User intent (paraphrased, in priority order):

1. Tag current code first.
2. SysML lives in a separate top-level folder, not mixed inside `packages/`.
3. Delete all examples except `gpca-pump`.
4. Accept test failures during the cut-over; fix later.
5. Work on a branch; merge when everything works.
6. Each methodology lives in its own folder under `ontology/methodology/<name>/` so it can grow into multiple SysML files instead of one giant file.
7. One web-app bundle (route-based for the future authoring app, not a separate Electron-style app).
8. Methodology defined in pure SysML (no hybrid YAML).

---

## Conceptual model agreed with user

```
LAYER 0  core            — common, enumerations, relationships (hidden plumbing)
LAYER 1  ontology kinds  — architecture / viewpoints / views / compliance / manifest
LAYER 2  methodology     — selects from Layer 1 + adds rules/gates/profiles/workflow/dhf docs
LAYER 3  project         — gpca-pump pins one methodology version
```

**MEMO is a methodology, not a package.** Architect projects pin a methodology; the methodology drives:

- which architecture kinds appear in the catalog
- which viewpoints + views are available
- which DHF documents are required
- which rules / gates / workflow apply

Methodologies are derivable: users fork an existing one, override selections, save as new. There will eventually be a separate authoring app (name still TBD — user said "Studio" sounds confusing).

---

## Target IA (MEMO Architect — for future Phase D)

| Tab | Contents | Driven by |
|---|---|---|
| **Dashboard** | KPIs + sidebar showing **recently updated elements** (not full tree) | model + activity log |
| **Model Explorer** | Element catalog — all 67 elements grouped by kind/layer. **Non-view items only.** | model + methodology.kinds |
| **Diagrams** | Tree: Viewpoint → View(template) → Diagram(instance). All views nested under viewpoints. | methodology.viewpoints → views |
| **DHF** | Document workbench. List = methodology.dhf_documents | methodology.dhf_documents → compliance/ |
| **Scenarios** | Behavior + mode scenarios | model |
| **Methodology** *(new — replaces Ontology tab)* | Read-only viewer of current methodology. Click "Edit" to launch authoring app. | methodology pkg |

The current **Ontology** tab is to be deleted; replaced by **Methodology**. Catalog content moves to Model Explorer; views move under viewpoints inside Diagrams.

---

## What's done on this branch

### Phase 0 — Tag + branch

- Committed all uncommitted main work as `00b798a` "checkpoint: baseline before feedback ontology replace"
- Tagged `pre-feedback-ontology-replace`
- Branched `feedback-ontology-replace`

### Phase 1 — Top-level `ontology/` from feedback

- Created top-level `ontology/` folder (separate from `packages/`)
- Copied feedback SysML exact into it:

```
ontology/
  core/                 (memo_common, memo_enumerations, memo_relationships)
  architecture/         (13 files: context, requirements, functions, logical_*, behavior,
                         software_structure, hardware_structure, physical_interfaces,
                         constraints, risk, cybersecurity, assurance)
  viewpoints/           (memo_viewpoint_core, memo_default_viewpoints)
  views/                (memo_view_core, memo_document_views)
  methodology/
    memo/               (memo_core, memo_gates, memo_patterns, memo_profiles,
                         memo_rules, memo_viewpoints, memo_workflow)
  compliance/           (memo_artifacts, memo_document_views)
  manifest/             (memo_release_manifest + .md notes)
  medical_device_library.sysml   (root aggregator; package memo::library)
```

- Renamed namespace `md::` → `memo::` (120 refs across .sysml + .md files)
- Renamed filenames `md_*` → `memo_*` (30 files)

### Phase 2 — Delete in-package SysML and old examples

- Removed `packages/ontology-arch/sysml/`
- Removed `packages/ontology-process/sysml/`
- Removed `packages/medical-modeling-profile/{sysml,profiles,templates}` and its `memo.rules.yaml`, `memo.viewpoints.yaml`
- Kept the package shells (`package.json`, `memo.package.yaml`, `memo.rendering.yaml`) so the workspace and TS builds still resolve them — they are now empty stubs.
- Deleted `examples/infusion-pump/` and `examples/irrigation-pump/`. Only `examples/gpca-pump/` remains.

### Phase 3 — Replace gpca-pump model with feedback gpca

- Wiped `examples/gpca-pump/model/` subdirs
- Copied feedback `examples/gpca/*.sysml` (13 files, flat)
- Renamed `md::` → `memo::`

### Phase 4 — Loader override for external sysml dir

In `packages/core/src/model/ontology-loader.ts`:

1. `buildPackageInfo` honors `sysmlDir:` field in `memo.package.yaml`. Resolves relative to package dir.
2. `getPackageMetadata` package-discovery loop uses the same override when checking `hasSysml`.
3. `walkExtendsChain` resolves `sysmlDir` when adding the package directory to ontology dirs.
4. `loadOntologyRegistries` SysML-collection loop uses the same override per package.

In `packages/ontology-arch/memo.package.yaml`:

```yaml
sysmlDir: "../../ontology"
```

This is what links the empty `@memo/ontology-arch` package wrapper to the top-level `ontology/` tree. The other two package wrappers have no override and contain no SysML — they're dormant.

### Phase A — methodology folder convention

- Moved `ontology/methodology/memo_*.sysml` → `ontology/methodology/memo/*.sysml`
- Convention going forward: `ontology/methodology/<methodology-name>/*.sysml`
- The root aggregator `medical_device_library.sysml` already imports by namespace (e.g. `memo::methodology::core::*`), so file location does not matter — `collectSysmlFiles` already recurses.

### Phase B — methodology as data

Goal achieved: `ontology/methodology/<name>/*.sysml` is parsed into a typed `MethodologyDescriptor` and broadcast to the web client over WebSocket, with no UI changes yet.

- Added `packages/core/src/model/methodology-loader.ts`:
  - Types: `MethodologyAttrValue`, `MethodologyPart`, `MethodologyPartDef`, `MethodologyFolderInfo`, `MethodologyDescriptor`.
  - `loadMethodologyDescriptor(configPath, projectRoot?)` — regex-based scan (mirrors `parseConstructsInFile` style; independent of Langium grammar so it survives ongoing grammar work).
  - Captures `part def Foo :> Bar { ... }` declarations and `part name : Type { attribute k = v; }` instances. Attribute parser handles string literals, qualified-enum refs (stored as both short and `__qualified` form), integers, and booleans. Part body capture relies on no-nested-brace assumption — true today across `memo_*.sysml`.
  - Discovery merges two sources, deduped by package directory: (1) `findOntologyPackageDirs(configPath)` and (2) `getPackageMetadata(projectRoot)`. Source (2) is what makes things work in the transitional state where `examples/gpca-pump/memo.config.yaml` still references retired ontology stubs (`@memo/ontology-medical-arch`, `@memo/medical-modeling-profile`); the `@memo/ontology-arch` wrapper with its `sysmlDir: "../../ontology"` override is found via the package scan.
- Exposed `findOntologyPackageDirs` and added `resolvePackageSysmlDir(pkgDir)` from `ontology-loader.ts`.
- Added `MethodologyUpdateMessage` (`type: 'methodology:update'`) to `packages/core/src/protocol/messages.ts`.
- `packages/cli/src/commands/dev.ts`:
  - Loads the descriptor once at bootstrap, logs counts, and includes a `methodology:update` message in every `rebuildProject()` broadcast (alongside `model:update`, `validation:update`, etc.).
  - Bootstrap log on gpca-pump: `Methodology: 1 folder(s), 7 file(s), 7 namespace(s), 9 part defs, 15 part instances (memo)`.
- WS payload verified end-to-end with a small native-WebSocket script — descriptor arrives with all 7 namespaces, 7 source files, 9 part defs, 15 instances across 10 partTypes (`MethodologyLibrary`, `MethodologyDefinition`, `ResolvedMethodology`, `Viewpoint:2`, `ElementUsageRule`, `RelationUsageRule`, `ModelingPattern:2`, `WorkflowStep:4`, `QualityGate`, `ProjectMethodBinding`).
- `pnpm run test` baseline unchanged: 7 failed | 267 passed | 18 skipped (same set of pre-existing infusion-pump / removed-stub failures from Phase 2 cut-over).

### Phase C — methodology package split

Goal achieved: methodology is its own publishable package; gpca-pump pins it via `methodology:`.

- New package `packages/methodology-medical-default/`:
  - `memo.package.yaml` — `name: "@memo/methodology-medical-default"`, `type: methodology`, `version: 1.0.0`, `extends: "@memo/ontology-arch"`, `sysmlDir: "../../ontology/methodology/memo"`.
  - `package.json`, `.project.json` (sysml-only, no build step).
- `examples/gpca-pump/memo.config.yaml` reduced to four lines: project name/type plus `methodology: "@memo/methodology-medical-default@^1.0"`. Dropped `extends:`, `ontologies:`, `modules:` — methodology now covers the chain.
- `packages/core/src/model/ontology-loader.ts`:
  - `OntologyPackageInfo['type']` extended with `'methodology'`. `buildPackageInfo` accepts `type: methodology` from manifests instead of coercing to ontology.
  - `findOntologyPackageDirs` got step 0: read `methodology:` field, resolve to package, walk its extends chain. Captures the chain BEFORE the legacy primary-extends step so kinds load correctly when the project no longer declares `extends:`.
  - New helper `readMethodologyChain` walks the methodology package's extends chain and returns the package names; `getPackageMetadata` ORs that set into the `selected` flag so the methodology pkg + ontology-arch render as selected in the Ontology viewer.
  - `loadOntologyRegistries` now dedupes its SysML file list by absolute path — the methodology pkg's `sysmlDir` (`ontology/methodology/memo`) is nested inside `@memo/ontology-arch`'s `sysmlDir` (`ontology/`), so the two pkg dirs would otherwise re-parse the same files.
  - Methodology field regex preserves `@memo/` scope when stripping the optional `@<version>` suffix (uses last-`@` rather than character-class exclusion).
- `pnpm run build` — 9/9 successful. Bootstrap log on gpca-pump: `Ontology: 116 kinds, 0 relationships (from 31 SysML files); Methodology: 1 folder(s), 7 file(s), 7 namespace(s), 9 part defs, 15 part instances (memo)`. Browser: 67 elements, 100% complete, 0 console errors. Ontology viewer lists `@memo/methodology-medical-default` (type `methodology`, selected) and `@memo/ontology-arch` (type `ontology`, selected, 100 kinds, 7 layers).
- `pnpm run test` unchanged: 7 failed | 267 passed | 18 skipped — same pre-existing failures.

Phase C **deferred** the empty-stub deletion (`packages/ontology-process`, `packages/medical-modeling-profile`). They're still referenced by `@memo/cli` deps, `init.ts` defaults, `dev-server.ts` profile-name table, and the e2e test suite. Removing them is a wider cleanup that belongs to Phase G alongside the doc/ADR alignment, not this milestone.

---

## Verified working

- `pnpm run build` — 8/8 packages, no errors
- `pnpm run test` — most pass; `@memo/cli` e2e fails on `execSync ENOENT` (env/sandbox issue, unrelated to ontology work)
- `memo dev` on `examples/gpca-pump`:
  - Server starts on port 3000
  - Model loads: 67 elements, 1 generated diagram, 0 relationships, 100% completeness
  - **Ontology viewer** shows `@memo/ontology-arch` v0.1.0 with **100 kinds, 7 layers**
  - **Diagrams tab** lists kinds correctly: HardwareAssembly, SoftwareComponent, BehaviorMachine, ModeState, BehaviorProperty, LogicalFunction
  - Tabs render: Dashboard, Model Explorer, Diagrams, DHF, Scenarios, Ontology, Tools — no console errors

`.claude/launch.json` configured to run `memo dev` against `examples/gpca-pump` on port 3000.

---

## Known gaps (accepted; fix later)

1. **0 relationships parsed** — feedback uses connection-def syntax + multiplicity expressions the current Langium grammar doesn't fully recognize. `RelationshipRegistry` returns empty.
2. **`gpca_views.sysml` parser warnings** — `view def { private import ... }`, `presentationKind = ...` expressions, list literals, `,` inside braces. Langium grammar needs extending.
3. **`methodology/`, `viewpoints/`, `views/`, `compliance/` not yet surfaced in UI** — loader treats the whole `ontology/` tree as one architecture package. Need per-area packaging or a new methodology-aware loader to drive Diagrams (viewpoints→views) and DHF (artifacts).
4. **`@memo/ontology-process` and `@memo/medical-modeling-profile`** — empty wrappers. Either delete entirely or repurpose later (medical-modeling-profile may become the first methodology pkg).
5. **`@memo/cli` e2e tests** — 11 failing on `spawnSync /bin/sh ENOENT` (test runner shell issue, not ontology).
6. **Docs in `docs/design_guidelines/architecture/`** still reference the pre-replace structure.
7. **GitLab roadmap milestones** (W1.P-FB, W1.P0, W1.P1, W1.P2, W1.P3, W2.P6, W3.P-MEDWB, etc.) are not yet aligned with the new top-level `ontology/` layout.

---

## Phases queued (do these in a new session, in this order)

### Phase D — UI re-IA

Goal: implement the target IA. **Touch one tab at a time. Verify in browser between each.**

- **D1** Dashboard sidebar → "Recently updated elements" feed (replace current full-tree element list). ✅ done — `DashboardSidebar.tsx`, store gained `recentlyVisited: string[]` (session-only, top 20). Falls back to kind-diverse sample when empty. Activated only for `activeView.type === 'dashboard'`.
- **D2** Diagrams tab → tree = methodology.viewpoints → views → user-drawn diagrams. Each view-def from `ontology/views/` becomes a template; user diagrams appear nested under their matching view. ⚠️ partial — methodology:update wired into store (`methodology` field + `setMethodology`); `ViewExplorerContent` shows a "Methodology Viewpoints" section above the legacy tree, sourced from `methodology.folders[*].parts['Viewpoint']`. Each entry currently a stub (title + id + description on expand). Still pending: nesting view-defs from `ontology/views/` under each viewpoint, and matching user diagrams to a methodology viewpoint id (today they only know about legacy `model.viewpoints`).
- **D3** Model Explorer → pure element catalog (kinds + instances). Drop view rendering from this tab. ✅ done — `ExplorerPanel.tsx` `groupTree` filters out `NON_ELEMENT_LAYERS = {views, viewpoints, methodology, manifest}` from both the layer-group derivation and the `Undefined — Not in Ontology` fallback. Sidebar gate switched from `activeView.type === 'dashboard'` to `activeMode === 'dashboard'` so DashboardSidebar no longer leaks into catalog mode. `ModeSwitcher` `case 'catalog'` now `setActiveView({ type: 'welcome' })` so the dashboard view doesn't linger after navigation, and `activeNavMode` returns `'catalog'` when `activeMode === 'catalog'` so the Model Explorer button highlights correctly. Verified in browser: gpca-pump Catalog shows Architecture (56), Core (3), Undefined (6) — no Views group.
- **D4** DHF tab → list driven by `methodology.dhf_documents`. Each entry uses its referenced document-view template from `ontology/compliance/`. ✅ done — added `DhfDocumentBinding` part def to `ontology/methodology/memo/memo_core.sysml` (attrs: documentTitle, groupLabel, templateId, viewKind, regulatoryReference, lifecycleStage, required) and seeded 5 instances in `memo_profiles.sysml` (DHF-001 RMP, DHF-002 HAR, DHF-003 SAD, DHF-004 Threat Model, DHF-005 V&V Plan). `DhfExplorerContent` in `ExplorerPanel.tsx` reads `methodology.folders[*].parts['DhfDocumentBinding']` and renders a "Methodology DHF" section above the legacy `DHF_GROUPS` tree. Clicking a binding row: opens the existing doc if `templateId` already maps to one, else `createDocuments([tmpl])` using the matching DHF_GROUPS template; rows show ✓ when bound doc exists, `+` otherwise. Required flag tints the ID red. `dev.ts` `rebuildProject` now reloads the methodology descriptor on every rebuild (was bootstrap-only) so SysML edits to methodology hot-reload too. **Pending wiring:** the `viewKind` reference is captured but not yet used to inject content from `ontology/compliance/` document-view kinds (CybersecurityThreatModelView, CybersecurityAssessmentView) — currently still uses built-in markdown templates from `dhf/built-in-templates.ts`. Tie-up belongs with Phase E (authoring) when document-view → template generation lands.
- **D5** Delete Ontology tab. Add **Methodology** tab — read-only viewer showing the active methodology (viewpoints, views, DHF docs, rules). Add a "Edit in <authoring app>" button (disabled until Phase E lands).
- After D5, the old kinds list moves to a collapsed sub-pane inside Model Explorer (dev-only debug surface).

### Phase E — methodology authoring app

Goal: derive / override / publish methodologies. Same web-app bundle, separate route.

- Decide name (user said "Studio" is confusing; not yet picked).
- Scaffold under a new route in `packages/web/` — e.g. `/methodology` or `/author`.
- List installed methodologies + local drafts.
- Fork / derive flow: clone an existing methodology, surface the selectors (viewpoint picker, view picker, DHF picker, rules editor).
- Publish flow: emit a new SysML methodology folder under `ontology/methodology/<name>/`, generate `memo.package.yaml` for it.

### Phase F — grammar + relationships

Goal: close known gaps.

- Extend `packages/core/memo-sysml.langium` with feedback constructs (`view def` body, `presentationKind`, list literals, `connection def` ends, `port def`, `interface def`, `flow`).
- Fill `RelationshipRegistry` from the new connection defs.
- Re-run `memo validate` against gpca-pump until 0 parser warnings.

### Phase G — alignment + merge

- Update `docs/design_guidelines/architecture/overview.md` and ADRs (especially ADR-1-10) to describe `ontology/` layout + methodology-as-package model.
- Reconcile GitLab roadmap (W1.P-FB, W1.P0–P3, W2.P6, W3.P-MEDWB) with the actual layout — close anything Phase 0–A already covered, file gap issues for what's missing.
- Run full `pnpm run build && pnpm run test`. Aim for green.
- Run `memo dev` on gpca-pump end-to-end (every tab loads, ontology viewer populates, no console errors, completeness > 0%).
- Open PR / merge to `main`. Delete the `feedback/` source folder once merged (it's only a reference drop).

---

## Execute in a new session

1. Pull the branch:
   ```bash
   cd /Users/someshkashyap/sandbox/memo
   git fetch
   git checkout feedback-ontology-replace
   git log --oneline -5
   ```
2. Read this file end-to-end before touching code.
3. Confirm baseline builds + boots:
   ```bash
   pnpm run build
   ```
   then in a separate shell:
   ```bash
   cd examples/gpca-pump
   node ../../packages/cli/lib/bin/memo.js dev
   ```
   open http://127.0.0.1:3000 and verify Ontology tab shows `@memo/ontology-arch` with 100 kinds, 7 layers.
4. Pick the next phase from the queue (start with **Phase D**).
5. Work in small commits. After each substantive change run `pnpm run build` and reload the dev server. Accept test failures only when explicitly noted in this doc — fix the rest.
6. Update this handoff file at the end of every session: tick off completed phases, add any new known gaps, leave a one-line "next person picks up at" pointer.
7. Do **not** merge to `main` until Phase G passes.

If anything in this doc conflicts with what you observe in the code, **trust the code**, then update this doc.

---

## Safety net

If the branch goes off the rails:

```bash
git reset --hard pre-feedback-ontology-replace
```

Tag is on the baseline commit; no work prior to Phase 0 will be lost.
