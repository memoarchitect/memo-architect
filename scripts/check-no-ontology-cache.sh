#!/usr/bin/env bash
# Guard against persisting server-owned ontology and model state in the browser.
set -euo pipefail

STORE_DIR="packages/web/src/store"
FAILED=0

echo "Checking for forbidden persisted ontology/model state in $STORE_DIR..."

PERSIST_HITS=$(grep -rn "persist(" "$STORE_DIR" 2>/dev/null || true)
if [ -n "$PERSIST_HITS" ]; then
    echo "ERROR: Found persist() in the web store:" >&2
    echo "$PERSIST_HITS" >&2
    FAILED=1
fi

LOCALSTORAGE_HITS=$(grep -rn "localStorage\.setItem" "$STORE_DIR" 2>/dev/null \
    | grep -iE "ontology|model|kind|relationship" || true)
if [ -n "$LOCALSTORAGE_HITS" ]; then
    echo "ERROR: Found ontology/model localStorage writes:" >&2
    echo "$LOCALSTORAGE_HITS" >&2
    FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

echo "OK: ontology and model state remain server-owned."

