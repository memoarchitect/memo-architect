# Command Line Usage

Two commands are installed with Architect:

- **`memo-architect`** opens a project in the workbench, builds static viewers,
  and owns the project commands: `init`, `import`, `export`, `install`, `dhf`,
  `rules`, `new` and more.
- **`memo`** (from MEMO Tools) compiles, validates, evaluates and packages a
  model. It is what CI runs.

Run both from the project root—the directory containing
`model/methodology/project.sysml`, the project's native entrypoint.

## Discover what is available

```bash
memo-architect --help
memo-architect --list
memo --help
```

`--list` (or `memo-architect examples`) prints the examples bundled with the
installed ontology package and how to run each.

## Create a project

```bash
memo-architect init my-device
```

`init` always creates a new, empty project; to look at a worked model, open an
example with `--example` instead. `init` creates `package.json`, `memo.package.yaml`, `memo.lock.yaml`,
`syside.toml`, the `model/` skeleton and `analysis/Samples`, then installs the
ontology. `--no-install` skips the install; `--toolchain.compiler syside` or
`opensysml` chooses the compiler. See [Start a New Project](new-project.md).

## Open a project

```bash
cd my-device
memo-architect dev
```

| Option | Default | Meaning |
|---|---:|---|
| `-p, --port <port>` | `3000` | HTTP port for the workbench. |
| `--no-open` | off | Start the server without opening a browser. |
| `--keep-alive` | off | Keep running after the last browser tab closes. |
| `--experimental` | off | Enable every experimental surface (AI Tools, Ontology, Import, Model Tools, Guide, Custom Dashboards). |
| `--at <ref>` | — | Open the model as it was at a commit, tag or branch, read-only. |
| `--release <record>` | — | Open the version a release record names, read-only. |

Architect requires a project. Running it with no command, `--example` or
`--list` prints help instead of starting an empty workbench.

## Open a bundled example

```bash
memo-architect --example gpca
memo-architect --example ros-mobile-robot
memo-architect --example standard-sysml-diagrams --read-only
```

An example from an installed package opens in a disposable copy, so the
dependency is never modified. A writable local ontology checkout opens in
place; `--read-only` forces the disposable copy.

## Validate and compile

```bash
memo validate .
memo validate . --format junit --output validation.xml
memo compile .
```

`memo validate` runs the compiler (stage 1) and then MEMO's closure rules.
See [Validation and Closure](validation.md).

## Choose the compiler

```bash
memo-architect config set compiler opensysml            # just for you
memo-architect config set compiler syside --project     # for everyone on the project
memo-architect config get
```

The project's setting wins over yours; yours applies where the project names
none. The **Compiler** control in the top bar does the same.

## Import, export and documents

```bash
memo-architect import template elements --output element-template.csv
memo-architect import csv requirements.csv --dry-run
memo-architect export json --output model.json
memo-architect export dot --output model.dot --viewpoint VP-LOG
memo-architect export dhf --format docx
memo-architect dhf review-packet
```

See [Import Existing Data](importing-data.md) and [DHF Workbench](dhf-workbench.md).

## Other project commands

| Command | Purpose |
|---|---|
| `memo-architect interfaces <a> <b>` | List every interface between two elements, of any kind or layer. |
| `memo-architect anatomy generate` | Generate the anatomy package the project's selectors ask for (see [Clinical and anatomy](../modeling/extensions/clinical-anatomy.md)). |
| `memo-architect install [source]` | Install locked MEMO content, or add a package from git, npm or a path. |
| `memo-architect lock` / `upgrade [version]` | Re-lock the ontology, or move to one release of Architect, Tools and Ontology. |
| `memo-architect ontology show` | Show the resolved kinds, relationships and rules. |
| `memo-architect new requirement` | Write a requirement stub from an EARS pattern. |
| `memo-architect new rule` / `new kind` / `new package` / `new plugin` | Scaffold a rule, kind, package or plugin. |
| `memo-architect rules` | Manage consistency rules. |
| `memo-architect ids rebase` | Renumber a branch's ids that clash with the target branch's. |
| `memo-architect migrate-layout` | Move diagram layouts from `.viewlayout` companions into the views. |
| `memo-architect mcp` | Serve the model to AI coding tools (see [AI Coding Tools](mcp-cursor.md)). |
| `memo-architect ask` / `generate` | Ask about the model, or draft SysML, with an LLM (see [Intelligence and AI](ai-features.md)). |

Every command has `--help`.

## Start only JupyterLab

```bash
memo-architect jupyter
```

Starts JupyterLab for the project's `analysis` folder without the workbench,
prints the URL, and stops JupyterLab on Ctrl-C. `memo-architect dev` already
starts Jupyter when you open **Analysis Notebooks**. `-p, --port` fixes the
port; set `MEMO_JUPYTER_BIN` to use a `jupyter` that is not on `PATH`. See
[Analysis Tools](analysis-tools.md#jupyter-starts-for-you).

## Build a static viewer

```bash
memo-architect build --output dist
memo-architect build --output review-viewer --standalone
```

| Option | Default | Meaning |
|---|---:|---|
| `-o, --output <dir>` | `dist` | Output directory. |
| `--standalone` | off | Inline JavaScript and CSS into `index.html`. |
| `--experimental` | off | Include the experimental surfaces. |

Keep the source commit, the lock file and the build command with the review
record.
