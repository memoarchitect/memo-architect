# Split Execution Checklist

Consumed by Epic FF (#504), Epic GG (#505), Epic HH (#506).
Reference: ADR-1-17, boundary inventory (`epic-j-boundary-inventory.md`).

## Execution Order

```
FF (memo-sysmlv2) → GG (memo-cli) → HH (memo-architect)
```

Content first (no engine deps), then engine (data-depends content), then UI (build-deps engine types + runtime WebSocket).

---

## Epic FF: Cut memo-sysmlv2

**What moves:**
- `ontology/` → repo root
- `packages/ontology-arch/` → `packages/ontology-arch/`
- `packages/ontology-process/` → `packages/ontology-process/`
- `packages/methodology-default/` → `packages/methodology-default/`
- `packages/methodology-gpca/` → `packages/methodology-gpca/`
- `packages/medical-modeling-profile/` → `packages/medical-modeling-profile/`
- `feedback/` → `feedback/`
- `examples/gpca-pump/` → `examples/gpca-pump/`

**Pre-cut steps:**
1. Strip TS from `@memo/medical-modeling-profile` — replace `src/index.ts` with metadata in `.project.json`; remove `main`/`types`/`build: tsc` from manifest
2. Remove `MEDICAL_DOMAIN_VERSION` const (unused — grep confirms no imports)
3. Verify all content packages have `splitTarget: "memo-sysmlv2"` in manifest ✓ (done in J-2)

**Cut steps:**
1. Create `memo-sysmlv2` repo on GitLab
2. `git subtree split` or `git filter-repo` to extract content paths with history
3. Set up root `package.json` with pnpm workspace (content packages only, no turbo needed)
4. Add sysand package manifest (`sysand.toml` or equivalent) for publishing
5. Verify: all `.sysml` files parse in SysIDE / SysON / sysand (portability check)
6. Tag initial release (e.g. `v0.1.0`)

**Post-cut steps:**
1. In monorepo: replace extracted dirs with git submodule or sysand dependency
2. Update `pnpm-workspace.yaml` to exclude moved packages
3. Verify monorepo `pnpm run build && pnpm run test` still passes

---

## Epic GG: Cut memo-cli

**What moves:**
- `packages/core/` → `packages/core/`
- `packages/cli/` → `packages/cli/`
- `tools/ontology-tools/` → `tools/ontology-tools/`
- `tools/vscode-extension/` → `tools/vscode-extension/`

**Pre-cut steps:**
1. Change `@memo/ontology-arch: workspace:*` and `@memo/ontology-process: workspace:*` in `packages/cli/package.json` to versioned external refs (sysand URNs or npm version from FF release)
2. Ensure `packages/core/src/protocol/messages.ts` is stable — this is the versioned WebSocket contract between cli and web
3. Copy `packages/core/syntaxes/memo-sysml.tmLanguage.json` into `tools/vscode-extension/` (remove cross-package build-time dependency)

**Cut steps:**
1. Create `memo-cli` repo on GitLab
2. `git subtree split` to extract `packages/core/` + `packages/cli/` + `tools/{ontology-tools,vscode-extension}` with history
3. Set up root `package.json` with pnpm workspace + turbo
4. Add data-dependency on `memo-sysmlv2` (sysand install or git submodule)
5. `pnpm run build && pnpm run test` — verify all 130+ tests pass
6. Tag initial release

**Post-cut steps:**
1. Publish `@memo/core` to npm (or keep workspace-only if memo-architect uses git dep)
2. In monorepo: remove `packages/core/` and `packages/cli/` from workspace
3. Verify web still builds with `@memo/core` as external dep

**Split blocker resolution:**
- `computeImpact` + `BUILTIN_RECIPES` runtime imports in web: these come from `@memo/core` which will be an npm package. Web build-depends on it. No code change needed — just make sure `@memo/core` is published before HH.

---

## Epic HH: Cut memo-architect

**What moves:**
- `packages/web/` → repo root (or `packages/web/`)
- `tools/ontology-viewer/` → `tools/ontology-viewer/`

**Pre-cut steps:**
1. Change `@memo/core: workspace:*` to npm version (from GG release)
2. Verify web builds with external `@memo/core` dep
3. Document WebSocket protocol version in `README` (contract with memo-cli dev server)

**Cut steps:**
1. Create `memo-architect` repo on GitLab
2. Extract `packages/web/` + `tools/ontology-viewer/` with history
3. Set up standalone Vite project (no turbo needed — single package)
4. `pnpm run build` — verify clean build
5. Tag initial release

**Post-cut steps:**
1. Archive or tombstone the original monorepo
2. Update all GitLab issue references to point to new repos
3. Update ADR-1-17 with completion status

---

## Verification Commands (per repo)

| Repo | Verification |
|---|---|
| memo-sysmlv2 | `sysand check` or equivalent SysML parser validation on all `.sysml` files |
| memo-cli | `pnpm run build && pnpm run test` (130+ tests) |
| memo-architect | `pnpm run build` (Vite), manual smoke test in browser |

## ADR Updates Needed

- ADR-1-17: mark split as executed, record actual repo URLs
- platform.md §10: update repo layout to match 3-repo reality
- Epic L (docs reconciliation): update all docs referencing monorepo paths
