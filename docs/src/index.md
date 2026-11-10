# MEMO Architect: review a medical-device model

MEMO Architect is the visual workbench for a medical-device model that lives in
SysML v2 source. It helps an engineering team navigate a device by concern,
follow a trace from need to evidence, find validation gaps, and prepare review
artifacts—without creating a second model.

Architect is the top of the MEMO product family. The **Ontology** supplies
meaning and methodology; **Tools** reads and validates the source; **Architect**
makes that shared model easy to explore, edit and review.

!!! warning "Experimental before 1.0"
    MEMO Architect, Tools and the ontology may change before version 1.0. The
    OpenSysML compiler path is newer than SysIDE and has had less use. Use a
    [tagged release](https://github.com/memoarchitect/memo-architect/releases) and
    an exact npm version (currently 0.20.0) rather than `main` or a floating
    range. See the [release notes](release-notes.md).

## Start with what you need to do

| Your goal | Start here |
|---|---|
| Decide which MEMO product you need | [Choose the Right MEMO Product](users/choose-layer.md) |
| Install Architect | [Prerequisites](users/prerequisites.md), then [Installation](users/installation.md) |
| Open the bundled pump model | [First Workbench Session](users/first-session.md) |
| See every major feature | [Feature Tour](users/features.md) |
| Learn what you can model in each layer | [Modeling › Layers](modeling/layers/index.md) |
| Learn to read a diagram (IBD, action flow, state, sequence…) | [Modeling › Views and Diagrams](modeling/views/index.md) |
| Model ROS 2, AADL, cloud, clinical procedures or anatomy | [Modeling › Extensions](modeling/extensions/index.md) |
| Decide whether something is a requirement, function, component or risk | [Choosing Elements](users/elements.md) |
| Build traceability correctly | [Connecting Elements](users/relationships.md) |
| Learn from a complete example | [Worked GPCA Example](users/gpca-example.md) |
| Bring in spreadsheet records | [Import Existing Data](users/importing-data.md) |
| Find and close model gaps | [Validation and Closure](users/validation.md) |

## The review path

Views give you different lenses on one model. Use them to follow a single
connected thread:

`context and use → needs and requirements → design response → risk and controls → verification evidence → review`

A diagram, matrix, table or document is a view of the source—never a separate
source of truth.

## Five-minute launch

With Node.js 26 or later:

```bash
npm install -g @memoarchitect/architect
memo-architect --example gpca
```

Open `http://localhost:3000` if the browser does not open by itself, then follow
[First Workbench Session](users/first-session.md). To build from source
instead, see [Installation](users/installation.md).

## Project links

- [MEMO Architect GitHub repository](https://github.com/memoarchitect/memo-architect)
- [MEMO Ontology documentation](https://memoarchitect.com/memo/) · [GitHub repository](https://github.com/memoarchitect/memo)
- [MEMO Tools documentation](https://memoarchitect.com/memo-tools/) · [GitHub repository](https://github.com/memoarchitect/memo-tools)
- [MEMO product website](https://memoarchitect.com/)
