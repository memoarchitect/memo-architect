# Epic J — Boundary Inventory

Per ADR-1-17 three-repo split: `memo-sysmlv2` / `memo-cli` / `memo-architect`.

## Repo Assignment

### memo-sysmlv2 (pure SysML v2 content, no TypeScript)

| Current path | Notes |
|---|---|
| `ontology/` (all) | Core ontology — base, core, architecture, compliance, artifacts, manifest, rules, viewpoints, views |
| `ontology/base/stdlib/` | KerML standard library wrapper |
| `ontology/methodology/` | Default + GPCA methodology SysML |
| `ontology/rules/` | Native constraint defs (Epic EE) |
| `packages/ontology-arch/` | `@memo/ontology-arch` — SysML-only package (no build step) |
| `packages/ontology-process/` | `@memo/ontology-process` — SysML-only package (no build step) |
| `packages/methodology-default/` | `@memo/methodology-default` — SysML-only package (no build step) |
| `packages/methodology-gpca/` | `@memo/methodology-gpca` — SysML-only package (no build step) |
| `packages/medical-modeling-profile/` | `@memo/medical-modeling-profile` — TS index re-exports, but content is SysML. Depends on ontology-arch + ontology-process |
| `feedback/` | Aspirational ontology guide (SysML, not part of canonical ontology but informational) |
| `examples/gpca-pump/` | Reference model — pure `.sysml` files |

### memo-cli (engine + CLI)

| Current path | Notes |
|---|---|
| `packages/core/src/language/` | Langium grammar + generated AST |
| `packages/core/src/model/` | Builder, config-loader, kind-registry, ontology-loader, parser-utils, etc. |
| `packages/core/src/validator/` | Rule engine, constraint eval/loader/interpreter |
| `packages/core/src/serializer/` | SysML generator, CSV I/O |
| `packages/core/src/importer/` | EA, Cameo, OWL, sysand importers |
| `packages/core/src/import/` | Column mapper, import-diff, recipes |
| `packages/core/src/analysis/` | DSM, impact analysis |
| `packages/core/src/completeness/` | Completeness tracker |
| `packages/core/src/dhf/` | Document Health File — compiler, exporters, templates, queries |
| `packages/core/src/llm/` | Ask/draft/generate engines, LLM provider |
| `packages/core/src/ontology/` | OWL exporter |
| `packages/core/src/plugin/` | Plugin loader, registry, scaffold |
| `packages/core/src/protocol/` | WebSocket message types (shared contract) |
| `packages/core/src/index.ts` | Barrel export |
| `packages/core/syntaxes/` | TextMate grammar |
| `packages/cli/src/` (all) | CLI commands, dev server, persistor, lock |
| `tools/ontology-tools/` | Lint + drawio generator (JS scripts, engine-adjacent) |
| `tools/vscode-extension/` | VS Code extension (TextMate grammar + activation) |

### memo-architect (web app)

| Current path | Notes |
|---|---|
| `packages/web/src/` (all) | React app — views, components, store, styles, analysis |
| `packages/web/index.html` | Entry point |
| `packages/web/vite.config.ts` | Build config |
| `tools/ontology-viewer/` | Standalone ontology viewer (React, no @memo deps) |

### Shared / root (stays in whichever repo is primary, or duplicated)

| Current path | Notes |
|---|---|
| `package.json` (root) | Workspace root — dissolves after split |
| `turbo.json` | Turborepo config — dissolves after split |
| `tsconfig.base.json` | Shared TS config — each repo gets its own |
| `docs/` | Documentation — split per relevance or keep in memo-cli as primary |
| `scripts/` | Utility scripts — mostly GitLab tooling, stays with primary repo |
| `.claude/` | Dev tooling config — not shipped |

## Cross-Boundary Import Analysis

### web → core (build-time type dependency)

Web imports from `@memo/core` — almost all are **type-only** (erased at build time):

| Import pattern | Type-only? | Files |
|---|---|---|
| `import type { MemoModelDTO, MemoElement, ... }` | Yes | 30+ files |
| `import { computeImpact }` | **No — runtime** | `CatalogExplorer.tsx`, `DiagramCanvas.tsx` |
| `import { BUILTIN_RECIPES, inferColumnMappings, applyColumnMappings }` | **No — runtime** | `BulkImportModal.tsx` |

**Split blocker #1:** `computeImpact` is a runtime function from `@memo/core/lib/analysis/impact.js`. Options:
- (a) Publish `@memo/core` types+utils as an npm package that web build-depends on
- (b) Duplicate the small `computeImpact` function into web
- (c) Move impact analysis behind the WebSocket protocol (server computes, web renders)

**Split blocker #2:** `BUILTIN_RECIPES` / `inferColumnMappings` / `applyColumnMappings` from `@memo/core/lib/import/`. Same options as above.

**Verdict:** These are small, stable utility functions. Option (a) — publish `@memo/core` as the contract package — is the intended design per ADR-1-17 ("build-deps core types"). The type-only imports confirm web is already nearly clean.

### cli → core (tight coupling, same repo)

CLI imports heavily from `@memo/core` — this is expected and non-blocking. Both live in `memo-cli`.

### cli → ontology-arch / ontology-process (data dependency)

CLI `package.json` declares `@memo/ontology-arch: workspace:*` and `@memo/ontology-process: workspace:*`. After split, CLI data-depends `memo-sysmlv2` (installed as sysand packages or git submodule).

**Split blocker #3:** `workspace:*` references must become versioned external references (sysand package URNs or npm). This is mechanical — Epic GG scope.

### medical-modeling-profile (straddler)

`@memo/medical-modeling-profile` has TypeScript (`src/index.ts`) that re-exports config. It depends on `@memo/ontology-arch` and `@memo/ontology-process`. Content is SysML + YAML templates.

**Decision needed:** Either:
- Strip the TS, make it pure content → `memo-sysmlv2`
- Keep the TS shim → `memo-cli` (with data-dep on sysmlv2 content)

Recommendation: strip TS, move to `memo-sysmlv2`. The TS index only re-exports paths; the engine can discover these via `.project.json`.

### tools/ (minor)

- `tools/ontology-tools/` — pure JS scripts, no `@memo/*` imports. Engine-adjacent → `memo-cli`.
- `tools/ontology-viewer/` — standalone React app, no `@memo/*` imports. Could go either way; natural fit with `memo-architect`.
- `tools/vscode-extension/` — bundles TextMate grammar from `packages/core/syntaxes/`. Needs grammar file at build time → `memo-cli`.

## Split Blockers Summary

| # | Blocker | Owner | Severity |
|---|---|---|---|
| 1 | `computeImpact` runtime import in web | Epic GG (memo-cli cut) | Low — small function, publish as core types pkg |
| 2 | `BUILTIN_RECIPES` + column-mapper runtime import in web | Epic GG | Low — same solution as #1 |
| 3 | `workspace:*` refs to ontology packages in CLI | Epic GG | Mechanical — change to versioned deps |
| 4 | `medical-modeling-profile` TS shim | Epic FF (memo-sysmlv2 cut) | Low — strip TS or relocate |
| 5 | `tools/vscode-extension` bundles grammar from core | Epic GG | Low — copy grammar at build time |

**No high-severity blockers.** The codebase is already well-separated along the three-repo boundaries. Web depends on core only for types + 2 small runtime utils. CLI and core are tightly coupled (same repo). Content packages are pure SysML with no TS engine deps.
