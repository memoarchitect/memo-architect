"""Regenerate every documentation figure.

    python3 docs/figures/build_figures.py

Writes SVG files into docs/src/images/modeling/. The figures are illustrations
drawn for the documentation, not renders of a model, so they stay small,
readable and stable across releases.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import figs_layers  # noqa: E402
import figs_views  # noqa: E402
import figs_extensions  # noqa: E402
import figs_dev  # noqa: E402

OUT = os.path.normpath(os.path.join(HERE, "..", "src", "images", "modeling"))


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    names = []
    for module in (figs_layers, figs_views, figs_extensions, figs_dev):
        for name, fn in module.FIGS.items():
            if only and name not in only:
                continue
            fn().save(os.path.join(OUT, f"{name}.svg"))
            names.append(name)
    print(f"wrote {len(names)} figures to {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
