# CLI Reference

The `memo` CLI provides a powerful suite of tools for MBSE, ontology management, and regulatory compliance. This reference covers all available command groups and their options.

---

## 1. Core Project Lifecycle

These commands allow you to start, develop, and build your MEMO project.

### `memo init`
Scaffold a new MEMO project. Omit the name, or pass `.`, to initialize the current
directory.

```bash
memo init [name] [options]
```

| Option | Default | Description |
|---|---|---|
| `-t, --template <id>` | — | Create from an ontology template |
| `--ontology <package>` | from the content manifest | Logical ontology package to use |
| `--example <id>` | — | Create from an example project |
| `--list` | — | List installed ontology packages, templates, and examples, then exit |
| `--no-install` | — | Create the project without running `npm install` |

Run `memo init --list` to see what is installed. A stock install offers the templates
`default`, `samd`, `connected-device`, `monitoring-device`, and `infusion-pump`, and the
examples `gpca-pump`, `sysml-diagram-samples`, `template`, and `clinical`.

**Example:**
```bash
memo init my-ventilator --template infusion-pump
```

### `memo-architect dev`
Start Architect with live model reload.

```bash
memo-architect dev [options]
```

| Option | Default | Description |
|---|---|---|
| `-p, --port <port>` | `3000` | Port for the web interface |
| `--no-open` | — | Do not automatically open the browser |

### `memo-architect --example`

Open a bundled example. **Where it opens from depends on how the ontology resolves:**

- A **local checkout** (a sibling clone or workspace link) is served **in place**, so
  your edits are real and can be committed. The path is printed on startup.
- An **installed package** under `node_modules` is copied to a disposable directory
  first, and the copy is discarded on exit — a dependency is never modified.

```bash
memo-architect --example <name> [options]
```

| Option | Default | Description |
|---|---|---|
| `--example <name>` | — | Manifest key or bundled example directory, such as `gpca` or `standard-sysml-diagrams` |
| `--read-only` | — | Always use a disposable copy, even from a local checkout |
| `-p, --port <port>` | `3000` | Port for the web interface |
| `--no-open` | — | Do not automatically open the browser |

!!! warning "`--example` is not read-only by default"
    From a local checkout your changes are written to the example's real source.
    Pass `--read-only` if you only want to look around.

### `memo validate`
Check your model against the active ontology's closure rules and show completeness stats.

```bash
memo validate [dir] [options]
```

| Option | Default | Description |
|---|---|---|
| `--format <fmt>` | `text` | Output format: `text`, `junit`, `json` |
| `-o, --output <file>` | — | Write validation results to a file |

### `memo-architect build`
Generate a static Architect viewer from your model.

```bash
memo-architect build [options]
```

| Option | Default | Description |
|---|---|---|
| `-o, --output <dir>` | `dist` | Target directory for the build |
| `--standalone` | — | Inline entry JavaScript and CSS into `index.html` |

### `memo pack`
Create a Knowledge Package Archive without requiring Architect.

```bash
memo pack [options]
```

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | project-derived | Output `.kpar` path |

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
| `-t, --target <id>` | — | Export a specific document (e.g., `rmp`, `har`, `fmea`) |
| `-g, --group <group>` | — | Export a group of docs: `risk`, `design`, `verification`, `compliance`, `all` |

---

## 3. Import Suite

Import data from spreadsheets, MBSE tools, or existing ontologies.

### `memo import csv`
Import model elements from a CSV file.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | `<package>.sysml` | Target `.sysml` file path |
| `--package <name>` | derived from the CSV filename | The SysML package to wrap the elements in |
| `--dry-run` | — | Preview the generated SysML without writing to disk |

**CSV Headers:** `id`, `name`, `kind`, `doc`, `[...]` (where kind matches the ontology).

### `memo import csv-rel`
Import relationships between existing elements.

| Option | Default | Description |
|---|---|---|
| `-o, --output <file>` | `<package>_relationships.sysml` | Target `.sysml` file path |
| `--package <name>` | derived from the CSV filename | The SysML package to wrap the connections in |
| `--dry-run` | — | Preview the generated SysML without writing to disk |

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
Install locked MEMO content, or add a package from a Git URL, npm package name, or local
path. With no argument it installs what `memo.lock.yaml` already pins.

```bash
memo install
memo install https://github.com/myorg/custom-profile.git
```

| Option | Default | Description |
|---|---|---|
| `--mode <mode>` | detected from the source | Force the install mode: `git`, `npm`, or `local` |

### `memo create-package`
Scaffold a new MEMO package rather than a project.

```bash
memo create-package @myorg/cardiac-ontology --type ontology
```

| Option | Default | Description |
|---|---|---|
| `-t, --type <type>` | `ontology` | `ontology`, `profile`, `library`, or `device` |
| `-e, --extends <package>` | auto for profiles | Package to extend |
| `-d, --description <desc>` | — | Package description |
| `--author <author>` | — | Package author |
| `--license <license>` | `Apache-2.0` | License identifier |
| `-o, --output <dir>` | `.` | Output base directory |

---

## 5. Intelligence (AI Features)

MEMO includes built-in AI capabilities to assist with modeling and drafting.

### Configuring a provider

`ask`, `generate`, and `dhf draft` all need an API key. MEMO reads, in order: the
environment, a project `.env`, `.memo/llm.json` for provider and model, then
`~/.memo/credentials.json` for a key saved from the workbench.

```bash
export ANTHROPIC_API_KEY=sk-ant-...     # or OPENAI_API_KEY
export MEMO_LLM_MODEL=claude-opus-5     # optional override
```

See [Intelligence & AI](ai-features.md) for the full resolution order and where each
source is appropriate.

### `memo ask`
Ask natural language questions about your model.

```bash
memo ask "Which hazards are still missing mitigation controls?"
```

| Option | Description |
|---|---|
| `--layer <layer>` | Restrict the context to one architecture layer |
| `--kind <kind>` | Restrict the context to one element kind |

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

### `memo mcp`
Serve the model to AI coding tools (Cursor, Claude Code) over the Model Context
Protocol. Speaks JSON-RPC on stdio, so it is normally launched by the IDE rather than
run by hand. Needs no API key — your IDE supplies the model.

```bash
memo mcp [options]
```

| Option | Default | Description |
|---|---|---|
| `--project <dir>` | current directory | Project to serve |
| `--write` | — | Enable the model-editing tool (read-only otherwise) |

### `memo mcp init`
Register the MCP server with Cursor and write MEMO editing rules. Merges into an
existing `.cursor/mcp.json` rather than replacing it.

```bash
memo mcp init [options]
```

| Option | Default | Description |
|---|---|---|
| `--project <dir>` | current directory | Project to register |
| `--write` | — | Register with editing tools enabled |
| `--no-rules` | — | Skip writing `.cursor/rules/memo.mdc` |

See [AI Coding Tools (MCP)](mcp-cursor.md) for the full tool reference.

---

## 6. DHF Workbench

Advanced commands for managing Design History File document versions and reviews.

| Command | Description |
|---|---|
| `memo dhf init` | Scaffold a DHF document set for your project (interactive wizard) |
| `memo dhf preview` | Start a local DHF preview server with live reload |
| `memo dhf status` | Show readiness percentage and gaps for all DHF docs |
| `memo dhf snapshot` | Capture current model state as a baseline for change tracking |
| `memo dhf diff` | Compare current state against the latest snapshot (see additions/deletions) |
| `memo dhf redline` | Generate a redlined document showing changes since the last snapshot |
| `memo dhf review-packet` | Generate all enabled DHF docs and snapshots for a formal review |

---

## 7. Consistency Rules

Inspect the closure rules your ontology enforces, separately from running them.

| Command | Description |
|---|---|
| `memo rules list [dir]` | List every consistency rule |
| `memo rules check [dir]` | Evaluate the rules against the current model |
| `memo rules explain <ruleId> [dir]` | Show detailed information for one rule |
| `memo rules coverage [dir]` | Show coverage rules grouped by regulatory standard |

---

## 8. Interoperability Checks

Confirm the model survives the trip to another SysML v2 tool before you rely on it.

### `memo check`
Check the model against the SysML v2 standard.

| Option | Default | Description |
|---|---|---|
| `--sysml-compat` | — | Run the SysML v2 standard compatibility check |
| `--format <format>` | `text` | `text` or `json` |
| `-o, --output <file>` | — | Write the report to a file |

### `memo round-trip`
Predict how well the model round-trips through an external tool.

| Option | Default | Description |
|---|---|---|
| `--tool <tool>` | `syson` | Target tool: `syson`, `syside`, or `cameo` |
| `--format <format>` | `text` | `text` or `json` |
| `-o, --output <file>` | — | Write the report to a file |

### `memo sysand publish`
Validate and package the ontology for SysAnd registry publication.

---

## 9. Authoring Helpers

### `memo req new`
Generate a requirement stub from an EARS template, so the phrasing is well-formed before
you fill in the detail.

---

## 10. Plugin System

Extend MEMO with custom validators, exporters, or generators.

- **`memo plugin list`**: See all configured plugins.
- **`memo plugin create <name>`**: Scaffold a new plugin project.
- **`memo plugin run <id>`**: Execute an analysis or generator plugin.
