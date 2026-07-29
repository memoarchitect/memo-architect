# Feature Tour

MEMO Architect is a collection of views over one SysML v2 source model. This
tour explains what each major feature is for, where to find it, and what to do
next. Diagram layouts, tables, documents, and notebooks do not create separate
copies of the engineering model.

## Feature availability

| Availability | Meaning | How to enable |
|---|---|---|
| Standard | Available in the normal regulated workspace | Start Architect normally |
| Experimental | Advanced or evolving behavior; hidden by default | Start with `memo-architect dev --experimental` |

The `--experimental` switch enables all experimental features together. It is
intended for evaluation and development, not as evidence that a feature is
release-ready.

## 1. Dashboard

**Purpose:** understand the model's current size, coverage, and most important
next review action.

Open **Dashboard** to see element and relationship totals, completeness,
violations, layer coverage, and shortcuts into common review tasks. Start here
after loading a project or after a large import.

Use the Dashboard to answer:

- Which engineering layers contain model content?
- Where is coverage absent or unexpectedly low?
- Are there validation issues that should block the next review?

## 2. Model Explorer

**Purpose:** browse the model as typed engineering content instead of raw files.

Open **Model Explorer**, search by name or identifier, then select an element to
inspect its properties and relationships. The explorer groups elements by model
family and keeps the underlying SysML source as the source of truth.

Typical workflow:

1. Search for a requirement, function, component, hazard, or verification item.
2. Open its details.
3. Follow incoming and outgoing relationships.
4. Use the breadcrumb to retain context while moving through the model.

See [Choosing Elements](elements.md) and [Connecting Elements](relationships.md).

## 3. Viewpoints and diagrams

**Purpose:** review a selected concern without placing the entire model on one
canvas.

Open **Viewpoints** and select a modeled view. Architect supports BDD, IBD,
use-case, action-flow, sequence, state, tree, DSM, and tabular presentations.
The appropriate renderer is selected from the view's modeled diagram type.

Use focused views for context, requirements, behavior, logical decomposition,
interfaces, physical architecture, risk, and verification. Auto-layout provides
a starting arrangement; manual positions and sizes can be used when a review
needs a carefully composed page.

See [Viewpoints and Diagrams](viewpoints-diagrams.md).

## 4. Documents and the DHF workbench

**Purpose:** produce reviewable engineering documents from model-backed content.

Open **Documents** to browse configured DHF documents and templates. Documents
can pull requirements, risks, architecture, verification evidence, and other
model content into a controlled review artifact.

Use this feature when preparing design reviews, risk-management records,
software lifecycle documents, verification summaries, or a DHF index. Generated
documents should be reviewed and approved through the organization's quality
process.

See [DHF Workbench](dhf-workbench.md).

## 5. Use Cases

**Purpose:** review operational intent from use-case hierarchy through executable
scenarios.

Open **Use Cases** to navigate modeled operational behavior. A use case may lead
to workflows and scenarios; scenario content can then be reviewed as an
operational flow. This keeps the user's goal, participating actors, and expected
system behavior connected to requirements and design.

Use this area to answer:

- What goal is the actor trying to accomplish?
- Which leaf use cases require detailed workflows?
- Which normal, alternate, and failure scenarios must be represented?
- Which requirements and risks are exercised by each scenario?

## 6. Analysis and Jupyter notebooks

**Purpose:** perform reproducible Python analysis directly against textual SysML
v2 models.

Choose **Analysis → Jupyter Notebooks** to open the live local JupyterLab server.
Every project created by `memo init` includes `analysis/Samples/README.md` and
seven model-independent notebooks:

| Notebook | Analysis |
|---|---|
| Model overview | Semantic composition and diagnostic summary |
| Architecture hotspots | Busy containers and deep ownership paths |
| Model quality | Diagnostics, unnamed elements, repeated names, and empty definitions |
| Change-impact explorer | Structural neighborhood of a selected element |
| Model charts | Semantic bar chart and diagnostic donut chart |
| Ownership graph | SVG graph of model ownership relationships |
| Model inventory table | HTML inventory with filters and CSV export |

The samples use the licensed Syside Python API and automatically locate either
the nearest `model/` or `src/` directory. Start JupyterLab from `analysis/` on
port 8888 before opening the menu.

See [Analysis Tools](analysis-tools.md).

## 7. Validation and the Problems bar

**Purpose:** keep completeness and consistency gaps visible throughout review.

The bottom Problems bar combines validation violations, completeness, and
analysis findings. Expand it to inspect individual issues and navigate back to
the affected model content.

Treat a clean display as evidence that configured rules passed—not as proof that
the design is safe or complete. Rule coverage and human review remain necessary.

See [Validation and Closure](validation.md).

## 8. Experimental tools

Start Architect with `--experimental` to evaluate the following hidden-by-default
surfaces:

| Feature | Purpose |
|---|---|
| Ontology Explorer | Inspect available element kinds, layers, and relationship definitions |
| Import Model | Bring supported external data into the project workflow |
| Design Structure Matrix | Review dependencies and connected clusters |
| Traceability Matrix | Compare coverage across source and target model families |
| Statistics Dashboard | Inspect model-wide counts and distributions |
| Compliance Wizard | Find consistency and compliance candidates for review |
| Model Diff | Compare model states and changed engineering content |
| Review Dashboard | Collect review-oriented status in one workspace |
| Workflow Wizard | Guide modeled workflow creation and review |
| AI Tools | Ask model-aware questions and generate supported SysML drafts |

Ontology and Import appear under **Tools** rather than as permanent top-level
navigation items. AI Tools remains separate because it is an interactive
workspace. Review generated or transformed content before committing it.

See [Intelligence and AI](ai-features.md) for AI configuration and limitations.

## Suggested first session

1. Use **Dashboard** to identify a coverage gap.
2. Find the relevant element in **Model Explorer**.
3. Review it within a focused **Viewpoint**.
4. Follow related operational behavior in **Use Cases**.
5. inspect validation findings in the **Problems** bar.
6. Open **Analysis → Jupyter Notebooks** and run Model Overview or Model Quality.
7. Generate or review the relevant artifact under **Documents**.

For a guided example, continue with [First Workbench Session](first-session.md)
or the [Worked GPCA Example](gpca-example.md).

