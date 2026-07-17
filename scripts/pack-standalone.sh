#!/usr/bin/env bash
# ─── pack-standalone.sh ───────────────────────────────────────────────────────
#
# Builds Architect against its published dependencies, packs Architect locally,
# downloads the exact dependency tarballs, and verifies all three together.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist-standalone"

echo "▸ Building Architect against published npm dependencies"
(cd "$ROOT" && corepack pnpm run build)

rm -rf "$OUT"
mkdir -p "$OUT"

pack() {
    local dir="$1"
    echo "▸ Packing $(node -p "require('$dir/package.json').name")"
    (cd "$dir" && corepack pnpm pack --pack-destination "$OUT" >/dev/null)
}

pack "$ROOT"

ONTOLOGY_SPEC="$(node -p "const p=require('$ROOT/package.json'); '@memoarchitect/ontology@'+p.dependencies['@memoarchitect/ontology']")"
TOOLS_SPEC="$(node -p "const p=require('$ROOT/package.json'); '@memoarchitect/tools@'+p.dependencies['@memoarchitect/tools']")"
(cd "$OUT" && npm pack "$ONTOLOGY_SPEC" "$TOOLS_SPEC" >/dev/null)

cat > "$OUT/README.md" <<'EOF'
# MEMO npm distribution

Each tarball is independently publishable. Install only the level you need:

```bash
npm install @memoarchitect/ontology
npm install @memoarchitect/tools
npm install @memoarchitect/architect
```

For these local tarballs:

```bash
npm install ./memoarchitect-ontology-*.tgz ./memoarchitect-tools-*.tgz ./memoarchitect-architect-*.tgz
```

Dependency direction is:

`@memoarchitect/ontology` ← `@memoarchitect/tools` ← `@memoarchitect/architect`
EOF

echo "▸ Verifying a clean npm consumer without a source checkout"
VERIFY="$(mktemp -d)"
trap 'rm -rf "$VERIFY"' EXIT
(cd "$VERIFY" && npm init -y >/dev/null && npm install "$OUT"/*.tgz >/dev/null)
(cd "$VERIFY" && ./node_modules/.bin/memo --help >/dev/null)
(cd "$VERIFY" && ./node_modules/.bin/memo-architect --help >/dev/null)
(cd "$VERIFY" && ./node_modules/.bin/memo init device --archetype blank >/dev/null)
(cd "$VERIFY/device" && ../node_modules/.bin/memo validate . >/dev/null)
(cd "$VERIFY/device" && ../node_modules/.bin/memo pack --output device.kpar >/dev/null)
(cd "$VERIFY/device" && ../node_modules/.bin/memo-architect build --output viewer >/dev/null)
test -f "$VERIFY/node_modules/@memoarchitect/ontology/memo.manifest.yaml"
test -f "$VERIFY/node_modules/@memoarchitect/tools/packages/tools/lib/index.js"
test -f "$VERIFY/node_modules/@memoarchitect/architect/dist/index.html"
test -f "$VERIFY/device/device.kpar"
test -f "$VERIFY/device/viewer/index.html"

COUNT="$(find "$OUT" -maxdepth 1 -name '*.tgz' | wc -l | tr -d ' ')"
test "$COUNT" = "3"

echo "✓ Three verified npm tarballs in $OUT"
ls -lh "$OUT"
