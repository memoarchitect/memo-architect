# ADR-1-9: Ontology Changes Require Dev Server Restart

**Status:** Accepted  
**Date:** 2026-04-20

## Context

The MEMO dev server previously rebuilt everything — including reloading ontology registries — on any file change. This caused silent corruption:

- `KindRegistry` and `RelationshipRegistry` are seeded from SysML files at startup and used throughout the build pipeline, validation, and UI rendering.
- Hot-swapping registries mid-session caused model state to reference stale kind definitions, orphaned elements from removed kinds, and broken validation rules.
- The web app cached `availableOntologies` and `memo:userViewpoints` in `localStorage`, allowing stale ontology metadata to persist across browser sessions.

## Decision

**Ontology registries are loaded exactly once at dev server bootstrap and frozen.** Any change to ontology source files or selection triggers an explicit restart signal (`app:restart-required`) rather than a hot reload.

### Watcher split

Two separate file watchers replace the previous single chokidar instance:

| Watcher | Paths | Action |
|---------|-------|--------|
| `createProjectWatcher` | `model/**/*.sysml`, `memo.rendering.yaml`, `memo.rules.yaml`, `memo.viewpoints.yaml` | `rebuildProject()` — hot reload, no ontology reload |
| `createOntologyWatcher` | `<ontologyRoot>/sysml/**/*.sysml`, `<ontologyRoot>/memo.package.yaml`, `memo.config.yaml`, `model/ontology-selection.sysml` | `notifyRestartRequired()` — broadcast `app:restart-required`, print CLI banner |

### Bootstrap / hot rebuild split

```
bootstrap() — runs once at dev server start:
  loadOntologyRegistries(configPath) → KindRegistry + RelationshipRegistry
  Object.freeze(registries)
  computeOntologyHash(registries) → 16-char hex (sha256 of kind+rel names)

rebuildProject() — runs on each project file change:
  parseFiles(projectSysmlFiles)
  buildMemoModel(docs, config, frozenRegistries)   ← no loadOntologyRegistries
  validateModel + computeCompleteness
  broadcast [model:update, validation:update, completeness:update, ontology:packages]
  — all messages carry ontologyHash field
```

### Web client behaviour

- On `app:restart-required`: set `restartRequired` state → show `RestartRequiredBanner` blocking overlay → stop accepting further model/validation/completeness messages.
- On `ontology:packages`: store `ontologyHash` from first message this session. If a later message carries a different hash (stale server race after restart), treat as `app:restart-required`.
- On WebSocket reconnect: reset `restartRequired`, `currentOntologyHash`, and `restartPending`.

### Cache elimination

| Removed | Replacement |
|---------|-------------|
| `localStorage:memo:userViewpoints` | In-memory only; one-time migration wipes the key and logs a warning |
| `availableOntologies` persistence | Always derived from `ontology:packages` WS message on connect |
| `window.__MEMO_DATA__` in dev mode | Only used for `memo-architect build` static output; dev mode always uses WS |

### Ontology selection

Saving ontology selection (Ontology Viewer UI) writes files to disk (`model/ontology-selection.sysml` + `memo.config.yaml`), then broadcasts `app:restart-required` with `reason: ontology-selection-changed`. No silent live-swap.

## Consequences

**Positive:**
- Zero mid-session ontology mutation — no silent state corruption.
- Simpler rebuild path: `rebuildProject()` is a pure hot path with no I/O beyond parsing project SysML files.
- Deterministic: sequential page loads against the same disk state produce identical model DTOs (modulo build counter in version string).
- CI guard (`scripts/check-no-ontology-cache.sh`) prevents regression.

**Negative:**
- Editing an ontology package source file requires restarting the dev server. This is expected and acceptable — ontology changes are infrequent compared to project model edits.
- The blocking banner may surprise users who edit ontology source in the same session as project modeling. The instruction text is explicit about what to do.
