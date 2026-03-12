# MEMO — Model-Based Systems Engineering

**SysML v2 powered MBSE for medical device development**

MEMO is a developer-first Model-Based Systems Engineering tool that brings the rigor of standards like ISO 14971 and IEC 62304 into a live, code-centric workflow. Instead of heavyweight UML/SysML tools, you write `.sysml` files in your editor and get real-time validation, completeness tracking, and interactive architecture diagrams in your browser.

---

## Key Features

| Feature | Description |
|---|---|
| **SysML v2 Parser** | Full Langium-based parser for SysML v2 textual notation |
| **60+ Entity Types** | Medical device domain ontology covering risk, requirements, architecture, software, verification |
| **Closure Rule Engine** | 15 configurable rules that enforce traceability (ISO 14971, IEC 62304) |
| **CoSMA Visualization** | 10-layer Concerns-Stakeholder-Model-Architecture diagram model |
| **Live Dev Server** | File watcher + WebSocket + React app with instant diagram updates |
| **Viewpoint Filtering** | 7 preconfigured viewpoints (Risk, Requirements, Architecture, etc.) |
| **Completeness Tracking** | Per-layer and overall completeness percentages |
| **Config Inheritance** | YAML configs with `extends` chains for domain reuse |

---

## How It Works

```
  .sysml files          memo.config.yaml
       |                       |
       v                       v
  [ Langium Parser ]    [ Config Loader ]
       |                       |
       v                       v
  [ AST Builder ] -------> [ MemoModel ]
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
      [ Validator ]   [ Completeness ]   [ modelToDTO() ]
              |                |                |
              v                v                v
      violations[]      report {}         MemoModelDTO
              |                |                |
              +----------------+----------------+
                               |
                        [ WebSocket ]
                               |
                               v
                    [ React + ReactFlow ]
                    Interactive Diagram
```

---

## Quick Example

**1. Define your system in SysML v2:**

```sysml
package InfusionPump {
    part def PumpSystem :>> System {
        attribute redefines name = "Infusion Pump";
    }

    requirement def SafeDelivery :>> SystemRequirement {
        attribute redefines name = "Drug delivery within +/- 5% accuracy";
    }

    part def OverInfusion :>> Hazard {
        attribute redefines name = "Over-infusion of drug";
    }

    part def FlowSensor :>> RiskControl {
        attribute redefines name = "Flow rate sensor with alarm";
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

MEMO is in active development. Phase 1 (parser, ontology, config) and Phase 2 (CLI, web app, live reload, validation) are complete. See the [Roadmap](development/roadmap.md) for what's next.

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
