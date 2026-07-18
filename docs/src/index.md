# MEMO Architect: review a medical-device model

MEMO Architect is the visual review workbench for a model that already lives
in SysML v2 source. It helps an engineering team navigate a device by concern,
follow a trace from need to evidence, inspect validation gaps, and prepare
review artifacts—without creating a second model.

Architect is the highest layer of the MEMO product family. The
**Ontology** supplies meaning and methodology; **Tools** reads and validates the
source; **Architect** makes that shared model easier to explore and review.

## Start with what you need to accomplish

| Your goal | Start here |
|---|---|
| Decide which MEMO product you need | [Choose Your MEMO Layer](users/choose-layer.md) |
| Open the included pump model | [First Workbench Session](users/first-session.md) |
| Understand why the model has layers | [Layers and Their Questions](users/layers.md) |
| Decide whether something is a requirement, function, component, or risk | [Choosing Elements](users/elements.md) |
| Build traceability correctly | [Connecting Elements](users/relationships.md) |
| Learn from a complete example | [Worked GPCA Example](users/gpca-example.md) |
| Bring in spreadsheet records | [Import Existing Data](users/importing-data.md) |
| Find and resolve model gaps | [Validation and Closure](users/validation.md) |

## The review path

Use views to follow a single connected thread:

`context and use → needs and requirements → design response → risk and controls → verification evidence → review`

The workbench gives you different lenses on this one model. A diagram, matrix,
table, or document is a view of the source—not a separate source of truth.

## Five-minute launch

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run example:dev
```

Open `http://localhost:3000`, then follow
[First Workbench Session](users/first-session.md).

!!! note "Project status"
    MEMO is in active development. APIs, views, and model semantics may change
    before the first stable release.
