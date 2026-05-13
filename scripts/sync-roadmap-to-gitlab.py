#!/usr/bin/env python3
"""Sync docs/roadmap/epic-*.md + index.md to GitLab issues.

GitLab is source of truth. md files are the staging ground that we now
push up and (separately) delete. Existing issues with matching title
prefix get their description rewritten. Missing epics/stories get
created. Closed-milestone provenance is appended where applicable.

Dry-run by default. Set MEMO_SYNC_APPLY=1 to execute writes.

Usage:
  python3 scripts/sync-roadmap-to-gitlab.py          # dry-run report
  MEMO_SYNC_APPLY=1 python3 scripts/sync-roadmap-to-gitlab.py
"""
from __future__ import annotations
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

REPO = "somesh_sandbox/memo"
REPO_ENC = "somesh_sandbox%2Fmemo"
ROADMAP_DIR = Path("docs/roadmap")
APPLY = os.environ.get("MEMO_SYNC_APPLY") == "1"

EPIC_ORDER: dict[str, tuple[int, int]] = {
    "k": (1, 1), "dd": (1, 2), "t": (1, 3), "b": (1, 4), "m": (1, 5),
    "c": (1, 6), "d": (1, 7), "e": (1, 8), "n": (1, 9),
    "f": (2, 1), "g": (2, 2), "h": (2, 3), "r": (2, 4), "bb": (2, 5), "u": (2, 6),
    "i": (3, 1), "s": (3, 2), "q": (3, 3), "cc": (3, 4),
    "a": (4, 1), "o": (4, 2), "p": (4, 3), "v": (4, 4), "x": (4, 5),
    "w": (4, 6), "y": (4, 7), "z": (4, 8), "aa": (4, 9), "j": (4, 10), "l": (4, 11),
}

PROVENANCE: dict[str, list[str]] = {
    "t": ["W1.P0 Physical separation", "W1.P-FB Sysand integration + reclassification"],
    "m": ["W2.P7 SysML compat + builder ports"],
    "n": ["W2.P6 Consistency rules"],
    "bb": ["W1.P-EX Examples cleanup"],
    "u": ["W2.P-IMPORT Imports + LSP"],
    "s": ["W2.P11 CLI parity audit + JSON/JUnit"],
    "q": ["W2.P9 DHF compiler descriptor-driven"],
    "cc": ["W1.P-DOC.1 Docs for W1", "W2.P-DOC.2 Docs for W2", "W3.P-DOC.3 Docs for W3"],
    "o": ["W3.P4 Renderer Dispatcher"],
    "v": ["W3.P-MOD Module + flag infrastructure"],
    "x": ["W3.P8 Medical-specific renderers", "W3.P-MEDWB Medical workbenches"],
    "w": ["W3.P-TOOL Tool modules"],
    "y": ["W3.P-SCEN Scenario editor + diff"],
    "z": ["W3.P-COMM Plugin system + libs + domains"],
    "aa": ["W3.P-MIRO Miro-like canvas engine"],
}


def glab_api(method: str, path: str, payload: Optional[dict] = None) -> dict | list:
    import tempfile
    args = ["glab", "api", "-X", method, path]
    tmp_files: list[str] = []
    if payload:
        for k, v in payload.items():
            if isinstance(v, str) and ("\n" in v or len(v) > 500):
                t = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
                t.write(v)
                t.close()
                tmp_files.append(t.name)
                # `-F` (--field) supports @file expansion; `-f` (--raw-field) does NOT.
                args += ["-F", f"{k}=@{t.name}"]
            else:
                args += ["-f", f"{k}={v}"]
    try:
        proc = subprocess.run(args, capture_output=True, text=True, check=False)
    finally:
        for p in tmp_files:
            try: os.unlink(p)
            except OSError: pass
    if proc.returncode != 0:
        raise RuntimeError(f"glab api {method} {path} failed: {proc.stderr}")
    return json.loads(proc.stdout) if proc.stdout.strip() else {}


def list_existing_issues() -> dict[str, int]:
    """Return map of title-prefix `[Wx.yy.NN]` → iid."""
    out: dict[str, int] = {}
    page = 1
    while True:
        data = glab_api("GET", f"/projects/{REPO_ENC}/issues?state=all&per_page=100&page={page}")
        assert isinstance(data, list)
        if not data:
            break
        for issue in data:
            title: str = issue["title"]
            m = re.match(r"^(\[W\d+\.\d+\.\d+\])", title)
            if m:
                out[m.group(1)] = issue["iid"]
        if len(data) < 100:
            break
        page += 1
    return out


def parse_epic_md(letter: str, path: Path) -> tuple[str, str, list[tuple[str, str, str]]]:
    """Return (epic_title_after_prefix, full_body, [(story_code, story_title, story_body)])."""
    text = path.read_text()
    first = text.splitlines()[0]
    m = re.match(r"^#\s+Epic\s+([A-Z]+):\s*(.+)$", first)
    if not m:
        raise RuntimeError(f"{path}: missing `# Epic X: name` header")
    epic_letter = m.group(1)
    epic_name = m.group(2).strip()
    epic_title = f"Epic {epic_letter}: {epic_name}"

    # Stories: sections starting `### <CODE> <title>` where CODE = <letters>-<digits>
    stories: list[tuple[str, str, str]] = []
    lines = text.splitlines()
    n = len(lines)
    i = 0
    while i < n:
        sm = re.match(r"^###\s+([A-Z]+-\d+)\s+(.+)$", lines[i])
        if sm:
            code, story_title = sm.group(1), sm.group(2).strip()
            j = i + 1
            while j < n:
                if re.match(r"^###\s+[A-Z]+-\d+\s+", lines[j]):
                    break
                if re.match(r"^##\s+Epic Exit", lines[j]):
                    break
                if re.match(r"^##\s+GitLab Source Issues", lines[j]):
                    break
                j += 1
            body = "\n".join(lines[i + 1 : j]).strip()
            stories.append((code, story_title, body))
            i = j
        else:
            i += 1
    return epic_title, text, stories


def epic_description(letter: str, md_body: str) -> str:
    parts = [md_body.rstrip()]
    if letter in PROVENANCE:
        parts.append("")
        parts.append("---")
        parts.append("**Closed-milestone provenance** (predecessor work, now closed):")
        for ms in PROVENANCE[letter]:
            parts.append(f"- {ms}")
    parts.append("")
    parts.append("_Synced from `docs/roadmap/epic-" + letter + ".md` (now deleted; GitLab is canonical)._")
    return "\n".join(parts)


def story_description(letter: str, code: str, title: str, body: str, parent_iid: Optional[int]) -> str:
    parts = [f"Parent: Epic {letter.upper()}"]
    if parent_iid:
        parts.append(f"Parent issue: #{parent_iid}")
    parts.append("")
    parts.append(f"### {code} {title}")
    parts.append("")
    parts.append(body if body else "_(no detail in source md)_")
    parts.append("")
    parts.append(f"_Synced from `docs/roadmap/epic-{letter}.md` (now deleted; GitLab is canonical)._")
    return "\n".join(parts)


def ensure_issue(prefix: str, title: str, description: str, existing: dict[str, int]) -> int:
    """Create or update by title prefix. Returns iid."""
    full_title = f"{prefix} {title}"
    iid = existing.get(prefix)
    if iid is not None:
        print(f"  UPDATE #{iid:4d}  {prefix} {title[:60]}")
        if APPLY:
            glab_api("PUT", f"/projects/{REPO_ENC}/issues/{iid}", {"description": description, "title": full_title})
        return iid
    print(f"  CREATE         {prefix} {title[:60]}")
    if APPLY:
        result = glab_api("POST", f"/projects/{REPO_ENC}/issues", {"title": full_title, "description": description})
        assert isinstance(result, dict)
        new_iid = int(result["iid"])
        existing[prefix] = new_iid
        return new_iid
    return -1


def main() -> int:
    if not APPLY:
        print("=== DRY RUN === (set MEMO_SYNC_APPLY=1 to execute)")
    else:
        print("=== APPLY MODE === (writing to GitLab)")
    print(f"Repo: {REPO}")
    print()

    existing = list_existing_issues()
    print(f"Existing roadmap-prefixed issues: {len(existing)}")
    print()

    # 1. Roadmap overview → #367
    overview_path = ROADMAP_DIR / "index.md"
    if overview_path.exists():
        overview_body = overview_path.read_text().rstrip() + "\n\n_Synced from `docs/roadmap/index.md` (now deleted; GitLab is canonical)._"
        print("Roadmap Overview:")
        ensure_issue("[W0.00.00]", "Roadmap Overview — Waves 1–4 (read this first)", overview_body, existing)
        print()

    # 2. Epics + their stories
    for letter, (wave, seq) in sorted(EPIC_ORDER.items(), key=lambda kv: kv[1]):
        path = ROADMAP_DIR / f"epic-{letter}.md"
        if not path.exists():
            print(f"SKIP epic-{letter}.md missing")
            continue
        epic_title, full_body, stories = parse_epic_md(letter, path)
        prefix = f"[W{wave}.{seq:02d}.00]"
        print(f"Epic {letter.upper()} ({prefix}) — {len(stories)} stories")
        parent_iid = ensure_issue(prefix, epic_title, epic_description(letter, full_body), existing)
        for idx, (code, story_title, story_body) in enumerate(stories, start=1):
            sprefix = f"[W{wave}.{seq:02d}.{idx:02d}]"
            full_title = f"{code} {story_title}"
            ensure_issue(sprefix, full_title, story_description(letter, code, story_title, story_body, parent_iid if parent_iid > 0 else None), existing)
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
