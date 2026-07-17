# MEMO Platform Architecture & Grand Plan

**Status:** Accepted (supersedes earlier ontology/methodology splits)
**Owner:** Somesh Kashyap
**Architecture source:** this document

---

## 1. Goals

1. SysML v2 = single source of truth. Push everything possible into `.sysml` files.
2. One canonical ontology — **MEMO Ontology** — comprehensive for medical-device modeling.
3. Default methodology — **MEMO Default** — comprehensive medical-device methodology covering full DHF set.
4. Custom methodology (e.g. **GPCA**) demonstrates tailoring: hide layers, hide element kinds, hide DHF docs, override workflow.
5. Four orthogonal dimensions for grouping: **Architecture**, **Compliance**, **Artifacts**, and **Viewpoints**.
6. Methodology selects subsets across all dimensions.
7. Helper SysML packages (base/core) are libraries — not ontology content.
8. CLI tools for creating/extending ontology, methodology, project.

---

## 2. Conceptual stack

```
L0  helpers                     ← @memoarchitect/sysml-base (libraries, not ontology)
    common types, enumerations, dimension defs, alias defs, rule defs
    Reused by every higher layer. No domain content.

L1  MEMO ontology               ← @memoarchitect/ontology
    domain kinds across 4 dimensions:
      - Architecture (layered: operational, functional, ..., safety, cybersecurity)
      - Compliance (per standard: ISO 14971, IEC 62304, FDA 21 CFR 820, ...)
      - Artifacts (concrete DHF docs: SAD, SRS, RMP, FMEA, ...)
      - Viewpoints (RiskMgmt, SwArch, Cybersecurity, ...)
    + relationships
    + invariant rules

L2  methodology                 ← @memoarchitect/methodology-default (or fork)
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
package memo::core::dimensions {
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

## 4. Single ontology repo: `@memoarchitect/ontology`

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

### 5.1 Default methodology — `@memoarchitect/methodology-default`

Comprehensive medical-device methodology. Selects:

- All architecture layers
- All standards (ISO 14971, IEC 62304, FDA 21 CFR 820, FDA cyber, ISO 13485, ISO 14155)
- All ~50 artifact kinds (full DHF set)
- All viewpoint types
- Strict rules (most invariants required)
- Full workflow (requirements → architecture → risk → design → V&V → DHF compile)

### 5.2 Custom methodology example — `@memoarchitect/methodology-gpca`

Forks `@memoarchitect/methodology-default`. Demonstrates:

- Hide layers (e.g. drop `cybersecurity` layer for non-networked pump variant)
- Hide element kinds (drop `SOUPComponent` if no SOUP used)
- Hide DHF documents (drop ICD if pump has no external interfaces)
- Override workflow (skip cybersecurity stage)
- Override viewpoint set (drop CyberViewpoint)
- Override rules (downgrade `IEC 62304 §5.5.4 trace required` to recommended for prototype phase)

### 5.3 Methodology declarations in SysML

```sysml
package memo::methodology::default::scope {
    private import memo::core::*;

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

GPCA's methodology now lives under `src/examples/gpca-pump/methodology/` — self-contained within the example, extending the shared default methodology rather than living under `memo::methodology::*` directly.

```sysml
package memo::examples::gpca::methodology_scope {
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
    attribute concreteOntology = "@memoarchitect/ontology";
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
memo ontology init <name> --extends @memoarchitect/ontology
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
memo methodology init <name> --extends @memoarchitect/methodology-default
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
memo init --methodology @memoarchitect/methodology-default
memo init --methodology @memoarchitect/methodology-gpca
memo-architect dev
memo validate    # ontology rules + methodology rules + project rules
memo export dhf  # uses methodology.includedArtifactKinds
```

---

## 9. Helper packages (L0)

`@memoarchitect/sysml-base` (L0 helpers) is consumed by both ontology and methodology packages. It ships inside the `memo-sysmlv2` repo (see §10). It only contains:

- common attributes (id, name, version, description, ...)
- enumerations (RuleStrengthKind, RigorKind, AudienceKind, WorkflowStageKind)
- dimension types (ElementKind, ArchitectureElementKind, ComplianceElementKind, ArtifactElementKind, ViewpointTypeKind)
- methodology scope types (MethodologyLayerSet, ..., MethodologyScope, ElementKindAlias)
- viewpoint/view base types
- rule type
- relationship base types

No domain content. Treat like a stdlib.

---

## 10. Repo layout (executed 2026-07-12)

Three repos, split along dependency lines — see [ADR-1-17](../decisions/adr/ADR-1-17-three-repo-split.md) (Implemented). The conceptual L0/L1/L2 content collapses into a single pure-content repo; the L3 tool splits into engine (cli) vs UI (web).

Actual repos (public naming follows the meMO four-layer stack):

| Repo | Layers | Public repository |
|---|---|---|
| `memo` (a.k.a. memo-sysmlv2) | 01 Ontology + 02 Methodology | `memoarchitect/memo` |
| `memo-tools` (engine, née memo-cli) | 03 Tools | `memoarchitect/memo-tools` |
| `memo-architect` (web UI) | 04 Architect | `memoarchitect/memo-architect` |

This repository is the webapp: the ontology was separated into `memo`, the engine
into `memo-tools`, and each is consumed through an exact npm dependency. The
private `memo-meta` workspace checks out all three repositories as siblings and
links matching package versions for coordinated development.

```
memo-sysmlv2/                       (L0+L1+L2 — pure SysML v2 / KerML content, no TypeScript)
  src/                              all .sysml content; directory tree mirrors the memo:: namespace
    medical_device_library.sysml    public import surface
    core/                           common/ enumerations/ relationships/ semantics/ + stdlib/ KerML wrapper
                                    (former base/ L0 helpers merged in)
    architecture/                   one folder per layer: context/ … risk/ cybersecurity/ assurance/ …
    compliance/                     artifacts/ change/ document_views/ postmarket/ iso14971/
    viewpoints/                     per-concern viewpoint + view defs (views nested here)
    artifacts/                      artifact kinds
    rules/                          native constraint def / requirement def (Epic EE)
    methodology/                    nested sysand project: memo/ (default) + gpca/
    examples/gpca-pump/             reference model
  packages/                         thin @memoarchitect/* manifests (sysmlDir points into src/)
  .project.json + sysand-lock.toml  ships as a sysand package; SysIDE/SysON/sysand consumable
        ▲ data-dependency (versioned sysand artifact)
memo-tools/                         (L3 engine + CLI; ADR name: memo-cli)
  packages/core/                    Langium grammar, parser, builder, validator, KerML evaluator
  packages/cli/
  tools/                            ontology lint/diagram tooling, viewer, VS Code extension
        ▲ build-dep (core types) + runtime WebSocket (dev server, versioned protocol)
memo-architect/                     (L3 tool UI)
  packages/web/
  examples/gpca-pump/               pins memo-sysmlv2 methodology content
  examples/full-medical-device/
```

Dependency direction: `@memoarchitect/ontology` ← `@memoarchitect/tools` ←
`@memoarchitect/architect`, with Architect also declaring Ontology directly. Tools does
not depend on Architect and exposes no commands that require it. Published
consumers install versioned npm packages; iterative development uses sibling
submodules in `memo-meta`.

Execution: keystone Epic EE (rules → native constraints) gates the first cut; Epic J prepares boundaries; Epics FF (memo-sysmlv2) → GG (memo-cli) → HH (memo-architect) execute the cuts.

---

## 11. Implementation planning boundary

This document defines the target system architecture and architectural guardrails. It does not own the execution roadmap.

Implementation planning lives in the private `memo-meta` repository. Planning
must preserve this public architecture, while this document remains focused on
stable product and repository boundaries.

---

## 12. Open questions

1. SysML v2 set difference (`A - B`) syntax — does Langium support it? If not, methodology declares full lists explicitly.
2. Multiple-inheritance kind definitions — `part def Hazard :> ArchitectureElementKind, ComplianceElementKind` — does grammar accept it? If not, model dimensions as composition (`part def Hazard :> ElementKind { attribute architecture : ArchitectureDim; attribute compliance : ComplianceDim; }`).
3. Should `viewpoint` be a fourth top-level dim folder or stay nested under base? Leaning toward top-level dim for symmetry.
4. Helper rename: `core/` vs `base/` — pick one and migrate.
5. Compliance + Artifact overlap — e.g. `RiskManagementPlan` is both an artifact AND a compliance instance. Probably tag with both dimensions.

---

## 13. Decision log

- **Methodology dictates layer set** — not the ontology. Ontology kinds carry `archLayer` attribute; methodology selects which layers to surface. (User direction.)
- **Single canonical ontology** — `@memoarchitect/ontology` covers all medical-device kinds. Custom ontologies extend it. (User direction.)
- **Default methodology = comprehensive** — `@memoarchitect/methodology-default` includes everything; tailoring = subtraction. (User direction.)
- **GPCA = tailoring example** — not default. Drives example project. (User direction.)
- **Artifacts = concrete document kinds** — `SoftwareArchitectureDocument`, `SystemRequirementsSpecification`, etc. Not abstract `DHFDocument`. (User direction.)
- **Push to SysML maximally** — no YAML/JSON for kind/scope/rule data; only project pin lives in `memo.config.yaml`. (User direction.)
- **Methodology viewpoints = viewpointTypes ∩ methodology.includedViewpointTypes** — symmetric with other dimensions. (User direction.)
- **Helpers ≠ ontology** — base/ is library-only, no domain content. (User direction.)

---

## 14. Pointers

- Default methodology pkg: `packages/methodology-default/`
- DhfDocumentBinding (added Phase D4) — will be retargeted to artifact kinds in E4.
