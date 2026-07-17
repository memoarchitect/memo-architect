# End-to-End Medical Device Tutorial

This tutorial uses the bundled GPCA pump to teach the complete workflow without
inventing a second, inconsistent example model.

## Outcome

You will:

- run and inspect a complete model;
- follow one scenario across layers;
- identify a missing or weak trace;
- make a small source change;
- validate and review the result.

## 1. Launch the example

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run example:dev
```

## 2. Follow the patient-bolus scenario

In the workbench, locate:

1. patient actor;
2. request-bolus operational activity;
3. titrated-analgesia capability;
4. patient-bolus functional chain;
5. enforce-limits and command-pump functions;
6. associated requirements;
7. overdose hazard and controls;
8. verification cases.

Use incoming and outgoing relationships to move between them.

## 3. Read the source

In a `memo-meta` development checkout, the editable source is under
`memo/examples/gpca-pump/model`. Standalone Architect runs the same example
from its installed `@memoarchitect/ontology` dependency.

- `catalog/gpca_context.sysml`
- `catalog/gpca_operational.sysml`
- `catalog/gpca_system.sysml`
- `catalog/gpca_requirements.sysml`
- `catalog/gpca_architecture.sysml`
- `catalog/gpca_risk.sysml`
- `catalog/gpca_verification.sysml`
- `catalog/gpca_trace.sysml`

Search for one selected element name in `gpca_trace.sysml` and read every
connection around it.

## 4. Validate

From the repository root:

```bash
pnpm --dir ../memo-tools run example:validate
```

Choose one finding or one trace you want to understand. State the engineering
question before changing the model.

## 5. Make and review a bounded change

Edit the appropriate catalog element or trace, save, and inspect the live
workbench update. Rerun validation. Confirm that:

- the intended finding changed;
- unrelated layers did not regress;
- the relationship direction is correct;
- the relevant review view remains understandable.

## 6. Apply the pattern to your project

Create a new project with `memo init`, then build one vertical scenario slice.
Use [Start a New Project](new-project.md) and
[Model Your Device](modeling-guide.md) as the checklist.
