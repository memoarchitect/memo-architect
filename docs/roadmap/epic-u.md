# Epic U: Imports And LSP

Wave: 2 (Methodology + import)

Priority: P2

Goal: import existing models from OWL, Sparx EA, Cameo/MagicDraw, AADL, and provide VS Code language support so the text editor stays the primary authoring surface.

Depends on: Epic K, Epic T.

## Stories

### U-1 OWL / JSON-LD / SysAnd to SysML

Session target: 30 minutes or less.

- Importer writing to `memo::ext::imported::*`.

Acceptance: one fixture file imports without manual edits.

### U-2 Sparx EA importer

Session target: 30 minutes or less.

- `.eapx`/`.qeax` to SysML.

Acceptance: one EA model imports and round-trips back.

### U-3 Cameo / MagicDraw importer

Session target: 30 minutes or less.

- `.mdzip` to SysML.

Acceptance: one Cameo model imports.

### U-4 SysML v2 to AADL bridge

Session target: 30 minutes or less.

- Bridge generator skeleton.

Acceptance: bridge produces AADL for one fixture.

### U-5 VS Code language server packaging

Session target: 30 minutes or less.

- Package via `vsce`.

Acceptance: extension installs and provides syntax highlighting + diagnostics.

## Epic Exit

- Authors can move existing models into MEMO via CLI imports and edit them in VS Code.

## GitLab Source Issues

#240–#244 (SIMP.1–SIMP.5)
