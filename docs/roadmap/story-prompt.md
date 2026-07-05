# Story Execution Prompt

Reusable prompt for asking Claude (or any LLM agent) to execute one roadmap story.

## How To Use

Replace `<STORY>` with the story identifier (e.g. `B-2`, `K-1`, `[W1.04.02]`, or the GitLab issue number `#326`). Paste the prompt to the agent.

---

## Prompt Template

```
Execute roadmap story <STORY> on the currently checked-out branch.

Pre-reads (only what the story actually needs):
1. The GitLab issue body: `glab issue view <iid> -R somesh_sandbox/memo`.
2. The parent epic issue if its body is not echoed in the story body.
3. Any ADR the story references (e.g. ADR-1-12, ADR-1-13, ADR-1-14 for Wave 1 SysML edits).
4. CLAUDE.md is auto-injected — do not re-read.

Pre-checks before any code change:
- Wave gate is enforced by title-prefix order; `./scripts/list-roadmap.sh next` returns the eligible story.
- Verify baseline: `pnpm run build && pnpm run test` green.
- Classify the story (per docs/LLM.md "Story Type Classification" section), preferring the `Story Types:` line on the parent epic issue:
  - Architecture-required: write or update an ADR in docs/decisions/adr/. Land ADR before coding.
  - Design-required: write a short design note in docs/design/<topic>.md. Land doc before coding.
  - Implementation: code directly.
  - Documentation: code-free PR.
  Record the classification in the final commit message.

Execute:
- Stay strictly within the story's acceptance criterion. No scope creep.
- Run tests after each logical change.
- For Wave 1 SysML edits: imports go through memo::core::stdlib::* only (per ADR-1-13). Filenames are snake_case (per ADR-1-12). Standard SysML v2 syntax only — no Langium-only shorthand.

Verify:
- `pnpm run build && pnpm run test`
- If CLI/builder touched: `cd examples/gpca-pump && memo dev` (smoke check).
- If Wave 1 SysML touched: `sysand build` (Epic T) clean; SysON import smoke (Epic DD-3) when those gates exist.

Close the story:
- Commit: "<W>.<E>.<S>: <short summary> (#<issue>)" with body noting type (arch/design/impl/docs) and any ADR / design-note link.
- `glab issue close -R somesh_sandbox/memo <issue>`
- If the story exposed something the GitLab issue body should record (completed acceptance, new follow-up note), update the issue body via `glab issue update`.

Stop conditions (report and ask before continuing):
- Pre-check fails.
- Story turns out to need Architecture or Design pre-step that wasn't anticipated.
- Acceptance criterion is ambiguous; story body is silent on a key choice.
- Touching code outside the story scope appears unavoidable.
```

---

## Variants

### Pure inspection (no code)

Drop steps after "Pre-checks". End with:

```
Then report:
- Story classification (arch / design / impl / docs).
- Files you'd touch.
- Any ADR or design note required first.
- Open questions for me before you'd start.
```

### Story chain (one whole epic)

Replace `<STORY>` with the epic id (e.g. `Epic K`). Add:

```
Execute every open story in this epic in their numeric order. After each
story closes, re-run pnpm run build && pnpm run test before starting the
next. Stop and report between stories of different types (e.g. don't
auto-chain from a Design story into an Implementation story without
showing me the design note first).
```

### Auto-pick next story (generic)

Use when you don't know the next story id — let the agent pick from live GitLab state and confirm before working.

Optimized for low round-trips: rely on `list-roadmap.sh next` (which
already enforces title-prefix order = wave gate) and on the epic
file's own type declaration. CLAUDE.md is auto-injected; do NOT
re-read it. Skip baseline check until after user confirms.

```
Pick next roadmap story on branch <BRANCH or main>.

Pick + report (no edits, no baseline yet):
1. ./scripts/list-roadmap.sh next  → gives single next-eligible story.
   If empty: report "no open next item" and stop.
2. `glab issue view <iid> -R somesh_sandbox/memo` for the story body.
   If the body references the parent epic, fetch the epic issue too.
   Read any ADR the body names.
3. Report:
   - Story id, issue #, title.
   - Type: use the parent-epic issue's declared "Story Types:" line if
     present; otherwise classify per docs/LLM.md table.
   - Required ADR / design note pre-step, if any.
   - Files you expect to touch (best-effort).
   - At most ONE open question if the acceptance criterion is
     ambiguous; otherwise omit.
4. End with literal line: "Proceed? (yes / pick different / abort)"
5. STOP. Wait for explicit "yes".

After confirmation, switch to the standard Story Execution Prompt
flow: verify baseline (`pnpm run build && pnpm run test`), pre-step
ADR/design note if required, implement, verify, commit on the
working branch, close issue.
```

Notes on what NOT to do in pick phase:
- Don't run `pnpm run roadmap` (summary view, zero signal for picking).
- Don't run `glab issue list` (duplicates `list-roadmap.sh next`).
- Don't run baseline build/test before user confirms — wasted minutes if they pick different / abort.
- Don't re-read CLAUDE.md, LLM.md, platform.md, decisions/index.md
  unless the chosen story's acceptance text references them.
- Don't look for `docs/roadmap/epic-*.md` — those files were removed. Story body is in GitLab.

### Wave gate verification

```
Audit Wave <N> readiness for closure. Confirm:
- Every Wave <N> story issue closed in GitLab.
- Wave <N> exit criteria from issue #367 (Roadmap Overview) "Wave Gates" section met.
- No regressions in pnpm run build && pnpm run test.
- For Wave 1: sysand build clean and SysON imports the .kpar.
Report findings as a checklist; do not change code.
```
