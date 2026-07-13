# MEMO LLM Context

Use this as the small context pack for AI agents. Do not scan the whole repository first.

## Load In This Order

1. [README.md](README.md) for the documentation map.
2. [architecture/platform.md](architecture/platform.md) for the canonical architecture.
3. [decisions/index.md](decisions/index.md) for accepted and superseded ADRs. Pay special attention to:
   - **ADR-1-11** — single canonical `@memo/ontology`.
   - **ADR-1-12** — namespace canonicalization (`memo::core::*`, `memo::ontology::*`, `memo::methodology::*`); snake_case filenames; SysON / SysIDE / Sysand interop binding.
   - **ADR-1-13** — standard library import wrapper at `memo::core::stdlib::*`. Ontology + methodology files MUST NOT import kernel paths directly.
   - **ADR-1-14** — medical-only scope; out-of-tree `@memo/ext-*` packages under `memo::ontology::ext::*`. Automotive and aerospace are out of scope.
   - **ADR-1-17** — three-repo split, **implemented 2026-07-12**: content (`memo`) ◄ engine (`memo-tools`) ◄ web (`memo-architect` = THIS repo, engine stripped out). Each layer consumes the previous as a git submodule (`memo-tools` → nested `memo-tools/memo`). Public GitHub mirrors in the `memoarchitect` org use the same names.
4. [design/sysmlv2-rulebook.md](design/sysmlv2-rulebook.md) before editing `.sysml`.
5. GitLab issue [#367 "Roadmap Overview"](https://gitlab.com/somesh_sandbox/memo/-/issues/367) for the wave plan and epic index. Local `docs/roadmap/epic-*.md` and `docs/roadmap/index.md` have been removed — GitLab is the sole source of truth for roadmap content.

## Roadmap Structure

30 epics in 4 sequenced waves. Authoring order is **SysML-first → CLI-second → UI-last**:

- **Wave 1** — SysML foundation (text editor + `.sysml` only). Epics K, DD, T, B, M, C, D, E, N.
- **Wave 2** — Methodology in SysML. Epics F, G, H, R, BB, U.
- **Wave 3** — CLI surface. Epics I, S, Q, CC.
- **Wave 4** — UI thin wrapper. Epics A, O, P, V, X, W, Y, Z, AA, J, L.

Wave gates are binding. Do not start Wave N+1 work until the Wave N gate clears.

## GitLab Mapping

- Each epic = parent work item (Issue type). Each story = child work item (Task type).
- Order in GitLab is encoded in the **title prefix** `[W<wave>.<epic_seq>.<story_idx>]`. Sort issues by **Title ascending** to reproduce roadmap order.
  - `[W0.00.00]` — Roadmap Overview ([#367](https://gitlab.com/somesh_sandbox/memo/-/issues/367))
  - `[W1.01.00]` — Epic K parent
  - `[W1.01.01]` — Story K-1
  - `[W4.11.03]` — Story L-3 (last item)
- Labels: `epic::A`–`epic::DD`, `wave::1`–`wave::4`, plus type/priority labels.
- Filter helpers in [scripts/list-roadmap.sh](../scripts/list-roadmap.sh).

GitLab Premium-only `weight` attribute is silently discarded on this project. Title prefix is the portable order mechanism.

## Story Type Classification

Before executing any story, classify it as one of:

| Type | When | Pre-step required |
|---|---|---|
| **Architecture** | Story requires a binding decision affecting >1 epic, or a public surface contract. | Write or update an ADR in `docs/decisions/adr/`. Land ADR before coding. |
| **Design** | Story requires an internal API, file layout, schema, or algorithm choice that downstream code will depend on. | Write a short design note (1 page) in `docs/design/<topic>.md`. Land doc before coding. |
| **Implementation** | Mechanical change against a known design / known ADR. | Code directly. Tests must precede or accompany the change. |
| **Documentation** | Doc-only change. No code. | Code-free PR. |

The GitLab issue description carries the story body, including any `Story Types:` declaration from the parent epic issue. If the issue is silent on type, classify during execution and record the classification in the commit message (`type: arch` / `type: design` / `type: impl` / `type: docs`).

## Story Execution Protocol

When asked to execute a specific story (e.g. "execute story B-2" or "execute story [W1.04.02]"):

1. **Read context** (this file already provides the load order).
2. **Run `pnpm run roadmap`** to confirm live GitLab state.
3. **Read the issue body**: `glab issue view <n> -R somesh_sandbox/memo` for full story description. Parent-epic body has epic-level scope and any closed-milestone provenance.
4. **Classify the story** per the table above. If Architecture or Design type, produce the ADR or design note FIRST.
5. **Verify baseline**: `pnpm run build && pnpm run test` must be green.
6. **Verify wave gate**: do not start a Wave N+1 story unless Wave N is fully closed (all child issues closed).
7. **Execute the story scope only**. No scope creep beyond the acceptance criterion.
8. **Verify**: `pnpm run build && pnpm run test`. For Wave 1 SysML changes: `sysand build` clean; SysON import smoke test (Epic DD).
9. **Commit on `main`** per CLAUDE.md (trunk-based). Reference issue: `[W<wave>.<seq>.<idx>] <summary> (#<issue>)`.
10. **Close the issue**: `glab issue close -R somesh_sandbox/memo <issue>`.
11. **Update epic file** if the story exposed something the file should record (e.g. completed acceptance check).

A reusable prompt template lives at [roadmap/story-prompt.md](roadmap/story-prompt.md).

## Use Only When Needed

- [architecture/reference/](architecture/reference/) for high-level architecture reference details.
- [design/](design/README.md) for runtime design, protocols, and authoring specifics.
- [decisions/adr/](decisions/adr/) for individual ADR text.
- [generated/requirements/](generated/requirements/) for generated traceability baselines.
- `docs/src/` for published user/developer docs.
- [scripts/migrate-roadmap-to-epics.sh](../scripts/migrate-roadmap-to-epics.sh) for the legacy-issue migration logic. Idempotent. Re-run safely.

## Do Not Treat As Planning Sources

- `docs/dist/` is built site output.
- `docs/generated/` is generated/reference material.
- Old W1/W2/W3 GitLab milestones are closed and have no current authority.

## Update Rules

- Architecture changes go to [architecture/platform.md](architecture/platform.md) or a new ADR.
- Roadmap scope changes update the relevant GitLab issue body directly (epic parent or story). The Roadmap Overview issue [#367](https://gitlab.com/somesh_sandbox/memo/-/issues/367) holds the wave plan.
- New ADRs increment the highest existing number; supersede instead of rewriting.
- Avoid duplicate plan files. Prefer updating the canonical doc and linking from indexes.
- Standard SysML v2 conformance is binding (per ADR-1-12). Do not introduce Langium-only shorthand outside the grammar package itself.
- Standard library symbols MUST be imported via `memo::core::stdlib::*` (per ADR-1-13).
- Filenames are snake_case; hyphens forbidden in path segments (per ADR-1-12).
