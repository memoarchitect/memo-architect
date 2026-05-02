#!/usr/bin/env bash
# Migrate legacy GitLab milestones (W1.P*–W3.P*) and issues (#186–#319)
# onto the new Epic A–DD plan defined in docs/roadmap/.
#
# This script is a DRY-RUN by default. Set MIGRATE_APPLY=1 to execute.
# Intended to be reviewed before running. Idempotent at the issue level
# (re-applying a label is a no-op; closing a closed issue is a no-op).

set -euo pipefail

REPO="somesh_sandbox/memo"
REPO_ENC="${REPO//\//%2F}"
APPLY="${MIGRATE_APPLY:-0}"

run() {
  if [[ "$APPLY" == "1" ]]; then
    echo "+ $*"
    "$@"
  else
    echo "DRYRUN  $*"
  fi
}

# Close a milestone by exact title. Dry-run prints intent; apply-time
# resolves the id and PUTs state_event=close.
close_milestone_by_title() {
  local title="$1"
  if [[ "$APPLY" != "1" ]]; then
    echo "DRYRUN  would close milestone: $title"
    return 0
  fi
  local mid
  mid=$(glab api "projects/${REPO_ENC}/milestones?per_page=100" \
        --paginate 2>/dev/null \
        | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' \
        | head -1)
  if [[ -z "$mid" ]]; then
    echo "  (milestone '$title' not found or already closed — skip)"
    return 0
  fi
  echo "+ closing milestone '$title' (id $mid)"
  glab api -X PUT "projects/${REPO_ENC}/milestones/${mid}" -f state_event=close \
    >/dev/null \
    && echo "  closed." \
    || echo "  ERROR closing $title (id $mid)"
}

# --- 1. Ensure epic labels exist (M..DD already created via API earlier;
#         B..L assumed already in place from #320–#366). ---
declare -A EPIC_DESC=(
  [A]="Methodology UI IA — Methodology tab primary, Ontology hidden (Wave 4)"
  [B]="L0 helpers — memo::base::* dimension defs + stdlib wrapper (Wave 1)"
  [C]="Architecture sublayers — memo::ontology::architecture::<layer>::* (Wave 1)"
  [D]="Compliance dimension — memo::ontology::compliance::<standard>::* (Wave 1)"
  [E]="Artifact kinds — concrete DHF document kinds (Wave 1)"
  [F]="Methodology scope filtering — dimension ∩ scope helper (Wave 2)"
  [G]="Default methodology — @memo/methodology-default comprehensive (Wave 2)"
  [H]="GPCA tailoring — subtraction example (Wave 2)"
  [I]="CLI authoring slices — memo ontology/methodology add-kind (Wave 3)"
  [J]="Repo split prep — boundary inventory + manifest cleanup (Wave 4)"
  [K]="Grammar gaps — set diff, view def, ports/interfaces (Wave 1)"
  [L]="Alignment + merge — final docs/ADR/GitLab cleanup (Wave 4)"
  [M]="Ports + interfaces — port def, interface def, connect, builder ports (Wave 1)"
  [N]="Consistency rules in SysML — YAML rules → SysML; memo rules CLI (Wave 1)"
  [O]="Renderer dispatcher — RendererPlan + per-renderer modules (Wave 4)"
  [P]="Four-tab web shell — replace six-mode shell (Wave 4)"
  [Q]="DHF descriptor compiler — DocumentBackedView walkers (Wave 3)"
  [R]="Archetypes in SysML — YAML profiles → Archetype parts (Wave 2)"
  [S]="CLI parity + machine output — --format json/junit + CI templates (Wave 3)"
  [T]="Sysand packaging — .project.json + .kpar + lockfile (Wave 1)"
  [U]="Imports + LSP — OWL/EA/Cameo/AADL importers; VS Code LS (Wave 2)"
  [V]="Module + flag infra — FeatureModule + lazy loader + memo features (Wave 4)"
  [W]="Tool modules — DSM, FMEA, trace, coverage, lint, diff (each wraps CLI) (Wave 4)"
  [X]="Medical renderers + workbenches — risk grid, bowtie, fault tree (Wave 4)"
  [Y]="Scenario editor + diff — scenario branches; diff renderer (Wave 4)"
  [Z]="Plugin system + extension pattern — @memo/plugin-api; medical-only @memo/ext-* (Wave 4)"
  [AA]="Miro canvas engine — free-form canvas; writes route through CLI (Wave 4)"
  [BB]="Examples cleanup — GPCA pump default; cyber 70→90% (Wave 2)"
  [CC]="Documentation restructure — Users vs Devs; full CLI manual (Wave 3)"
  [DD]="SysML standard conformance — SysON/SysIDE/Sysand interop CI gate (Wave 1)"
)

declare -A WAVE_DESC=(
  [1]="Wave 1 — SysML foundation. Standard-conformant grammar, ports, sysand packaging, dimension helpers, ontology kinds, rules. Authoring via text editor + .sysml. No CLI surface, no UI."
  [2]="Wave 2 — Methodology in SysML. Scope filtering, default + GPCA tailoring, archetypes, examples cleanup, importers writing .sysml. No UI."
  [3]="Wave 3 — CLI surface. Authoring CLI, DHF compiler, machine-readable output (JSON/JUnit), full docs."
  [4]="Wave 4 — UI thin wrapper. Renderer dispatcher, 4-tab shell, medical renderers, tools, plugins, canvas. Every UI action wraps a CLI command."
)

for K in "${!EPIC_DESC[@]}"; do
  run glab label create -R "$REPO" --name "epic::$K" --color "#6699cc" \
    --description "${EPIC_DESC[$K]}" 2>/dev/null || true
done

for K in "${!WAVE_DESC[@]}"; do
  run glab label create -R "$REPO" --name "wave::$K" --color "#cc6666" \
    --description "${WAVE_DESC[$K]}" 2>/dev/null || true
done

# --- 2. Map legacy issues to new epics + waves. ---
# Format: "<issue> <epic> <wave>"
declare -a MAP=(
  # Repo moves — obsolete (target layout differs from platform.md).
  "186 OBSOLETE -"   # S0.1 packages/core → apps/core
  "187 OBSOLETE -"   # S0.2 packages/cli → apps/cli
  "188 OBSOLETE -"   # S0.3 packages/web → apps/web
  "189 OBSOLETE -"   # S0.4 ontology → ontology/memo-base/...
  "190 OBSOLETE -"   # S0.5 examples → projects

  # S1.x codemods — retarget under platform.md namespace via Epic C.
  "191 C 1"
  "192 C 1"
  "193 N 1"   # lint rules R1/P1/P5/P2

  # S2.x core packages — fold into Epic B (helpers) + Epic N (rules).
  "194 B 1"
  "195 B 1"
  "196 B 1"
  "197 N 1"

  # S3.x viewpoints/views — fold into Epic B + Epic F.
  "198 B 1"
  "199 B 1"
  "200 F 2"
  "201 F 2"
  "202 X 4"
  "203 X 4"
  "204 X 4"
  "205 F 2"

  # S10.x archetypes — Epic R.
  "206 R 2"
  "207 R 2"
  "208 R 2"

  # SFB.x sysand — Epic T.
  "209 T 1"
  "210 T 1"
  "211 T 1"
  "212 T 1"
  "213 T 1"
  "214 T 1"
  "215 T 1"
  "216 T 1"

  # S7.x ports — Epic M.
  "217 M 1"
  "218 M 1"
  "223 M 1"
  "224 M 1"
  "225 M 1"

  # SEX.x examples — Epic BB.
  "219 BB 2"
  "220 BB 2"
  "221 BB 2"

  # SDOC.W1 — Epic CC.
  "222 CC 3"

  # S6.x rules — Epic N.
  "226 N 1"
  "227 N 1"
  "228 N 1"
  "229 N 1"
  "230 N 1"
  "231 N 1"

  # S9.x DHF compiler — Epic Q.
  "232 Q 3"
  "233 Q 3"
  "234 Q 3"
  "235 Q 3"
  "236 Q 3"

  # S11.x parity — Epic S.
  "237 S 3"
  "238 S 3"
  "239 S 3"

  # SIMP.x imports — Epic U.
  "240 U 2"
  "241 U 2"
  "242 U 2"
  "243 U 2"
  "244 U 2"

  # SDOC.W2.x — Epic CC.
  "245 CC 3"
  "246 CC 3"

  # SMOD.x modules — Epic V.
  "247 V 4"
  "248 V 4"
  "249 V 4"
  "250 V 4"

  # S5.x shell — Epic P.
  "251 P 4"
  "252 P 4"
  "253 P 4"
  "254 P 4"
  "255 P 4"

  # S4.x dispatcher — Epic O.
  "256 O 4"
  "257 O 4"
  "258 O 4"
  "259 O 4"

  # S5.3 diagramming — Epic P.
  "260 P 4"

  # S5.8 ext namespace loader — Epic Z.
  "261 Z 4"

  # S8.x medical renderers — Epic X.
  "262 X 4"
  "263 X 4"
  "264 X 4"
  "265 X 4"
  "266 X 4"
  "267 X 4"
  "268 X 4"
  "269 X 4"
  "270 X 4"
  "271 X 4"
  "272 X 4"
  "273 X 4"

  # STL.x tools — Epic W.
  "274 W 4"
  "275 W 4"
  "276 W 4"
  "277 W 4"
  "278 W 4"
  "279 W 4"
  "280 W 4"
  "281 W 4"
  "282 W 4"
  "283 W 4"
  "284 W 4"
  "285 W 4"
  "286 W 4"
  "287 W 4"
  "288 W 4"

  # SMIRO.x canvas — Epic AA.
  "289 AA 4"
  "290 AA 4"
  "291 AA 4"
  "292 AA 4"
  "293 AA 4"
  "294 AA 4"
  "295 AA 4"
  "296 AA 4"
  "297 AA 4"
  "298 AA 4"
  "299 AA 4"
  "300 AA 4"
  "301 AA 4"
  "302 AA 4"
  "303 AA 4"
  "304 AA 4"

  # SMW.x medical workbenches — Epic X.
  "305 X 4"
  "306 X 4"
  "307 X 4"
  "308 X 4"

  # SSC.x scenarios — Epic Y.
  "309 Y 4"
  "310 Y 4"
  "311 Y 4"
  "312 Y 4"

  # SCM.x plugin / domains — Epic Z (auto/aero dropped per ADR-1-14).
  "313 Z 4"
  "314 Z 4"
  "315 OBSOLETE -"   # SCM.3 automotive — out of scope per ADR-1-14
  "316 OBSOLETE -"   # SCM.4 aerospace — out of scope per ADR-1-14

  # SDOC.W3.x — Epic CC.
  "317 CC 3"
  "318 CC 3"
  "319 CC 3"
)

for entry in "${MAP[@]}"; do
  read -r issue epic wave <<< "$entry"
  if [[ "$epic" == "OBSOLETE" ]]; then
    case "$issue" in
      315|316)
        REASON="Closing as obsolete per ADR-1-14: MEMO is medical-only; automotive/aerospace are out of scope."
        ;;
      *)
        REASON="Closing as obsolete per ADR-1-12: legacy repo-layout target differs from platform.md final layout. See docs/roadmap/index.md."
        ;;
    esac
    run glab issue note -R "$REPO" "$issue" -m "$REASON"
    run glab issue close -R "$REPO" "$issue"
  else
    run glab issue update -R "$REPO" "$issue" \
      --label "epic::${epic},wave::${wave}"
  fi
done

# --- 3. Close legacy milestones. New plan does not use W1/W2/W3 milestones. ---
LEGACY_MILESTONES=(
  "W1.P-DOC.1 Docs for W1"
  "W1.P-EX Examples cleanup"
  "W1.P-FB Sysand integration + reclassification"
  "W1.P0 Physical separation"
  "W1.P1 Namespace introduction"
  "W1.P10 Templates"
  "W1.P2 Core ontology"
  "W1.P3 Viewpoints + views as SysML"
  "W2.P-DOC.2 Docs for W2"
  "W2.P-IMPORT Imports + LSP"
  "W2.P11 CLI parity audit + JSON/JUnit"
  "W2.P6 Consistency rules"
  "W2.P7 SysML compat + builder ports"
  "W2.P9 DHF compiler descriptor-driven"
  "W3.P-COMM Plugin system + libs + domains"
  "W3.P-DOC.3 Docs for W3"
  "W3.P-MEDWB Medical workbenches"
  "W3.P-MIRO Miro-like canvas engine"
  "W3.P-MOD Module + flag infrastructure"
  "W3.P-SCEN Scenario editor + diff"
  "W3.P-TOOL Tool modules"
  "W3.P4 Renderer Dispatcher"
  "W3.P8 Medical-specific renderers"
)

for M in "${LEGACY_MILESTONES[@]}"; do
  close_milestone_by_title "$M"
done

# --- 4. Apply title prefixes for sortable order. ---
#
# Title prefix scheme: [W<wave>.<epic_seq>.<story_idx>]
#   wave       = 1..4
#   epic_seq   = 01..nn within wave
#   story_idx  = 00 for epic parent, 01..nn for stories
#
# Example:
#   Epic K (Wave 1, seq 01)   "[W1.01.00] Epic K: Grammar Support"
#   Story K-1                 "[W1.01.01] K-1 Scope expression grammar decision"
#   Story K-2                 "[W1.01.02] K-2 View and presentation syntax gap check"
#   Epic DD (Wave 1, seq 02)  "[W1.02.00] Epic DD: SysML v2 Standard Conformance"
#
# Sorting GitLab issue list by Title ascending reproduces the roadmap order.
# (Weight attribute requires GitLab Premium/Ultimate — free tier silently
# discards weight, so prefix-in-title is the portable mechanism.)

# epic_id : wave : seq_in_wave : gitlab_parent_issue : "story_issue,story_issue,..."
# Parent issue and stories left blank for epics M..DD (not yet created in GitLab).
declare -a EPIC_PLAN=(
  # Wave 1
  "K  : 1 : 01 : 360 : 361,362"
  "DD : 1 : 02 :     :"
  "T  : 1 : 03 :     :"
  "B  : 1 : 04 : 324 : 325,326,327"
  "M  : 1 : 05 :     :"
  "C  : 1 : 06 : 328 : 329,330,331"
  "D  : 1 : 07 : 332 : 333,334,335"
  "E  : 1 : 08 : 336 : 337,338,339"
  "N  : 1 : 09 :     :"
  # Wave 2
  "F  : 2 : 01 : 340 : 341,342,343"
  "G  : 2 : 02 : 344 : 345,346,347"
  "H  : 2 : 03 : 348 : 349,350,351"
  "R  : 2 : 04 :     :"
  "BB : 2 : 05 :     :"
  "U  : 2 : 06 :     :"
  # Wave 3
  "I  : 3 : 01 : 352 : 353,354,355"
  "S  : 3 : 02 :     :"
  "Q  : 3 : 03 :     :"
  "CC : 3 : 04 :     :"
  # Wave 4
  "A  : 4 : 01 : 320 : 321,322,323"
  "O  : 4 : 02 :     :"
  "P  : 4 : 03 :     :"
  "V  : 4 : 04 :     :"
  "X  : 4 : 05 :     :"
  "W  : 4 : 06 :     :"
  "Y  : 4 : 07 :     :"
  "Z  : 4 : 08 :     :"
  "AA : 4 : 09 :     :"
  "J  : 4 : 10 : 356 : 357,358,359"
  "L  : 4 : 11 : 363 : 364,365,366"
)

retitle_with_prefix() {
  local id="$1" prefix="$2"
  local current
  current=$(glab api "projects/${REPO_ENC}/issues/${id}" 2>/dev/null | jq -r '.title')
  local stripped
  stripped=$(echo "$current" | sed -E 's/^\[W[0-9]+\.[0-9]+(\.[0-9]+)?\] *//')
  local new="${prefix} ${stripped}"
  if [[ "$current" == "$new" ]]; then
    echo "  #${id} already correct: $new"
    return 0
  fi
  if [[ "$APPLY" != "1" ]]; then
    echo "DRYRUN  #${id} → $new"
    return 0
  fi
  echo "  #${id} → $new"
  glab api -X PUT "projects/${REPO_ENC}/issues/${id}" -f "title=${new}" >/dev/null
}

for entry in "${EPIC_PLAN[@]}"; do
  IFS=':' read -r raw_epic raw_wave raw_seq raw_parent raw_stories <<< "$entry"
  epic="$(echo "$raw_epic"     | tr -d ' ')"
  wave="$(echo "$raw_wave"     | tr -d ' ')"
  seq="$(echo  "$raw_seq"      | tr -d ' ')"
  parent="$(echo "$raw_parent" | tr -d ' ')"
  stories="$(echo "$raw_stories" | tr -d ' ')"

  if [[ -n "$parent" ]]; then
    retitle_with_prefix "$parent" "[W${wave}.${seq}.00]"
  else
    echo "  (epic $epic — parent issue not yet created; prefix [W${wave}.${seq}.*] reserved)"
  fi

  if [[ -n "$stories" ]]; then
    idx=1
    IFS=',' read -ra STORY_ARR <<< "$stories"
    for sid in "${STORY_ARR[@]}"; do
      printf -v story_idx "%02d" "$idx"
      retitle_with_prefix "$sid" "[W${wave}.${seq}.${story_idx}]"
      idx=$(( idx + 1 ))
    done
  fi
done

# --- 5. Create / update the pinned Roadmap Overview issue. ---
OVERVIEW_TITLE="Roadmap Overview — Waves 1–4 (read this first)"
OVERVIEW_BODY=$(cat <<'EOF'
# MEMO Roadmap Overview

Source of truth: [docs/roadmap/index.md](../../tree/main/docs/roadmap/index.md).
Architecture: [docs/architecture/platform.md](../../tree/main/docs/architecture/platform.md).
Decisions: ADR-1-11, ADR-1-12, ADR-1-13, ADR-1-14 in [docs/decisions/](../../tree/main/docs/decisions).

## Authoring Order Of Priority

SysML-first → CLI-second → UI-last. UI never owns truth.

| Wave | Label | Focus | Gate |
|---|---|---|---|
| 1 | `wave::1` | SysML foundation. Standard-conformant grammar, ports/interfaces, sysand `.kpar` packaging, L0 helpers + stdlib wrapper, ontology dimensions (architecture, compliance, artifact), consistency rules in SysML. **Authoring via text editor only.** | Build green; gpca-pump boots; `sysand build` produces clean `.kpar`; SysON imports it without errors |
| 2 | `wave::2` | Methodology in SysML. Scope filtering helper (data layer only), default + GPCA tailoring, archetypes, examples cleanup, importers (OWL/EA/Cameo) writing `.sysml`. | Default + GPCA methodologies validate; gpca-pump pins `@memo/methodology-gpca`; importers produce parser-valid SysML |
| 3 | `wave::3` | CLI surface. Authoring CLI (`memo ontology add-kind`, `memo methodology drop-*`), DHF descriptor compiler, machine-readable output (`--format json/junit`), full user + dev docs. | Every CLI command emits stable JSON/JUnit; DHF compiler reproduces every existing output; user manual covers 100% of public CLI |
| 4 | `wave::4` | UI thin wrapper. Renderer dispatcher, 4-tab shell, methodology IA tab, medical renderers, tool modules, plugin/canvas extras, repo split, final alignment. | UI wraps CLI for every persistent action; repo split checklist green; ADR index reflects current state |

## Epic Index (30 epics)

Wave 1: K, DD, T, B, M, C, D, E, N
Wave 2: F, G, H, R, BB, U
Wave 3: I, S, Q, CC
Wave 4: A, O, P, V, X, W, Y, Z, AA, J, L

Each epic has its own parent work item with child stories. Filter by `epic::<id>` label.

## Wave Filter Quick Links

- Wave 1 issues: `?label_name[]=wave::1`
- Wave 2 issues: `?label_name[]=wave::2`
- Wave 3 issues: `?label_name[]=wave::3`
- Wave 4 issues: `?label_name[]=wave::4`

## Out Of Scope (per ADR-1-14)

Medical-device modeling only. Automotive (ISO 26262) and aerospace (DO-178C) are explicitly out of scope.

## Do Not

- Start Wave 2 work until Wave 1 gate clears.
- Add UI work to Wave 1 / 2 / 3 epics.
- Author ontology content directly in YAML (use SysML).
- Import standard library symbols outside `memo::base::stdlib::*` (per ADR-1-13).
EOF
)

if [[ "$APPLY" == "1" ]]; then
  EXISTING=$(glab issue list -R "$REPO" --search "Roadmap Overview" --per-page 5 2>/dev/null | awk '/Roadmap Overview/ {print $1; exit}' | tr -d '#')
  if [[ -n "$EXISTING" ]]; then
    echo "Roadmap Overview issue exists at #$EXISTING — leaving untouched."
  else
    OVERVIEW_TMP=$(mktemp)
    printf '%s\n' "$OVERVIEW_BODY" > "$OVERVIEW_TMP"
    glab issue create -R "$REPO" \
      --title "$OVERVIEW_TITLE" \
      --description "$(cat "$OVERVIEW_TMP")" \
      --no-editor
    rm -f "$OVERVIEW_TMP"
  fi
else
  echo "DRYRUN  would create issue \"$OVERVIEW_TITLE\" with full wave overview body"
fi

echo ""
echo "Done. APPLY=$APPLY"
[[ "$APPLY" == "1" ]] || echo "Re-run with MIGRATE_APPLY=1 to execute."
echo ""
echo "After apply: pin the Roadmap Overview issue at"
echo "  https://gitlab.com/$REPO/-/issues"
echo "via Issue → ⋮ → Pin issue (manual step; no API for pinning)."
