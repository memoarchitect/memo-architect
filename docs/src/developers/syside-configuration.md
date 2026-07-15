# SysIDE Configuration

MEMO includes a root-level `syside.toml` so the SysIDE VS Code extension and
command-line checker load the ontology, methodologies, namespace facade, and
examples as one model.

## Open the repository

1. Clone the repository and initialize both submodules recursively.
2. Open the repository root in VS Code, rather than opening an individual
   `.sysml` file or the ontology submodule by itself.
3. Install and enable the SysIDE extension.

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
code .
```

SysIDE discovers `syside.toml` at the Git root and indexes
`memo-tools/memo/src`. This source root includes `memo_namespaces.sysml` and
the GPCA pump examples, so their cross-package imports resolve in the same
model as the canonical ontology.

## Configuration

```toml
include = [
    "memo-tools/memo/src",
]

exclude = [
    "node_modules",
    "dist",
    "memo-tools/memo/packages",
    ".sysand",
]
```

Do not add the generated package directories as separate SysIDE roots. The
single `src` root prevents duplicate package declarations while preserving
qualified-name resolution across ontology and example files.

## Command-line verification

After configuring the SysIDE license in your environment, verify the same
paths used by the editor:

```bash
syside check --warnings-as-errors memo-tools/memo/src/memo_namespaces.sysml
syside check --warnings-as-errors memo-tools/memo/src/examples
syside check --warnings-as-errors memo-tools/memo/src
```

All three commands must complete with zero diagnostics. If VS Code still shows
old errors after the command-line checks pass, run **Developer: Reload Window**
so SysIDE rebuilds its workspace index from the updated submodule checkout.

## Updating submodules

The repositories form this reference chain:

```text
memo-architect -> memo-tools -> memo
```

After pulling a parent repository, update the physical nested checkouts—not
only the Git index entries:

```bash
git submodule update --init --recursive
```

For MEMO 0.4.0, the innermost `memo` checkout is tagged `v0.4.0`.
