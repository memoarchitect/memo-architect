#!/usr/bin/env bash
# show-roadmap.sh — Show phases and issues from GitLab
# Usage:
#   pnpm run roadmap                   # phase summary only
#   pnpm run roadmap -- --open         # open issues grouped by phase
#   pnpm run roadmap -- --done         # closed issues grouped by phase
#   pnpm run roadmap -- --bugs         # open bugs only
#   pnpm run roadmap -- --phase c      # single phase detail (from local file)
set -euo pipefail

PROJECT="somesh_sandbox/memo"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PHASE=""
MODE="summary"   # summary | open | done | bugs

while [[ $# -gt 0 ]]; do
  case $1 in
    --phase|-p)  PHASE="${2,,}"; shift 2 ;;
    --open)      MODE="open";    shift ;;
    --done)      MODE="done";    shift ;;
    --bugs)      MODE="bugs";    shift ;;
    *)           shift ;;
  esac
done

# ── Single phase: cat the local synced file ───────────────────────────
if [ -n "$PHASE" ]; then
  FILE="$REPO_DIR/docs/roadmap/phase-${PHASE}.md"
  if [ -f "$FILE" ]; then
    cat "$FILE"
  else
    echo "Phase '$PHASE' not found. Available: 1 2 a b c d e f g h i j"
    exit 1
  fi
  exit 0
fi

# ── Print header ──────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo "  MEMO Roadmap"
echo "═══════════════════════════════════════════════════"
echo ""

# ── BUGS mode ─────────────────────────────────────────────────────────
if [ "$MODE" = "bugs" ]; then
  echo "  Open Bugs"
  echo "  ─────────────────────────────────────────────────"
  echo ""
  glab issue list -R "$PROJECT" --per-page 200 2>/dev/null | tail -n +3 \
    | grep -iE "bug|type::fix" \
    | while IFS=$'\t' read -r id title labels created rest; do
        [ -z "$id" ] && continue
        printf "  %-8s %s\n" "$id" "$title"
        [ -n "$labels" ] && printf "           %s\n" "$labels"
      done
  echo ""
  echo "  pnpm run roadmap:open   # all open issues by phase"
  exit 0
fi

# ── Phase summary table (always shown) ───────────────────────────────
echo "  Phase │ Pri  │ Focus"
echo "  ──────┼──────┼──────────────────────────────────────────"
echo "    1   │ P0 ★ │ Ontology cleanup (extract, collapse, simplify)"
echo "    2   │ P0 ★ │ GPCA reference model (single strong example)"
echo "    A   │ P0   │ Critical bug fixes"
echo "    B   │ P1   │ UX foundation"
echo "    C   │ P1   │ Visual ontology viewer"
echo "    D   │ P2   │ Diagrams & views"
echo "    E   │ P2   │ DHF improvements"
echo "    F   │ P2   │ Model & scenarios"
echo "    G   │ P3   │ Examples, docs & manuals"
echo "    H   │ --   │ Cloud & collaboration (deferred)"
echo "    I   │ --   │ Domain packages (deferred)"
echo "    J   │ P2   │ Import/export formats"
echo ""
echo "  Order: 1 → 2 → A → B → C → D/E/F/J (parallel) → G → H/I"
echo ""

if [ "$MODE" = "summary" ]; then
  echo "  pnpm run roadmap            # phase summary"
  echo "  pnpm run roadmap:open       # open issues by phase"
  echo "  pnpm run roadmap:done       # closed issues by phase"
  echo "  pnpm run roadmap:bugs       # open bugs only"
  echo "  pnpm run roadmap -- --phase c  # single phase detail"
  exit 0
fi

# ── Phase definitions — all known issue IDs per phase ─────────────────
# Associative arrays not reliable in bash 3 (macOS default), use parallel arrays

PHASE_NAMES=(
  "Phase 1 — Ontology Cleanup (P0)"
  "Phase 2 — GPCA Reference Model (P0)"
  "Phase A — Critical Bug Fixes (P0)"
  "Phase B — UX Foundation (P1)"
  "Phase C — Visual Ontology Viewer (P1)"
  "Phase D — Diagrams & Views (P2)"
  "Phase E — DHF Improvements (P2)"
  "Phase F — Model & Scenarios (P2)"
  "Phase G — Examples, Docs & Manuals (P3)"
  "Phase H — Cloud & Collaboration (deferred)"
  "Phase I — Domain Packages (deferred)"
  "Phase J — Import/Export Formats (P2)"
)

PHASE_IDS=(
  "#97 #98 #99 #100 #101 #102 #103 #104 #105 #91 #93 #111"
  "#106 #107 #87 #108 #110 #109 #111"
  "#81 #82 #83 #84 #85 #86 #91 #93"
  "#62 #66 #69 #70 #74 #75"
  "#7 #80 #89 #92"
  "#71 #72"
  "#76 #77 #78 #121"
  "#73 #79"
  "#87 #90 #94 #95 #96"
  "#58 #59 #60"
  "#56 #57"
  "#88"
)

# ── Fetch issues ──────────────────────────────────────────────────────
if [ "$MODE" = "open" ]; then
  echo "  Open Issues by Phase"
  echo ""
  RAW=$(glab issue list -R "$PROJECT" --per-page 200 2>/dev/null || echo "")
  MATCH_IDS=$(echo "$RAW" | tail -n +3 | awk '{print $1}' | grep "^#" || echo "")
  LABEL="open"
elif [ "$MODE" = "done" ]; then
  echo "  Closed Issues by Phase"
  echo ""
  RAW=$(glab issue list -R "$PROJECT" --per-page 200 --closed 2>/dev/null || echo "")
  MATCH_IDS=$(echo "$RAW" | tail -n +3 | awk '{print $1}' | grep "^#" || echo "")
  LABEL="closed"
fi

total=0
for i in "${!PHASE_NAMES[@]}"; do
  phase="${PHASE_NAMES[$i]}"
  ids="${PHASE_IDS[$i]}"
  lines=""
  for id in $ids; do
    if echo "$MATCH_IDS" | grep -qx "$id"; then
      title=$(echo "$RAW" | tail -n +3 | grep "^${id}	" | cut -f2 | head -1)
      lines+="$(printf '    %-8s %s\n' "$id" "$title")\n"
      total=$((total + 1))
    fi
  done
  [ -z "$lines" ] && continue
  echo "  ─── $phase"
  printf '%b' "$lines"
  echo ""
done

echo "  Total $LABEL: $total"
echo ""
echo "  pnpm run roadmap -- --open        # open issues by phase"
echo "  pnpm run roadmap -- --done        # closed issues by phase"
echo "  pnpm run roadmap -- --bugs        # open bugs only"
echo "  pnpm run roadmap -- --phase c     # single phase detail"
