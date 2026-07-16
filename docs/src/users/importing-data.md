# Importing Existing Data

Most teams starting a new device already have requirements in Excel, hazards
in a risk analysis spreadsheet, or a component list in a BOM. MEMO can import
all of this via CSV.

## Overview

```mermaid
graph LR
    A[Excel / Sheets] -->|Export as CSV| B[CSV File]
    B -->|memo import csv| C[Generated .sysml]
    C --> D[MEMO Model]
```

The workflow is:

1. **Generate a template** that matches your ontology
2. **Fill in your data** (paste from Excel / Sheets)
3. **Import** to generate valid SysML v2 files
4. **Import relationships** to connect elements

## Step 1 — Generate a CSV Template

```bash
# Template for elements (one example row per ontology kind)
pnpm memo import template elements -o elements-template.csv

# Template for relationships (one example row per relationship type)
pnpm memo import template relationships -o relationships-template.csv
```

### Elements Template Format

The generated template has these columns:

| Column | Required | Description |
|--------|----------|-------------|
| `id` | Yes | Unique identifier (letters, digits, underscore; must start with letter or `_`) |
| `name` | Yes | Human-readable display name |
| `kind` | Yes | Ontology type — must match a kind from your config |
| `construct` | No | SysML construct override (`part`, `requirement`, `action`). Auto-derived if blank |
| `doc` | No | Documentation comment |
| *additional* | No | Any extra columns become SysML attributes |

### Example Elements CSV

```csv
id,name,kind,doc,severity,priority
hazOverdose,Over-infusion of medication,Hazard,Uncontrolled flow rate delivery,Critical,
hazAirEmbolism,Air embolism,Hazard,Air enters IV line,Critical,
rcFlowSensor,Flow rate sensor,RiskControl,Hardware flow monitoring,,High
sysReqFlowControl,Flow rate control,SystemRequirement,System shall control flow +-5%,,High
swReqPIDLoop,PID control loop,SoftwareRequirement,Software shall implement PID control,,Medium
```

!!! info "Kind determines the layer"
    You never set the CoSMA layer directly. When you specify `kind: Hazard`, MEMO
    knows it belongs to the `risk` layer. When you specify `kind: SystemRequirement`,
    it belongs to the `requirements` layer.

### Available Kinds

Run this to see all kinds your config supports:

```bash
pnpm memo ontology show
```

Common kinds for medical devices:

=== "Requirements"

    | Kind | Layer | Construct |
    |------|-------|-----------|
    | UserNeed | requirements | requirement |
    | SystemRequirement | requirements | requirement |
    | SoftwareRequirement | requirements | requirement |
    | HardwareRequirement | requirements | requirement |
    | DesignSpecification | requirements | requirement |
    | Standard | requirements | requirement |
    | RegulatoryRequirement | requirements | requirement |

=== "Risk (ISO 14971)"

    | Kind | Layer | Construct |
    |------|-------|-----------|
    | Hazard | risk | requirement |
    | HazardousSituation | risk | requirement |
    | Harm | risk | requirement |
    | Risk | risk | requirement |
    | RiskControl | risk | requirement |
    | SafetyGoal | risk | requirement |

=== "Architecture"

    | Kind | Layer | Construct |
    |------|-------|-----------|
    | System | logical | part |
    | Subsystem | logical | part |
    | Component | logical | part |
    | Software | software | part |
    | SoftwareComponent | software | part |
    | Firmware | software | part |
    | Microcontroller | physical | part |
    | ElectricalComponent | physical | part |
    | MechanicalComponent | physical | part |

=== "Business & Functional"

    | Kind | Layer | Construct |
    |------|-------|-----------|
    | Actor | purpose | part |
    | Stakeholder | purpose | part |
    | UseCase | functional | part |
    | Scenario | functional | action |
    | SystemFunction | functional | action |
    | ComponentFunction | functional | action |

=== "Verification"

    | Kind | Layer | Construct |
    |------|-------|-----------|
    | Test | verification | part |

## Step 2 — Import Elements

```bash
# Preview what will be generated (no files written)
pnpm memo import csv elements.csv --dry-run

# Import into model/imported-elements.sysml
pnpm memo import csv elements.csv -o model/imported-elements.sysml

# Import into a named package
pnpm memo import csv elements.csv -o model/requirements.sysml --package Requirements
```

### What Gets Generated

For this CSV row:

```csv
id,name,kind,doc,severity
hazOverdose,Over-infusion of medication,Hazard,Uncontrolled flow rate,Critical
```

MEMO generates:

```sysml
requirement hazOverdose : Hazard {
    attribute redefines name = "Over-infusion of medication";
    attribute redefines severity = "Critical";
    doc /* Uncontrolled flow rate */
}
```

Notice:

- `construct` was auto-derived as `requirement` (Hazard's default construct)
- `severity` became an attribute (extra CSV column → SysML attribute)
- `doc` became a SysML doc comment
- `id` became the SysML element identifier

### Validation During Import

The importer validates your data and reports:

- **Errors** (import blocked): invalid `id` format, unknown `kind`
- **Warnings** (import continues): missing optional fields, unknown attributes

```
⚠ Warning: Row 3 — kind "FooBar" is not defined in the ontology
✓ Parsed 42 elements (40 valid, 2 warnings)
```

## Step 3 — Import Relationships

After elements are imported, connect them with a relationships CSV:

```csv
sourceId,targetId,type
hazOverdose,rcFlowSensor,mitigates
unFlowControl,sysReqFlowControl,derives
sysReqFlowControl,swReqPIDLoop,derives
testFlowAccuracy,sysReqFlowControl,verify
testFlowCalibration,rcFlowSensor,verify
```

```bash
pnpm memo import csv-rel relationships.csv -o model/traceability.sysml
```

### Relationship CSV Columns

| Column | Required | Description |
|--------|----------|-------------|
| `sourceId` | Yes | Source element identifier |
| `targetId` | Yes | Target element identifier |
| `type` | Yes | Relationship type from ontology |
| `sourceEnd` | No | Source connection end name (default: `source`) |
| `targetEnd` | No | Target connection end name (default: `target`) |

### Available Relationship Types

| Type | Label | Use For |
|------|-------|---------|
| `derives` | Derives | Need/requirement decomposition where the upstream source is known |
| `refines` | Refines | Use case / concern refinement |
| `traceTo` | Trace To | General traceability fallback when no stronger stable semantics apply |
| `allocateTo` | Allocate To | Function → component allocation |
| `satisfy` | Satisfy | Component → requirement satisfaction |
| `verify` | Verify | Test → requirement verification |
| `mitigates` | Mitigates | Risk control → hazard mitigation |
| `causes` | Causes | Hazard → hazardous situation |
| `leadsTo` | Leads To | Hazardous situation → harm |
| `identifies` | Identifies | Risk → hazard identification |
| `composedOf` | Composed Of | Structural composition |
| `dependency` | Dependency | General dependency |
| `aggregation` | Aggregation | Whole-part aggregation |
| `association` | Association | General association |
| `realization` | Realization | Logical → physical realization |
| `extend` | Extend | Use case extension |
| `include` | Include | Use case inclusion |

## Step 4 — Verify the Import

After importing, run the dev server to visually inspect:

```bash
pnpm architect -- dev --port 3000
```

Then validate for completeness:

```bash
pnpm memo validate
```

This checks all 109 medical closure rules and tells you what's missing.

## Practical Example: Migrating from Excel

Suppose you have a requirements spreadsheet with columns:
`Req ID | Title | Description | Priority | Category`

### 1. Map your columns to MEMO's CSV format

```csv
id,name,kind,doc,priority
REQ001,Flow rate accuracy,SystemRequirement,System shall maintain +-5% accuracy,High
REQ002,Alarm response time,SystemRequirement,Alarm shall sound within 2 seconds,Critical
REQ003,Battery life,SystemRequirement,Device shall operate for 8 hours on battery,Medium
```

The `name` CSV column is the importer's display-label field. For requirement
and risk kinds it maps onto the ontology's `title` attribute; for parts and
actions it maps onto `name`.

!!! warning "ID format"
    MEMO IDs must start with a letter or underscore and contain only letters,
    digits, and underscores. If your existing IDs have dashes or spaces, rename
    them (e.g., `REQ-001` → `REQ001` or `req_001`).

### 2. Import elements

```bash
pnpm memo import csv requirements.csv -o model/requirements/system-reqs.sysml --package SystemRequirements
```

### 3. Create a hazards CSV and import

```csv
id,name,kind,severity
hazOverdose,Over-infusion,Hazard,Critical
hazUnderDose,Under-infusion,Hazard,Major
hazAirEmbolism,Air embolism,Hazard,Critical
```

```bash
pnpm memo import csv hazards.csv -o model/risk/hazards.sysml --package RiskAnalysis
```

### 4. Link them with relationships

```csv
sourceId,targetId,type
hazOverdose,REQ001,mitigates
hazUnderDose,REQ001,mitigates
REQ001,testFlowAccuracy,verify
```

```bash
pnpm memo import csv-rel traceability.csv -o model/traceability.sysml --package Traceability
```

## Exporting Back to CSV

You can also export your model to CSV for review in Excel:

```bash
# Export all elements
pnpm memo export json -o model.json
```

!!! tip "Roundtrip workflow"
    Import → edit in MEMO → export → review in Excel → re-import.
    This lets non-technical stakeholders contribute via spreadsheets while
    engineers maintain the SysML model.

## Next Steps

- [Modeling Your Device](modeling-guide.md) — add relationships and refine your model
- [Validation & Closure Rules](validation.md) — check ISO 14971 / IEC 62304 compliance
