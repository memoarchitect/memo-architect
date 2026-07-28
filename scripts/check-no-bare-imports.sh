#!/usr/bin/env bash
# Guard against shipping a bundle the browser cannot load.
#
# Rollup leaves an import it could not resolve in the output as a bare
# specifier. The browser has no resolver for those, so evaluating the chunk
# throws `Failed to resolve module specifier` and every route that statically
# depends on it renders blank. Vite reports this as a warning, so the build
# stays green and the breakage only surfaces once a user installs the package —
# it cannot reproduce in `dev`, which serves source rather than chunks.
#
# This is what shipped 0.6.2 with `import"web-worker"` in the elk chunk and
# broke every diagram. Every specifier in dist must be relative or absolute.
set -euo pipefail

ASSET_DIR="dist/assets"

if [ ! -d "$ASSET_DIR" ]; then
    echo "ERROR: $ASSET_DIR not found — run the client build first." >&2
    exit 1
fi

echo "Checking for unresolved bare imports in $ASSET_DIR..."

# A bare specifier is anything after import/from that does not start with
# / . or a protocol. Matching the minified form (no spaces) and the plain one.
HITS=$(grep -rlE '(^|[};])(import|export[^"]*from)[[:space:]]*"[^"./][^":]*"' \
    "$ASSET_DIR" --include='*.js' 2>/dev/null || true)

if [ -n "$HITS" ]; then
    echo "ERROR: Bundled chunks import unresolvable bare specifiers:" >&2
    for file in $HITS; do
        echo "  $file" >&2
        grep -oE '(import|from)[[:space:]]*"[^"./][^":]*"' "$file" | sort -u | sed 's/^/    /' >&2
    done
    echo >&2
    echo "The browser cannot resolve these and the chunk will throw on load." >&2
    echo "Usually a manualChunks entry naming a package instead of the module" >&2
    echo "the app imports — point it at the exact module path." >&2
    exit 1
fi

echo "OK: every import in the bundle is resolvable."
