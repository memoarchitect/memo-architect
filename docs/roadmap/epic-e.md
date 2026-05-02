# Epic E: Artifact Kinds

Wave: 1 (SysML foundation)

Priority: P0

Story Types: Implementation

Goal: model concrete DHF/review documents as artifact dimension kinds.

## Stories

### E-1 Artifact folder skeleton

Session target: 30 minutes or less.

- Add `ontology/artifacts/`.
- Add discovery for artifact kind files.
- Preserve existing DHF template behavior.

Acceptance: artifact folder discovery works without changing the DHF UI.

### E-2 First concrete artifact kind

Session target: 30 minutes or less.

- Add one concrete artifact kind, preferably `RiskManagementPlan`.
- Include document title and regulatory reference metadata.

Acceptance: one artifact kind parses and is discoverable.

### E-3 DHF binding artifact lookup

Session target: 30 minutes or less.

- Resolve one DHF binding through artifact kind ID or template ID.
- Fall back to built-in templates when no artifact kind exists.

Acceptance: one DHF row can be backed by artifact discovery.

## Epic Exit

- Artifact dimension is represented in SysML.
- DHF bindings begin to reference artifact kinds instead of owning document truth.
