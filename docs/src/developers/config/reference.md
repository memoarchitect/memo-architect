# Project Configuration Reference

**A device project is its SysML.** Configuration selects tools and settings, not
model content.

> Delete every YAML file in a project and the model still means exactly what it
> meant before.

This page is the settings half. What the model *contains* is declared natively —
see [Native project format](https://memoarchitect.com/memo/reference/native-project-format/)
in the ontology reference.

## Three kinds of file, and the line between them

| Layer | Examples | Rule |
|---|---|---|
| **Semantic model source** | `model/catalog/**/*.sysml` | The only thing that decides which elements, relationships, viewpoints, rules and obligations exist |
| **Application project settings** | `memo.tools.yaml`, `memo.architect.yaml`, `memo.package.yaml`, `syside.toml` | May change how a command or the workbench *runs*. May never change what the model means |
| **Transient workspace state** | `.memo/architect/`, caches, `.viewlayout` sidecars | Regenerable. Deleting it costs you diagram positions and caches, nothing else |

Removing a settings file may change how an application runs or looks. It must
not change which model elements, relationships, methodology, rules, portable
views, or validation obligations exist.

## Starting the workbench

A project is found by its native entrypoint, `model/catalog/project.sysml` — not
by a settings file. Run from the project root:

```bash
memo-architect dev
```

## `memo.config.yaml` is gone

It existed to carry project semantics, and every field it carried now lives in
`model/catalog/project.sysml`. A project that still has one is told so, with the
native construct that replaced it named. The file is not merged, compared, or
used as a fallback.

| Retired | What decides it now |
|---|---|
| `extends:` | A native `private import` of the package in `model/catalog/project.sysml` |
| `methodology:` | The `ProjectMethodBinding`, whose `selectedMethodology` is a typed SysML reference |
| `ontologies:` | A native `private import` of the ontology package |
| `modules:`, `optionalModules:` | `includedModule` on the methodology |
| `projectType:`, `type:`, `usage:` | Nothing — a package's authority comes from the resolved root its files sit under |
| `kinds:`, `relationshipTypes:` | Ontology `part def` / `item def` and `connection def` declarations |
| `closureRules:` | `constraint def` declarations plus `RulePolicy` tailoring |
| `cosmaLayers:` | `LayerRendering` and `ExplorerClassification` usages in the ontology |

The sidecar files are retired with it: `memo.rules.yaml`, `memo.viewpoints.yaml`
and `memo.rendering.yaml` are no longer inputs of any kind.

So the method binding that `extends:` used to express is now:

```sysml
package infusion_pump_catalog {
    private import memo_methodology_profiles::*;
    private import infusion_pump_architecture::*;

    part projectMethodBinding : ProjectMethodBinding {
        attribute :>> id = "PMB-001";
        attribute :>> projectName = "Infusion Pump";
        ref :>> selectedMethodology = mdDefaultDefinition;
        attribute :>> scopeMode = ScopeModeKind::explicit;
    }
}
```

`selectedMethodology` is a typed reference, not a string, so there is no ID to
keep in sync with anything.

## Settings files that are read

| File | Purpose |
|---|---|
| `memo.package.yaml` | Locator only: `name`, `version`, `description`, `license`, `tags`, `sysmlDir`. It may say where a package's source lives; it may not say whether that package is loaded |
| `memo.tools.yaml` | MEMO Tools settings — toolchain selection, executable paths, command behaviour. See the Tools configuration reference |
| `memo.architect.yaml` | Reserved for Architect application settings; checked against the semantic boundary |
| `memo.lock.yaml` | Generated. Records what the imports resolved to; it cannot introduce a package no import named |

A settings file inherits nothing — there is no `extends` chain, because
inheritance was how one project's settings reached into another package's model.

## Extensions

Extensions participate through ordinary SysML specialization, and are selected
by being imported — never by being installed. A package a manifest points at but
no import reaches contributes nothing.

```sysml
package my_company_software {
    private import memo_architecture_implementation_software_runtime::*;

    part def FirmwareComponent specializes SoftwareComponent {
        attribute bootloaderVersion : String;
    }
}
```

Import that package from `model/catalog/project.sysml` and its kinds load into
the same registry as MEMO's. View selection, palette eligibility, and
relationship checks walk the transitive specialization chain, so a viewpoint or
rule targeting `SoftwareComponent` also recognizes `FirmwareComponent`. The
extension does not need to copy or patch the base viewpoint.
