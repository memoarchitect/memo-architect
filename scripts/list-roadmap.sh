#!/usr/bin/env bash
# List MEMO roadmap items from GitLab in roadmap order (title-prefix sorted).
#
# Subcommands:
#   epics           — open epic PARENTS only (titles like [Wn.nn.00])
#   stories         — open STORIES only (titles like [Wn.nn.NN] where NN > 00)
#   all             — open epics + stories together (full roadmap)
#   wave <N>        — every open item in wave N (epic parents + their stories)
#   epic <ID>       — every open item under epic <ID> (parent + stories)
#   next            — single next-eligible story (lowest open story in lowest open wave)
#   closed          — closed roadmap items (recently completed)
#
# Examples:
#   ./scripts/list-roadmap.sh epics
#   ./scripts/list-roadmap.sh stories
#   ./scripts/list-roadmap.sh wave 1
#   ./scripts/list-roadmap.sh epic K

set -euo pipefail

REPO_ENC="somesh_sandbox%2Fmemo-architect"
CMD="${1:-all}"

fetch() {
  local state="${1:-opened}"
  glab api "projects/${REPO_ENC}/issues?state=${state}&per_page=100" --paginate
}

format() {
  jq -r '.[] | "#\(.iid)\t\(.title)"' | sort -t$'\t' -k2
}

case "$CMD" in
  epics)
    fetch opened \
      | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.00\\] ")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  stories)
    fetch opened \
      | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.(0[1-9]|[1-9][0-9])\\] ")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  all)
    fetch opened \
      | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.[0-9]+\\] ")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  wave)
    N="${2:?wave number required: ./list-roadmap.sh wave 1}"
    fetch opened \
      | jq -r --arg n "$N" '.[] | select(.title | test("^\\[W" + $n + "\\.")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  epic)
    ID="${2:?epic id required: ./list-roadmap.sh epic K}"
    # Match by epic letter in the title body (after the bracket prefix).
    fetch opened \
      | jq -r --arg e "$ID" '
          .[]
          | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.[0-9]+\\] (Epic " + $e + ":|" + $e + "-)"))
          | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  next)
    # Pick lowest-titled open story whose wave has no earlier open story.
    # Title-prefix sort ([Wn.nn.NN]) is the canonical roadmap order, so
    # the very first open story line IS the next-eligible item.
    fetch opened \
      | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.(0[1-9]|[1-9][0-9])\\] ")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2 \
      | head -1
    ;;
  closed)
    fetch closed \
      | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.[0-9]+\\] ")) | "#\(.iid)\t\(.title)"' \
      | sort -t$'\t' -k2
    ;;
  *)
    echo "Usage: $0 {epics|stories|all|wave <N>|epic <ID>|next|closed}" >&2
    exit 2
    ;;
esac
