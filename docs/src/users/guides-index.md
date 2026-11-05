# Guide Map

These guides walk you through using MEMO on a **real medical device project**,
from an empty folder to a design review with complete traceability.

## Who is this for?

- **Systems engineers** starting a new device who want model-based
  traceability from day one.
- **Software and hardware leads** who already have requirements in
  spreadsheets and need them in a SysML v2 model.
- **Quality and regulatory engineers** who need to show closure (ISO 14971,
  IEC 62304) before submission.

!!! tip "New to MEMO?"
    Start with the **[End-to-End Tutorial](medical-device-tutorial.md)**: it
    follows one scenario through the bundled GPCA pump, makes a change, and
    validates it.

## Guides

| Guide | What you'll learn |
|-------|-------------------|
| [End-to-End Tutorial](medical-device-tutorial.md) | Follow a scenario across layers, make a change, validate it |
| [Start a New Project](new-project.md) | Scaffold a project, understand its layout, build a first slice |
| [Model Your Device](modeling-guide.md) | Write one need-to-evidence slice in SysML with MEMO kinds |
| [Import Existing Data](importing-data.md) | Bring requirements, hazards and components in from CSV |
| [Validation and Closure](validation.md) | Run `memo validate`, read findings, close traceability gaps |
| [Viewpoints and Diagrams](viewpoints-diagrams.md) | Add views, edit diagram layouts, export |
| [Modeling](../modeling/index.md) | What each layer, extension and view kind lets you model |

## Typical workflow

1. **Create the project.** `memo-architect init my-device` scaffolds the model
   and installs the ontology.
2. **Bring in what you have.** `memo-architect import csv` turns spreadsheet
   records into SysML source.
3. **Connect the argument.** Add typed relationships in `.sysml` files—or from
   the Traceability Matrix with **Edit trace** on.
4. **Review visually.** `memo-architect dev` opens the workbench; the model
   reloads as you save.
5. **Close the gaps.** `memo validate .` (and the Problems bar) report what the
   closure rules still expect.
6. **Publish a review snapshot.** `memo-architect build` writes a static viewer;
   **☰ › Model › Documents** produces the DHF documents.

!!! tip "Already have requirements in Excel?"
    Jump to [Import Existing Data](importing-data.md): generate a CSV template
    that matches your ontology, paste your data in, and import it with one
    command.
