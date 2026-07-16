# Import Existing Data

Use import to translate governed records into SysML source. Import does not
prove that the source classifications or relationships are correct.

## 1. Inspect the active vocabulary

```bash
memo ontology show
memo import template elements --output element-template.csv
memo import template relationships --output relationship-template.csv
```

## 2. Prepare elements

The fixed columns are `id`, `name`, `kind`, `construct`, and `doc`. Additional
columns become attributes when supported.

```csv
id,name,kind,construct,doc,priority
NEED-001,Safe therapy,StakeholderNeed,requirement,Patient needs safe medication delivery,high
REQ-001,Flow accuracy,SystemRequirement,requirement,The pump shall deliver within the specified tolerance,high
HAZ-001,Over-infusion,Hazard,item,Delivery exceeds the prescribed amount,
```

Use exact kind names from `memo ontology show`. Preserve stable source IDs.

## 3. Preview and generate

```bash
memo import csv requirements.csv --dry-run
memo import csv requirements.csv \
  --output model/requirements/imported.sysml \
  --package imported_requirements
```

Review the generated usage names, kinds, text escaping, and attributes.

## 4. Import relationships

```csv
sourceId,targetId,type
NEED-001,REQ-001,DerivesFrom
```

```bash
memo import csv-rel traceability.csv \
  --output model/traceability/imported.sysml \
  --package imported_traceability
```

Relationship direction matters. Compare the generated endpoints with
[Connecting Elements](relationships.md).

## 5. Validate and review

```bash
memo validate .
memo-architect dev
```

Resolve unknown kinds, duplicate IDs, unsupported attributes, and missing
traceability before treating the imported model as controlled engineering data.
