# Epic CC: Documentation Restructure

Wave: 3 (CLI surface)

Priority: P1

Goal: split documentation into Users vs Developers tracks, complete the user manual covering every CLI command, and document developer extension points.

Depends on: Epic I, Epic S.

## Stories

### CC-1 Ontology quickstart

Session target: 30 minutes or less.

- `docs/src/users/ontology-quickstart.md` covering SysON / SysIDE / Sysand consumption, `.kpar` install, namespace usage.

Acceptance: quickstart walks an external author from zero to first kind.

### CC-2 User manual

Session target: 30 minutes or less.

- Document every CLI command, every config option, every workflow.

Acceptance: every public CLI subcommand has a manual page entry.

### CC-3 CI integration guide

Session target: 30 minutes or less.

- Document `memo validate --format junit` integration, gate setup, artifact upload.

Acceptance: guide includes runnable GitLab + GitHub snippets.

### CC-4 Developer manual

Session target: 30 minutes or less.

- Extension dev, plugin authoring, module manifest format.

Acceptance: dev manual covers `@memo/plugin-api` + `@memo/web-module-api` contracts.

### CC-5 Restructure Users vs Devs

Session target: 30 minutes or less.

- Reorganise `docs/src/` into `users/` and `developers/` trees.
- Add user-facing web tool guide.

Acceptance: navigation reflects audience split.

### CC-6 Hidden features documentation

Session target: 30 minutes or less.

- Document LLM commands, env vars, advanced flags.

Acceptance: hidden surfaces are discoverable from a single index.

## Epic Exit

- Docs site ships Users + Developers tracks; CLI is the documented authoring surface.

## GitLab Source Issues

#222 (SDOC.W1), #245–#246 (SDOC.W2.1–W2.2), #317–#319 (SDOC.W3.1–W3.3)
