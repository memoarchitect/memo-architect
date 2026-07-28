# Architect command line

`memo-architect` opens a MEMO project as an interactive workbench or builds a
static viewer. Run it from the project directory containing `memo.config.yaml`
or `memo.package.yaml`.

## Discover what is available

```bash
memo-architect --help
memo-architect examples
memo-architect templates
```

`examples` lists the example IDs bundled by the installed ontology package.
`templates` lists the project templates that can be created with MEMO Tools.
The choices come from the installed content manifest, so the CLI does not rely
on a hard-coded list that can drift from the package.

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
memo templates
memo examples
memo init my-device --template infusion-pump
memo validate my-device
```
