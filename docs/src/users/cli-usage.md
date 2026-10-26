# Architect command line

`memo-architect` opens a MEMO project as an interactive workbench or builds a
static viewer. Run it from the project root — the directory containing
`model/methodology/project.sysml`, the project's native entrypoint. A project stays a
project when every YAML file beside it is deleted.

## Discover what is available

```bash
memo-architect --help
memo-architect examples
```

`examples` lists the example IDs bundled by the installed ontology package.
The choices come from the installed content manifest, so the CLI does not rely
on a hard-coded list that can drift from the package. A new project starts from
one empty skeleton (`memo-architect init`) or from a copy of an example
(`memo-architect init --example <id>`).

## Open a project

```bash
cd my-device
memo-architect dev
```

| Option | Default | Meaning |
|---|---:|---|
| `-p, --port <port>` | `3000` | HTTP port for the workbench. |
| `--no-open` | off | Start the server without opening a browser. |

Architect requires a project. Running the command without `dev`, `build`, or
`--example` prints help instead of starting an empty workbench.

## Open a worked example

```bash
memo-architect examples
memo-architect --example gpca
memo-architect --example standard-sysml-diagrams --read-only
```

| Option | Default | Meaning |
|---|---:|---|
| `--example <id>` | — | Open an example listed by `memo-architect examples`. |
| `--read-only` | off | Use a disposable copy; edits are discarded on exit. |
| `-p, --port <port>` | `3000` | HTTP port for the workbench. |
| `--no-open` | off | Do not open a browser. |

A writable local ontology checkout is opened in place. An example from an
installed package is copied to a disposable directory automatically so a
dependency is never modified.

## Start only JupyterLab

```bash
memo-architect jupyter
```

Starts JupyterLab for the project in the current directory (its `analysis` folder) without
the workbench. It prints the URL, runs in the foreground, and stops JupyterLab on Ctrl-C or
SIGTERM. `memo-architect dev` already starts Jupyter for you when you open the Analysis
view; this command is for using JupyterLab alone.

| Option | Default | Meaning |
|---|---:|---|
| `-p, --port <port>` | a free port | Port for JupyterLab. |

Architect finds `jupyter` on `PATH`; set `MEMO_JUPYTER_BIN` to use another executable.
See [Analysis Tools](analysis-tools.md#jupyter-starts-for-you).

## Build a static viewer

```bash
memo-architect build --output dist
memo-architect build --output review-viewer --standalone
```

| Option | Default | Meaning |
|---|---:|---|
| `-o, --output <dir>` | `dist` | Output directory. |
| `--standalone` | off | Inline JavaScript and CSS into `index.html`. |

## Create a project first

Project creation, validation, import, export, and package management belong to
the [`memo` CLI](https://memoarchitect.github.io/memo-tools/reference/commands/):

```bash
memo-architect init my-device
memo-architect init my-pump --example gpca
memo validate my-device
```
