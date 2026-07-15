# Diagram rendering benchmarks

This is a rendering checklist, not a product comparison. MEMO remains a
model-driven SysML v2 tool; the products below are references for visual and
interaction quality only.

| Reference | Quality to carry into MEMO |
| --- | --- |
| [Miro architecture diagrams](https://miro.com/diagramming/software-architecture-diagram/) | Anchored connectors, quick alignment, restrained infinite-canvas controls, and predictable zoom/pan. |
| [draw.io editor](https://www.drawio.com/docs/getting-started/) | Compact context-sensitive tools, strong shape proportions, grid/snap feedback, and an unobstructed canvas. |
| [draw.io connectors](https://www.drawio.com/docs/manual/connectors/) | Editable bend points, stable labels, orthogonal routes, and clear line/arrow semantics. |
| [Tom Sawyer Software](https://www.tomsawyer.com/) | Hierarchical graph navigation, layout stability, overview/detail coordination, and dense-graph legibility. |
| [SysModeler](https://sysmodeler.ai/) | SysML textual/visual continuity and model-driven rather than drawing-driven diagrams. |
| MATLAB System Composer | Component drill-down, boundary ports, retained external context, and breadcrumbs. |

## MEMO rendering rules

- Use a neutral canvas, 12–14 px text, crisp 1–1.5 px borders, and 2–3 px
  corner radii. Shadows are reserved for selection or floating UI.
- Size nodes from content. Wrap or elide long labels without shrinking text.
- Structural and interface connectors are orthogonal, port-anchored, and must
  not cross node interiors. Control flow and object flow remain visually
  distinct without animation.
- Expanded containers preserve their boundary and reveal immediate children.
  Collapsing them must not delete or duplicate model elements.
- At low zoom retain boundaries and primary labels; reveal ports,
  compartments, and editing handles progressively.
- A layout operation is bounded. Failure produces an actionable message and a
  retry control, never a permanent progress indicator.

## Screenshot gate

Each accepted sample is captured at 1440×900 and scored from 1–5 for
typography, proportions, whitespace, routing, label placement, hierarchy,
semantic correctness, initial-viewport readability, and professional
appearance. Every category must score at least 4 before the screenshot becomes
a regression baseline.
