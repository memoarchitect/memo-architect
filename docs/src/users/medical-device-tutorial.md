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
memo-architect --example gpca
```

The example opens in a disposable copy: you can edit it freely, and the edits
are discarded when Architect exits. The copy's folder is printed on startup;
you will need it in steps 3 and 4.

## 2. Follow the patient-bolus scenario

In the workbench, locate:

1. the patient (`actorPatient`, a `User`);
2. the request-bolus operative action (`oaRequestBolus`);
3. the *Deliver PCA therapy* use case and its workflows;
4. the patient-bolus functional flow (`fcPatientBolus`);
5. the enforce-limits and command-pump functions (`fnEnforceLimits`, `fnCommandPump`);
6. the requirements derived from the request (`reqCs25` and others);
7. the over-infusion hazard (`overdoseHazard`) and its controls;
8. the verification cases that verify those requirements (`vcLockout`).

Use incoming and outgoing relationships in the Properties panel to move between
them. The [Layers](../modeling/layers/index.md) pages explain each kind you
meet.

## 3. Read the source

Open the `model/catalog` folder of the copy in your editor:

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

In a second terminal, from the copy's folder:

```bash
memo validate .
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

Create a new project with `memo-architect init my-device`, then build one vertical scenario slice.
Use [Start a New Project](new-project.md) and
[Model Your Device](modeling-guide.md) as the checklist.
