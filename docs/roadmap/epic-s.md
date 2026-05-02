# Epic S: CLI Parity And Machine Output

Wave: 3 (CLI surface)

Priority: P1

Goal: make every CLI command emit machine-readable output (`--format json`, `--format junit`) and document parity gaps against the web UI so the CLI stays a first-class authoring path.

Depends on: Epic I (CLI authoring slices).

## Stories

### S-1 Parity audit

Session target: 30 minutes or less.

- Inventory each web action and its CLI equivalent.
- Document gaps with severity.

Acceptance: parity audit doc exists with explicit gaps.

### S-2 Machine-readable output flags

Session target: 30 minutes or less.

- Add `--format json` and `--format junit` to `memo validate`, `memo rules check`, `memo export`.

Acceptance: each command emits stable JSON/JUnit when flagged.

### S-3 CI templates

Session target: 30 minutes or less.

- Provide GitLab CI and GitHub Actions templates running `memo validate --format junit` and uploading reports.

Acceptance: templates exist under `examples/` and execute against gpca-pump.

## Epic Exit

- CLI fully drives validation/export output suitable for CI gating.

## GitLab Source Issues

#237–#239 (S11.1–S11.3)
