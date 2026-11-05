"""Figures for the developer pages."""
from svgkit import Fig, PALETTE, INK, MUTED

FIGS = {}


def fig(name):
    def deco(fn):
        FIGS[name] = fn
        return fn
    return deco


@fig("dev-stack")
def stack():
    f = Fig(1000, 230, "Where Architect sits", "Dependencies point one way: a lower package never imports a higher one")
    boxes = [
        ("memo", "@memoarchitect/ontology", "SysML content: kinds, rules,\nviewpoints, methodology", "requirements"),
        ("memo-tools", "@memoarchitect/tools", "engine · memo CLI ·\nproject server", "logical"),
        ("memo-architect", "@memoarchitect/architect", "React workbench +\nmemo-architect bin", "software"),
    ]
    xs = [40, 360, 680]
    made = []
    for (repo, pkg, desc, cat), x in zip(boxes, xs):
        stroke, fill, _ = PALETTE[cat]
        f.rect(x, 80, 280, 120, fill=fill, stroke=stroke, sw=1.6, rx=10)
        f.text(x + 140, 104, repo, size=14, weight=700)
        f.text(x + 140, 126, pkg, size=11.5, color=stroke, mono=True)
        f.text(x + 140, 168, desc, size=11.5, color=MUTED)
        made.append(x)
    for x in xs[:-1]:
        f.line([(x + 284, 140), (x + 316, 140)], color=INK, sw=1.8, end="arrow")
    f.text(500, 216, "consumed by →", size=11, color=MUTED, italic=True)
    return f


@fig("dev-runtime")
def runtime():
    f = Fig(1000, 250, "How the runtime fits together",
            "memo-architect dev starts the project server from Tools and serves the web client")
    f.rect(40, 90, 250, 120, fill="#f8fafc", stroke="#52606d", sw=1.5, rx=10)
    f.text(165, 118, "Project directory", size=14, weight=700)
    f.text(165, 160, ".sysml source\nmemo.package.yaml\nmemo.lock.yaml", size=11.5, color=MUTED, mono=True)
    stroke, fill, _ = PALETTE["logical"]
    f.rect(375, 90, 250, 120, fill=fill, stroke=stroke, sw=1.6, rx=10)
    f.text(500, 118, "Project server", size=14, weight=700)
    f.text(500, 138, "@memoarchitect/tools", size=11.5, color=stroke, mono=True)
    f.text(500, 176, "compile · validate\noperations · file watch", size=11.5, color=MUTED)
    stroke, fill, _ = PALETTE["software"]
    f.rect(710, 90, 250, 120, fill=fill, stroke=stroke, sw=1.6, rx=10)
    f.text(835, 118, "React workbench", size=14, weight=700)
    f.text(835, 138, "imports tools/browser", size=11.5, color=stroke, mono=True)
    f.text(835, 176, "Zustand store\ndiagrams and views", size=11.5, color=MUTED)
    f.line([(294, 150), (371, 150)], color=INK, sw=1.8, end="arrow", start="arrow")
    f.text(332, 136, "reads / writes", size=10.5, color=MUTED)
    f.line([(629, 140), (706, 140)], color=INK, sw=1.8, end="arrow")
    f.line([(706, 162), (629, 162)], color=INK, sw=1.8, end="arrow")
    f.text(667, 124, "model state", size=10.5, color=MUTED)
    f.text(667, 180, "operations", size=10.5, color=MUTED)
    f.text(667, 226, "WebSocket protocol (@memoarchitect/tools/types)", size=11, color=MUTED, italic=True)
    return f
