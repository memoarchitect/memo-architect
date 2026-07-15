# Standalone Distribution

Users can run the meMO workbench against a model folder of their own without
the `memo-architect` source tree. The stack ships as four npm tarballs; the
`memo` CLI carries the engine and ontology as regular dependencies and serves
the prebuilt web app statically.

## Packing

```bash
./scripts/pack-standalone.sh     # builds everything, emits dist-standalone/
```

| Tarball | Package | Source repo |
| --- | --- | --- |
| `memo-core-*.tgz` | `@memo/core` — parser/engine | memo-tools |
| `memo-ontology-*.tgz` | `@memo/ontology` — canonical ontology | memo (nested submodule) |
| `memo-cli-*.tgz` | `@memo/cli` — the `memo` CLI | memo-tools |
| `memo-web-*.tgz` | `@memo/web` — prebuilt `dist/` only | memo-architect |

`@memo/web` declares `files: ["dist/"]`, so the tarball contains the built app
and none of the source. `pnpm pack` rewrites `workspace:*` dependency ranges to
concrete versions.

## Installing and using

```bash
npm install -g ./memo-core-*.tgz ./memo-ontology-*.tgz ./memo-cli-*.tgz ./memo-web-*.tgz

mkdir my-device && cd my-device
memo init .          # scaffold model/ + memo.config.yaml
memo dev             # http://127.0.0.1:3000
```

The user's folder holds only their model. The ontology and engine resolve
through the CLI's own dependency tree; the web app resolves per the rules
below.

## How the CLI finds the web app

`resolveWebPackage` (memo-tools `packages/cli/src/commands/dev.ts`) tries, in
order:

1. `MEMO_WEB_ROOT` env var (path to the `@memo/web` package or a folder
   containing `dist/`)
2. `<project>/node_modules/@memo/web` — per-project install
3. Monorepo-relative paths (developer checkouts)
4. `require.resolve('@memo/web/package.json')` from the CLI's install tree —
   global installs

## How the dev server serves it

`createDevServer` (memo-tools `packages/cli/src/server/dev-server.ts`) picks a
mode by inspecting the resolved web package:

- **Source tree present** (`index.html` at the package root) and Vite
  importable → Vite dev middleware (developer workflow, HMR).
- **Prebuilt only** (`dist/index.html`) → static SPA serving with path
  traversal guard and `index.html` fallback. No Vite in the user's folder.
- Neither → diagnostic placeholder page.

The WebSocket protocol is unchanged: the web app connects to
`ws://<location.host>`, which is the same server in both modes.

## Renderer flag in standalone use

The diagram renderer feature flag works identically in packed builds:
`?renderer=maxgraph`, the on-canvas switcher, or baking a default with
`VITE_MEMO_DIAGRAM_RENDERER` when building `@memo/web`. See
[diagram-renderers.md](diagram-renderers.md).
