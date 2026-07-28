# Viewpoints and views

MEMO follows ISO/IEC/IEEE 42010: a **viewpoint** defines the concerns, audience,
allowed model content, and presentation choices for a review; a **view** is an
authored representation that conforms to one or more viewpoints. The
relationship is many-to-many: a view can be reused across viewpoints, and a
viewpoint can govern many views.

Both are modeled in SysML v2 and supplied by the selected ontology and
methodology packages. A device project's YAML does not redefine them.

## What appears in Architect

Open **Viewpoints** in the top navigation. The left explorer shows one
authoritative hierarchy:

```text
Viewpoint title                         VP-LOG
  View title                           VIEW-BHV-003
  View title                           VIEW-LOG-001
```

The ID is the stable identity used by source, routing, persistence, and review
references. The title is the readable label. A view URL therefore ends in its
authored ID, for example:

```text
/diagrams/afd/VIEW-BHV-003
```

“Unassigned Views” can appear temporarily while editing, but validation reports
`VW-003` as an error when a view has no `viewpointDefinition` binding.
Architect does not infer a “Document Views” viewpoint from presentation kind.

## Ontology source

A viewpoint usage defines its ID, title, purpose, audience, concerns, layers,
and allowed kinds:

```sysml
part logicalArchitectureViewpoint : Viewpoint {
    attribute :>> id = "VP-LOG";
    attribute :>> title = "Logical Viewpoint";
    attribute :>> purpose = "Describe the system's logical decomposition.";
    attribute :>> group = "Architect & Realize";
}
```

To reuse the same view, bind the inherited feature more than once:

```sysml
part :>> viewpointDefinition = logicalArchitectureViewpoint;
part :>> viewpointDefinition = softwareViewpoint;
```

Architect lists the same stable view under both viewpoints; it does not clone
the view. An optional `group` attribute on a view creates labeled sections
inside each viewpoint, which keeps a large view catalog navigable while the
grouping remains ontology-authored metadata.

A view binds to that viewpoint and owns a separate stable ID:

```sysml
view gpcaActionFlowView : MemoDiagramView {
    attribute :>> id = "VIEW-BHV-003";
    attribute :>> name = "GPCA_InfusionDeliveryActionFlowView";
    attribute :>> title = "GPCA Infusion Delivery Action Flow";
    attribute :>> diagramType = "afd";
    part :>> viewpointDefinition = logicalArchitectureViewpoint;
}
```

`name` is a model attribute; it is not used as the URL identity.

## Presentation types

All authored views resolve to one of the eight SysML v2 presentation kinds
used by Architect:

| View kind | Typical presentation |
|---|---|
| General | structure, decomposition, packages |
| Interconnection | parts, ports, interfaces, exchanges |
| Action flow | activity, operative flow, function flow |
| State transition | state machines and transitions |
| Sequence | ordered interactions and messages |
| Grid | matrices and tabular analysis |
| Browser | document-backed or hierarchical model browsing |
| Geometry | reserved by the model; renderer support is deferred |

Legacy diagram codes such as `bdd`, `ibd`, `afd`, `ofd`, `ffd`, `stm`, and
`seq` select a concrete presentation template within those kinds.

## Behaviour navigation

Composite state and activity views support folding and drill-down without
changing the model. Activity views also offer inline or nested steps. Operative
flows, function flows, and sequence views remain separate authored views of a
scenario; they are not renderer modes of one diagram.

## Export

Build a distributable viewer with Architect:

```bash
memo-architect build --output dist
memo-architect build --output review-viewer --standalone
```

Export model data or Graphviz through MEMO Tools:

```bash
memo export json --output model.json
memo export dot --output model.dot --viewpoint VP-LOG
```

## Add a view

Create or specialize a `MemoView`/`MemoDiagramView` in a SysML source file,
give it an `id`, `name`, and `title`, and bind `viewpointDefinition` to at least
one ontology-defined viewpoint. Restarting Architect is not required for
project source changes; the project watcher rebuilds the model and refreshes
the view.
