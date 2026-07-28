# Project Configuration Reference

MEMO Architect device projects use one minimal `memo.config.yaml` file at the
project root. It selects the modeling profile and optional ontology extensions;
modeling kinds, rendering layers, relationships, rules, and viewpoints belong
to those packages rather than to the device project.

## Device project: `memo.config.yaml`

```yaml
projectName: gpca-pump
projectType: device

extends: "@memoarchitect/medical-modeling-profile"

ontologies:
  - name: "@memoarchitect/ontology"
    version: "^0.6.0"
```

| Field | Required | Description |
|---|---:|---|
| `projectName` | Yes | Human-readable project identifier. |
| `projectType` | Yes | Must be `device` for an end project. |
| `extends` | Yes | Modeling profile inherited by the project. |
| `ontologies` | No | Additional ontology packages, each with `name` and `version`. |

Run the workbench from the directory containing this file:

```bash
memo-architect dev
```

## What does not belong in project configuration

Do not put these blocks in a device project's `memo.config.yaml`:

- `cosmaLayers`
- `kinds`
- `relationshipTypes`
- `closureRules`
- `viewpoints`

Those were part of an obsolete exploratory configuration format. The current
ownership model is:

| Concern | Canonical owner |
|---|---|
| Kinds and relationship definitions | SysML files in ontology packages |
| Layer labels, colors, and icons | `memo.rendering.yaml` in an ontology package |
| Validation and completeness rules | `memo.rules.yaml` in a profile package |
| Viewpoints and methodology workflow | SysML files in a methodology/profile package |

## Ontology and profile packages

Package authors use `memo.package.yaml`, not the device-project format:

```yaml
name: "@memoarchitect/ontology-example"
version: "0.1.0"
type: ontology
description: "Example ontology extension"
```

An ontology package may also provide `memo.rendering.yaml`; a profile package
may provide `memo.rules.yaml`. Kinds and relationships remain defined in SysML.

Extensions participate through ordinary SysML specialization. For example, a
user ontology can define:

```sysml
package my_company_software {
    private import memo_architecture_implementation_software_runtime::*;

    part def FirmwareComponent specializes SoftwareComponent {
        attribute bootloaderVersion : String;
    }
}
```

After adding that package under `ontologies`, Memo Architect loads its kinds
into the same registry as MEMO. View selection, palette eligibility, and
relationship checks walk the transitive specialization chain, so a viewpoint
or rule targeting `SoftwareComponent` also recognizes `FirmwareComponent`.
The extension does not need to copy or patch the base viewpoint.

This separation keeps device projects configuration-light and prevents local
project YAML from overriding the canonical ontology.
