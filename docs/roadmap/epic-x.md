# Epic X: Medical Renderers And Workbenches

Wave: 4 (UI thin wrapper)

Priority: P2

Story Types: Implementation

Goal: ship medical-specific viewpoints (risk grid, bowtie, fault tree, residual heatmap, STPA, DFD, claim chain, evidence matrix, privacy matrix, software safety class tree, benefit-risk delta) and their workbench modes (risk, usability, software lifecycle).

Depends on: Epic O (dispatcher), Epic R (archetypes), Epic V (modules).

## Stories

### X-1 Risk 5×5 grid

Session target: 30 minutes or less.

Acceptance: 5×5 grid renders for ISO 14971 risk set.

### X-2 Bowtie (risk + threat)

Session target: 30 minutes or less.

Acceptance: bowtie renders combining hazard and threat data.

### X-3 Fault tree

Session target: 30 minutes or less.

Acceptance: fault tree renders for one hazard chain.

### X-4 Residual heatmap

Session target: 30 minutes or less.

Acceptance: residual risk heatmap renders.

### X-5 Benefit-risk delta

Session target: 30 minutes or less.

Acceptance: delta renderer compares pre/post mitigation.

### X-6 Software safety-class tree

Session target: 30 minutes or less.

Acceptance: IEC 62304 safety class tree renders.

### X-7 Clinical claim chain

Session target: 30 minutes or less.

Acceptance: claim chain renderer.

### X-8 Clinical evidence matrix

Session target: 30 minutes or less.

Acceptance: evidence matrix renderer.

### X-9 Privacy impact matrix

Session target: 30 minutes or less.

Acceptance: privacy renderer per applicable rules.

### X-10 STPA control structure

Session target: 30 minutes or less.

Acceptance: STPA control structure renderer.

### X-11 Data flow diagram

Session target: 30 minutes or less.

Acceptance: DFD renderer.

### X-12 Risk workbench (ISO 14971 chain)

Session target: 30 minutes or less.

Acceptance: workbench module wires renderers + risk CLI.

### X-13 Usability cockpit (IEC 62366)

Session target: 30 minutes or less.

Acceptance: cockpit module wires usability viewpoints.

### X-14 Software lifecycle (IEC 62304) + evidence linking

Session target: 30 minutes or less.

Acceptance: lifecycle module renders software process artifacts.

### X-15 Workflow defs in medical config

Session target: 30 minutes or less.

Acceptance: workflow defs declared in methodology drive workbench gates.

### X-16 Renderer feature flag

Session target: 30 minutes or less.

Acceptance: `VITE_FEATURE_RENDERER_DHF_IO` toggles DHF I/O renderer.

## Epic Exit

- Medical viewpoints render via dispatcher; workbenches read methodology workflow defs.

## GitLab Source Issues

#262–#273 (S8.1–S8.12), #305–#308 (SMW.1–SMW.4)
