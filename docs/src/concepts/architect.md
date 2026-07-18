# How Architect Works

MEMO Architect is a review surface over a text-first engineering model. It does
not replace SysML v2 files with a private diagram format, and it does not define
new medical-device concepts. Its purpose is to make the model's existing
meaning easier for a team to inspect together.

## The boundary

| Concern | System of record | Architect's role |
|---|---|---|
| Engineering concepts and semantic links | MEMO Ontology and project SysML | Show the chosen kinds and relationships in context |
| Project source | `.sysml` files and project configuration | Read, validate, and reflect source changes |
| Modeling practice | Methodology profiles, viewpoints, and rules | Present the right slice for a review question |
| Review output | Model-derived views and exports | Help people navigate, inspect gaps, and discuss evidence |

This boundary matters: an element selected in a diagram is the same element seen
in a traceability table or a validation finding. A view changes the question
being asked, not the underlying engineering record.

## From source to review

Architect reads the project configuration and selected ontology, builds a
semantic model from SysML v2 source, then derives focused viewpoints. The
workbench can render those viewpoints as diagrams, tables, matrices, and
evidence-oriented views.

For example, one pump requirement can be inspected in several legitimate ways:

| Review question | Useful viewpoint | What the reviewer looks for |
|---|---|---|
| Is the need understood? | Context or operational | actor, use, and intended outcome |
| Does the design answer it? | Functional or architecture | responsible behavior and allocation |
| Is risk managed? | Risk | hazard, control, and control verification |
| Is the claim supported? | Verification | acceptance criteria and evidence coverage |

The views are intentionally small and question-led. Follow one trace before
opening a broad diagram; it is usually a better way to find a missing claim or
an unclear hand-off.

## What Architect does not decide

Architect can expose a missing link, inconsistent source, or incomplete
evidence chain. It cannot decide clinical acceptability, regulatory strategy,
risk acceptability, or design approval. Those remain accountable engineering
and quality-system decisions.

Next, open [First Workbench Session](../users/first-session.md) to explore the
included GPCA model, or [Viewpoints and Diagrams](../users/viewpoints-diagrams.md)
to choose a review lens for your own project.
