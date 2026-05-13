# Story Execution Prompt

Reusable prompt for asking Claude (or any LLM agent) to execute one roadmap story.

## How To Use

Replace `<STORY>` with the story identifier (e.g. `B-2`, `K-1`, `[W1.04.02]`, or the GitLab issue number `#326`). Paste the prompt to the agent.

---

## Prompt Template

```
Execute roadmap story <STORY> on branch main.

Mandatory pre-reads (in this order):
1. CLAUDE.md (project overview + commit policy: trunk-based, commit to main).
2. docs/LLM.md (load order, story execution protocol, story-type table).
3. docs/architecture/platform.md (canonical architecture).
4. docs/decisions/index.md and any ADR referenced by the story (esp. ADR-1-12, ADR-1-13, ADR-1-14 for Wave 1 SysML edits).
5. docs/roadmap/epic-<id>.md for the full epic + the specific story description.
6. Run `pnpm run roadmap` to confirm live GitLab state.

Pre-checks before any code change:
- Verify wave gate: previous wave's stories all closed (do not start Wave N+1 work until Wave N is fully closed).
- Verify baseline: pnpm run build && pnpm run test green.
- Classify the story (per docs/LLM.md "Story Type Classification" section):
  - Architecture-required: write or update an ADR in docs/decisions/adr/. Land ADR before coding.
  - Design-required: write a short design note in docs/design/<topic>.md. Land doc before coding.
  - Implementation: code directly.
  - Documentation: code-free PR.
  Record the classification in your final commit message.

Execute:
- Stay strictly within the story's acceptance criterion. No scope creep.
- Run tests after each logical change.
- For Wave 1 SysML edits: imports go through memo::base::stdlib::* only (per ADR-1-13). Filenames are snake_case (per ADR-1-12). Standard SysML v2 syntax only — no Langium-only shorthand.

Verify:
- pnpm run build && pnpm run test
- If CLI/builder touched: cd examples/gpca-pump && memo dev (smoke check).
- If Wave 1 SysML touched: sysand build (Epic T) clean; SysON import smoke (Epic DD-3) when those gates exist.

Close the story:
- Commit on main: "<W>.<E>.<S>: <short summary> (#<issue>)" with body noting type (arch/design/impl/docs) and any ADR / design-note link.
- glab issue close -R somesh_sandbox/memo <issue>
- If the story exposed something the epic file should record (completed acceptance, new follow-up note), update docs/roadmap/epic-<id>.md.

Stop conditions (report and ask before continuing):
- Pre-check fails.
- Story turns out to need Architecture or Design pre-step that wasn't anticipated.
- Acceptance criterion is ambiguous; story description is silent on a key choice.
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

```
Pick and execute the next roadmap story on branch <BRANCH or main>.

Discovery (do this first, do not edit anything yet):
1. Read CLAUDE.md, docs/LLM.md, docs/architecture/platform.md,
   docs/decisions/index.md, docs/roadmap/index.md.
2. Run `pnpm run roadmap` and `./scripts/list-roadmap.sh stories`
   to enumerate open stories in title-prefix order.
3. Cross-check with `glab issue list -R somesh_sandbox/memo --per-page 100`.
4. Verify wave gate: do not propose a Wave N+1 story unless every
   Wave N story is closed. Within a wave, the lowest open
   `[W<wave>.<epic_seq>.<story_idx>]` is next unless it depends on
   another open story (read the epic file to confirm).
5. Verify baseline: `pnpm run build && pnpm run test`. If red,
   propose fixing the baseline first instead.
6. If no open story exists at all, stop and report "no open next
   item". Do not invent work.

Report to user, then STOP and wait for explicit confirmation:
- Story id, GitLab issue number, title, wave, epic.
- Story type classification (arch / design / impl / docs) and
  reasoning.
- Required ADR or design note pre-step, if any.
- Files you expect to touch (best-effort list).
- Baseline status (green / red + summary).
- Any open questions or ambiguities in the acceptance criterion.

End the report with the literal line:
  "Proceed? (yes / pick different / abort)"

Wait for the user's reply. Do not start editing until they reply
"yes" (or equivalent). If they pick a different story, restart
this prompt with that id via the standard Story Execution Prompt
template above. If they abort, stop cleanly.

After confirmation:
- Switch to the standard Story Execution Prompt flow for the
  confirmed story id (pre-step ADR/design note if required,
  implement, verify, commit, close issue, push only if the user
  asked you to push beyond the initial branch push).
```

### Wave gate verification

```
Audit Wave <N> readiness for closure. Confirm:
- Every Wave <N> story issue closed in GitLab.
- Wave <N> exit criteria from docs/roadmap/index.md "Wave Gates" section met.
- No regressions in pnpm run build && pnpm run test.
- For Wave 1: sysand build clean and SysON imports the .kpar.
Report findings as a checklist; do not change code.
```
