# Epic M: Ports And Interfaces

Wave: 1 (SysML foundation)

Priority: P0

Story Types: Architecture + Implementation (port grammar binding)

Goal: support standard SysML v2 `port def`, `interface def`, `connect`, and flow notation in grammar, model, and validators so the ontology can express interface architectures consumable by SysON/SysIDE.

Depends on: Epic K.

## Stories

### M-1 Grammar extension for ports and interfaces

Session target: 30 minutes or less.

- Extend `memo-sysml.langium` with `port def`, `interface def`, `connect`, `flow`, and `~` direction marker.
- Add minimal parser fixtures.

Acceptance: a fixture using all four constructs parses without error.

### M-2 Builder + model registry port wiring

Session target: 30 minutes or less.

- Extend builder to populate `owner`, `ownedPorts`, `portSpec`, source/target port IDs on connections.
- Update model registry shape.

Acceptance: parsed ports appear in model registry with owner reference.

### M-3 Migrate `logical_interfaces` to `port def` + `interface def`

Session target: 30 minutes or less.

- Convert one existing logical interface package to standard syntax.
- Confirm GPCA pump still validates.

Acceptance: at least one interface kind uses standard syntax and gpca-pump boots.

### M-4 SysML compat check command

Session target: 30 minutes or less.

- Add `memo check --sysml-compat` running OMG pilot parser (or stub if unavailable).
- Wire as CI gate.

Acceptance: CI runs compat check and reports machine-readable result.

### M-5 Round-trip via Syson

Session target: 30 minutes or less.

- Add `memo round-trip --tool syson` invocation skeleton.
- Document expected diff acceptance.

Acceptance: round-trip command exists and prints conformance report.

## Epic Exit

- Standard port/interface syntax parses, validates, and round-trips for at least one example.
- CI gates SysML compatibility on every push.

## GitLab Source Issues

#217, #218, #223, #224, #225 (S7.1–S7.6)
