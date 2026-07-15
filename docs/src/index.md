## Get Started

- **Users:** [Installation](users/installation.md), [Running MEMO](users/running.md), and [CLI Usage](users/cli-usage.md) or [Workbench UI Usage](users/ui-usage.md).
- **Developers:** [Codebase Overview](developers/codebase-overview.md). Repository-level architecture, decisions, roadmap, and LLM context live under `docs/`.

---

## Quick Example

**1. Define your system in SysML v2:**

```sysml
package GPCA_Pump {
    part def PumpSystem :> System {
        attribute redefines name = "GPCA Infusion Pump";
    }

    requirement def SafeDelivery :> SystemRequirement {
        attribute redefines title = "Drug delivery within +/- 5% accuracy";
    }

    part def OverInfusion :> Hazard {
        attribute redefines title = "Over-infusion of drug";
    }

    part def FlowSensor :> RiskControl {
        attribute redefines title = "Flow rate sensor with alarm";
    }

    connection : mitigates connect FlowSensor to OverInfusion;
}
```

**2. Run the dev server:**

```bash
memo dev
```

**3. See the live diagram** at `http://localhost:3000` with validation, completeness, and viewpoint filtering.

---

## Project Status

MEMO is in active development. Public defects and feature discussions are tracked
in the [GitHub issue tracker](https://github.com/memoarchitect/memo-architect/issues).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Parser | [Langium](https://langium.org/) (SysML v2 grammar) |
| Build | TypeScript, pnpm workspaces, Turborepo |
| CLI | [Commander.js](https://github.com/tj/commander.js), Chalk, Chokidar |
| Web | React 18, Vite 6, Tailwind CSS v4, Zustand 5 |
| Diagram | [ReactFlow](https://reactflow.dev/), [ELK.js](https://www.eclipse.org/elk/) |
| Protocol | WebSocket (ws) |
| Testing | Vitest |
