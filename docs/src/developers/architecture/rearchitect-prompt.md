# MEMO Milestone Execution Guide

**Purpose:** Give this prompt to Claude Code, Codex, or Gemini when executing any milestone. Say "execute M<N>" to run a specific milestone.

**Session discipline:** Each milestone is scoped to ~40 minutes of LLM session time. Do NOT attempt multiple milestones in one session. Complete one, commit, and start a fresh session for the next.

---

## Before Starting Any Milestone

### 1. Read context (ALWAYS do this first)

```
Read these files in order:
1. CLAUDE.md                                    — project overview, tech stack, current state
2. docs/development/roadmap.md                  — authoritative milestone table (scope, deps, acceptance)
3. docs/architecture/platform-strategy.md       — architecture spec (package format, registries, SysAnd interop)
```

### 2. Verify clean baseline

```bash
git checkout main && git pull
pnpm install
pnpm run build && pnpm run test    # all 130+ tests must pass
```

### 3. Work on `main` (trunk-based development)

Commit directly to `main`. No feature branches.

### 4. Read milestone-specific files

Each milestone's scope in `roadmap.md` tells you WHAT to do. The sections below tell you WHERE the relevant code lives.

---

## Key Files Reference

### Config & Types (Phase 7-8 milestones touch these)

| File | What | Lines |
|------|------|-------|
| `packages/core/src/model/config.ts` | `MEMOConfig`, `KindDefinition`, `CosmaLayer`, `SysMLConstruct` types | 287 |
| `packages/core/src/model/config-loader.ts` | `loadConfig()`, `resolveConfig()`, YAML parsing | ~100 |
| `packages/core/src/model/builder.ts` | `buildMemoModel()` — **line 262 is THE coupling point**: `config.kinds[typeName]` | ~300 |
| `packages/core/src/model/semantic.ts` | `MemoModelDTO`, `MemoElement`, `CosmaLayerDTO` | ~150 |
| `packages/core/src/model/package-registry.ts` | `PackageRegistry` for cross-file resolution | ~100 |

### Ontology Packages (Phase 7 milestones restructure these)

| File | What | Lines |
|------|------|-------|
| `packages/ontology-core/memo.config.yaml` | Monolithic config — 978 lines of kinds/rels/layers to decompose | 978 |
| `packages/ontology-medical/memo.config.yaml` | Monolithic config — 1,401 lines to decompose | 1401 |
| `packages/medical-modeling-profile/memo.config.yaml` | Profile config — rules, viewpoints. `projectType: device` (BUG) | ~500 |
| `packages/ontology-core/sysml/entities/*.sysml` | 11 entity files — to be restructured into layer directories | ~1500 |
| `packages/ontology-medical/sysml/entities/*.sysml` | 14 entity files — to be restructured into layer directories | ~2000 |
| `packages/ontology-core/sysml/relationships/relationships.sysml` | 42 connection defs — stays in `relationships/` | 213 |

### CLI (Phase 9 milestones modify these)

| File | What |
|------|------|
| `packages/cli/src/commands/dev.ts` | `memo dev` — HTTP + WebSocket server |
| `packages/cli/src/commands/validate.ts` | `memo validate` — validation runner |
| `packages/cli/src/commands/init.ts` | `memo init` — project scaffolding |
| `packages/cli/src/commands/ontology.ts` | `memo ontology export sysand` — already exists, needs hardening |

### Web App (Phase 10 milestones rewrite these)

| File | What |
|------|------|
| `packages/web/src/App.tsx` | 6-mode switcher (line ~105) — to be replaced |
| `packages/web/src/store/model-store.ts` | `AppMode` type (line 16), Zustand store |
| `packages/web/src/components/OntologyViewer.tsx` | Ontology viewer — to be extracted into standalone app |

### Tests

| File | What |
|------|------|
| `packages/core/src/__tests__/builder.test.ts` | Builder tests — most affected by registry changes |
| `packages/core/src/__tests__/config-loader.test.ts` | Config loader tests |
| `packages/core/src/__tests__/validator.test.ts` | Validation tests |

---

## Architecture Context

### The Problem (Current State)

Kinds and relationships are duplicated:
1. **SysML files** (`sysml/entities/*.sysml`): `part def Hazard { ... }`
2. **YAML config** (`memo.config.yaml`): `Hazard: { layer: risk, sysmlConstruct: part def }`

The builder at `builder.ts:262` does `config.kinds[typeName]` to resolve layer/construct. This means ~2,900 lines of YAML duplicate what SysML already defines.

### The Target

1. **SysML is the single source of truth** — `KindRegistry` walks AST `*Definition` nodes
2. **Directory = Layer** — `sysml/risk/hazard.sysml` → risk layer (Apollo-11 pattern)
3. **Config decomposes** — `memo.package.yaml` + `memo.rendering.yaml` + `memo.rules.yaml`
4. **`.project.json`** — SysAnd-compatible manifest

### What Stays MEMO-Specific (NOT in SysML)

| Concern | File | Why |
|---------|------|-----|
| Layer colors/icons | `memo.rendering.yaml` | Tool-specific visualization |
| Closure rules | `memo.rules.yaml` | Validation logic, not model content |
| Package identity | `memo.package.yaml` | MEMO manifest (extends, ontologies) |
| SysAnd identity | `.project.json` | Ecosystem interop |

### Current Directory Structure

```
packages/ontology-core/
├── memo.config.yaml            ← 978 lines (to be decomposed)
├── sysml/
│   ├── index.sysml
│   ├── entities/               ← flat (to be restructured into layer dirs)
│   │   ├── business.sysml
│   │   ├── operational.sysml
│   │   └── ... (11 files)
│   └── relationships/
│       └── relationships.sysml
└── src/
    └── export/owl-exporter.ts
```

### Target Directory Structure

```
packages/ontology-core/
├── .project.json                    ← SysAnd manifest
├── memo.package.yaml                ← identity (~10 lines)
├── memo.rendering.yaml              ← layer colors (~30 lines)
├── sysml/
│   ├── index.sysml
│   ├── purpose/purpose.sysml        ← directory = architecture layer
│   ├── operational/operational.sysml
│   ├── requirements/requirements.sysml
│   ├── functional/functional.sysml
│   ├── logical/logical.sysml
│   ├── physical/physical.sysml
│   ├── software/software.sysml
│   ├── interfaces/interfaces.sysml
│   ├── analysis/analysis.sysml
│   ├── verification/verification.sysml
│   ├── platform/platform.sysml
│   └── relationships/relationships.sysml
└── src/
    └── export/owl-exporter.ts
```

### Layer Derivation Logic

```typescript
function resolveLayerFromPath(filePath: string): string {
    // sysml/risk/risk-management.sysml → "risk"
    // sysml/operational/operational.sysml → "operational"
    // sysml/relationships/relationships.sysml → "crosscutting"
    const sysmlIndex = filePath.indexOf('/sysml/');
    if (sysmlIndex === -1) return 'unknown';
    const afterSysml = filePath.substring(sysmlIndex + 7);
    const layerDir = afterSysml.split('/')[0];
    return layerDir === 'relationships' ? 'crosscutting' : layerDir;
}
```

### Kind Discovery Logic

```typescript
// Walk AST *Definition nodes from ontology SysML files
// Map: PartDefinition → "part def", RequirementDefinition → "requirement def", etc.
// Derive layer from file path's parent directory
// KindRegistry.getKind(name) replaces config.kinds[name]
```

### Relationship Discovery Logic

```typescript
// Walk ConnectionDefinition AST nodes
// Extract name, normalize PascalCase → camelCase: "Mitigates" → "mitigates"
// RelationshipRegistry.getRelType(name) replaces config lookup
```

---

## During Execution

1. Read ALL files mentioned in the milestone's scope before making changes.
2. Make changes incrementally — don't rewrite entire files.
3. Run `pnpm run build && pnpm run test` after each logical change, not just at the end.
4. If a test fails, fix it immediately before proceeding.

## After Completing

1. Run full suite: `pnpm run build && pnpm run test`
2. If milestone touched CLI/builder/config: `cd examples/infusion-pump && memo dev` (verify it works)
3. Commit: `M<ID>: <milestone title>`
4. Do NOT push or create PR unless explicitly asked.

## What NOT to Do

- Do NOT attempt more than one milestone per session.
- Do NOT modify files outside the milestone's scope.
- Do NOT add features, comments, or "improvements" beyond what the milestone specifies.
- Do NOT create new test files unless the milestone explicitly requires new functionality.
- Do NOT refactor surrounding code — only touch what the milestone requires.
- Do NOT update `CLAUDE.md` unless the milestone says to.
- Do NOT update `roadmap.md` status — the user will do that after verifying.

---

## Milestone Quick Reference

See `docs/development/roadmap.md` for full scope, dependencies, and acceptance criteria.

| ID | Title | Phase | Key Files |
|----|-------|-------|-----------|
| M36 | Package semantics cleanup | 7 | `medical-modeling-profile/memo.config.yaml`, all 3 ontology `package.json` files |
| M37 | Directory restructure — ontology-core | 7 | `ontology-core/sysml/entities/*.sysml`, `index.sysml` |
| M38 | Directory restructure — ontology-medical | 7 | `ontology-medical/sysml/entities/*.sysml`, `index.sysml` |
| M39 | KindRegistry | 7 | New: `core/src/model/kind-registry.ts`, `layer-resolver.ts` |
| M40 | RelationshipRegistry | 7 | New: `core/src/model/relationship-registry.ts` |
| M41 | Dual-mode builder | 7 | `core/src/model/builder.ts` (line 262) |
| M42 | Ontology loader | 7 | New: `core/src/model/ontology-loader.ts`, `cli/src/commands/dev.ts` |
| M43 | Extract memo.rendering.yaml | 8 | `config-loader.ts`, `model-store.ts`, new `memo.rendering.yaml` files |
| M44 | Extract memo.rules.yaml | 8 | `medical-modeling-profile/memo.config.yaml`, `config-loader.ts` |
| M45 | Remove config.kinds | 8 | `config.ts`, `builder.ts`, all `memo.config.yaml` files |
| M46 | Remove config.relationshipTypes | 8 | `config.ts`, `builder.ts`, all `memo.config.yaml` files |
| M47 | Delete legacy config | 8 | All `memo.config.yaml` in ontology packages, `config.ts` |
| M48 | Harden SysAnd export | 9 | `cli/src/commands/ontology.ts` |
| M49 | Ontology lock | 9 | New: lock file logic in `config-loader.ts` or `ontology-loader.ts` |
| M50 | memo init | 9 | `cli/src/commands/init.ts` |
| M51 | memo install | 9 | New: `cli/src/commands/install.ts` |
| M52 | Unified view architecture | 10 | `web/src/App.tsx`, `web/src/store/model-store.ts` |
| M53 | Model Explorer + View Explorer | 10 | `web/src/components/` |
| M54 | Properties panel | 10 | `web/src/components/PropertiesPanel.tsx` |
| M55 | Tools panel | 10 | `web/src/components/`, `web/src/App.tsx` |
| M56 | CI integration | 11 | `cli/src/commands/validate.ts` |
| M57 | Traceability matrix | 11 | New: `web/src/components/TraceabilityMatrix.tsx` |
| M58 | DHF generator | 11 | New: `core/src/export/dhf-generator.ts`, `cli/src/commands/export.ts` |
| M59 | Static build + packages | 12 | New: `cli/src/commands/build.ts`, `cli/src/commands/create-package.ts` |
| M60 | Standalone ontology viewer | 12 | New: `tools/ontology-viewer/`, extract from `web/src/components/OntologyViewer.tsx` |
| M61 | VS Code extension | 12 | New: `tools/vscode-extension/` |
