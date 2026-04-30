# Two-Ontology Refactor — `memo-arch` + `memo-process`

**Status:** Plan
**Date:** 2026-04-20
**Authority:** `docs/likec4/memo-ontology-architecture.v12.drawio` (6 tabs: Visual Map, OWL Classes, Object Properties, Data Properties, Axioms, SysMLv2/AADL Binding)
**Goal:** Collapse 9 fragmented ontology packages into **2 clean packages** that match v12. Delete everything else. No backwards compat.

---

## 1. Motivation

Current state — 9 ontology/profile packages, overlapping scopes, no clear separation:

```
ontology-medical-arch
ontology-medical-process
ontology-cybersecurity
ontology-iec62304
ontology-clinical-interop
ontology-clinical-procedure
ontology-medical-clinical-trial
ontology-ros
medical-product-line-profile
medical-modeling-profile     (rules/viewpoints — kept, retargeted)
```

v12 ontology design has only **two natural axes**:

- **Architecture axis** — layered: Operational → Behavioral → Functional → Logical → Software → Hardware → Verification → Safety → Security → Privacy → Software Extension. Owns 53 of 56 OWL classes.
- **Process axis** — layered by **standard**: ISO 14971, IEC 62304, IEC 60601, ISO 13485, ISO 14155, ISO 27001/27701, FDA 21 CFR 820, EU MDR. Owns process activities, work products, design reviews, evidence routing.

Everything else is either (a) an architecture concern misfiled as a separate ontology (ROS, cybersecurity, clinical-interop), or (b) a process concern misfiled (iec62304, clinical-trial, clinical-procedure).

---

## 2. Target State

### 2.1 Two packages

```
packages/
  ontology-arch/         # @memo/ontology-arch    — was: ontology-medical-arch + ros + cybersecurity + clinical-interop + clinical-procedure (arch parts)
  ontology-process/      # @memo/ontology-process — was: ontology-medical-process + iec62304 + clinical-trial + (process parts of others)
  medical-modeling-profile/  # kept — retargeted to depend on the two above
```

### 2.2 `@memo/ontology-arch` — layered like v12 Visual Map

Directory = layer (Apollo-11 pattern). Layers are **architectural**, not domain-tagged.

```
ontology-arch/
  memo.package.yaml
  memo.rendering.yaml          # layer colors/icons (one per layer below)
  sysml/
    operational/               # System, Actor, EnvironmentContext, UserNeed, IntendedUse
    behavioral/                # Scenario, Action, ClinicalAction, StateMachine, State, Transition, Event
    functional/                # Function, DataObject, ConstraintDefinition
    logical/                   # LogicalComponent, Interface, Port
    software/                  # SoftwareComponent, SoftwareInterface, ExecutionThread, SoftwareModule
    software-extension/        # ROSNode, ROSTopic, ROSMessageType, ROSService, ROSAction
    hardware/                  # HardwareComponent, HardwareAssembly, HardwareBoard, HardwarePart, Processor
    safety/                    # Hazard, HazardousSituation, Harm, Risk, Mitigation, FailureMode, FaultTreeNode
    security/                  # TrustBoundary, Asset, ThreatScenario, Control
    privacy/                   # DataCategory, DataSubjectCategory, ProcessingActivity, RetentionRule, PrivacyRiskScenario
    verification/              # Requirement, VerificationCase, Evidence, SecurityRequirement, PrivacyRequirement
    relationships/             # all 45 connection defs (refines, satisfies, allocatedTo, ...)
    axioms/                    # disjointness, restrictions, SWRL, SHACL shapes
```

**Class count target:** 56 (matches v12 Tab 2). **Object property count:** 45 (Tab 3). **Data property count:** ~55 (Tab 4). **Axiom count:** 37 (Tab 5).

### 2.3 `@memo/ontology-process` — layered by standard

Directory = standard. Each standard owns its process activities, work products, lifecycle phases, and roles.

```
ontology-process/
  memo.package.yaml
  memo.rendering.yaml          # color per standard
  sysml/
    iso-14971/                 # Risk-management process (RMP, RMF, post-market surveillance feedback)
    iec-62304/                 # Software lifecycle (planning, requirements, architecture, unit/integration/system testing, problem resolution, configuration mgmt)
    iec-60601/                 # Essential performance + general safety processes
    iso-13485/                 # QMS (design control, CAPA, document control, supplier control, management review)
    iso-14155/                 # Clinical investigation process (replaces ontology-medical-clinical-trial)
    iso-27001-27701/           # Security & privacy mgmt processes
    fda-21cfr820/              # Design History File, Device Master Record, Device History Record
    eu-mdr/                    # CE mark technical documentation, PMCF
    common/                    # ProcessActivity, WorkProduct, DesignReview base defs (v12 C-034..C-036)
    relationships/             # producesEvidence, governedBy, sourceStandard, regulatoryClause
```

**Bridges to arch:** every WorkProduct binds to one or more arch classes via `tracedTo` / `producesEvidence` / `verifies`. The two ontologies stay decoupled at the SysML level — process imports arch, never the reverse.

### 2.4 `medical-modeling-profile` — retargeted

Stays as the consumer-facing profile. Now extends only the two new ontologies:

```yaml
# medical-modeling-profile/memo.package.yaml
extends:
  - "@memo/ontology-arch"
  - "@memo/ontology-process"
```

Internal `memo.rules.yaml` and `memo.viewpoints.yaml` stay — viewpoints are the right place for cross-cutting view definitions (FMEA view, DHF view, hazard log, ROS topology view).

---

## 3. Mapping — Old to New

| Old package | Where its content goes | Notes |
|---|---|---|
| `ontology-medical-arch` | `ontology-arch/` (becomes the seed) | Move all `sysml/{operational,behavioral,functional,logical,software,hardware,verification,analysis,interfaces,system,ui}/` |
| `ontology-medical-arch/sysml/ui/` | **delete** | UI is not architecture; viewpoints handle this |
| `ontology-ros/` | `ontology-arch/sysml/software-extension/` | ROS is a SW specialization (v12 Tab 2 C-037..C-041) |
| `ontology-cybersecurity/sysml/cybersecurity/` | `ontology-arch/sysml/security/` | v12 sec: namespace classes C-046, C-047, C-052, C-054 |
| `ontology-cybersecurity/sysml/privacy/` | `ontology-arch/sysml/privacy/` | v12 C-048..C-051, C-053, C-056 |
| `ontology-clinical-interop/sysml/interop/terminology.sysml` | `ontology-arch/sysml/functional/` (DataObject specialization) OR **delete** | Terminology is a DataObject kind — keep as a value-type extension, not a package |
| `ontology-clinical-procedure/sysml/procedure/` | `ontology-arch/sysml/behavioral/` (ClinicalAction extends) | Already covered by `med:ClinicalAction` (C-026). Audit, dedupe, then delete the package. |
| `ontology-medical-process/` | `ontology-process/` (becomes the seed) | Move `design-control/`, `operations/`, `risk/`, `safety/` content split per standard below |
| `ontology-medical-process/sysml/design-control/` | `ontology-process/sysml/iso-13485/` + `fda-21cfr820/` | Design control = ISO 13485 §7.3 + 21 CFR 820.30 |
| `ontology-medical-process/sysml/risk/` | `ontology-process/sysml/iso-14971/` | Risk **process**; risk **classes** (Hazard etc.) stay in arch/safety |
| `ontology-medical-process/sysml/safety/` | `ontology-process/sysml/iec-60601/` | Essential performance is 60601 process |
| `ontology-medical-process/sysml/operations/` | `ontology-process/sysml/iso-13485/` | Post-market = QMS |
| `ontology-iec62304/sysml/software-lifecycle/` | `ontology-process/sysml/iec-62304/` | Direct rename |
| `ontology-medical-clinical-trial/sysml/clinical-trial/` | `ontology-process/sysml/iso-14155/` | Clinical investigation standard |
| `medical-product-line-profile/` | **delete** | Out of scope for v12; product-line is a future concern, not an ontology |

---

## 4. Execution Plan

### Phase 0 — Reference snapshot

```bash
git tag pre-ontology-refactor-2026-04-20
git push origin pre-ontology-refactor-2026-04-20
```

Tag is the rollback / diff reference. No branch — work on `main` per project convention.

### Phase 1 — Inventory & gap audit

1. For each **old** package, list every `part def`, `connection def`, `attribute def`, `enum def` in its `sysml/`.
2. For each **v12** class (56), object property (45), data property (~55), axiom (37), confirm a source in step 1. Flag missing items — these get authored fresh.
3. Flag duplicates (e.g., `ClinicalAction` likely defined in both `ontology-medical-arch` and `ontology-clinical-procedure`).
4. Flag drift from v12 (anything in old packages not in v12 → delete unless justified).

Output: `docs/src/developers/architecture/ontology-refactor-inventory.md` with three tables: keep, rewrite, delete.

### Phase 2 — Scaffold new packages

```bash
# Create empty packages with v12-aligned layer dirs
packages/ontology-arch/{memo.package.yaml, memo.rendering.yaml, sysml/<11 layers>/}
packages/ontology-process/{memo.package.yaml, memo.rendering.yaml, sysml/<8 standards + common>/}
```

`memo.rendering.yaml` for arch: one color per architectural layer (use v12 visual-map palette).
`memo.rendering.yaml` for process: one color per standard.

### Phase 3 — Author `ontology-arch`

Order (lowest deps first):

1. `operational/` — System, Actor, EnvironmentContext, UserNeed, IntendedUse
2. `behavioral/` — Scenario, Action, ClinicalAction, StateMachine, State, Transition, Event
3. `functional/` — Function, DataObject, ConstraintDefinition
4. `logical/` — LogicalComponent, Interface, Port
5. `software/` — SoftwareComponent, SoftwareInterface, ExecutionThread, SoftwareModule
6. `software-extension/` — ROS classes (extend `software/`)
7. `hardware/` — HardwareComponent + 4 specializations
8. `safety/` — full risk chain (Hazard → HazardousSituation → Harm → Risk → Mitigation, FailureMode, FaultTreeNode)
9. `security/` — TrustBoundary, Asset, ThreatScenario, Control
10. `privacy/` — DataCategory, DataSubjectCategory, ProcessingActivity, RetentionRule, PrivacyRiskScenario
11. `verification/` — Requirement, VerificationCase, Evidence, SecurityRequirement, PrivacyRequirement
12. `relationships/` — all 45 `connection def`s with domain/range exactly per v12 Tab 3
13. `axioms/` — disjointness, cardinality restrictions, SWRL (risk_before/after multiplication), SHACL shapes (acyclic FTA, schedulability, RPN, hardware bounds, residualRisk ≤ impact, release-gate)

For each file: copy content from old package where it matches v12; rewrite where v12 supersedes; author fresh where v12 introduces new (security/privacy classes, hardware refinements C-042..C-045).

### Phase 4 — Author `ontology-process`

1. `common/` — ProcessActivity, WorkProduct, DesignReview (v12 C-034..C-036)
2. `iso-14971/` — RMP, RMF, hazard analysis activity, post-market surveillance feedback loop
3. `iec-62304/` — software lifecycle phases (planning, requirements, architectural design, detailed design, unit impl, integration, system test, release, problem resolution, config mgmt) — class A/B/C tailoring
4. `iec-60601/` — essential performance verification process
5. `iso-13485/` — QMS processes (design control §7.3, CAPA §8.5, document control §4.2, management review §5.6, supplier control §7.4)
6. `iso-14155/` — clinical investigation plan, investigator brochure, CSR
7. `iso-27001-27701/` — ISMS + PIMS processes (risk treatment, statement of applicability, DPIA)
8. `fda-21cfr820/` — DHF, DMR, DHR
9. `eu-mdr/` — technical documentation per Annex II/III, PMCF
10. `relationships/` — producesEvidence (process → arch verification), sourceStandard, regulatoryClause, governedBy

### Phase 5 — Retarget `medical-modeling-profile`

- Update `memo.package.yaml` `extends:` to the two new packages.
- Audit `memo.rules.yaml` (33.6K) — every rule references an ontology class; rewrite refs to `@memo/ontology-arch` or `@memo/ontology-process` namespaces.
- Audit `memo.viewpoints.yaml` (17.2K) — same.
- Templates under `templates/` (connected-device, infusion-pump, monitoring-device, samd, ventilator) — repoint imports.

### Phase 6 — Update CLI

Files to touch (from current grep):

- `packages/cli/lib/server/dev-server.js:400-402` — drop `MEMO_Ontology_MedicalArch`/`MEMO_Ontology_MedicalProcess` mappings, replace with `MEMO_Ontology_Arch`/`MEMO_Ontology_Process`.
- `packages/cli/lib/commands/init.js:35` — `DEFAULT_ONTOLOGY` stays `@memo/medical-modeling-profile` (profile, not raw ontology).
- `packages/cli/lib/commands/create-package.js:44` — change default `--extends` to `@memo/ontology-process`.
- `packages/cli/lib/__tests__/e2e-workflow.test.js` — full rewrite of expectations (lines 57, 71-94, 176-243, 264-291, 304-326, 350, 409): replace old package names with `@memo/ontology-arch` / `@memo/ontology-process`.
- `packages/cli/package.json` — replace `@memo/ontology-medical-process` workspace dep with `@memo/ontology-process`.

### Phase 7 — Delete old packages

After build + tests green on the new packages:

```bash
rm -rf packages/ontology-medical-arch
rm -rf packages/ontology-medical-process
rm -rf packages/ontology-cybersecurity
rm -rf packages/ontology-iec62304
rm -rf packages/ontology-clinical-interop
rm -rf packages/ontology-clinical-procedure
rm -rf packages/ontology-medical-clinical-trial
rm -rf packages/ontology-ros
rm -rf packages/medical-product-line-profile
```

Update `pnpm-workspace.yaml` if it lists packages explicitly. Run `pnpm install` to refresh the lockfile.

### Phase 8 — Examples

For each of `examples/{infusion-pump, irrigation-pump, gpca-pump}/`:

- Update `memo.config.yaml` `extends:` if it references any deleted package.
- Resolve any `import` in `.sysml` files that pointed at an old namespace.
- Run `memo dev` — confirm parser, validator, and all view types render.

### Phase 9 — Tests + docs

- Run full test suite. Fix any non-test code that referenced old packages.
- Update `CLAUDE.md` package structure block to show the two-package layout.
- Update `docs/src/developers/architecture/overview.md` package diagram.
- Add ADR: `docs/src/developers/adr/ADR-1-10-two-ontology-refactor.md` capturing rationale + the v12 alignment.
- Drop `docs/src/developers/architecture/ontology-rearchitecture.md` if superseded — review first.

### Phase 10 — Sanity check vs v12

For each of v12's 6 tabs, run a query against the new ontology:

- Tab 2 — count of `part def` per layer matches v12 class table.
- Tab 3 — count of `connection def` matches 45.
- Tab 4 — count of `attribute def` matches ~55.
- Tab 5 — SHACL shape count + SWRL rule count matches 37.
- Tab 6 — every class has a `@sysmlBinding(...)` and `@aadlBinding(...)` annotation matching the binding matrix.

Pass = refactor done.

---

## 5. Risks & Decisions

| Risk | Mitigation |
|---|---|
| Examples break mid-refactor | Keep `pre-ontology-refactor-2026-04-20` tag. Examples updated in Phase 8 in lockstep with Phase 7 deletion. |
| `medical-modeling-profile` rules drift from new class names | Phase 5 is gated on Phase 3+4 done. Run profile-rule unit tests before deleting old packages in Phase 7. |
| ClinicalAction / terminology classes lost | Phase 1 inventory explicitly diffs old packages against v12 — anything in old not in v12 is an explicit delete decision logged in the inventory doc. |
| v12 itself missing things current code uses (e.g., `ui` layer) | Treat v12 as authoritative — anything outside v12 gets deleted, not migrated. UI concerns belong in viewpoints, not ontology. |
| Process side has no current source for IEC 60601 / EU MDR / 21 CFR 820 / 27001 | Author fresh in Phase 4 — these are net-new but small (a handful of activities + work products each). |

---

## 6. Out of Scope

- No CLI UX changes beyond renaming.
- No web app refactor — only the dev-server import map changes.
- No new viewpoints.
- No two-repo split (`memo-base` / `memo-architect`) — that is a separate roadmap item.
- No SHACL/SWRL execution engine work — axioms are authored, validation engine integration is deferred.

---

## 7. Acceptance

Done when:

1. `packages/ontology-arch` and `packages/ontology-process` exist; all 9 old packages deleted.
2. `pnpm run build && pnpm run test` green.
3. All three examples run via `memo dev` and render every view type.
4. v12 sanity check (Phase 10) passes class/property/axiom counts.
5. ADR-1-10 merged.
6. `pre-ontology-refactor-2026-04-20` tag still exists for diff/rollback reference.
