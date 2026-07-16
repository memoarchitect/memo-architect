# Start a New Project

Build the first scenario as an end-to-end slice. This exposes vocabulary,
traceability, and validation issues before the model becomes large.

## 1. Scaffold

```bash
memo init my-device
cd my-device
memo ontology show
memo validate .
```

`ontology show` lists the active element kinds, relationships, and rules.

## 2. Establish scope

Record:

- intended use and use environment;
- important actors and external systems;
- one operational scenario;
- explicit model boundaries.

## 3. Add one connected slice

For the scenario, add:

1. a stakeholder need;
2. a measurable system requirement;
3. a logical function;
4. a responsible logical component;
5. a relevant hazard and risk control;
6. a verification case and evidence placeholder.

Use stable identifiers from the beginning:

```sysml
requirement detectFault : SystemRequirement {
    attribute :>> id = "REQ-001";
    attribute :>> name = "DetectDeliveryFault";
    attribute :>> statement =
        "The device shall detect a delivery fault within two seconds.";
}
```

## 4. Organize for review

```text
model/
  context/
  operations/
  requirements/
  functions/
  architecture/
  risk/
  assurance/
  traceability/
  views/
```

The element kind determines semantic ownership; the folder supports human
ownership and review.

## 5. Review in Architect

```bash
memo validate .
memo-architect dev
```

Review the slice in context, requirement, allocation, risk, and verification
views. Correct the meaning of gaps rather than adding placeholder links.

Then add the next scenario.
