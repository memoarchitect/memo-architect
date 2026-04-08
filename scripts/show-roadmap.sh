#!/usr/bin/env bash
# show-roadmap.sh — Query GitLab live and display roadmap
# Usage: pnpm run roadmap [--open|--done|--bugs|--phase <slug>]
# Requires: glab CLI authenticated to gitlab.com
#
# GitLab is the single source of truth. No local cache files.
set -euo pipefail

PROJECT_ENCODED="somesh_sandbox%2Fmemo"
PHASE=""
MODE="summary"

while [[ $# -gt 0 ]]; do
  case $1 in
    --phase|-p)  PHASE="$(echo "$2" | tr '[:upper:]' '[:lower:]')"; shift 2 ;;
    --open)      MODE="open";    shift ;;
    --done)      MODE="done";    shift ;;
    --bugs)      MODE="bugs";    shift ;;
    *)           shift ;;
  esac
done

# ── Fetch from GitLab API ────────────────────────────────────────────
fetch_issues() {
  local state="${1:-opened}"
  local all="[]"
  local page=1
  while true; do
    local page_json
    page_json=$(glab api "projects/$PROJECT_ENCODED/issues?state=$state&per_page=100&page=$page" 2>/dev/null || echo "[]")
    local count
    count=$(echo "$page_json" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    [ "$count" -eq 0 ] && break
    all=$(python3 -c "import sys,json; print(json.dumps(json.loads(sys.argv[1])+json.loads(sys.argv[2])))" "$all" "$page_json")
    [ "$count" -lt 100 ] && break
    page=$((page + 1))
  done
  echo "$all"
}

MILESTONES_JSON=$(glab api "projects/$PROJECT_ENCODED/milestones?state=active&per_page=100" 2>/dev/null || echo "[]")

if [ "$MODE" = "done" ]; then
  ISSUES_JSON=$(fetch_issues "closed")
else
  ISSUES_JSON=$(fetch_issues "opened")
fi

# ── Render via Python ────────────────────────────────────────────────
python3 - "$MODE" "$PHASE" "$MILESTONES_JSON" "$ISSUES_JSON" << 'PYEOF'
import sys, json, re

mode = sys.argv[1]
phase_filter = sys.argv[2]
milestones = json.loads(sys.argv[3])
issues = json.loads(sys.argv[4])

ms_by_id = {m["id"]: m for m in milestones}
issues_by_ms = {}
issues_no_ms = []
for iss in issues:
    ms = iss.get("milestone")
    if ms and ms["id"] in ms_by_id:
        issues_by_ms.setdefault(ms["id"], []).append(iss)
    else:
        issues_no_ms.append(iss)
for ms_id in issues_by_ms:
    issues_by_ms[ms_id].sort(key=lambda i: i["iid"])

def phase_slug(title):
    m = re.match(r"Phase\s+([A-Za-z0-9]+)", title)
    if m: return m.group(1).lower()
    m = re.match(r"(M\d+):", title)
    if m: return m.group(1).lower()
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:30]

def priority_key(desc):
    if not desc: return 99
    m = re.search(r"\**(P\d)\**", desc)
    if m: return int(m.group(1)[1])
    if "CRITICAL" in (desc or "").upper(): return 0
    return 99

def short_desc(desc):
    if not desc: return ""
    for line in desc.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"): continue
        line = re.sub(r"\*+", "", line)
        return line[:100] + ("..." if len(line) > 100 else "")
    return ""

phase_ms = [(phase_slug(m["title"]), m) for m in milestones if m["title"].startswith("Phase ")]
legacy_ms = [(phase_slug(m["title"]), m) for m in milestones if not m["title"].startswith("Phase ")]
phase_ms.sort(key=lambda x: (priority_key(x[1].get("description", "")), x[0]))
legacy_ms.sort(key=lambda x: x[0])

# ── Single phase detail ─────────────────────────────────────────────
if phase_filter:
    found = None
    for slug, m in phase_ms + legacy_ms:
        if slug == phase_filter:
            found = m; break
    if not found:
        slugs = [s for s, _ in phase_ms + legacy_ms]
        print(f"  Phase '{phase_filter}' not found. Available: {' '.join(slugs)}")
        sys.exit(1)

    ms_issues = issues_by_ms.get(found["id"], [])
    print(f"\n  {found['title']}")
    print(f"  {'─' * len(found['title'])}")
    desc = short_desc(found.get("description", ""))
    if desc: print(f"  {desc}")
    print(f"\n  Issues: {len(ms_issues)}\n")
    for iss in ms_issues:
        labels = ", ".join(l for l in iss.get("labels", []) if not l.startswith("priority::"))
        print(f"    #{iss['iid']:<6} {iss['title']}")
        if labels: print(f"           {labels}")
    if not ms_issues: print("    (no open issues)")
    print()
    sys.exit(0)

# ── Bugs mode ────────────────────────────────────────────────────────
if mode == "bugs":
    bug_issues = [i for i in issues if "bug" in i.get("labels", []) or "type::fix" in i.get("labels", [])]
    bug_issues.sort(key=lambda i: i["iid"])
    print("\n  Open Bugs\n  " + "─" * 50 + "\n")
    for iss in bug_issues:
        ms_title = iss["milestone"]["title"] if iss.get("milestone") else "—"
        print(f"    #{iss['iid']:<6} {iss['title']}")
        print(f"           {ms_title}")
    if not bug_issues: print("    (no open bugs)")
    print(f"\n  Total: {len(bug_issues)}\n")
    sys.exit(0)

# ── Summary mode ─────────────────────────────────────────────────────
if mode == "summary":
    print()
    print("  ═══════════════════════════════════════════════════")
    print("  MEMO Roadmap (live from GitLab)")
    print("  ═══════════════════════════════════════════════════")
    print()
    print(f"  {'Phase':<8} {'Issues':>6}   Focus")
    print(f"  {'──────':<8} {'──────':>6}   {'─' * 42}")
    for slug, m in phase_ms:
        count = len(issues_by_ms.get(m["id"], []))
        focus = m["title"].split(":", 1)[1].strip() if ":" in m["title"] else m["title"]
        if len(focus) > 50: focus = focus[:47] + "..."
        print(f"  {slug.upper():<8} {count:>6}   {focus}")

    if legacy_ms:
        print()
        print("  Other milestones:")
        for slug, m in legacy_ms:
            count = len(issues_by_ms.get(m["id"], []))
            print(f"    {m['title']:<50} ({count} issues)")

    total = len(issues)
    unassigned = len(issues_no_ms)
    print(f"\n  Total open: {total} | Unassigned: {unassigned}")
    print()
    print("  pnpm run roadmap:open          # issues by phase")
    print("  pnpm run roadmap:bugs          # open bugs")
    print("  pnpm run roadmap -- -p c2      # single phase")
    print()
    sys.exit(0)

# ── Open / Done mode ────────────────────────────────────────────────
label = "Open" if mode == "open" else "Closed"
print(f"\n  {label} Issues by Phase\n")

total = 0
for slug, m in phase_ms + legacy_ms:
    ms_issues = issues_by_ms.get(m["id"], [])
    if not ms_issues: continue
    print(f"  ─── {m['title']}")
    for iss in ms_issues:
        print(f"    #{iss['iid']:<6} {iss['title']}")
        total += 1
    print()

if issues_no_ms:
    print(f"  ─── (no milestone)")
    for iss in sorted(issues_no_ms, key=lambda i: i["iid"]):
        print(f"    #{iss['iid']:<6} {iss['title']}")
        total += 1
    print()

print(f"  Total {label.lower()}: {total}\n")
PYEOF
