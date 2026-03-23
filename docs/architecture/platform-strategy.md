# MEMO Platform Architecture

**Date:** 2026-03-22
**Status:** Accepted
**Supersedes:** Previous v2 product-suite proposal

---

## 1. Product Decomposition

MEMO stands for **Medical Engineering Modeling Ontology**. The ontology IS the product. MEMO Architect is the tool that consumes it. **They live in separate git repositories** to allow independent evolution.

| Layer | What | Own / Use | Repository | Artifact |
|-------|------|-----------|-----------|----------|
| **Layer 1** | SysAnd / SysML v2 ecosystem | Publish to, don't build | External | `.project.json` + SysML files |
| **Layer 2** | MEMO — the ontology | Own. Publish as SysAnd-compatible SysML | `memo-base` | `@memo/ontology-core`, `@memo/ontology-medical`, `@memo/medical-modeling-profile` |
| **Layer 3** | MEMO Architect — the tool | Own. Imports ontology, adds tools | `memo-architect` | CLI + web app (DSM, FMEA, DHF, completeness) |

**Key decisions:**
- **Two repositories.** Ontology evolves independently of the tool. Community contributes ontology without touching the architect codebase. Other tools can consume MEMO ontology directly.
- No separate apps. No Forge, no Registry. One MEMO Architect app + one standalone ontology viewer.
- Layer 1 is an external ecosystem. We export to it, we don't build infrastructure for it.
- Layer 2 (MEMO) is the defensible moat — comprehensive, standards-aligned, open source.
- Layer 3 (MEMO Architect) consumes Layer 2 and adds engineering value (visualization, analysis, validation, document generation).
- MEMO Architect depends on a **specific version** of the MEMO ontology (pinned in `package.json`).

### Repository Structure

**`memo-base`** (Layer 2 — the ontology):
```
memo-base/
├── packages/
│   ├── ontology-core/              @memo/ontology-core
│   ├── ontology-medical/           @memo/ontology-medical
│   └── medical-modeling-profile/   @memo/medical-modeling-profile
├── package.json                    pnpm workspace (ontology packages only)
├── pnpm-workspace.yaml
└── turbo.json
```

**`memo-architect`** (Layer 3 — the tool):
```
memo-architect/
├── packages/
│   ├── core/                       @memo-architect/core (parser, builder, registries)
│   ├── cli/                        CLI commands (memo-architect dev, validate, export)
│   └── web/                        React web app
├── tools/
│   └── ontology-viewer/            Standalone read-only viewer
├── examples/
│   ├── infusion-pump/
│   └── irrigation-pump/
├── ontology/                       ← git subtree of memo-base (for local dev)
├── package.json
└── pnpm-workspace.yaml
```

### Git Subtree for Local Development

During development, `memo-base` is pulled into `memo-architect` as a **git subtree** at `ontology/`. This gives developers a single working tree while keeping repos independent.

```bash
# Initial setup (once)
git subtree add --prefix=ontology git@gitlab.com:somesh_sandbox/memo-base.git main --squash

# Pull latest ontology changes
git subtree pull --prefix=ontology git@gitlab.com:somesh_sandbox/memo-base.git main --squash

# Push ontology changes back upstream
git subtree push --prefix=ontology git@gitlab.com:somesh_sandbox/memo-base.git main
```

The `pnpm-workspace.yaml` in `memo-architect` includes `ontology/packages/*` so that workspace resolution works across both repos during development. For CI/releases, `memo-architect` consumes published `@memo/ontology-*` packages from npm.

### Standalone Ontology Viewer

A read-only tool for inspecting ontology packages. Shows kinds by architecture layer, relationships, closure rules, type hierarchy. Not a mode inside MEMO Architect — a separate lightweight Vite app at `tools/ontology-viewer/`. Open source.

---

## 2. Package Format Spec

Each ontology package follows the Apollo-11 directory-per-layer pattern (inspired by the Airbus Apollo-11 SysML v2 model).

### Directory Structure

**ontology-core** (domain-agnostic MBSE backbone):
```
packages/ontology-core/
├── .project.json                         # SysAnd manifest
├── memo.package.yaml                     # Identity: name, version, license
├── memo.rendering.yaml                   # Architecture layer colors/icons (~30 lines)
├── sysml/
│   ├── index.sysml                       # Re-exports all packages
│   ├── purpose/business.sysml            # Directory = architecture layer
│   ├── operational/operational.sysml
│   ├── requirements/requirements.sysml
│   ├── functional/functional.sysml
│   ├── logical/logical.sysml
│   ├── physical/physical.sysml
│   ├── software/software.sysml
│   ├── interfaces/interfaces.sysml
│   ├── platform/platform.sysml
│   ├── analysis/analysis.sysml
│   ├── verification/verification.sysml
│   └── relationships/relationships.sysml # Crosscutting
├── src/
│   ├── index.ts
│   └── export/owl-exporter.ts
└── package.json
```

**ontology-medical** (regulated medical device backbone, extends core):
```
packages/ontology-medical/
├── .project.json
├── memo.package.yaml                     # extends: "@memo/ontology-core"
├── memo.rendering.yaml                   # Additional layer colors
├── sysml/
│   ├── index.sysml
│   ├── design-control/design-control.sysml
│   ├── risk/
│   │   ├── risk-management.sysml
│   │   └── risk-analysis.sysml
│   ├── software-lifecycle/software-lifecycle.sysml
│   ├── safety/safety-essential-performance.sysml
│   ├── qms/qms-trace.sysml
│   ├── privacy/privacy-import-governance.sysml
│   ├── clinical/
│   │   ├── clinical-context.sysml
│   │   └── clinical-evaluation.sysml
│   ├── cybersecurity/cybersecurity-interoperability.sysml
│   ├── product-line/product-line.sysml
│   ├── operations/
│   │   ├── medical-development.sysml
│   │   └── operations-service.sysml
│   ├── ui/ui.sysml
│   └── relationships/relationships.sysml
└── ...
```

**medical-modeling-profile** (closure rules, viewpoints, templates):
```
packages/medical-modeling-profile/
├── .project.json
├── memo.package.yaml                     # extends: "@memo/ontology-medical"
├── memo.rules.yaml                       # 41 closure rules (CR-MED-001..041)
├── memo.rendering.yaml                   # Optional additional colors
├── templates/
│   └── infusion-pump/model.sysml
└── ...
```

### Config File Specs

**`.project.json`** — SysAnd-compatible manifest:
```json
{
  "type": "ontology-package",
  "name": "@memo/ontology-core",
  "version": "0.1.0",
  "usage": ["kinds", "relationships"]
}
```

**`memo.package.yaml`** — Package identity (~10 lines):
```yaml
name: "@memo/ontology-core"
version: "0.1.0"
type: ontology
description: "Domain-agnostic MBSE backbone (11 architecture layers, 165 kinds)"
license: "Apache-2.0"
tags: ["mbse", "sysml-v2", "arcadia"]
```

For extending packages:
```yaml
name: "@memo/ontology-medical"
version: "0.1.0"
type: ontology
extends: "@memo/ontology-core"
description: "Medical device backbone (ISO 14971, IEC 62304, IEC 62366)"
license: "Apache-2.0"
```

**`memo.rendering.yaml`** — MEMO-specific visualization (~30 lines):
```yaml
layers:
  - id: purpose
    label: "Purpose & Stakeholders"
    color: "#8B5CF6"
  - id: operational
    label: "Operational Analysis"
    color: "#EC4899"
  - id: requirements
    label: "Requirements"
    color: "#4A90D9"
  # ... one entry per architecture layer
```

**`memo.rules.yaml`** — Closure rules (medical-modeling-profile only):
```yaml
closureRules:
  - id: CR-MED-001
    description: "Every Hazard must have at least one RiskControl"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      min: 1
      direction: incoming
    severity: error
    completenessLayer: risk
  # ... 40 more rules
```

### What Each Config Controls

| Config file | What it defines | Who modifies it |
|-------------|----------------|-----------------|
| `.project.json` | SysAnd package identity | Generated by tooling |
| `memo.package.yaml` | Package name, version, extends chain | Package author |
| `memo.rendering.yaml` | Architecture layer colors, icons | Package author (optional) |
| `memo.rules.yaml` | Closure/validation rules | Profile author (optional) |
| SysML files | Kinds, relationships, type hierarchy, attributes | Package author |

---

## 3. Kind & Relationship Discovery from SysML AST

### The Problem (Current State)

Kinds and relationships are defined in two places:
1. **SysML definitions** in `sysml/` files: `part def Hazard { ... }`, `connection def Mitigates { ... }`
2. **YAML config** in `memo.config.yaml`: `kinds: { Hazard: { layer: risk, sysmlConstruct: part def } }`

The parser at `builder.ts:262` does `config.kinds[typeName]` to determine layer and construct. This means ~2,900 lines of YAML duplicate what the SysML files already define.

### The Solution

A `KindRegistry` and `RelationshipRegistry` replace `config.kinds` and `config.relationshipTypes` by parsing the SysML AST directly.

**Kind discovery:**
1. Walk all `PartDefinition`, `RequirementDefinition`, `ActionDefinition`, `ItemDefinition`, `PortDefinition`, `InterfaceDefinition` nodes in ontology SysML files
2. Map AST `$type` → `sysmlConstruct` (e.g., `PartDefinition` → `"part def"`)
3. Derive `layer` from the file's parent directory name (see Section 4)
4. Extract `name` as the kind ID, `specialization?.superType` for type hierarchy
5. `KindRegistry.getKind(name)` replaces `config.kinds[name]` in the builder

**Relationship discovery:**
1. Walk all `ConnectionDefinition` nodes
2. Extract `name` as the relationship type ID (PascalCase in SysML)
3. Normalize to camelCase for matching: `"Mitigates"` → `"mitigates"`
4. `RelationshipRegistry.getRelType(name)` replaces config lookup

**Result:** Config files drop from ~2,900 lines to ~200 lines total. Kinds are defined once, in SysML.

---

## 4. Architecture Layer Derivation from Directory Path

Convention: a `.sysml` file's parent directory under `sysml/` determines its architecture layer.

```
resolveLayerFromPath("sysml/risk/risk-management.sysml")          → "risk"
resolveLayerFromPath("sysml/operational/operational.sysml")       → "operational"
resolveLayerFromPath("sysml/purpose/business.sysml")              → "purpose"
resolveLayerFromPath("sysml/relationships/relationships.sysml")   → "crosscutting"
```

Implementation: strip the `sysml/` prefix, take the immediate subdirectory name. The `relationships/` directory maps to `"crosscutting"` since relationships span layers.

This replaces the `layer` field in `config.kinds` entries. When a user adds a new kind, they place the `.sysml` file in the appropriate layer directory — no YAML editing needed.

---

## 5. SysAnd Interop Strategy

### Export (M50)

```bash
memo export sysand --output ./sysand-project/
```

Produces:
```
sysand-project/
├── .project.json          # Generated from memo.package.yaml
├── purpose/business.sysml # Copied from ontology package
├── operational/...
└── relationships/...
```

Pure SysML v2 + SysAnd manifest. No MEMO-specific files (rendering, rules) in the export.

### Future Import

```bash
memo import sysand <package-path>
```

Reads `.project.json` + SysML definitions, populates `KindRegistry` and `RelationshipRegistry`. The imported package becomes available as an ontology source.

### Mapping

| MEMO concept | SysAnd equivalent |
|-------------|-------------------|
| Kind (e.g., Hazard) | `part def` / `requirement def` in SysML |
| Relationship type (e.g., Mitigates) | `connection def` in SysML |
| Package identity | `.project.json` |
| Architecture layers | Directory structure (convention) |
| Closure rules | No SysAnd equivalent (MEMO-specific) |
| Rendering config | No SysAnd equivalent (MEMO-specific) |

---

## 6. Extension Model

MEMO follows a ROS2-style package model. Users extend by adding packages, not by forking.

### How to Create a Custom Ontology Package

1. Create a directory with `memo.package.yaml`:
   ```yaml
   name: "@myorg/cardiology-ontology"
   version: "1.0.0"
   type: ontology
   extends: "@memo/ontology-medical"
   ```

2. Add SysML files in layer-named subdirectories:
   ```
   sysml/
   ├── clinical/
   │   └── cardiology-kinds.sysml   # part def AtrialFibrillation { ... }
   └── relationships/
       └── cardiology-rels.sysml    # connection def IndicatesAblation { ... }
   ```

3. Optionally add `memo.rendering.yaml` (custom layer colors) and `memo.rules.yaml` (custom closure rules).

4. The parser discovers kinds from SysML definitions automatically — no YAML kind catalog needed.

### Package Types

| Type | Contains | Example |
|------|----------|---------|
| **Ontology** | Kinds + relationships + architecture layers | `@memo/ontology-medical` |
| **Profile** | Closure rules + viewpoints + templates (extends an ontology) | `@memo/medical-modeling-profile` |
| **Library** | Reusable model elements (instances, not types) | `@sysand/std-library` |

### Package Resolution

Packages are resolved via (in order):
1. **Git subtree workspace**: `ontology/packages/<name>/` (during development with subtree)
2. **Workspace resolution**: `packages/<name>/` in the current repo
3. **Local packages**: `memo_packages/<name>/` in the project directory
4. **node_modules resolution**: `node_modules/@memo/<name>/` for published packages

The `extends` chain is resolved recursively. Child overrides parent for rendering and rules; SysML definitions are merged (child adds kinds, doesn't remove parent kinds).

### Installing Packages

```bash
memo install <git-url>          # Clone into memo_packages/ from git
memo install <npm-package>      # Install via npm into node_modules/
memo install <local-path>       # Symlink into memo_packages/
```

The `memo install` command adds the package reference to `memo.package.yaml` under `dependencies` and makes it available for resolution. This is analogous to `npm install` or `ros2 pkg install`.

### Version Pinning

`memo-architect` pins its ontology dependency in `package.json`:
```json
{
  "dependencies": {
    "@memo/medical-modeling-profile": "^0.1.0"
  }
}
```

During development (git subtree at `ontology/`), the workspace version takes precedence. In production/CI, the published npm version is used.

---

## 7. What Stays MEMO-Specific vs Pure SysML v2

| MEMO-specific (in YAML config) | Pure SysML v2 (in .sysml files) |
|--------------------------------|--------------------------------|
| Architecture layer colors/icons (`memo.rendering.yaml`) | Kind definitions (`part def Hazard { }`) |
| Closure rules (`memo.rules.yaml`) | Relationship definitions (`connection def Mitigates { }`) |
| Viewpoint configurations | Type hierarchy (`:>` specialization) |
| Tool parameters (DSM, FMEA settings) | Attributes and doc comments |
| Package identity (`memo.package.yaml`) | Package structure and imports |

**Principle:** If it's a modeling concept (types, relationships, structure), it belongs in SysML. If it's a tool concern (visualization, validation rules, project identity), it belongs in YAML config.

---

## 8. Ontology Lifecycle

### Ontology Selection

On `memo init`, the user selects an ontology:
```bash
memo init my-device --ontology @memo/medical-modeling-profile  # default
memo init my-device --ontology @myorg/cardiology-profile       # custom
```

### Ontology Lock

A `memo.lock.yaml` is created at project init:
```yaml
ontology: "@memo/medical-modeling-profile"
version: "0.1.0"
lockedAt: "2026-03-22"
```

### Changing Ontology

Changing the ontology ID in `memo.package.yaml` triggers a full validation pass on `memo dev` or `memo validate`. All violations are shown as errors. There is no auto-migration — the user must manually resolve incompatibilities. This is intentional: ontology changes are rare and high-risk in regulated medical device development.

---

## 9. Milestone Roadmap

The authoritative milestone roadmap lives in [`docs/development/roadmap.md`](../development/roadmap.md). This document defines the architecture; the roadmap defines the execution sequence.

**Summary:** Phase 7 (Package & Registry Foundation, M36-M42) → Phase 8 (Config Decomposition, M43-M47) → Phase 9 (Package Lifecycle, M48-M51) → Phase 10 (Unified Workbench, M52-M55) → Phase 11 (Compliance, M56-M59) → Phase 12 (Extension Ecosystem, M59-M61).

Each milestone is scoped for ~40 minutes of LLM session time.
