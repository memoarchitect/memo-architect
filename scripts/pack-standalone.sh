#!/usr/bin/env bash
# ─── pack-standalone.sh ───────────────────────────────────────────────────────
#
# Builds the meMO stack and packs it into installable npm tarballs so a user
# can run `memo dev` in their own model folder without the memo-architect
# source tree. Output: dist-standalone/
#
#   memo-core-<v>.tgz      @memo/core      — parser/engine       (memo-tools)
#   memo-ontology-<v>.tgz  @memo/ontology  — canonical ontology  (memo)
#   memo-cli-<v>.tgz       @memo/cli       — the `memo` CLI      (memo-tools)
#   memo-web-<v>.tgz       @memo/web       — prebuilt web app dist/
#
# Install (from the user's machine):
#   npm install -g ./memo-core-*.tgz ./memo-ontology-*.tgz ./memo-cli-*.tgz ./memo-web-*.tgz
#   mkdir my-device && cd my-device && memo init . && memo dev
#
# The CLI resolves the web app from the global install (or MEMO_WEB_ROOT) and
# serves the prebuilt dist/ statically — Vite is not needed at runtime.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist-standalone"

echo "▸ Building all packages…"
(cd "$ROOT" && corepack pnpm run build)

rm -rf "$OUT"
mkdir -p "$OUT"

pack() {
    local dir="$1"
    echo "▸ Packing $(node -p "require('$dir/package.json').name")"
    (cd "$dir" && corepack pnpm pack --pack-destination "$OUT" >/dev/null)
}

pack "$ROOT/memo-tools/packages/core"
pack "$ROOT/memo-tools/memo/packages/ontology"
pack "$ROOT/memo-tools/packages/cli"
pack "$ROOT/packages/web"

cat > "$OUT/README.md" <<'EOF'
# meMO standalone distribution

Install the stack globally (order matters — dependencies first):

```bash
npm install -g ./memo-core-*.tgz ./memo-ontology-*.tgz ./memo-cli-*.tgz ./memo-web-*.tgz
```

Then work in any folder of your own:

```bash
mkdir my-device && cd my-device
memo init .        # scaffold model/ + memo.config.yaml
memo dev           # opens the web app at http://127.0.0.1:3000
```

The `memo` CLI carries the engine (`@memo/core`) and the canonical ontology
(`@memo/ontology`) as regular package dependencies; the web app is resolved
from the installed `@memo/web` package (prebuilt `dist/`, served statically).

To point the CLI at a different web build, set `MEMO_WEB_ROOT`:

```bash
MEMO_WEB_ROOT=/path/to/memo-architect/packages/web memo dev
```

Diagram rendering engine can be switched per session with `?renderer=maxgraph`
or persistently via the on-canvas switcher (feature flag, defaults to ReactFlow).
EOF

echo "✓ Standalone tarballs in $OUT"
ls -lh "$OUT"
