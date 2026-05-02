# MEMO Roadmap

This folder owns the implementation roadmap. The architecture target lives in [../architecture/platform.md](../architecture/platform.md); this roadmap turns that architecture into executable epics and numbered stories.

## Naming

- Epics use alphabetic IDs: `A`, `B`, `C`, ...
- Stories use epic-local numeric IDs: `A-1`, `A-2`, `B-1`, ...
- Each epic file contains the stories for that epic.
- Each story is intended for one focused LLM coding session, roughly 30 minutes or less.

## GitLab Mapping

Use GitLab hierarchy this way:

| Roadmap concept | GitLab concept | Reason |
|---|---|---|
| Epic `A`, `B`, ... | Parent work item | An epic groups related implementation stories. |
| Story `A-1`, `B-2`, ... | Child work item | A story is a small executable work item. |
| Release/timebox | GitLab Milestone | GitLab milestones are best used for delivery windows or releases, not roadmap hierarchy. |

GitLab's Work Items model supports Epic, Issue, and Task work item types with child items. In this project, creating type `Epic` work items through the API returned a permissions/resource error, so the active implementation uses parent `Issue` work items named `Epic A` through `Epic L`, with child `Task` work items for stories.

## Rules

- Roadmap epics are ordered by execution sequence.
- Keep only work that supports the active architecture migration.
- Architecture changes update `platform.md` or an ADR. Execution sequencing changes update this roadmap.
- Work outside this epic list is outside the active roadmap.

## Epic Order

| Order | Epic | Original scope | File | Priority | Outcome |
|---:|---|---|---|---|---|
| 1 | A | D5 | [epic-a.md](epic-a.md) | P0 | Finish methodology-centered UI IA. |
| 2 | B | E1 | [epic-b.md](epic-b.md) | P0 | Extract L0 helper definitions. |
| 3 | C | E2 | [epic-c.md](epic-c.md) | P0 | Promote architecture sublayers safely. |
| 4 | D | E3 | [epic-d.md](epic-d.md) | P0 | Introduce compliance dimension. |
| 5 | E | E4 | [epic-e.md](epic-e.md) | P0 | Introduce concrete artifact kinds. |
| 6 | F | E5 | [epic-f.md](epic-f.md) | P0 | Expand methodology scope and UI filters. |
| 7 | G | E6 | [epic-g.md](epic-g.md) | P0 | Establish comprehensive default methodology. |
| 8 | H | E7 | [epic-h.md](epic-h.md) | P0 | Establish GPCA tailoring methodology. |
| 9 | I | E8 | [epic-i.md](epic-i.md) | P1 | Add SysML-first authoring CLI slices. |
| 10 | J | E9 | [epic-j.md](epic-j.md) | P1 | Prepare final repo/package split. |
| 11 | K | F | [epic-k.md](epic-k.md) | P0 | Complete grammar support needed by the architecture. |
| 12 | L | G | [epic-l.md](epic-l.md) | P0 | Align docs, ADRs, roadmap, examples, and GitLab pointers. |

## GitLab Work Items

| Epic | GitLab parent work item | Story work items |
|---|---|---|
| A | [#320](https://gitlab.com/somesh_sandbox/memo/-/work_items/320) | `A-1` [#321](https://gitlab.com/somesh_sandbox/memo/-/work_items/321), `A-2` [#322](https://gitlab.com/somesh_sandbox/memo/-/work_items/322), `A-3` [#323](https://gitlab.com/somesh_sandbox/memo/-/work_items/323) |
| B | [#324](https://gitlab.com/somesh_sandbox/memo/-/work_items/324) | `B-1` [#325](https://gitlab.com/somesh_sandbox/memo/-/work_items/325), `B-2` [#326](https://gitlab.com/somesh_sandbox/memo/-/work_items/326), `B-3` [#327](https://gitlab.com/somesh_sandbox/memo/-/work_items/327) |
| C | [#328](https://gitlab.com/somesh_sandbox/memo/-/work_items/328) | `C-1` [#329](https://gitlab.com/somesh_sandbox/memo/-/work_items/329), `C-2` [#330](https://gitlab.com/somesh_sandbox/memo/-/work_items/330), `C-3` [#331](https://gitlab.com/somesh_sandbox/memo/-/work_items/331) |
| D | [#332](https://gitlab.com/somesh_sandbox/memo/-/work_items/332) | `D-1` [#333](https://gitlab.com/somesh_sandbox/memo/-/work_items/333), `D-2` [#334](https://gitlab.com/somesh_sandbox/memo/-/work_items/334), `D-3` [#335](https://gitlab.com/somesh_sandbox/memo/-/work_items/335) |
| E | [#336](https://gitlab.com/somesh_sandbox/memo/-/work_items/336) | `E-1` [#337](https://gitlab.com/somesh_sandbox/memo/-/work_items/337), `E-2` [#338](https://gitlab.com/somesh_sandbox/memo/-/work_items/338), `E-3` [#339](https://gitlab.com/somesh_sandbox/memo/-/work_items/339) |
| F | [#340](https://gitlab.com/somesh_sandbox/memo/-/work_items/340) | `F-1` [#341](https://gitlab.com/somesh_sandbox/memo/-/work_items/341), `F-2` [#342](https://gitlab.com/somesh_sandbox/memo/-/work_items/342), `F-3` [#343](https://gitlab.com/somesh_sandbox/memo/-/work_items/343) |
| G | [#344](https://gitlab.com/somesh_sandbox/memo/-/work_items/344) | `G-1` [#345](https://gitlab.com/somesh_sandbox/memo/-/work_items/345), `G-2` [#346](https://gitlab.com/somesh_sandbox/memo/-/work_items/346), `G-3` [#347](https://gitlab.com/somesh_sandbox/memo/-/work_items/347) |
| H | [#348](https://gitlab.com/somesh_sandbox/memo/-/work_items/348) | `H-1` [#349](https://gitlab.com/somesh_sandbox/memo/-/work_items/349), `H-2` [#350](https://gitlab.com/somesh_sandbox/memo/-/work_items/350), `H-3` [#351](https://gitlab.com/somesh_sandbox/memo/-/work_items/351) |
| I | [#352](https://gitlab.com/somesh_sandbox/memo/-/work_items/352) | `I-1` [#353](https://gitlab.com/somesh_sandbox/memo/-/work_items/353), `I-2` [#354](https://gitlab.com/somesh_sandbox/memo/-/work_items/354), `I-3` [#355](https://gitlab.com/somesh_sandbox/memo/-/work_items/355) |
| J | [#356](https://gitlab.com/somesh_sandbox/memo/-/work_items/356) | `J-1` [#357](https://gitlab.com/somesh_sandbox/memo/-/work_items/357), `J-2` [#358](https://gitlab.com/somesh_sandbox/memo/-/work_items/358), `J-3` [#359](https://gitlab.com/somesh_sandbox/memo/-/work_items/359) |
| K | [#360](https://gitlab.com/somesh_sandbox/memo/-/work_items/360) | `K-1` [#361](https://gitlab.com/somesh_sandbox/memo/-/work_items/361), `K-2` [#362](https://gitlab.com/somesh_sandbox/memo/-/work_items/362) |
| L | [#363](https://gitlab.com/somesh_sandbox/memo/-/work_items/363) | `L-1` [#364](https://gitlab.com/somesh_sandbox/memo/-/work_items/364), `L-2` [#365](https://gitlab.com/somesh_sandbox/memo/-/work_items/365), `L-3` [#366](https://gitlab.com/somesh_sandbox/memo/-/work_items/366) |
