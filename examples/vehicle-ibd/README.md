# Vehicle internal block diagram

A dense internal block diagram for trying out IBD editing and routing: 24
blocks, 72 boundary ports and 36 typed interfaces. Its drivetrain (fuel tank,
engine, transmission, driveshaft, differential, half axles and wheels) follows
the GfSE
[`VehicleModel.sysml`](https://github.com/GfSE/SysML-v2-Models/blob/main/models/SE_Models/VehicleModel.sysml).
The MEMO source here is original; its controller, braking, sensing, power and
road connections were added so that routing has crossings to resolve.

Run it from the Architect checkout:

```bash
pnpm example:vehicle
```

and open **Vehicle interconnection**. The example runs from a temporary copy,
so edits do not change this folder. It uses the OpenSysML compiler, which needs
no licence.

In the diagram:

- Drag a part by its title to move it; its inner parts, ports and connectors
  move with it. A part dropped on another lands beside it.
- Drag a port to slide it along its part's walls and round the corners. Dragged
  onto or past another port, it takes the nearest free place.
- Connectors reroute with right-angled (Manhattan) routes whenever a part or
  port moves, and keep clear of the parts and ports they do not connect.
