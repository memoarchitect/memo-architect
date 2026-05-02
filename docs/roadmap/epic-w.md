# Epic W: Tool Modules

Wave: 4 (UI thin wrapper)

Priority: P2

Story Types: Implementation

Goal: ship analysis tools (DSM, FMEA, trace, coverage, lint, diff, impact, SBOM, FIBO, EA importer, risk ALARP, rule explainer, codemod) as feature modules. Each tool wraps a CLI command — UI never owns analysis logic.

Depends on: Epic V (module infra), Epic S (CLI parity).

## Stories

### W-1 DSM analysis

Session target: 30 minutes or less.

- DSM CLI + UI wrapper.

Acceptance: DSM runs from CLI and renders in UI module.

### W-2 FMEA builder + importer

Session target: 30 minutes or less.

- FMEA CLI builder; Excel/CSV importer.

Acceptance: FMEA round-trips through CLI; UI displays.

### W-3 Trace matrix N×N

Session target: 30 minutes or less.

- Trace matrix CLI generator.

Acceptance: matrix renders for gpca-pump.

### W-4 Coverage map

Session target: 30 minutes or less.

- Coverage CLI per dimension.

Acceptance: coverage report includes every active rule.

### W-5 Consistency checker dashboard

Session target: 30 minutes or less.

- C1–C9 dashboard wrapper for rule packs from Epic N.

Acceptance: dashboard fetches via CLI and renders status.

### W-6 Lint runner

Session target: 30 minutes or less.

- `memo lint` runner aggregating R/P/FB rule packs.

Acceptance: lint runs from CLI with stable JSON output.

### W-7 Diff viewer

Session target: 30 minutes or less.

- Model diff CLI + viewer module.

Acceptance: diff between two project states renders.

### W-8 Impact analyzer

Session target: 30 minutes or less.

- Cross-dimension impact analysis CLI.

Acceptance: editing one kind reports downstream impacts.

### W-9 SBOM importer

Session target: 30 minutes or less.

- SBOM importer to SysML.

Acceptance: one CycloneDX file imports.

### W-10 FIBO library reuse

Session target: 30 minutes or less.

- Optional FIBO concepts importable.

Acceptance: subset of FIBO imports without name collision.

### W-11 Risk calculator (ALARP)

Session target: 30 minutes or less.

- Risk calculation CLI + module.

Acceptance: ALARP computation matches reference fixtures.

### W-12 Rule explainer

Session target: 30 minutes or less.

- `memo rules explain <id>` rendering rationale + citations.

Acceptance: explainer outputs match `ConsistencyRule.rationaleText`.

### W-13 Namespace codemod runner

Session target: 30 minutes or less.

- Codemod runner used during ADR-1-12 migration; preserved for future renames.

Acceptance: codemod runs idempotently.

## Epic Exit

- Each tool exists as CLI command + UI wrapper module.
- UI bundle shrinks because tools are lazy-loaded.

## GitLab Source Issues

#274–#288 (STL.1–STL.15)
