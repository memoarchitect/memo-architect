# SysIDE Configuration

The `memo-meta` integration workspace includes a root-level `syside.toml` so
the SysIDE VS Code extension and command-line checker load the ontology,
methodologies, namespace facade, and examples as one model.

## Open the repository

1. Clone `memo-meta` and initialize its sibling submodules.
2. Open the meta repository root in VS Code, rather than an individual product
   checkout.
3. Install and enable the SysIDE extension.

```bash
git clone --recurse-submodules git@gitlab.com:somesh_sandbox/memo-meta.git
cd memo-meta
code .
```

SysIDE discovers `syside.toml` at the Git root and indexes
`memo/src`. This source root includes `memo_namespaces.sysml` and
the GPCA pump examples, so their cross-package imports resolve in the same
model as the canonical ontology.

## Configuration

```toml
include = [
    "memo/src",
]

exclude = [
    "node_modules",
    "dist",
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
syside check --warnings-as-errors memo/src/memo_namespaces.sysml
syside check --warnings-as-errors memo/examples
syside check --warnings-as-errors memo/src
```

All three commands must complete with zero diagnostics. If VS Code still shows
old errors after the command-line checks pass, run **Developer: Reload Window**
so SysIDE rebuilds its workspace index from the updated submodule checkout.

## Updating submodules

The meta repository records all three products as siblings:

```text
memo-meta -> { memo, memo-tools, memo-architect }
```

After pulling a parent repository, update the physical nested checkouts—not
only the Git index entries:

```bash
git submodule update --init --recursive
```

Keep all three checkouts on the same `MAJOR.MINOR` compatibility line; patch
versions may differ.
