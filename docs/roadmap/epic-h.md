# Epic H: GPCA Custom Methodology

Wave: 2 (Methodology in SysML)

Priority: P0

Story Types: Implementation

Goal: establish GPCA as a tailoring example that subtracts from the default methodology.

## Stories

### H-1 GPCA package skeleton

Session target: 30 minutes or less.

- Create `@memo/methodology-gpca` package skeleton.
- Import or reference default methodology scope.
- Add concrete subtraction sets for the GPCA prototype scope.

Acceptance: GPCA package is discoverable.

### H-2 GPCA scope implementation

Session target: 30 minutes or less.

- Exclude cybersecurity layer/standard/artifacts/viewpoint for the non-networked prototype variant.
- Exclude `SOUPComponent` when the example has no SOUP.

Acceptance: GPCA scope data expresses real tailoring choices.

### H-3 GPCA example pin

Session target: 30 minutes or less.

- Repoint `examples/gpca-pump` to `@memo/methodology-gpca`.
- Run validation or boot smoke check.

Acceptance: GPCA example uses the GPCA methodology and still loads.

## Epic Exit

- Default is comprehensive.
- GPCA demonstrates subtraction-based tailoring.
