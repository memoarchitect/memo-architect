# Diagram generators

Scripts that emit committed diagrams so layout stays consistent and reproducible.

## `gen-ontology-hierarchy.py`

Generates [`docs/src/diagrams/ontology-medical-device-hierarchy.drawio`](../../docs/src/diagrams/ontology-medical-device-hierarchy.drawio)
— a 16-tab draw.io walkthrough that introduces MEMO top-down (zoom-in via tabs).

Layout invariant: every tab is a vertical stack of labeled bands where the
**parent / foundation / root is the top band** and children flow downward with
orthogonal, downward connectors. Geometry is computed, so bands and inner nodes
never overlap.

Content is grounded in [`docs/review/ontology_review.md`](../../docs/review/ontology_review.md)
and the current `vendor/memo-sysmlv2` ontology. Edit the `TABS` spec in the
script (not the `.drawio` by hand) and regenerate:

```bash
python3 tools/diagrams/gen-ontology-hierarchy.py
```

No dependencies beyond the Python 3 standard library.
