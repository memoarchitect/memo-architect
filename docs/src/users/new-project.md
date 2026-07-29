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

The generated project contains:

```text
package.json
memo.package.yaml
memo.lock.yaml
syside.toml
analysis/
  Samples/
    README.md
    01-model-overview.ipynb
    ...
src/
  architecture/
  assurance/
  artifacts/
node_modules/@memoarchitect/ontology/
```

`syside.toml` lets SysIDE resolve the project source and the installed ontology
as one model.

`analysis/Samples` contains seven model-independent Jupyter notebooks created by
`memo init`, including charts, an SVG ownership graph, and an HTML/CSV inventory
table. Start JupyterLab from the project's `analysis` directory, then use
**Analysis → Jupyter Notebooks** in Architect to open it.

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
requirement detectFault : Requirement {
    attribute :>> id = "REQ-001";
    attribute :>> requirementKind = RequirementKind::system;
    attribute :>> name = "DetectDeliveryFault";
    attribute :>> statement =
        "The device shall detect a delivery fault within two seconds.";
}
```

## 4. Organize for review

Add architecture definitions under `src/architecture`, assurance definitions
under `src/assurance`, and model-backed outputs under `src/artifacts`.

## 5. Review in Architect

```bash
memo validate .
memo-architect dev
```

Review the slice in context, requirement, allocation, risk, and verification
views. Correct the meaning of gaps rather than adding placeholder links.

Then add the next scenario.
