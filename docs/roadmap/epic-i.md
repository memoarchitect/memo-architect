# Epic I: CLI Authoring Tools

Wave: 3 (CLI surface)

Priority: P1

Story Types: Design + Implementation (CLI command shape)

Goal: add narrow SysML-writing CLI slices for ontology and methodology authoring.

## Stories

### I-1 Ontology add-kind thin slice

Session target: 30 minutes or less.

- Add one `memo ontology` command that writes a `.sysml` kind file.
- Support one dimension path first.

Acceptance: command writes parser-valid SysML and no YAML/JSON catalog state.

### I-2 Methodology scope thin slice

Session target: 30 minutes or less.

- Add one `memo methodology` command that updates or creates methodology scope SysML.
- Preserve formatting where practical.

Acceptance: command writes SysML and keeps methodology package loadable.

### I-3 Authoring command help and tests

Session target: 30 minutes or less.

- Add help text for supported narrow paths.
- Add one temp-project or fixture-based test per command.

Acceptance: users can discover supported authoring paths from CLI help.

## Epic Exit

- CLI proves SysML-first ontology and methodology authoring.
- Full CLI surface can expand later.
