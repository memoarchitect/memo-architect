# MEMO Live-Reload Architecture — Split Ontology vs Project Reload

## Problem

Current dev server (`packages/cli/src/commands/dev.ts:224-228`) rebuilds **everything** on any file change — including ontology packages. Ontology changes mutate `KindRegistry`/`RelationshipRegistry` mid-session. Registries seed validation rules, palette, renderers. Live-swap corrupts model state. Also: web app caches `availableOntologies`, user viewpoints (`localStorage:memo:userViewpoints`), user diagrams (`.memo/user-diagrams.json`) — stale ontology bleeds into new loads.

## Goal

| Change type | Behavior |
|-------------|----------|
| Project SysML (`model/**/*.sysml`) | Live reload, push via WS |
| Project config rendering/rules | Live reload |
| Methodology pin or ontology selection (`memo.config.yaml`) | Force restart prompt |
| Ontology or methodology source (`ontology/**/*.sysml`, `packages/methodology-*/sysml/**`) | Force restart prompt |
| Package metadata (`memo.package.yaml`, `.project.json`) | Force restart prompt |
| App startup | Fresh parse, zero cache |

---

## Proposal

### Part A — Split watcher into two scopes

**File:** `packages/cli/src/server/file-watcher.ts`

Replace single chokidar instance with two:

```ts
// scope 1: PROJECT — hot reload
createProjectWatcher({
  paths: ['model/**/*.sysml', 'memo.rendering.yaml', 'memo.rules.yaml', 'memo.viewpoints.yaml'],
  onChange: rebuildProject
})

// scope 2: ONTOLOGY — restart required
createOntologyWatcher({
  paths: [
    resolvedOntologyRoots.map(r => `${r}/**/*.sysml`),
    resolvedMethodologyRoots.map(r => `${r}/**/*.sysml`),
    resolvedOntologyRoots.map(r => `${r}/memo.package.yaml`),
    resolvedOntologyRoots.map(r => `${r}/memo.rendering.yaml`),
    'memo.config.yaml',                  // methodology pin / ontology selection lives here
    'model/ontology-selection.sysml',    // transitional selection as SysML imports
  ],
  onChange: notifyRestartRequired
})
```

`resolvedOntologyRoots` = paths returned from `config-resolver.ts:loadAndResolveConfig()` during dev startup. Cache those paths once; pass to ontology watcher.

### Part B — Rebuild pipeline: project-only path

**File:** `packages/cli/src/commands/dev.ts`

Current `rebuild()` does: parse → load ontology registries → build → validate → broadcast. Split:

```ts
// Startup only — runs once at dev boot
async function bootstrap() {
  config = await loadAndResolveConfig(cwd)
  ontologyRegistries = await loadOntologyRegistries(configPath)  // parses ontology SysML
  // freeze: mark registries readonly after bootstrap
  Object.freeze(ontologyRegistries.kinds)
  Object.freeze(ontologyRegistries.relationships)
}

// Hot path — runs on every project file change
async function rebuildProject() {
  const documents = await parseFiles(projectSysmlFiles)
  const model = buildMemoModel(documents, config, errors, ontologyRegistries)
  const validation = validateModel(model, config, ontologyRegistries)
  const completeness = computeCompleteness(model, config)
  server.broadcast([modelMsg, validationMsg, completenessMsg])
}
```

Remove `loadOntologyRegistries()` call from rebuild loop. It runs **only at bootstrap**.

### Part C — Ontology change → restart signal

**New message type** in `packages/core/src/protocol/messages.ts`:

```ts
export interface RestartRequiredMessage {
  type: 'app:restart-required'
  reason: 'ontology-source-changed' | 'ontology-selection-changed'
  changedFile: string
  instruction: string   // human-readable: "Stop dev server (Ctrl+C) and run `memo-architect dev` again"
}
```

On ontology watcher fire:
1. Do NOT reload registries.
2. Broadcast `app:restart-required` to all WS clients.
3. Print loud banner to CLI stderr: `⚠ Ontology changed — restart required. Changes ignored until restart.`
4. Exit code: do not exit. User decides.

**Optional flag** `--auto-restart-ontology`: if set, dev server self-terminates with exit code 75 (EX_TEMPFAIL), a supervisor script (`memo-architect dev`) respawns fresh process. Default OFF.

### Part D — Web app handles restart signal

**File:** `packages/web/src/store/ws-client.ts`

Add handler:
```ts
case 'app:restart-required':
  useModelStore.getState().setRestartRequired(msg)
  // stop accepting model updates until reconnect
  break
```

**File:** `packages/web/src/store/model-store.ts`

Add `restartRequired: RestartRequiredMessage | null` to state. When non-null, render modal overlay (new component `packages/web/src/components/RestartRequiredBanner.tsx`) blocking UI:

> Ontology changed on disk. Restart dev server (`Ctrl+C`, then `memo-architect dev`) to apply. Current view may be inconsistent.

Modal has one action: `Reload page` — triggers `window.location.reload()`. On reconnect WS sees fresh server with fresh bootstrap. Clear `restartRequired`.

### Part E — Kill caches on load

**App-level rule: every load = fresh parse, zero persisted model/ontology state.**

Changes:

1. **Remove** `localStorage:memo:userViewpoints` cache (`model-store.ts:20-37`). User viewpoints must live in SysML/YAML on disk (single source of truth per `feedback_sysml_ground_truth.md`). Migrate current localStorage viewpoints to `memo.viewpoints.yaml` on next load then wipe the key.

2. **Remove** `availableOntologies` persistence. Always derived from server `ontology:packages` message on connect. Never localStorage.

3. **Remove** `window.__MEMO_DATA__` embedded-data fallback from `ws-client.ts:loadEmbeddedData()` for dev mode. Keep only for static `memo-architect build` output.

4. **Keep but scope-limit** `.memo/user-diagrams.json` and `*.viewlayout` companions — these are view state (layout coordinates), not ontology. Legacy `.memo/layouts/*.yaml` files remain load-compatible and migrate to `.viewlayout` on the next save. Validate at load: drop any diagram/layout whose `kind` or relationship `type` is not present in current ontology registries. Log the drop count.

5. Audit Zustand for `persist()` middleware. Remove any persistence of: `model`, `validation`, `completeness`, `availableOntologies`, `selectedOntologies`, `ontologySelection`. UI state OK (sidebar collapsed, selected tab).

6. Web bootstrap sequence on page load:
   ```
   connect WS → receive ontology:packages → receive model:update
               → receive validation:update → receive completeness:update
   render only after all four received (show skeleton meanwhile)
   ```
   No render from stale store.

### Part F — Bootstrap integrity check

**File:** `packages/cli/src/commands/dev.ts`

At bootstrap end, compute hash of ontology input:
```ts
const ontologyHash = sha256(concat(
  ontologyRegistries.kinds.serialize(),
  ontologyRegistries.relationships.serialize()
))
```
Include hash in every `model:update`, `ontology:packages` message. Web client rejects messages if hash mismatches in-memory value (defense against orphan messages from old server after restart race).

### Part G — Ontology selection UI change

**File:** `packages/web/src/components/OntologyViewer/*` (selection save path)

Current flow (`dev-server.ts:386-463`): UI toggle → write files → watcher rebuilds → WS broadcast. Replace with:

1. UI toggle → `ontology:save-selection` message → server writes files.
2. Server responds with `app:restart-required` (reason: `ontology-selection-changed`) **instead of** triggering rebuild.
3. UI shows modal: "Ontology selection saved. Restart server to apply."

No silent live swap of ontology via selection.

### Part H — Prevent accidental ontology cache anywhere

Add ESLint rule / grep guard in CI:
- Forbid `persist(` on any slice touching `model`, `ontology*`, `kindRegistry`, `relationshipRegistry`
- Forbid `localStorage.setItem` with keys matching `/ontology|kind|relationship|model/i`

---

## Execution Instructions for Implementing LLM

Execute phases in order. Run `pnpm run build && pnpm run test` after each phase. Commit directly to `main` per `feedback_work_on_main.md`.

### Phase 1 — Add RestartRequired message type
- Edit `packages/core/src/protocol/messages.ts`: add `RestartRequiredMessage` interface. Add to union.
- Export from index.
- Test: `pnpm --filter @memoarchitect/tools test`.

### Phase 2 — Split file watcher
- Edit `packages/cli/src/server/file-watcher.ts`: replace `createFileWatcher()` with `createProjectWatcher()` + `createOntologyWatcher()`. Each returns `{ close() }`.
- Project patterns: `model/**/*.sysml`, `memo.rendering.yaml`, `memo.rules.yaml`, `memo.viewpoints.yaml` (project-root only).
- Ontology patterns: take `ontologyRoots: string[]` param, watch `<root>/sysml/**/*.sysml`, `<root>/memo.package.yaml`, `<root>/memo.rendering.yaml`; plus project-root `memo.config.yaml` and `model/ontology-selection.sysml`.
- Both debounce 300ms.
- Write unit tests mirroring existing watcher tests.

### Phase 3 — Split dev command rebuild
- Edit `packages/cli/src/commands/dev.ts`:
  - Extract `bootstrap()` async func: load config, call `loadAndResolveConfig`, call `loadOntologyRegistries`, freeze registries, store `ontologyRoots` from resolver result, compute `ontologyHash`.
  - Extract `rebuildProject()` func: parse project files + build model + validate + completeness + broadcast. Uses frozen registries.
  - Extract `notifyRestartRequired(reason, changedFile)` func: broadcast `app:restart-required`, print stderr banner.
  - Wire project watcher → `rebuildProject`. Wire ontology watcher → `notifyRestartRequired`.
- Remove old unified `rebuild()`.
- Verify `memo-architect dev` in `examples/infusion-pump` hot-reloads a `.sysml` edit under `model/` but NOT under ontology paths.

### Phase 4 — Change ontology:save-selection handler
- Edit `packages/cli/src/server/dev-server.ts` lines 386-463:
  - Keep file writes (SysML + YAML).
  - Remove any rebuild trigger code.
  - After write succeeds, broadcast `app:restart-required` with `reason: 'ontology-selection-changed'`.
- Update tests.

### Phase 5 — Web: handle restart-required
- Edit `packages/web/src/store/model-store.ts`: add `restartRequired: RestartRequiredMessage | null`, setter `setRestartRequired`.
- Edit `packages/web/src/store/ws-client.ts`: add case `app:restart-required` → `setRestartRequired(msg)`. After receiving, ignore further `model:update` etc. until `restartRequired` cleared.
- Create `packages/web/src/components/RestartRequiredBanner.tsx`: blocking modal, shows reason + changedFile + instruction, one button "Reload page" (calls `window.location.reload()`).
- Mount banner in root `App.tsx` when `restartRequired` non-null.

### Phase 6 — Kill web caches
- Edit `packages/web/src/store/model-store.ts`:
  - Remove `loadUserViewpoints()`/`saveUserViewpoints()` and their localStorage access. Delete key `memo:userViewpoints` on first load (migration).
  - Grep store for `persist(` — remove from any ontology/model slice.
- Write migration: on first store init after upgrade, if `localStorage.memo:userViewpoints` present, POST to `memo-architect dev` via WS as `viewpoint:migrate` or write directly into project's `memo.viewpoints.yaml`. Then `localStorage.removeItem('memo:userViewpoints')`.
- Edit `packages/web/src/store/ws-client.ts:loadEmbeddedData`: keep path for static build (detect via `window.__MEMO_DATA__` + no WS URL), but in dev mode (WS URL set) never call it.

### Phase 7 — Validate user diagrams/layouts on load
- Edit `packages/cli/src/server/dev-server.ts` diagram/layout loaders (lines 28-83):
  - After load, walk each diagram's nodes/edges. Drop any whose `kind` not in `kindRegistry` or whose edge `type` not in `relationshipRegistry`.
  - Log `console.warn` with drop count.

### Phase 8 — Ontology hash integrity
- In `dev.ts` bootstrap: compute `ontologyHash` (sha256 of stable JSON of kind + relationship registries).
- Include `ontologyHash` field in every outgoing `model:update`, `ontology:packages`, `validation:update`, `completeness:update`.
- Web `ws-client.ts`: track `currentOntologyHash`. On first `ontology:packages`, store hash. On any later message, if hash differs, treat as forced restart (set `restartRequired`).

### Phase 9 — CI guards
- Add ESLint custom rule (or simple grep check in `scripts/check-no-ontology-cache.sh`) that fails CI if:
  - `persist(` appears near `ontology`, `model`, `kind`, `relationship` in `packages/web/src/store/`
  - `localStorage.setItem` with ontology-ish keys
- Wire into Turbo `lint` task.

### Phase 10 — Docs
- Update `docs/design/runtime/websocket-protocol.md`: document `app:restart-required`, hash field.
- Update `docs/design/runtime/data-flow.md`: document bootstrap-only ontology load, project-only hot rebuild.
- Add ADR: `docs/decisions/adr/ADR-X-ontology-restart-required.md` capturing the rationale (no mid-session ontology mutation, zero model cache).

### Phase 11 — Verification
- `pnpm run build && pnpm run test` (all packages).
- `cd examples/infusion-pump && memo-architect dev`. Web open. Edit a `model/**/*.sysml` → diagrams update instantly. Edit `../../ontology/**/*.sysml` → modal appears, no model update.
- Toggle ontology in UI → file written, modal appears, reload → new ontology active.
- Hard reload page repeatedly → identical model each time (no drift).
- `grep -r "memo:userViewpoints" packages/web/src` → no matches.

### Phase 12 — Close issues, commit
- Commits per phase: `Phase N: <scope> (#<gitlab-issue>)`. Create GitLab issues up front if not present.

---

## Acceptance Criteria

1. Project `.sysml` edit under `model/` → web diagram updates <1s, no page reload.
2. Ontology source edit OR selection change → web shows blocking banner, CLI prints banner, no model mutation until restart.
3. Page reload = fresh parse. `localStorage` contains zero ontology/model data. Two sequential page loads against same disk state produce byte-identical model DTOs (modulo timestamps).
4. Orphaned diagrams/layouts referencing absent kinds get dropped with warn log.
5. CI fails if someone adds ontology caching.
