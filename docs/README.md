# MEMO Architect documentation

This directory contains public technical documentation for the workbench and its
integration with Memo Tools and the MEMO ontology.

## Main areas

| Area | Contents |
|---|---|
| [architecture/](architecture/README.md) | Platform and repository architecture |
| [design/](design/README.md) | Runtime, protocol, ontology, and authoring design |
| [decisions/](decisions/index.md) | Public architecture decision records |
| [src/](src/index.md) | User and developer documentation used by MkDocs |
| [figures/](figures/build_figures.py) | The generator for the illustrations under `src/images/modeling/` |

## Source-of-truth rules

- Architecture changes update `architecture/` or add an ADR under `decisions/`.
- SysML authoring rules live in `design/sysmlv2-rulebook.md`.
- User-visible behavior is documented under `src/users/`.
- What can be modeled—layers, extensions and view kinds—is documented under
  `src/modeling/`. Its figures are drawn by `figures/build_figures.py`
  (`python3 docs/figures/build_figures.py`); edit the figure code and rerun it
  rather than editing the SVG files by hand.
- Extension and contribution interfaces are documented under `src/developers/`.
- Private roadmaps, internal reviews, handoffs, generated planning baselines, and
  release coordination belong in the private `memo-meta` repository.

## Current package model

Architect is a standalone npm package with exact dependencies on Memo Tools and
the MEMO ontology. Cross-repository development happens in `memo-meta`, where the
three repositories are sibling submodules linked by meta-only pnpm overrides.
