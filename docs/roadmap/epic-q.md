# Epic Q: DHF Descriptor Compiler

Wave: 3 (CLI surface)

Priority: P0

Goal: convert the DHF compiler from custom queries to a descriptor walk over `DocumentBackedView` defs, so document generation is data-driven and the UI stays a viewer.

Depends on: Epic E (artifact kinds), Epic F (methodology scope), Epic N (rules in SysML).

## Stories

### Q-1 Move dhf into composer

Session target: 30 minutes or less.

- Move `dhf/*` to `apps/core/src/composer/`.
- Update imports.

Acceptance: build green with composer module.

### Q-2 DocumentBackedView per regulatory document

Session target: 30 minutes or less.

- Add six `DocumentBackedView` defs (RMF, SDD, CER, Cyber, DPIA, DHF index).

Acceptance: each def parses and discovers its bound artifact kind.

### Q-3 Rewrite compiler as descriptor walk

Session target: 30 minutes or less.

- Replace custom query code with descriptor walker.

Acceptance: compiled output for one document matches prior version byte-for-byte (or has explicit diff rationale).

### Q-4 One adapter per DocumentViewKind

Session target: 30 minutes or less.

- Add adapter per RMF, SDD, CER, Cyber, DPIA, DHF.

Acceptance: each adapter renders without referencing unrelated kinds.

### Q-5 Audit chain on every section

Session target: 30 minutes or less.

- Stamp `id`, `version`, source SysML hash on every compiled section.

Acceptance: audit fields appear in output and verify deterministically.

## Epic Exit

- DHF compilation is descriptor-driven and reproducible from SysML alone.

## GitLab Source Issues

#232–#236 (S9.1–S9.5)
