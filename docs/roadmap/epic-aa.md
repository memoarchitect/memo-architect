# Epic AA: Miro-Like Canvas Engine

Wave: 4 (UI thin wrapper, deferred)

Priority: P3

Goal: build a free-form canvas engine for diagram authoring layered above the renderer dispatcher. Canvas is a viewer/composer; persistence still lives in SysML.

Depends on: Epic O (dispatcher), Epic V (modules).

## Stories

### AA-1 Canvas core scaffolding

Session target: 30 minutes or less.

Acceptance: blank canvas mounts and accepts pan/zoom.

### AA-2 NodeRegistry

Session target: 30 minutes or less.

Acceptance: nodes register and dedupe by id.

### AA-3 EdgeRouter

Session target: 30 minutes or less.

Acceptance: edges route between two registered nodes.

### AA-4 SelectionModel

Session target: 30 minutes or less.

Acceptance: multi-select with bounding box.

### AA-5 Layout pinning

Session target: 30 minutes or less.

Acceptance: pinning a hazard node preserves position when layout algorithm changes.

### AA-6 ValidationOverlay

Session target: 30 minutes or less.

Acceptance: validator findings render as overlay markers.

### AA-7 ExportEngine

Session target: 30 minutes or less.

Acceptance: canvas exports to SVG/PNG and to SysML deltas.

### AA-8 CommandStack

Session target: 30 minutes or less.

Acceptance: undo/redo across all canvas commands.

### AA-9 Canvas-to-SysML write path

Session target: 30 minutes or less.

Acceptance: canvas edits route through CLI command (no direct model writes from UI).

## Epic Exit

- Canvas engine ships behind a feature flag; every persistent change goes through a CLI command.

## GitLab Source Issues

#289–#304 (SMIRO.1–SMIRO.16) — consolidated
