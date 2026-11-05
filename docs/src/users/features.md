# Feature Tour

MEMO Architect is a set of views over one SysML v2 source model. This tour
explains what each feature is for, where to find it, and where to read more.
Diagrams, tables, documents and notebooks never create a separate copy of the
engineering model.

## Finding your way

Open the navigation with **☰** in the top-left corner. It has five sections:

| Section | Pages |
|---|---|
| **Home** | Dashboard; Guide and Custom Dashboards when switched on |
| **Views** | Viewpoints, Use Cases, UI Screens, Interfaces |
| **Model** | Architecture and Assurance explorers, Traceability Matrix, Documents; Model Diff and AI Tools when switched on |
| **Advanced** | Variability, Projects and Impact, Release Records, Suspect Links, Design Structure Matrix, Analysis Notebooks; Design Review and Statistics when switched on |
| **Settings** | Settings (including Rules and Methodology); Import Model and Ontology Explorer when switched on |

Every page has its own URL, so you can bookmark or share any view, element or
matrix.

## Feature availability

| Availability | Meaning | How to enable |
|---|---|---|
| Standard | Part of the normal regulated workspace | Start Architect normally |
| Experimental | Advanced or evolving; hidden by default | Start with `memo-architect dev --experimental`, or switch individual features on in **Settings › Features** (saved per person) |

Experimental features are AI Tools, Ontology Explorer, Import Model, the Model
Tools (Model Diff, Design Review, Statistics), the Guide and Custom Dashboards.
Generated and transformed content from these features carries no
design-control provenance; review it before committing it.

## Home

### Dashboard

**Purpose:** see the model's size, coverage and the most important next review
action.

The Dashboard shows element and relationship totals, completeness, violations
and layer coverage, with shortcuts into common review tasks. Start here after
loading a project or after a large import.

- Which layers contain model content?
- Where is coverage absent or unexpectedly low?
- Are there validation issues that should block the next review?

With the Guide switched on, the Dashboard also shows the next step of the
project's method. See [Custom Dashboards](dashboards.md) for markdown
dashboards with live embeds.

## Views

### Viewpoints and diagrams

**Purpose:** review one concern without putting the whole model on one canvas.

**☰ › Views › Viewpoints** lists the ontology's viewpoints and their views. The
renderer follows the view's kind: general (BDD, requirements, risk chain),
interconnection (IBD), action flow, state transition, sequence, grid and
browser. The **Role** control narrows the list to the viewpoints written for
your role.

See [Views and diagrams](../modeling/views/index.md) for what each diagram
shows, and [Viewpoints and Diagrams](viewpoints-diagrams.md) for how to add and
edit views.

### Use Cases

**Purpose:** review operational intent from goals through scenarios.

**☰ › Views › Use Cases** lists use cases grouped by declared level, each with
the workflows that realize it and their scenarios. Select a scenario to review
it as an operational flow; variants appear as rows you can switch between.

- What goal is the actor trying to accomplish?
- Which normal, alternate and failure scenarios are represented?
- Which requirements and risks does each scenario exercise?

See the [Operational layer](../modeling/layers/operational.md).

### UI Screens

**Purpose:** connect the user interface to the model.

Load screen captures, detect regions, label each as a UI element and accept it
into the model. Each region links to its traceability. See
[Human factors](../modeling/layers/human-factors.md).

### Interfaces

**Purpose:** list every interface between two parts.

Pick two parts—of any kind or layer—and Architect lists every interface between
them: ports, connectors and what flows. Save the result as a markdown page. The
same list is available from a terminal: `memo-architect interfaces <a> <b>`.

## Model

### Model Explorer

**Purpose:** browse the model as typed engineering content instead of raw files.

**☰ › Model › Architecture** and **Assurance** open the explorer on one domain,
with a system filter. The explorer groups elements by kind (requirements by
requirement type, use cases by declared level) and, if you switch it on, by
package. Search by name or id, select an element, and follow its relationships
in the Properties panel.

See [Choosing Elements](elements.md), [Connecting Elements](relationships.md)
and [Layers](../modeling/layers/index.md).

### Traceability Matrix

**Purpose:** show and close coverage gaps.

Choose rows and columns (or a quick trace such as *Requirement → Test case*),
build the matrix, filter to missing links, and save it into the model as a view.
With **Edit trace** on, clicking a cell writes or removes a typed relationship.
See [Analysis Tools](analysis-tools.md#1b-traceability).

### Documents and the DHF workbench

**Purpose:** produce reviewable engineering documents from model content.

**☰ › Model › Documents** lists the DHF documents and their readiness.
Documents pull requirements, risks, architecture and verification evidence
into controlled review artifacts, with the document's diagrams drawn in.
Download as HTML, PDF or Word.

Generated documents are reviewed and approved through your organization's
quality process. See [DHF Workbench](dhf-workbench.md).

## Advanced

| Page | Purpose | Read more |
|---|---|---|
| Variability | Features, variation points, variants and release selections | [Features and Design Options](variability.md) |
| Projects and Impact | Change projects and the elements they affect | — |
| Release Records | What each release contains | [Features and Design Options](variability.md) |
| Suspect Links | Links whose imported record changed revision | [Analysis Tools](analysis-tools.md#1c-suspect-links) |
| Design Structure Matrix | Dependencies and coupled clusters | [Analysis Tools](analysis-tools.md#1-design-structure-matrix-dsm) |
| Analysis Notebooks | Live JupyterLab on the project's `analysis` folder | [Analysis Tools](analysis-tools.md#jupyter-notebooks) |

### Analysis notebooks

Architect starts JupyterLab for you when you open **Analysis Notebooks**, and
stops it when Architect exits. Every project created by `memo-architect init`
includes `analysis/Samples/README.md` and seven model-independent notebooks:

| Notebook | Analysis |
|---|---|
| Model overview | Semantic composition and diagnostic summary |
| Architecture hotspots | Busy containers and deep ownership paths |
| Model quality | Diagnostics, unnamed elements, repeated names and empty definitions |
| Change-impact explorer | Structural neighborhood of a selected element |
| Model charts | Semantic bar chart and diagnostic donut chart |
| Ownership graph | SVG graph of model ownership relationships |
| Model inventory table | HTML inventory with filters and CSV export |

The samples read the model through `analysis/memo_model.py`, compiled by the
project's compiler (or your own default where the project names none; set it
with the **Compiler** control or `memo-architect config set compiler`).

## Validation and the Problems bar

**Purpose:** keep completeness and consistency gaps visible during review.

The Problems bar at the bottom combines validation violations, completeness and
analysis findings. Expand it and select a finding to go to the affected
element.

A clean display means the configured rules passed—not that the design is safe
or complete. Rule coverage and human review remain necessary. See
[Validation and Closure](validation.md).

## Suggested first session

1. Use the **Dashboard** to find a coverage gap.
2. Find the relevant element in the **Model Explorer**.
3. Review it in a focused **Viewpoint**.
4. Follow related behavior in **Use Cases**.
5. Inspect findings in the **Problems** bar.
6. Build a **Traceability Matrix** for the gap you found.
7. Generate or review the relevant artifact in **Documents**.

For a guided example, continue with [First Workbench Session](first-session.md)
or the [Worked GPCA Example](gpca-example.md).
