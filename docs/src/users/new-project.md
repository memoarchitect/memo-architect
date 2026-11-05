# Start a New Project

Build the first scenario as an end-to-end slice. A thin slice through every
layer exposes vocabulary, traceability and validation questions before the
model becomes large.

## 1. Scaffold

```bash
memo-architect init my-device
cd my-device
memo validate .
memo-architect dev
```

`init` always starts from an empty skeleton. To learn from a worked model
first, open an example: `memo-architect --example gpca`.

The generated project contains:

```text
package.json             depends on @memoarchitect/ontology
memo.package.yaml        name, version, entrypoint and toolchain
memo.lock.yaml           the exact ontology release the model is locked to
syside.toml              lets SysIDE resolve the project and the ontology as one model
model/
  methodology/
    project.sysml        the native entrypoint: imports and the method binding
  catalog/
    architecture/system.sysml
    assurance/requirements.sysml
    artifacts/catalog.sysml
analysis/
  memo_model.py
  Samples/               seven sample notebooks and a README
node_modules/@memoarchitect/ontology/
```

`model/methodology/project.sysml` is where the project selects its methodology
and imports any [extensions](../modeling/extensions/index.md). Everything else
you write goes under `model/catalog`.

The `analysis/Samples` notebooks are model-independent: charts, an SVG
ownership graph and an HTML/CSV inventory. Open them from
**☰ › Advanced › Analysis Notebooks**; Architect starts JupyterLab for you.

## 2. Establish scope

Record, in the [context layer](../modeling/layers/context.md):

- the intended use and use environment;
- the important users and external systems;
- one operational scenario;
- explicit model boundaries.

## 3. Add one connected slice

For that scenario, add:

1. a stakeholder [need](../modeling/layers/requirements.md);
2. a measurable system requirement derived from it;
3. a [system function](../modeling/layers/functional.md);
4. a responsible [logical component](../modeling/layers/logical.md);
5. a relevant [hazard and risk control](../modeling/layers/risk.md);
6. a [verification case](../modeling/layers/verification.md) and an evidence
   placeholder.

Give elements stable identifiers from the beginning:

```sysml
requirement detectFault : Requirement {
    attribute :>> requirementType = RequirementTypeKind::system;
    @MemoIdentity { :>> providedId = "REQ-001"; :>> label = "DetectDeliveryFault"; }
    attribute :>> statement =
        "The device shall detect a delivery fault within two seconds.";
}
```

[Model Your Device](modeling-guide.md) walks through the whole slice in SysML.

## 4. Organize for review

Group catalog files by what a reviewer owns: `model/catalog/architecture`,
`model/catalog/assurance`, `model/catalog/artifacts`, and a
`viewpoints/` folder for the project's own views. The folder does not change an
element's meaning; its kind does.

## 5. Review in Architect

```bash
memo validate .
memo-architect dev
```

Review the slice in context, requirements, allocation, risk and verification
views. Correct the meaning of each gap rather than adding placeholder links.

Then add the next scenario.
