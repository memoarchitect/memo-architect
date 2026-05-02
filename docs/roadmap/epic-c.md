# Epic C: Architecture Sublayers

Wave: 1 (SysML foundation)

Priority: P0

Depends on: Epic B, ADR-1-12.

Goal: move architecture kinds into `memo::ontology::architecture::<layer>::*` per ADR-1-12 namespace canonicalization, without breaking current loading.

## Stories

### C-1 Architecture discovery adapter

Session target: 30 minutes or less.

- Update layer discovery to support both flat `architecture/*.sysml` and nested `architecture/<sublayer>/*.sysml`.
- Add one fixture or focused test.

Acceptance: flat and nested architecture layouts both load.

### C-2 First sublayer migration

Session target: 30 minutes or less.

- Move one low-risk architecture kind or fixture into a sublayer folder.
- Add `archLayer` metadata.
- Preserve imports.

Acceptance: the moved kind appears under the expected architecture layer.

### C-3 Architecture migration batch plan

Session target: 30 minutes or less.

- Identify remaining architecture files by target sublayer.
- Create a checklist in this epic file or a local migration note.
- Mark files that should move to compliance or artifacts instead.

Acceptance: remaining architecture migration is batched and low-risk.

## Epic Exit

- Loader supports final architecture folder shape.
- At least one real or fixture kind proves the shape.
