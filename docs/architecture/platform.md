# MEMO Platform Architecture & Grand Plan

**Status:** Proposal (supersedes earlier ontology/methodology splits once accepted)
**Owner:** Somesh Kashyap
**Branch context:** continues from `feedback-ontology-replace`

---

## 1. Goals

1. SysML v2 = single source of truth. Push everything possible into `.sysml` files.
2. One canonical ontology — **MEMO Ontology** — comprehensive for medical-device modeling.
3. Default methodology — **MEMO Default** — comprehensive medical-device methodology covering full DHF set.
4. Custom methodology (e.g. **GPCA**) demonstrates tailoring: hide layers, hide element kinds, hide DHF docs, override workflow.
5. Three orthogonal dimensions for grouping: **Architecture**, **Compliance**, **Artifacts**.
6. Methodology selects subsets across all dimensions including **viewpoints**.
7. Helper SysML packages (base/core) are libraries — not ontology content.
8. CLI tools for creating/extending ontology, methodology, project.

---

## 2. Conceptual stack

```
L0  helpers                     ← @memo/sysml-base (libraries, not ontology)
    common types, enumerations, dimension defs, alias defs, rule defs
    Reused by every higher layer. No domain content.

L1  MEMO ontology               ← @memo/ontology
    domain kinds across 3 dimensions:
      - Architecture (layered: operational, functional, ..., safety, cybersecurity)
      - Compliance (per standard: ISO 14971, IEC 62304, FDA 21 CFR 820, ...)
      - Artifacts (concrete DHF docs: SAD, SRS, RMP, FMEA, ...)
    + viewpoint types (RiskMgmt, SwArch, Cybersecurity, ...)
    + relationships
    + invariant rules

L2  methodology                 ← @memo/methodology-default (or fork)
    declares LAYER SET, STANDARD SET, ARTIFACT SET, VIEWPOINT TYPE SET
    selects subset of ontology kinds (scope)
    aliases method terms → concrete ontology kinds
    workflow, gates, DHF bindings, project rules

L3  project                     ← examples/gpca-pump
    pins methodology version (transitively pins ontology version)
    contains element instances
```

L0 is the only layer that is repo-private helpers. L1 and L2 are publishable packages.

---

## 3. Dimensions and how kinds attach to them

```sysml
package memo::base::dimensions {
    enum def DimensionKind { enum architecture; enum compliance; enum artifact; enum viewpoint; }

    part def ElementKind :> TraceableElement {
        attribute kindName : String;
        attribute description : String;
        attribute dimensions : DimensionKind[1..*];  // can span multiple
    }

    part def ArchitectureElementKind :> ElementKind {
        attribute archLayer : String;          // operational | software | safety | ...
    }

    part def ComplianceElementKind :> ElementKind {
        attribute standard : String[1..*];     // "ISO 14971" | "IEC 62304" | ...
        attribute clause : String[*];          // "4.1", "5.5.4", ...
    }

    part def ArtifactElementKind :> ElementKind {
        attribute documentTitle : String;       // "Software Architecture Document"
        attribute regulatoryReference : String[*];
    }

    part def ViewpointTypeKind :> ElementKind {
        attribute typeId : String;              // "RiskMgmt" | "SwArch" | ...
    }
}
```

A concrete kind specializes one or more. Example: `Hazard` extends both `ArchitectureElementKind(safety)` and `ComplianceElementKind(ISO 14971)`. Same instance shows in Model Explorer (safety layer) and Compliance tab (ISO 14971 group).

---

## 4. Single ontology repo: `@memo/ontology`

```
ontology/
  base/                            ← L0 helpers (renamed from current ontology/core/)
    common.sysml                   common attrs, enumerations
    dimensions.sysml               DimensionKind, ElementKind subkinds
    relationships.sysml            base relationship + endpoint defs
    rules.sysml                    Rule part def + RuleStrengthKind
    aliases.sysml                  ElementKindAlias part def
    viewpoints.sysml               Viewpoint, ViewpointTypeKind part defs
    views.sysml                    View, DiagramView, DocumentBackedView part defs

  architecture/                    ← L1 dim 1: kinds tagged dimension=architecture
    operational/*.sysml
    functional/*.sysml
    logical/*.sysml
    behavioral/*.sysml
    software/*.sysml
    hardware/*.sysml
    safety/*.sysml
    cybersecurity/*.sysml
    requirements/*.sysml
    context/*.sysml
    constraints/*.sysml

  compliance/                      ← L1 dim 2: kinds tagged dimension=compliance
    iso-14971/*.sysml              Hazard, RiskControl, RiskMatrix, RiskBenefit
    iec-62304/*.sysml              SOUPComponent, SoftwareItem, SoftwareUnit
    fda-21cfr820/*.sysml           DesignInput, DesignOutput, DesignReview
    fda-cybersecurity/*.sysml      ThreatModel artifacts, SBOM
    iso-13485/*.sysml              QMS records
    iso-14155/*.sysml              clinical investigation kinds

  artifacts/                       ← L1 dim 3: real DHF document kinds (not abstract)
    risk-management-plan.sysml         RiskManagementPlan
    hazard-analysis-report.sysml       HazardAnalysisReport
    fmea.sysml                         FMEA
    software-development-plan.sysml    SoftwareDevelopmentPlan
    software-requirements-spec.sysml   SoftwareRequirementsSpecification
    software-architecture-document.sysml SoftwareArchitectureDocument  // SAD
    software-detailed-design.sysml     SoftwareDetailedDesign          // SDD
    software-vv-plan.sysml             SoftwareVVPlan
    soup-list.sysml                    SOUPList
    sbom.sysml                         SBOM
    system-requirements-spec.sysml     SystemRequirementsSpecification // SRS
    system-architecture-description.sysml
    interface-control-document.sysml   ICD
    threat-model.sysml                 ThreatModel
    cybersecurity-assessment.sysml     CybersecurityAssessment
    user-needs.sysml                   UserNeeds
    design-input.sysml                 DesignInputSpecification
    design-output.sysml                DesignOutputSpecification
    vv-plan.sysml                      VVPlan
    vv-report.sysml                    VVReport
    design-review-record.sysml
    dhf-index.sysml                    DHFIndex
    ...                                ~50 doc kinds total

  viewpoints/                      ← L1 viewpoint types
    risk-management.sysml          ViewpointType: RiskMgmt
    software-architecture.sysml    ViewpointType: SwArch
    cybersecurity.sysml            ViewpointType: Cyber
    system-context.sysml           ViewpointType: Context
    logical-architecture.sysml     ViewpointType: Logical
    ...

  views/                           ← L1 view templates (instances of view defs)
    document-views/*.sysml
    diagram-views/*.sysml

  relationships/*.sysml            cross-dimension connection defs
  rules/*.sysml                    invariant rules (e.g. SystemRequirement → UserNeed trace)
```

`buildLayers` walks: top-level dim folder = UI tab. Sub-folder under arch = arch layer. Sub-folder under compliance = standard. Each artifact file = one document kind.

---

## 5. Methodology

### 5.1 Default methodology — `@memo/methodology-default`

Comprehensive medical-device methodology. Selects:

- All architecture layers
- All standards (ISO 14971, IEC 62304, FDA 21 CFR 820, FDA cyber, ISO 13485, ISO 14155)
- All ~50 artifact kinds (full DHF set)
- All viewpoint types
- Strict rules (most invariants required)
- Full workflow (requirements → architecture → risk → design → V&V → DHF compile)

### 5.2 Custom methodology example — `@memo/methodology-gpca`

Forks `@memo/methodology-default`. Demonstrates:

- Hide layers (e.g. drop `cybersecurity` layer for non-networked pump variant)
- Hide element kinds (drop `SOUPComponent` if no SOUP used)
- Hide DHF documents (drop ICD if pump has no external interfaces)
- Override workflow (skip cybersecurity stage)
- Override viewpoint set (drop CyberViewpoint)
- Override rules (downgrade `IEC 62304 §5.5.4 trace required` to recommended for prototype phase)

### 5.3 Methodology declarations in SysML

```sysml
package memo::methodology::default::scope {
    private import memo::base::*;

    part defaultLayerSet : MethodologyLayerSet {
        attribute layers = {
            "operational","functional","logical","behavioral",
            "software","hardware","safety","cybersecurity",
            "requirements","context","constraints"
        };
    }

    part defaultStandardSet : MethodologyStandardSet {
        attribute standards = {
            "ISO 14971","IEC 62304","FDA 21 CFR 820",
            "FDA Cybersecurity Guidance","ISO 13485","ISO 14155"
        };
    }

    part defaultArtifactSet : MethodologyArtifactSet {
        attribute artifactKinds = {
            "RiskManagementPlan","HazardAnalysisReport","FMEA",
            "SoftwareDevelopmentPlan","SoftwareRequirementsSpecification",
            "SoftwareArchitectureDocument","SoftwareDetailedDesign",
            "SoftwareVVPlan","SOUPList","SBOM",
            "SystemRequirementsSpecification","SystemArchitectureDescription",
            "InterfaceControlDocument","ThreatModel","CybersecurityAssessment",
            "UserNeeds","DesignInputSpecification","DesignOutputSpecification",
            "VVPlan","VVReport","DesignReviewRecord","DHFIndex"
            // ~30+ more
        };
    }

    part defaultViewpointTypeSet : MethodologyViewpointTypeSet {
        attribute viewpointTypes = {
            "RiskMgmt","SwArch","Cyber","Context","Logical",
            "Behavioral","Hardware","Verification","DHF"
        };
    }

    part defaultScope : MethodologyScope {
        attribute includedArchLayers = defaultLayerSet.layers;
        attribute includedStandards = defaultStandardSet.standards;
        attribute includedArtifactKinds = defaultArtifactSet.artifactKinds;
        attribute includedViewpointTypes = defaultViewpointTypeSet.viewpointTypes;
        attribute excludedKinds = {};   // override per-kind
    }
}
```

### 5.4 GPCA tailoring

```sysml
package memo::methodology::gpca::scope {
    private import memo::methodology::default::scope::*;

    part gpcaScope : MethodologyScope {
        // start from default, then subtract
        attribute includedArchLayers = defaultLayerSet.layers - {"cybersecurity"};
        attribute includedStandards = defaultStandardSet.standards - {"FDA Cybersecurity Guidance"};
        attribute includedArtifactKinds = defaultArtifactSet.artifactKinds - {
            "ThreatModel","CybersecurityAssessment","SBOM","InterfaceControlDocument"
        };
        attribute includedViewpointTypes = defaultViewpointTypeSet.viewpointTypes - {"Cyber"};
        attribute excludedKinds = {"SOUPComponent"};  // GPCA prototype has no SOUP
    }
}
```

(SysML set difference syntax may need expansion; semantically `includedX = defaultX − {excluded}`.)

### 5.5 Aliases

```sysml
part swUnitAlias : ElementKindAlias {
    attribute methodTerm = "SoftwareUnit";       // IEC 62304 vocabulary
    attribute concreteKind = "SoftwareElement";   // ontology arch kind
    attribute concreteOntology = "@memo/ontology";
}
```

Lets the methodology speak its vocabulary while staying tied to ontology kinds.

---

## 6. Rules: ontology vs methodology

| Rule type | Lives in | Example | Strength |
|---|---|---|---|
| Invariant on kind | Ontology | `SystemRequirement requires trace to UserNeed` | always required |
| Invariant on relationship | Ontology | `Mitigates target must be RiskControl` | always required |
| Process/workflow | Methodology | `risk analysis must complete before software design` | required/recommended |
| Tailoring | Methodology | downgrade rule strength | per project |
| Project exemption | Project (last resort) | waive rule X for module Y | per element |

```sysml
part def Rule :> TraceableElement {
    attribute appliesTo : String[1..*];
    attribute predicate : String;
    attribute strength : RuleStrengthKind;
    attribute rationaleText : String;
}
```

`memo validate` runs ontology rules + methodology rules.

---

## 7. UI mapping

| Tab | Source dimension | Group by | Filter by methodology |
|---|---|---|---|
| Dashboard | — | recently visited | — |
| Model Explorer | Architecture | `archLayer` | `methodology.includedArchLayers` |
| Compliance | Compliance | `standard` | `methodology.includedStandards` |
| Artifacts (DHF) | Artifact | `regulatoryReference` or stage | `methodology.includedArtifactKinds` |
| Diagrams | Viewpoint instances | viewpoint type | `methodology.includedViewpointTypes` |
| Methodology | methodology pkg | read-only viewer | — |

Same instance can appear in multiple tabs. Element pages link to all dimensions it carries.

Generic rule: **what a tab shows = (ontology kinds in dimension X) ∩ (methodology.includedX)**.

---

## 8. CLI tools

### 8.1 Ontology authoring

```bash
memo ontology init <name> --extends @memo/ontology
memo ontology add-kind <Name> --dimension architecture --layer software
memo ontology add-kind <Name> --dimension compliance --standard "ISO 14971" --clause "5.4"
memo ontology add-kind <Name> --dimension artifact --doc-title "Software Architecture Document"
memo ontology add-relationship <Name> --source <Kind> --target <Kind>
memo ontology add-rule --applies-to <Kind> --predicate "<expr>" --strength required
memo ontology validate
memo ontology publish
```

### 8.2 Methodology authoring

```bash
memo methodology init <name> --extends @memo/methodology-default
memo methodology add-layer <id>
memo methodology drop-layer <id>
memo methodology add-standard <id>
memo methodology drop-standard <id>
memo methodology add-artifact <kindName>
memo methodology drop-artifact <kindName>
memo methodology drop-viewpoint-type <id>
memo methodology bind-alias <MethodTerm> <OntologyKind> [--ontology <pkg>]
memo methodology validate
memo methodology publish
```

### 8.3 Project

```bash
memo init --methodology @memo/methodology-default
memo init --methodology @memo/methodology-gpca
memo dev
memo validate    # ontology rules + methodology rules + project rules
memo export dhf  # uses methodology.includedArtifactKinds
```

---

## 9. Helper packages (L0)

`@memo/sysml-base` lives in `memo-base` repo and is consumed by both ontology and methodology packages. It only contains:

- common attributes (id, name, version, description, ...)
- enumerations (RuleStrengthKind, RigorKind, AudienceKind, WorkflowStageKind)
- dimension types (ElementKind, ArchitectureElementKind, ComplianceElementKind, ArtifactElementKind, ViewpointTypeKind)
- methodology scope types (MethodologyLayerSet, ..., MethodologyScope, ElementKindAlias)
- viewpoint/view base types
- rule type
- relationship base types

No domain content. Treat like a stdlib.

---

## 10. Repo layout (final state)

```
memo-base/                          (L0 helpers)
  packages/sysml-base/
    sysml/base/*.sysml
  packages/methodology-base/
    sysml/base/*.sysml

memo-ontology/                      (L1 — single comprehensive ontology pkg)
  ontology/
    base/                           re-exports memo-base
    architecture/
    compliance/
    artifacts/
    viewpoints/
    views/
    relationships/
    rules/

memo-methodologies/                 (L2 — methodology library)
  packages/methodology-default/
    sysml/methodology/default/*.sysml
  packages/methodology-gpca/
    sysml/methodology/gpca/*.sysml
  examples/                          (illustrative example methodologies)

memo-architect/                     (L3 — tool)
  packages/core/
  packages/cli/
  packages/web/
  examples/gpca-pump/               pins @memo/methodology-gpca
  examples/full-medical-device/     pins @memo/methodology-default
```

Each repo is git-subtree-pulled into `memo-architect` for local dev (existing pattern continues).

---

## 11. Migration plan (incremental phases)

Each phase is one branch, build + boot must stay green at the end.

### Phase D5 — finish current UI re-IA branch
- Delete Ontology tab, add read-only Methodology tab.
- Already queued in `../handoffs/feedback-ontology-replace.md`.

### Phase E1 — extract L0 helpers
- Rename `ontology/core/` → `ontology/base/` (or keep core, alias).
- Add `dimensions.sysml`, dimension-typed kind defs (`ArchitectureElementKind`, `ComplianceElementKind`, `ArtifactElementKind`, `ViewpointTypeKind`).
- Add `MethodologyLayerSet`, `MethodologyStandardSet`, `MethodologyArtifactSet`, `MethodologyViewpointTypeSet`, `MethodologyScope`, `ElementKindAlias` part defs.
- No behavioral change yet — kinds still flat under existing dirs.

### Phase E2 — promote architecture sublayers
- Split `ontology/architecture/<file>.sysml` → `ontology/architecture/<sublayer>/*.sysml` (operational/, functional/, logical/, behavioral/, software/, hardware/, safety/, cybersecurity/, requirements/, context/, constraints/).
- Tag each kind with `:> ArchitectureElementKind` and set `archLayer`.
- Update `buildLayers` to walk one level deeper under `architecture/`.

### Phase E3 — compliance dimension
- Move regulatory kinds out of `architecture/` into `compliance/<standard>/`.
- Tag with `:> ComplianceElementKind` and set `standard`/`clause`.
- Add Compliance tab to web app — group by standard, filter by methodology.

### Phase E4 — artifact kinds
- Replace abstract document-view kinds with concrete artifact kinds (RiskManagementPlan, SoftwareArchitectureDocument, SoftwareDetailedDesign, SystemRequirementsSpecification, ...).
- Each artifact kind = one `.sysml` file in `ontology/artifacts/`.
- DhfDocumentBinding (added in D4) becomes thinner — just selects which artifact kinds to surface for current methodology.

### Phase E5 — methodology scope expansion
- Add `MethodologyViewpointTypeSet` and link methodology Viewpoint instances to viewpoint types via `typeRef`.
- UI tab filters: each tab = ontology kinds in dim X ∩ methodology.includedX.
- Diagrams sidebar: viewpoints filtered by `methodology.includedViewpointTypes`.

### Phase E6 — default methodology
- Author `@memo/methodology-default` with full inclusive scope.
- Rename existing `@memo/methodology-medical-default` → `@memo/methodology-default`.

### Phase E7 — GPCA custom methodology
- Author `@memo/methodology-gpca` extending default with subtractions.
- Repoint `examples/gpca-pump` from default to gpca.
- Verify Compliance, Artifacts, Diagrams tabs hide cyber elements/docs/viewpoints.

### Phase E8 — CLI authoring tools
- Implement `memo ontology *` subcommands.
- Implement `memo methodology *` subcommands.
- Each subcommand writes `.sysml` files (no JSON state).

### Phase E9 — repo split (memo-base, memo-ontology, memo-methodologies)
- Move packages out, set up subtree.
- ADRs updated.

### Phase F — grammar + relationships
- Langium grammar fills in `connection def`, `view def {private import}`, `presentationKind`, set literals, set difference (or workaround via explicit lists).
- `RelationshipRegistry` populated.

### Phase G — alignment + merge
- Docs updated (this file becomes the canonical architecture doc).
- ADR-1-10 superseded by an ADR pointing to this file.
- Merge to `main`.

---

## 12. Open questions to resolve before coding E2+

1. SysML v2 set difference (`A - B`) syntax — does Langium support it? If not, methodology declares full lists explicitly.
2. Multiple-inheritance kind definitions — `part def Hazard :> ArchitectureElementKind, ComplianceElementKind` — does grammar accept it? If not, model dimensions as composition (`part def Hazard :> ElementKind { attribute architecture : ArchitectureDim; attribute compliance : ComplianceDim; }`).
3. Should `viewpoint` be a fourth top-level dim folder or stay nested under base? Leaning toward top-level dim for symmetry.
4. Helper rename: `core/` vs `base/` — pick one and migrate.
5. Compliance + Artifact overlap — e.g. `RiskManagementPlan` is both an artifact AND a compliance instance. Probably tag with both dimensions.

---

## 13. Decision log

- **Methodology dictates layer set** — not the ontology. Ontology kinds carry `archLayer` attribute; methodology selects which layers to surface. (User direction.)
- **Single canonical ontology** — `@memo/ontology` covers all medical-device kinds. Custom ontologies extend it. (User direction.)
- **Default methodology = comprehensive** — `@memo/methodology-default` includes everything; tailoring = subtraction. (User direction.)
- **GPCA = tailoring example** — not default. Drives example project. (User direction.)
- **Artifacts = concrete document kinds** — `SoftwareArchitectureDocument`, `SystemRequirementsSpecification`, etc. Not abstract `DHFDocument`. (User direction.)
- **Push to SysML maximally** — no YAML/JSON for kind/scope/rule data; only project pin lives in `memo.config.yaml`. (User direction.)
- **Methodology viewpoints = viewpointTypes ∩ methodology.includedViewpointTypes** — symmetric with other dimensions. (User direction.)
- **Helpers ≠ ontology** — base/ is library-only, no domain content. (User direction.)

---

## 14. Pointers

- Earlier phase log + queued work: [../handoffs/feedback-ontology-replace.md](../handoffs/feedback-ontology-replace.md)
- Currently committed methodology pkg (will be renamed/restructured under E6): `packages/methodology-medical-default/`
- DhfDocumentBinding (added Phase D4) — will be retargeted to artifact kinds in E4.
