# Standalone Distribution

The three repositories each publish one independently distributable npm
package. Users install packages from a registry or tarballs; they do not clone
the source repositories.

## Packing

```bash
./scripts/pack-standalone.sh     # builds everything, emits dist-standalone/
```

| Tarball | Package | Source repo |
| --- | --- | --- |
| `memo-ontology-*.tgz` | `@memoarchitect/ontology` — canonical ontology and methodology | memo |
| `memo-tools-*.tgz` | `@memoarchitect/tools` — engine, headless operations, and `memo` CLI | memo-tools |
| `memo-architect-*.tgz` | `@memoarchitect/architect` — visual workbench and viewer CLI | memo-architect |

`pnpm pack` rewrites workspace dependency ranges to concrete versions. The
packing script also installs all three tarballs into a fresh temporary npm
project, initializes and validates a model, creates a KPAR, builds an Architect
viewer, and checks both command entry points.

## Installing and using

```bash
npm install ./memo-ontology-*.tgz ./memo-tools-*.tgz ./memo-architect-*.tgz

mkdir my-device && cd my-device
memo init .
memo validate .
memo-architect dev   # http://127.0.0.1:3000
```

The user's folder holds only their model and normal npm metadata. Tools finds
its installed `@memoarchitect/ontology` dependency. Architect supplies its own client
assets to the reusable Tools server operation. Tools never resolves or imports
Architect and exposes no commands that require it.

## Renderer flag in standalone use

The diagram renderer feature flag works identically in packed builds:
`?renderer=maxgraph`, the on-canvas switcher, or baking a default with
`VITE_MEMO_DIAGRAM_RENDERER` when building `@memoarchitect/architect`. See
[diagram-renderers.md](diagram-renderers.md).
