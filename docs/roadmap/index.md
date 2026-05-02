# MEMO Roadmap

This folder owns the implementation roadmap. The architecture target lives in [../architecture/platform.md](../architecture/platform.md); namespace canonicalization in [ADR-1-12](../decisions/adr/ADR-1-12-namespace-canonicalization.md); standard library wrapper in [ADR-1-13](../decisions/adr/ADR-1-13-sysml-library-import-wrapper.md); medical-only extension policy in [ADR-1-14](../decisions/adr/ADR-1-14-extension-package-policy.md). This roadmap turns the architecture into executable epics and numbered stories.

## Authoring Order Of Priority

The execution order below reflects the **SysML-first, CLI-second, UI-last** policy:

1. **Wave 1 — SysML foundation.** Standard-conformant grammar, ports/interfaces, sysand packaging, dimension helpers, ontology kinds. Authoring is via text editor + `.sysml` files. No UI work.
2. **Wave 2 — Methodology in SysML.** Methodology scope, default + GPCA tailoring, archetypes, examples cleanup, importers writing `.sysml`. Still no UI work.
3. **Wave 3 — CLI surface.** Authoring CLI (`memo ontology add-kind`, `memo methodology drop-*`), DHF descriptor compiler, machine-readable output (`--format json|junit`), full docs.
4. **Wave 4 — UI thin wrapper.** Renderer dispatcher, four-tab shell, methodology IA tab, medical renderers, tool modules, plugin/canvas extras. Every UI action must wrap a CLI command — UI never owns truth.

Tools such as **SysON**, **SysIDE**, and **Sysand** must work with MEMO ontology and methodology packages without MEMO-specific tooling. Standard conformance is enforced by Epic DD as a CI gate.

## Naming

- Epics use alphabetic IDs: `A`, `B`, ..., `DD`.
- Stories use epic-local numeric IDs: `A-1`, ..., `DD-6`.
- Each epic file contains the stories for that epic.
- Each story is intended for one focused LLM coding session, ~30 minutes or less.

## GitLab Mapping

| Roadmap concept | GitLab concept |
|---|---|
| Epic | Parent work item (Issue type; API blocks Epic-type creation in this project) |
| Story | Child work item (Task type) |
| Order | **Title prefix** `[W<wave>.<epic_seq>.<story_idx>]` — alphabetic title sort = roadmap order |
| Wave | Label `wave::1`–`wave::4` (with descriptive `--description` per label) |
| Epic group | Label `epic::A`–`epic::DD` (with descriptive `--description` per label) |
| Roadmap overview | Pinned issue [#367](https://gitlab.com/somesh_sandbox/memo/-/issues/367) titled `[W0.00.00] Roadmap Overview ...` |

### Title Prefix Scheme

`[W<wave>.<epic_seq>.<story_idx>]` — three numeric segments, zero-padded.

- `wave` = 1..4
- `epic_seq` = 01..nn within wave
- `story_idx` = 00 for the epic parent issue, 01..nn for child stories

Examples:

| Item | Title |
|---|---|
| Roadmap Overview | `[W0.00.00] Roadmap Overview — Waves 1–4 (read this first)` |
| Epic K (Wave 1, seq 01) | `[W1.01.00] Epic K: Grammar Support` |
| Story K-1 | `[W1.01.01] K-1 Scope expression grammar decision` |
| Story K-2 | `[W1.01.02] K-2 View and presentation syntax gap check` |
| Epic DD (Wave 1, seq 02) | `[W1.02.00] Epic DD: SysML v2 Standard Conformance` |
| Epic F (Wave 2, seq 01) | `[W2.01.00] Epic F: Methodology Scope Expansion` |
| Story L-3 | `[W4.11.03] L-3 GitLab alignment checklist` |

To view ordered roadmap in GitLab issue list: sort by **Title ascending**.

GitLab Issue `weight` is GitLab Premium / Ultimate only; free tier silently discards weight. Title-prefix is the portable mechanism.

### Reserved Slots

Epics M–DD do not yet have GitLab parent issues. Their prefix slots are reserved:

- `[W1.02.*]` Epic DD (SysML standard conformance)
- `[W1.03.*]` Epic T (Sysand packaging)
- `[W1.05.*]` Epic M (Ports + interfaces)
- `[W1.09.*]` Epic N (Consistency rules in SysML)
- `[W2.04.*]` Epic R (Archetypes in SysML)
- `[W2.05.*]` Epic BB (Examples cleanup)
- `[W2.06.*]` Epic U (Imports + LSP)
- `[W3.02.*]` Epic S (CLI parity + machine output)
- `[W3.03.*]` Epic Q (DHF descriptor compiler)
- `[W3.04.*]` Epic CC (Documentation restructure)
- `[W4.02.*]` Epic O (Renderer dispatcher)
- `[W4.03.*]` Epic P (Four-tab shell)
- `[W4.04.*]` Epic V (Module + flag infra)
- `[W4.05.*]` Epic X (Medical renderers + workbenches)
- `[W4.06.*]` Epic W (Tool modules)
- `[W4.07.*]` Epic Y (Scenario editor + diff)
- `[W4.08.*]` Epic Z (Plugin system + extension pattern)
- `[W4.09.*]` Epic AA (Miro canvas engine)

GitLab milestones (timeboxes) are not used as roadmap hierarchy. Legacy milestones (`W1.P*`, `W2.P*`, `W3.P*`) are closed. Legacy issue migration + title prefixes + label setup + pinned Roadmap Overview issue are all applied by [scripts/migrate-roadmap-to-epics.sh](../../scripts/migrate-roadmap-to-epics.sh).

### Listing Roadmap Items From GitLab

Helper script [scripts/list-roadmap.sh](../../scripts/list-roadmap.sh) wraps the API + jq filters:

| Subcommand | What it lists |
|---|---|
| `./scripts/list-roadmap.sh epics` | Open epic parents only (titles ending `.00]`) |
| `./scripts/list-roadmap.sh stories` | Open stories only (titles ending `.NN]` where NN > 00) |
| `./scripts/list-roadmap.sh all` | Open epics + stories together (full roadmap) |
| `./scripts/list-roadmap.sh wave 1` | All open items in Wave 1 (parents + stories) |
| `./scripts/list-roadmap.sh epic K` | All open items under Epic K |
| `./scripts/list-roadmap.sh closed` | Closed roadmap items (recently completed) |

Output is sorted by title prefix → reproduces roadmap order.

Equivalent raw commands (without the script):

```bash
# Open epic parents only
glab api 'projects/somesh_sandbox%2Fmemo/issues?state=opened&per_page=100' --paginate \
  | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.00\\] ")) | "#\(.iid)\t\(.title)"' \
  | sort -t$'\t' -k2

# All open epics + stories
glab api 'projects/somesh_sandbox%2Fmemo/issues?state=opened&per_page=100' --paginate \
  | jq -r '.[] | select(.title | test("^\\[W[0-9]+\\.[0-9]+\\.[0-9]+\\] ")) | "#\(.iid)\t\(.title)"' \
  | sort -t$'\t' -k2

# Wave 2 only
glab api 'projects/somesh_sandbox%2Fmemo/issues?state=opened&per_page=100' --paginate \
  | jq -r '.[] | select(.title | test("^\\[W2\\.")) | "#\(.iid)\t\(.title)"' \
  | sort -t$'\t' -k2

# All open issues (raw, no roadmap filter — includes legacy)
glab issue list -R somesh_sandbox/memo --state opened --per-page 200
```

## Story Type Convention

Each epic file declares a `Story Types:` line under `Priority:` covering the dominant work type for stories in that epic. Per-story overrides go in the story body when needed. Categories:

- **Architecture** — story requires a binding decision affecting >1 epic or a public surface contract. Pre-step: write or update an ADR.
- **Design** — story requires an internal API, file layout, schema, or algorithm choice. Pre-step: write a short design note in `docs/design/<topic>.md`.
- **Implementation** — mechanical change against a known design / known ADR.
- **Documentation** — doc-only change. No code.

Refer to [LLM.md "Story Type Classification"](../LLM.md#story-type-classification) for the full table and the agent-facing rules.

## Rules

- Epic and story files in this folder are the authoritative roadmap. GitLab work items mirror them.
- Architecture changes update [../architecture/platform.md](../architecture/platform.md) or add an ADR. Execution sequencing changes update this roadmap.
- Wave order is binding: do not start Wave 2 work until Wave 1 builds green; same for 2→3 and 3→4.
- Within a wave, stories may run in parallel unless an epic-level dependency is listed.

## Epic Order

| # | Wave | Epic | File | P | Outcome |
|---:|---:|---|---|---|---|
|  1 | 1 | **K** Grammar gaps | [epic-k.md](epic-k.md) | P0 | Standard SysML v2 syntax (set diff, view def, ports) parses |
|  2 | 1 | **DD** SysML standard conformance + tool interop | [epic-dd.md](epic-dd.md) | P0 | SysON / SysIDE / Sysand round-trip the ontology |
|  3 | 1 | **T** Sysand packaging | [epic-t.md](epic-t.md) | P0 | `.project.json` + `.kpar` + lockfile |
|  4 | 1 | **B** L0 helpers | [epic-b.md](epic-b.md) | P0 | `memo::base::*` dimension + scope defs |
|  5 | 1 | **M** Ports + interfaces | [epic-m.md](epic-m.md) | P0 | `port def`, `interface def`, `connect`, builder ports |
|  6 | 1 | **C** Architecture sublayers | [epic-c.md](epic-c.md) | P0 | `memo::ontology::architecture::<layer>::*` |
|  7 | 1 | **D** Compliance dimension | [epic-d.md](epic-d.md) | P0 | `memo::ontology::compliance::<standard>::*` |
|  8 | 1 | **E** Artifact kinds | [epic-e.md](epic-e.md) | P0 | Concrete DHF document kinds |
|  9 | 1 | **N** Consistency rules in SysML | [epic-n.md](epic-n.md) | P0 | YAML rules → SysML; `memo rules` CLI |
| 10 | 2 | **F** Methodology scope filtering | [epic-f.md](epic-f.md) | P0 | Dimension ∩ scope helper (data layer only) |
| 11 | 2 | **G** Default methodology | [epic-g.md](epic-g.md) | P0 | `@memo/methodology-default` comprehensive |
| 12 | 2 | **H** GPCA tailoring | [epic-h.md](epic-h.md) | P0 | Subtraction example |
| 13 | 2 | **R** Archetypes in SysML | [epic-r.md](epic-r.md) | P0 | YAML profiles → `Archetype` parts |
| 14 | 2 | **BB** Examples cleanup | [epic-bb.md](epic-bb.md) | P1 | GPCA pump default; cyber 70→90% |
| 15 | 2 | **U** Imports + LSP | [epic-u.md](epic-u.md) | P2 | OWL/EA/Cameo/AADL importers; VS Code LS |
| 16 | 3 | **I** CLI authoring slices | [epic-i.md](epic-i.md) | P0 | `memo ontology add-kind`, `memo methodology drop-*` |
| 17 | 3 | **S** CLI parity + machine output | [epic-s.md](epic-s.md) | P1 | `--format json` / `junit`, CI templates |
| 18 | 3 | **Q** DHF descriptor compiler | [epic-q.md](epic-q.md) | P0 | Descriptor walk, `DocumentBackedView` adapters |
| 19 | 3 | **CC** Documentation restructure | [epic-cc.md](epic-cc.md) | P1 | Users vs Devs, full CLI manual, CI guide |
| 20 | 4 | **A** Methodology UI IA | [epic-a.md](epic-a.md) | P0 | Methodology tab primary; Ontology hidden |
| 21 | 4 | **O** Renderer dispatcher | [epic-o.md](epic-o.md) | P0 | `RendererPlan` + per-renderer modules |
| 22 | 4 | **P** Four-tab shell | [epic-p.md](epic-p.md) | P0 | Replace six-mode shell |
| 23 | 4 | **V** Module + flag infra | [epic-v.md](epic-v.md) | P2 | `FeatureModule` part-def, lazy loader, `memo features` |
| 24 | 4 | **X** Medical renderers + workbenches | [epic-x.md](epic-x.md) | P2 | Risk grid, bowtie, fault tree, workbenches |
| 25 | 4 | **W** Tool modules | [epic-w.md](epic-w.md) | P2 | DSM, FMEA, trace, coverage, lint, diff, ... (each wraps a CLI command) |
| 26 | 4 | **Y** Scenario editor + diff | [epic-y.md](epic-y.md) | P2 | Scenario branches, diff renderer |
| 27 | 4 | **Z** Plugin system + extension pattern | [epic-z.md](epic-z.md) | P3 | `@memo/plugin-api`; `@memo/lib-*`; out-of-tree `@memo/ext-*` (medical only) |
| 28 | 4 | **AA** Miro canvas engine | [epic-aa.md](epic-aa.md) | P3 | Free-form canvas; writes route through CLI |
| 29 | 4 | **J** Repo split prep | [epic-j.md](epic-j.md) | P1 | Boundary inventory; manifest cleanup; checklist |
| 30 | 4 | **L** Alignment + merge | [epic-l.md](epic-l.md) | P0 | Final doc/ADR/GitLab cleanup |

## Wave Gates

Each gate is binding. Do not start the next wave until the gate clears.

- **Gate 1 (after Wave 1):** `pnpm run build && pnpm run test` green; GPCA pump boots; `sysand build` produces a clean `.kpar`; SysON imports the `.kpar` without errors (Epic DD CI step).
- **Gate 2 (after Wave 2):** Default methodology and GPCA methodology both validate; `examples/gpca-pump` pins `@memo/methodology-gpca`; importers produce parser-valid SysML.
- **Gate 3 (after Wave 3):** Every CLI command emits stable JSON/JUnit; DHF descriptor compiler reproduces every existing DHF output; user manual covers 100% of public CLI surface.
- **Gate 4 (final):** UI is a thin wrapper — every persistent action invokes a CLI command. Repo split checklist green. ADR index reflects current decisions.

## GitLab Work Items (Epics A–L)

Existing parent work items remain in place. New epics M–DD will be created as the wave they belong to opens.

| Epic | GitLab parent | Stories |
|---|---|---|
| A | [#320](https://gitlab.com/somesh_sandbox/memo/-/work_items/320) | A-1 [#321](https://gitlab.com/somesh_sandbox/memo/-/work_items/321), A-2 [#322](https://gitlab.com/somesh_sandbox/memo/-/work_items/322), A-3 [#323](https://gitlab.com/somesh_sandbox/memo/-/work_items/323) |
| B | [#324](https://gitlab.com/somesh_sandbox/memo/-/work_items/324) | B-1 [#325](https://gitlab.com/somesh_sandbox/memo/-/work_items/325), B-2 [#326](https://gitlab.com/somesh_sandbox/memo/-/work_items/326), B-3 [#327](https://gitlab.com/somesh_sandbox/memo/-/work_items/327) |
| C | [#328](https://gitlab.com/somesh_sandbox/memo/-/work_items/328) | C-1 [#329](https://gitlab.com/somesh_sandbox/memo/-/work_items/329), C-2 [#330](https://gitlab.com/somesh_sandbox/memo/-/work_items/330), C-3 [#331](https://gitlab.com/somesh_sandbox/memo/-/work_items/331) |
| D | [#332](https://gitlab.com/somesh_sandbox/memo/-/work_items/332) | D-1 [#333](https://gitlab.com/somesh_sandbox/memo/-/work_items/333), D-2 [#334](https://gitlab.com/somesh_sandbox/memo/-/work_items/334), D-3 [#335](https://gitlab.com/somesh_sandbox/memo/-/work_items/335) |
| E | [#336](https://gitlab.com/somesh_sandbox/memo/-/work_items/336) | E-1 [#337](https://gitlab.com/somesh_sandbox/memo/-/work_items/337), E-2 [#338](https://gitlab.com/somesh_sandbox/memo/-/work_items/338), E-3 [#339](https://gitlab.com/somesh_sandbox/memo/-/work_items/339) |
| F | [#340](https://gitlab.com/somesh_sandbox/memo/-/work_items/340) | F-1 [#341](https://gitlab.com/somesh_sandbox/memo/-/work_items/341), F-2 [#342](https://gitlab.com/somesh_sandbox/memo/-/work_items/342), F-3 [#343](https://gitlab.com/somesh_sandbox/memo/-/work_items/343) |
| G | [#344](https://gitlab.com/somesh_sandbox/memo/-/work_items/344) | G-1 [#345](https://gitlab.com/somesh_sandbox/memo/-/work_items/345), G-2 [#346](https://gitlab.com/somesh_sandbox/memo/-/work_items/346), G-3 [#347](https://gitlab.com/somesh_sandbox/memo/-/work_items/347) |
| H | [#348](https://gitlab.com/somesh_sandbox/memo/-/work_items/348) | H-1 [#349](https://gitlab.com/somesh_sandbox/memo/-/work_items/349), H-2 [#350](https://gitlab.com/somesh_sandbox/memo/-/work_items/350), H-3 [#351](https://gitlab.com/somesh_sandbox/memo/-/work_items/351) |
| I | [#352](https://gitlab.com/somesh_sandbox/memo/-/work_items/352) | I-1 [#353](https://gitlab.com/somesh_sandbox/memo/-/work_items/353), I-2 [#354](https://gitlab.com/somesh_sandbox/memo/-/work_items/354), I-3 [#355](https://gitlab.com/somesh_sandbox/memo/-/work_items/355) |
| J | [#356](https://gitlab.com/somesh_sandbox/memo/-/work_items/356) | J-1 [#357](https://gitlab.com/somesh_sandbox/memo/-/work_items/357), J-2 [#358](https://gitlab.com/somesh_sandbox/memo/-/work_items/358), J-3 [#359](https://gitlab.com/somesh_sandbox/memo/-/work_items/359) |
| K | [#360](https://gitlab.com/somesh_sandbox/memo/-/work_items/360) | K-1 [#361](https://gitlab.com/somesh_sandbox/memo/-/work_items/361), K-2 [#362](https://gitlab.com/somesh_sandbox/memo/-/work_items/362) |
| L | [#363](https://gitlab.com/somesh_sandbox/memo/-/work_items/363) | L-1 [#364](https://gitlab.com/somesh_sandbox/memo/-/work_items/364), L-2 [#365](https://gitlab.com/somesh_sandbox/memo/-/work_items/365), L-3 [#366](https://gitlab.com/somesh_sandbox/memo/-/work_items/366) |
| M–DD | TBD | Will be created when their wave opens; legacy issues retag onto these via `epic::*` labels |

## Migration Of Legacy Issues

The 134 legacy issues (#186–#319) and their parent milestones (W1.P*–W3.P*) are migrated by [scripts/migrate-roadmap-to-epics.sh](../../scripts/migrate-roadmap-to-epics.sh) (dry-run by default; set `MIGRATE_APPLY=1` to execute). Mapping rationale:

- **Repo-layout issues (#186–#190 S0.x)** are closed as obsolete: ADR-1-12 + platform.md target a different layout (`memo-base/memo-ontology/memo-methodologies/memo-architect`), so `apps/core` moves are not part of the active plan.
- **Codemods to `memo::arch::*` / `memo::core::*` (#191–#197)** retarget under canonical namespaces from ADR-1-12 (`memo::ontology::architecture::*`, `memo::base::*`).
- **Substantive scope** (rules, ports, dispatcher, shell, importers, modules, tools, renderers, workbenches, scenarios, plugins, canvas, docs) maps onto Epics M–CC + DD per the script.
