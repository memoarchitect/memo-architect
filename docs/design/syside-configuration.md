# Syside Configuration for MEMO

Syside (Sensmetry) is a VS Code–based SysML v2 tool suite. In folder mode (default), it treats all `.sysml` files in included paths as a single model and resolves cross-package imports by qualified name.

## Opening the GPCA Pump in Syside

1. **Open the `memo-meta` root** in VS Code with the Syside extension installed.
2. Syside discovers `syside.toml` at the repo root (`.git` is the root marker).
3. The config includes `memo/src/` — Syside indexes the ontology, methodology, facade, and example documents as one model.
4. Cross-package imports (e.g. `memo::architecture::risk::*` from `gpca_risk.sysml`) resolve automatically.

No additional setup required. The `syside.toml` at repo root handles everything.

## `syside.toml`

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

- `include` — source folders Syside scans for `.sysml` files
- `exclude` — directories skipped during discovery (faster startup)

## Structural invariants enforced by CI

These invariants ensure Syside (and SysON, Sysand) can index the project:

| Check | Rule | Reference |
|-------|------|-----------|
| C1 | Every SysML source has a unique package declaration | Syside global scope |
| C2 | Every `import` target resolves to a declared package | Syside import resolution |
| C3 | No Langium-only syntax in `.sysml` files | Standard SysML v2 only |
| C4 | Directory path mirrors namespace segments | ADR-1-12 §4 |
| C5 | No hyphens in `.sysml` filenames | ADR-1-12 §5 |

Automated checks: `node tools/ontology-tools/syside-compat.mjs` (standalone) and the `DD-4` conformance test suite in `memo-tools/packages/tools/src/__tests__/conformance.test.ts`.

## Standard library imports

MEMO wraps SysML v2 standard library imports behind `memo::core::stdlib::*` (ADR-1-13). Syside's `std` setting points to its bundled standard library by default. The wrapper absorbs path differences between Syside, SysON, and Sysand — ontology files never import kernel packages directly.

## Resolution modes

| Mode | Behavior | MEMO status |
|------|----------|-------------|
| Folder (default) | All `.sysml` in included paths = one model | Works with `syside.toml` |
| Standalone | Single file, no cross-file resolution | Not suitable for MEMO |
| Project | Multi-directory workspaces (upcoming) | Future option |
