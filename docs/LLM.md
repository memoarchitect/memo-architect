# MEMO LLM Context

Use this as the small context pack for AI agents. Do not scan the whole repository first.

## Load In This Order

1. [README.md](README.md) for the documentation map.
2. [architecture/platform.md](architecture/platform.md) for the canonical architecture.
3. [decisions/index.md](decisions/index.md) for accepted and superseded ADRs. Pay special attention to:
   - **ADR-1-11** — single canonical `@memo/ontology`.
   - **ADR-1-12** — namespace canonicalization (`memo::base::*`, `memo::ontology::*`, `memo::methodology::*`); snake_case filenames; SysON / SysIDE / Sysand interop binding.
   - **ADR-1-13** — standard library import wrapper at `memo::base::stdlib::*`. Ontology + methodology files MUST NOT import kernel paths directly.
   - **ADR-1-14** — medical-only scope; out-of-tree `@memo/ext-*` packages under `memo::ontology::ext::*`. Automotive and aerospace are out of scope.
4. [design/sysmlv2-rulebook.md](design/sysmlv2-rulebook.md) before editing `.sysml`.
5. [roadmap/index.md](roadmap/index.md) for incremental implementation epics and stories.

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

Story files in `docs/roadmap/epic-*.md` SHOULD declare the type per story. If a story file is silent, classify it during execution and record the classification in the commit message (`type: arch` / `type: design` / `type: impl` / `type: docs`).

## Story Execution Protocol

When asked to execute a specific story (e.g. "execute story B-2" or "execute story [W1.04.02]"):

1. **Read context** (this file already provides the load order).
2. **Run `pnpm run roadmap`** to confirm live GitLab state.
3. **Read the epic file**: `docs/roadmap/epic-<id>.md` for full story description.
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
- Roadmap scope changes update [roadmap/index.md](roadmap/index.md) and the relevant epic file.
- New ADRs increment the highest existing number; supersede instead of rewriting.
- Avoid duplicate plan files. Prefer updating the canonical doc and linking from indexes.
- Standard SysML v2 conformance is binding (per ADR-1-12). Do not introduce Langium-only shorthand outside the grammar package itself.
- Standard library symbols MUST be imported via `memo::base::stdlib::*` (per ADR-1-13).
- Filenames are snake_case; hyphens forbidden in path segments (per ADR-1-12).
