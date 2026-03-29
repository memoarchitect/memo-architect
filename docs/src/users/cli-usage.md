# CLI Reference

The `memo` CLI provides a powerful suite of tools for MBSE, ontology management, and regulatory compliance. This reference covers all available command groups and their options.

---

## 1. Core Project Lifecycle

These commands allow you to start, develop, and build your MEMO project.

### `memo init`
Scaffold a new MEMO project or ontology package.

```bash
memo init [name] [options]
```

| Option | Default | Description |
|---|---|---|
| `-t, --template <id>` | `medical` | Domain template to use |
| `--ontology <pkg>` | `@memo/medical-modeling-profile` | Ontology package to extend |
| `--list-ontologies` | — | List all available ontology packages and exit |

**Example:**
```bash
memo init my-ventilator --template medical
```

### `memo dev`
Start the interactive development server with live model reload and a built-in diagram viewer.

```bash
memo dev [options]
```

| Option | Default | Description |
|---|---|---|
| `-p, --port <port>` | `3000` | Port for the web interface |
| `--no-open` | — | Do not automatically open the browser |

### `memo validate`
Check your model against the active ontology's closure rules and show completeness stats.

```bash
memo validate [dir] [options]
```

| Option | Default | Description |
|---|---|---|
| `--format <fmt>` | `text` | Output format: `text`, `junit`, `json` |
| `-o, --output <file>` | — | Write validation results to a file |

### `memo build`
Generate a self-contained, static HTML site from your model. Ideal for air-gapped design reviews.

```bash
memo build [options]
```

| Option | Default | Description |
|---|---|---|
| `-o, --output <dir>` | `dist` | Target directory for the build |
| `--single-file` | — | Inline all assets into a single `index.html` file |
| `--kpar` | — | Also produce a `.kpar` (Knowledge Package Archive) for distribution |

---

## 2. Export Suite

Export your model or parts of it to standard interchange formats.

### `memo export json`
Export the full semantic model as a structured JSON file.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | `memo-model.json` | Output file path |
| `--no-pretty` | — | Minify the JSON output |

### `memo export dot`
Export the model as a Graphviz DOT file for specialized visualization.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | `memo-model.dot` | Output file path |
| `--viewpoint <id>` | — | Filter the export to a specific viewpoint (e.g., `risk-overview`) |

### `memo export dhf`
Export Design History File (DHF) documents.

| Option | Default | Description |
|---|---|---|
| `-o, --output <dir>` | `dhf-output` | Output directory |
| `-f, --format <fmt>` | `html` | Output format: `html`, `md` (Markdown), `docx` |
| `-t, --target <id>` | — | Export a specific document (e.g., `rmp`, `fmea`, `har`) |
| `-g, --group <name>` | — | Export a group of docs: `risk`, `design`, `verification`, `all` |

---

## 3. Import Suite

Import data from spreadsheets, MBSE tools, or existing ontologies.

### `memo import csv`
Import model elements from a CSV file.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | — | Target `.sysml` file path |
| `--package <name>` | `Import` | The SysML package to wrap the elements in |
| `--dry-run` | — | Preview the generated SysML without writing to disk |

**CSV Headers:** `id`, `name`, `kind`, `doc`, `[...]` (where kind matches the ontology).

### `memo import csv-rel`
Import relationships between existing elements.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | — | Target `.sysml` file path |
| `--package <name>` | `Traceability` | The SysML package to wrap the connections in |

**CSV Headers:** `sourceId`, `targetId`, `type` (where type is a relationship in the ontology).

### `memo import template`
Generate blank CSV templates based on your current ontology.

```bash
memo import template <elements|relationships> -o templates.csv
```

### `memo import (ea|cameo|sysand|owl)`
Import from specialized sources:
- **`ea`**: Sparx Enterprise Architect JSON exports.
- **`cameo`**: MagicDraw/Cameo XMI or JSON files.
- **`sysand`**: SysAnd interchange project directories.
- **`owl`**: OWL/Turtle or JSON-LD ontologies.

---

## 4. Ontology & Package Management

Manage the "DNA" of your model—the kinds, layers, and rules.

### `memo ontology show`
Display a summary of the resolved ontology stack (all layers, kinds, relationship types, and closure rules).

### `memo ontology export`
Export the ontology itself for interoperability:
- **`export owl`**: Export to OWL/Turtle format.
- **`export xml`**: Export to OWL/RDF XML format.
- **`export sysand`**: Export the full dependency stack as a SysAnd project.

### `memo lock`
Regenerate the `memo.lock.yaml` file to pin all ontology versions in the dependency chain.

### `memo install`
Install an ontology package from a Git URL, npm package, or local path.

```bash
memo install https://github.com/myorg/custom-profile.git
```

---

## 5. Intelligence (AI Features)

MEMO includes built-in AI capabilities to assist with modeling and drafting.

### `memo ask`
Ask natural language questions about your model.

```bash
memo ask "Which hazards are still missing mitigation controls?"
```

### `memo generate`
Generate SysML snippets from a description.

```bash
memo generate "Create a requirement for a 10-hour battery life and an actor called Pharmacist."
```

### `memo dhf draft`
Use an LLM to automatically draft content for missing sections in your DHF documents based on the existing model data.

```bash
memo dhf draft --target rmp --section "Risk Acceptability"
```

---

## 6. DHF Workbench

Advanced commands for managing Design History File document versions and reviews.

| Command | Description |
|---|---|
| `memo dhf status` | Show readiness percentage and gaps for all DHF docs |
| `memo dhf snapshot` | Capture current model state as a baseline for change tracking |
| `memo dhf diff` | Compare current state against the latest snapshot (see additions/deletions) |
| `memo dhf redline` | Generate a redlined document showing changes since the last version |
| `memo dhf review-packet` | Generate all enabled DHF docs and snapshots for a formal review |

---

## 7. Plugin System

Extend MEMO with custom validators, exporters, or generators.

- **`memo plugin list`**: See all configured plugins.
- **`memo plugin create`**: Scaffold a new plugin project.
- **`memo plugin run <id>`**: Execute an analysis or generator plugin.
