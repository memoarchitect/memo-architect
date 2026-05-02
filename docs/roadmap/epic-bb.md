# Epic BB: Examples Cleanup

Wave: 2 (Methodology in SysML)

Priority: P1

Goal: make `examples/gpca-pump` the canonical sample, retire confusing alternates, and bring cybersecurity coverage to a useful level.

Depends on: Epic H (GPCA methodology).

## Stories

### BB-1 GPCA pump default

Session target: 30 minutes or less.

- Make GPCA pump the default example; remove irrigation; trim infusion.

Acceptance: `memo init --from-example` lists GPCA pump first.

### BB-2 CriSys source references

Session target: 30 minutes or less.

- Add CriSys traceability references to GPCA hazards/threats.

Acceptance: each CriSys reference resolves to a citation block.

### BB-3 Cybersecurity coverage to 90%

Session target: 30 minutes or less.

- Raise GPCA cybersecurity content from ~70% to ~90% rule coverage.

Acceptance: `memo rules coverage` reports >= 90% on cyber rule pack.

## Epic Exit

- Example surface is one well-curated medical-device project that exercises the full methodology.

## GitLab Source Issues

#219–#221 (SEX.1–SEX.3)
