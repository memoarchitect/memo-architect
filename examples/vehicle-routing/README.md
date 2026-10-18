# Vehicle routing comparison pilot

This is a deliberately dense internal-block-diagram routing fixture: 24 blocks,
72 boundary ports, and 36 typed interfaces. It uses the GfSE
[`VehicleModel.sysml`](https://github.com/GfSE/SysML-v2-Models/blob/main/models/SE_Models/VehicleModel.sysml)
as structural inspiration for its drivetrain — fuel tank, engine, transmission,
driveshaft, differential, half axles, and wheels. The MEMO source in this folder
is original: its controller, braking, sensing, power-distribution, and road
connections were added to make crossings and routing choices visible.

Run this isolated pilot from the Architect checkout:

```bash
pnpm example:vehicle-routing
```

Open **Vehicle routing comparison**, then use **Renderer for this diagram** to
switch between React Flow, JointJS, X6 and maxGraph. The selection is written
only for that declared view; **Vehicle reference — default renderer** remains
independent. React Flow placement and routes remain in the shared layout fields.
JointJS and X6 retain their native snapshots in their own namespaces. View layout
is written as metadata inside `model/catalog/views.sysml`, including a versioned
extension record for native and forward-compatible fields. Camera state is not
saved. The native entrypoint is `model/methodology/project.sysml`.

The selector describes each engine's current capabilities. X6 has explicit
routing mappings and native Undo/Redo; approximations are named in its status.
JointJS supports native block, port and segment editing without shared routing
types or Undo. maxGraph supports placement and alignment. React Flow remains the
full IBD authoring surface. This is a dense renderer stress fixture, not a claim
of complete ontology-rule conformance or diagram-quality acceptance.
