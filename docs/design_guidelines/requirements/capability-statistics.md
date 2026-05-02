# Capability Statistics (Code-Derived)

These counts are derived from the AST function inventory and show implementation density by subsystem.

Interpretation:

- Higher symbol counts indicate broader implementation surface, not necessarily higher complexity.
- `Exported` indicates externally consumable API surface at module boundaries.

| Package | Subsystem | Symbols | Exported |
|---|---|---:|---:|
| `packages/cli` | `src/commands` | 107 | 41 |
| `packages/cli` | `src/server` | 29 | 6 |
| `packages/cli` | `src/lock.ts` | 8 | 3 |
| `packages/core` | `src/dhf` | 118 | 52 |
| `packages/core` | `src/model` | 82 | 46 |
| `packages/core` | `src/language` | 58 | 58 |
| `packages/core` | `src/importer` | 38 | 11 |
| `packages/core` | `src/plugin` | 30 | 24 |
| `packages/core` | `src/llm` | 19 | 7 |
| `packages/core` | `src/serializer` | 16 | 10 |
| `packages/core` | `src/import` | 10 | 5 |
| `packages/core` | `src/validator` | 10 | 3 |
| `packages/core` | `src/analysis` | 6 | 3 |
| `packages/core` | `src/completeness` | 1 | 1 |
| `packages/ontology-core` | `src/export` | 5 | 2 |
| `packages/ontology-medical` | `src/export` | 4 | 2 |
| `packages/web` | `src/views` | 217 | 55 |
| `packages/web` | `src/components` | 140 | 24 |
| `packages/web` | `src/store` | 40 | 32 |
| `packages/web` | `src/App.tsx` | 11 | 1 |
| `packages/web` | `src/analysis` | 6 | 3 |
| `packages/web` | `src/dhf` | 5 | 3 |
| `packages/web` | `src/router.ts` | 5 | 5 |
| `packages/web` | `src/short-id.ts` | 3 | 2 |

## Key Observations

1. `core/dhf` and `web/views` are the two largest implementation surfaces.
2. `core/model` + `core/language` form the semantic backbone and expose a high API ratio.
3. `cli/commands` is broad, confirming large operational surface via command-line workflows.
4. `web/store` has high export density, consistent with central orchestration responsibilities.
