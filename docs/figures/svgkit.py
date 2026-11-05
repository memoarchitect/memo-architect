"""A tiny, dependency-free SVG drawing kit for the documentation figures.

Every illustration under ``docs/src/images/modeling`` is produced by
``build_figures.py`` with the helpers below, so the figures share one visual
language: a white card, one colour family per modeling layer, SysML-style
blocks with stereotypes, square ports on block edges, orthogonal connectors,
and numbered call-outs that the page text explains.

The figures are drawn on their own white card on purpose, so they read the
same in the documentation's light and dark themes.

Run ``python3 docs/figures/build_figures.py`` after changing a figure.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from html import escape

FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
MONO = "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace"
INK = "#1f2933"
MUTED = "#52606d"
FAINT = "#9aa5b1"
CARD = "#ffffff"
CARD_EDGE = "#d9e2ec"
ACCENT = "#0B1E2D"
TEAL = "#14b88f"

# One colour family per layer: (stroke / heading, fill, soft fill)
PALETTE = {
    "context": ("#0f766e", "#ccfbf1", "#f0fdfa"),
    "operational": ("#0e7490", "#cffafe", "#ecfeff"),
    "requirements": ("#4338ca", "#e0e7ff", "#eef2ff"),
    "functional": ("#b45309", "#fef3c7", "#fffbeb"),
    "logical": ("#1d4ed8", "#dbeafe", "#eff6ff"),
    "software": ("#6d28d9", "#ede9fe", "#f5f3ff"),
    "physical": ("#475569", "#e2e8f0", "#f8fafc"),
    "deployment": ("#0369a1", "#e0f2fe", "#f0f9ff"),
    "risk": ("#b91c1c", "#fee2e2", "#fef2f2"),
    "cyber": ("#be185d", "#fce7f3", "#fdf2f8"),
    "human": ("#c2410c", "#ffedd5", "#fff7ed"),
    "verification": ("#15803d", "#dcfce7", "#f0fdf4"),
    "variability": ("#a21caf", "#fae8ff", "#fdf4ff"),
    "extension": ("#0d9488", "#ccfbf1", "#f0fdfa"),
    "neutral": ("#52606d", "#f1f5f9", "#f8fafc"),
}


def text_width(s: str, size: float, weight: int = 400) -> float:
    """A coarse width estimate for a proportional sans-serif face."""
    factor = 0.56 if weight < 600 else 0.6
    return len(s) * size * factor


@dataclass
class Box:
    x: float
    y: float
    w: float
    h: float

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2

    @property
    def r(self) -> float:
        return self.x + self.w

    @property
    def b(self) -> float:
        return self.y + self.h

    def left(self, f: float = 0.5):
        return (self.x, self.y + self.h * f)

    def right(self, f: float = 0.5):
        return (self.r, self.y + self.h * f)

    def top(self, f: float = 0.5):
        return (self.x + self.w * f, self.y)

    def bottom(self, f: float = 0.5):
        return (self.x + self.w * f, self.b)


class Fig:
    def __init__(self, w: int, h: int, title: str | None = None, subtitle: str | None = None):
        self.w, self.h = w, h
        self.body: list[str] = []
        self.markers: dict[str, str] = {}
        self.title = title
        self.subtitle = subtitle

    # ── low level ────────────────────────────────────────────────────────
    def add(self, s: str) -> None:
        self.body.append(s)

    def marker(self, kind: str, color: str) -> str:
        mid = f"m-{kind}-{color.lstrip('#')}"
        if mid in self.markers:
            return mid
        if kind == "arrow":
            shape = f'<path d="M0,0 L10,5 L0,10 z" fill="{color}"/>'
            ref = (9, 5)
        elif kind == "open":
            shape = f'<path d="M1,1 L10,5 L1,9" fill="none" stroke="{color}" stroke-width="1.6"/>'
            ref = (9.5, 5)
        elif kind == "triangle":
            shape = f'<path d="M0,0 L11,5.5 L0,11 z" fill="#ffffff" stroke="{color}" stroke-width="1.4"/>'
            ref = (11, 5.5)
        elif kind == "diamond":
            shape = f'<path d="M0,5 L7,0 L14,5 L7,10 z" fill="{color}"/>'
            ref = (0, 5)
        elif kind == "odiamond":
            shape = f'<path d="M0,5 L7,0 L14,5 L7,10 z" fill="#ffffff" stroke="{color}" stroke-width="1.3"/>'
            ref = (0, 5)
        elif kind == "dot":
            shape = f'<circle cx="5" cy="5" r="3.5" fill="{color}"/>'
            ref = (5, 5)
        else:
            raise ValueError(kind)
        size = 14 if "diamond" in kind else 12
        self.markers[mid] = (
            f'<marker id="{mid}" viewBox="0 0 {size} {size}" refX="{ref[0]}" refY="{ref[1]}" '
            f'markerWidth="{size}" markerHeight="{size}" markerUnits="userSpaceOnUse" '
            f'orient="auto-start-reverse">{shape}</marker>'
        )
        return mid

    def text(self, x, y, s, size=13, weight=400, color=INK, anchor="middle", italic=False, mono=False, opacity=None):
        lines = s.split("\n")
        family = MONO if mono else FONT
        style = ' font-style="italic"' if italic else ""
        op = f' opacity="{opacity}"' if opacity is not None else ""
        lh = size * 1.25
        y0 = y - (len(lines) - 1) * lh / 2
        out = []
        for i, line in enumerate(lines):
            out.append(
                f'<text x="{x:.1f}" y="{y0 + i * lh:.1f}" font-family="{family}" font-size="{size}" '
                f'font-weight="{weight}" fill="{color}" text-anchor="{anchor}" dominant-baseline="central"{style}{op}>'
                f"{escape(line)}</text>"
            )
        self.add("".join(out))

    def rect(self, x, y, w, h, fill="none", stroke=INK, sw=1.4, rx=6, dash=None, opacity=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        op = f' opacity="{opacity}"' if opacity is not None else ""
        self.add(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}{op}/>'
        )

    # ── building blocks ──────────────────────────────────────────────────
    def block(self, x, y, w, h, name, stereo=None, cat="logical", attrs=None, dash=None,
              fill=None, title_top=False, rx=7, name_size=14, soft=False, sw=1.6):
        """A SysML-style block: «stereotype» over a bold name, optional attribute compartment."""
        stroke, f1, f2 = PALETTE[cat]
        self.rect(x, y, w, h, fill=fill or (f2 if soft else f1), stroke=stroke, sw=sw, rx=rx, dash=dash)
        head_y = y + 22 if (attrs or title_top) else y + h / 2
        if stereo:
            if attrs or title_top:
                self.text(x + w / 2, y + 15, f"«{stereo}»", size=11, color=stroke, italic=True)
                self.text(x + w / 2, y + 32, name, size=name_size, weight=700)
                head_bottom = y + 44
            else:
                self.text(x + w / 2, head_y - 9, f"«{stereo}»", size=11, color=stroke, italic=True)
                self.text(x + w / 2, head_y + 8, name, size=name_size, weight=700)
                head_bottom = None
        else:
            if attrs or title_top:
                self.text(x + w / 2, y + 20, name, size=name_size, weight=700)
                head_bottom = y + 34
            else:
                self.text(x + w / 2, head_y, name, size=name_size, weight=700)
                head_bottom = None
        if attrs:
            self.add(f'<line x1="{x:.1f}" y1="{head_bottom:.1f}" x2="{x + w:.1f}" y2="{head_bottom:.1f}" stroke="{stroke}" stroke-width="1"/>')
            for i, a in enumerate(attrs):
                self.text(x + 10, head_bottom + 14 + i * 17, a, size=11.5, color=MUTED, anchor="start", mono=True)
        return Box(x, y, w, h)

    def frame(self, x, y, w, h, label, cat="neutral", dash=None):
        """A diagram frame or container with a pentagon name tag in the top-left corner."""
        stroke, _, soft = PALETTE[cat]
        self.rect(x, y, w, h, fill=soft, stroke=stroke, sw=1.4, rx=8, dash=dash)
        tw = text_width(label, 12, 600) + 20
        self.add(
            f'<path d="M{x + 1:.1f},{y + 1:.1f} h{tw:.1f} v14 l-8,8 h{-(tw - 8):.1f} z" fill="{stroke}" opacity="0.92"/>'
        )
        self.text(x + 10, y + 12, label, size=12, weight=600, color="#ffffff", anchor="start")
        return Box(x, y, w, h)

    def port(self, box: Box, side: str, f: float, direction="inout", cat=None, label=None,
             size=14, label_side=None, label_size=11):
        """A square port straddling a block edge. Returns the outer attachment point."""
        stroke = PALETTE[cat or "physical"][0]
        if side == "left":
            cx, cy = box.x, box.y + box.h * f
            outer = (cx - size / 2, cy)
        elif side == "right":
            cx, cy = box.r, box.y + box.h * f
            outer = (cx + size / 2, cy)
        elif side == "top":
            cx, cy = box.x + box.w * f, box.y
            outer = (cx, cy - size / 2)
        else:
            cx, cy = box.x + box.w * f, box.b
            outer = (cx, cy + size / 2)
        s = size
        self.add(f'<rect x="{cx - s / 2:.1f}" y="{cy - s / 2:.1f}" width="{s}" height="{s}" fill="#ffffff" stroke="{stroke}" stroke-width="1.5"/>')
        # A direction glyph: the arrow points the way items travel through the port.
        if direction in ("in", "out"):
            outward = direction == "out"
            vec = {"left": (-1, 0), "right": (1, 0), "top": (0, -1), "bottom": (0, 1)}[side]
            if not outward:
                vec = (-vec[0], -vec[1])
            a = s * 0.28
            tip = (cx + vec[0] * a, cy + vec[1] * a)
            base1 = (cx - vec[0] * a + vec[1] * a, cy - vec[1] * a + vec[0] * a)
            base2 = (cx - vec[0] * a - vec[1] * a, cy - vec[1] * a - vec[0] * a)
            self.add(
                f'<path d="M{tip[0]:.1f},{tip[1]:.1f} L{base1[0]:.1f},{base1[1]:.1f} L{base2[0]:.1f},{base2[1]:.1f} z" fill="{stroke}"/>'
            )
        else:
            self.add(f'<path d="M{cx - s * 0.28:.1f},{cy:.1f} h{s * 0.56:.1f}" stroke="{stroke}" stroke-width="1.3"/>'
                     if side in ("top", "bottom") else
                     f'<path d="M{cx:.1f},{cy - s * 0.28:.1f} v{s * 0.56:.1f}" stroke="{stroke}" stroke-width="1.3"/>')
        if label:
            ls = label_side or {"left": "inside-left", "right": "inside-right", "top": "below", "bottom": "above"}[side]
            if ls == "inside-left":
                self.text(cx + s / 2 + 4, cy, label, size=label_size, color=MUTED, anchor="start")
            elif ls == "inside-right":
                self.text(cx - s / 2 - 4, cy, label, size=label_size, color=MUTED, anchor="end")
            elif ls == "outside-left":
                self.text(cx - s / 2 - 4, cy - 12, label, size=label_size, color=MUTED, anchor="end")
            elif ls == "outside-right":
                self.text(cx + s / 2 + 4, cy - 12, label, size=label_size, color=MUTED, anchor="start")
            elif ls == "below":
                self.text(cx, cy + s / 2 + 10, label, size=label_size, color=MUTED)
            elif ls == "above":
                self.text(cx, cy - s / 2 - 10, label, size=label_size, color=MUTED)
            elif ls == "above-out":
                self.text(cx, cy - s / 2 - 10, label, size=label_size, color=MUTED)
        return outer

    def line(self, pts, color=INK, sw=1.6, dash=None, end=None, start=None, label=None, at=0.5,
             label_dy=0, label_color=None, label_size=11.5, label_italic=False, rounded=True, opacity=None):
        if len(pts) > 2 and rounded:
            d = self._rounded_path(pts, 6)
        else:
            d = "M" + " L".join(f"{p[0]:.1f},{p[1]:.1f}" for p in pts)
        attrs = ""
        if dash:
            attrs += f' stroke-dasharray="{dash}"'
        if end:
            attrs += f' marker-end="url(#{self.marker(end, color)})"'
        if start:
            attrs += f' marker-start="url(#{self.marker(start, color)})"'
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linejoin="round"{attrs}/>')
        if label:
            x, y = self.point_along(pts, at)
            self.pill(x, y + label_dy, label, color=label_color or color, size=label_size, italic=label_italic)

    @staticmethod
    def _rounded_path(pts, r):
        d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
        for i in range(1, len(pts) - 1):
            p0, p1, p2 = pts[i - 1], pts[i], pts[i + 1]
            v1 = (p1[0] - p0[0], p1[1] - p0[1])
            v2 = (p2[0] - p1[0], p2[1] - p1[1])
            l1 = math.hypot(*v1) or 1
            l2 = math.hypot(*v2) or 1
            rr = min(r, l1 / 2, l2 / 2)
            a = (p1[0] - v1[0] / l1 * rr, p1[1] - v1[1] / l1 * rr)
            b = (p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr)
            d += f" L{a[0]:.1f},{a[1]:.1f} Q{p1[0]:.1f},{p1[1]:.1f} {b[0]:.1f},{b[1]:.1f}"
        d += f" L{pts[-1][0]:.1f},{pts[-1][1]:.1f}"
        return d

    @staticmethod
    def point_along(pts, t):
        segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
        lens = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs]
        total = sum(lens) or 1
        target = total * t
        for (a, b), L in zip(segs, lens):
            if target <= L:
                f = target / (L or 1)
                return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
            target -= L
        return pts[-1]

    def pill(self, x, y, s, color=INK, size=11.5, italic=False, fill="#ffffff", bold=False):
        w = text_width(s, size, 600 if bold else 400) + 12
        h = size + 8
        self.add(f'<rect x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h / 2:.1f}" fill="{fill}" stroke="{color}" stroke-width="0.9" opacity="0.98"/>')
        self.text(x, y, s, size=size, color=color, italic=italic, weight=600 if bold else 400)

    def flow(self, x, y, label, direction="right", cat="physical", label_pos="above", size=11):
        """An item flow marker: a filled arrowhead on a connector plus the item that flows."""
        stroke = PALETTE[cat][0]
        a = 6.5
        vec = {"right": (1, 0), "left": (-1, 0), "down": (0, 1), "up": (0, -1)}[direction]
        tip = (x + vec[0] * a, y + vec[1] * a)
        b1 = (x - vec[0] * a + vec[1] * a, y - vec[1] * a + vec[0] * a)
        b2 = (x - vec[0] * a - vec[1] * a, y - vec[1] * a - vec[0] * a)
        self.add(f'<path d="M{tip[0]:.1f},{tip[1]:.1f} L{b1[0]:.1f},{b1[1]:.1f} L{b2[0]:.1f},{b2[1]:.1f} z" fill="{stroke}"/>')
        if label:
            if label_pos == "above":
                self.pill(x, y - 17, label, color=stroke, size=size, fill=PALETTE[cat][2])
            elif label_pos == "below":
                self.pill(x, y + 17, label, color=stroke, size=size, fill=PALETTE[cat][2])
            elif label_pos == "right":
                w = text_width(label, size) + 12
                self.pill(x + w / 2 + 12, y, label, color=stroke, size=size, fill=PALETTE[cat][2])
            elif label_pos == "left":
                w = text_width(label, size) + 12
                self.pill(x - w / 2 - 12, y, label, color=stroke, size=size, fill=PALETTE[cat][2])

    def callout(self, x, y, n, r=11):
        """A numbered call-out the page text explains."""
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{ACCENT}" stroke="#ffffff" stroke-width="2"/>')
        self.text(x, y + 0.5, str(n), size=12, weight=700, color="#ffffff")

    def leader(self, x1, y1, x2, y2):
        self.add(f'<path d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="{ACCENT}" stroke-width="1.1" stroke-dasharray="2 3"/>')

    def actor(self, x, y, name, color=INK, scale=1.0):
        s = scale
        self.add(
            f'<g stroke="{color}" stroke-width="1.8" fill="none" stroke-linecap="round">'
            f'<circle cx="{x}" cy="{y - 22 * s}" r="{8 * s}" fill="#ffffff"/>'
            f'<path d="M{x},{y - 14 * s} v{20 * s} M{x - 13 * s},{y - 6 * s} h{26 * s} '
            f'M{x},{y + 6 * s} l{-11 * s},{15 * s} M{x},{y + 6 * s} l{11 * s},{15 * s}"/></g>'
        )
        self.text(x, y + 33 * s, name, size=12, weight=600)

    def ellipse(self, cx, cy, rx, ry, name, cat="operational", stereo=None, size=12.5):
        stroke, f1, _ = PALETTE[cat]
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{f1}" stroke="{stroke}" stroke-width="1.6"/>')
        if stereo:
            self.text(cx, cy - 9, f"«{stereo}»", size=10.5, color=stroke, italic=True)
            self.text(cx, cy + 7, name, size=size, weight=600)
        else:
            self.text(cx, cy, name, size=size, weight=600)

    def action(self, x, y, w, h, name, cat="functional", stereo=None, soft=False):
        stroke, f1, f2 = PALETTE[cat]
        self.rect(x, y, w, h, fill=f2 if soft else f1, stroke=stroke, sw=1.6, rx=min(h / 2, 16))
        if stereo:
            self.text(x + w / 2, y + h / 2 - 8, f"«{stereo}»", size=10.5, color=stroke, italic=True)
            self.text(x + w / 2, y + h / 2 + 8, name, size=12.5, weight=600)
        else:
            self.text(x + w / 2, y + h / 2, name, size=12.5, weight=600)
        return Box(x, y, w, h)

    def pin(self, box: Box, side: str, f: float, cat="functional", direction="in"):
        return self.port(box, side, f, direction=direction, cat=cat, size=11)

    def initial(self, cx, cy, r=8):
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{INK}"/>')
        return (cx, cy)

    def final(self, cx, cy, r=10):
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" stroke="{INK}" stroke-width="1.6"/>'
                 f'<circle cx="{cx}" cy="{cy}" r="{r - 4}" fill="{INK}"/>')
        return (cx, cy)

    def diamond(self, cx, cy, s=16, fill="#ffffff", stroke=INK):
        self.add(f'<path d="M{cx},{cy - s} L{cx + s},{cy} L{cx},{cy + s} L{cx - s},{cy} z" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')
        return Box(cx - s, cy - s, 2 * s, 2 * s)

    def bar(self, x, y, w, h):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{INK}"/>')
        return Box(x, y, w, h)

    def note(self, x, y, w, h, s, size=11.5, color=MUTED):
        fold = 10
        self.add(
            f'<path d="M{x},{y} h{w - fold} l{fold},{fold} v{h - fold} h{-w} z" fill="#fffdf2" stroke="#c9b458" stroke-width="1.1"/>'
            f'<path d="M{x + w - fold},{y} v{fold} h{fold}" fill="none" stroke="#c9b458" stroke-width="1.1"/>'
        )
        self.text(x + w / 2, y + h / 2, s, size=size, color=color)

    def chip(self, x, y, s, cat="neutral", size=11.5, anchor="start", bold=False):
        stroke, f1, _ = PALETTE[cat]
        w = text_width(s, size, 600 if bold else 400) + 14
        h = size + 9
        x0 = x if anchor == "start" else x - w / 2
        self.add(f'<rect x="{x0:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="5" fill="{f1}" stroke="{stroke}" stroke-width="1"/>')
        self.text(x0 + w / 2, y, s, size=size, color=INK, weight=600 if bold else 400)
        return Box(x0, y - h / 2, w, h)

    def legend(self, x, y, items, gap=22, size=11.5):
        """items: (kind, colour, label) where kind is 'line', 'dash', 'arrow', 'box'."""
        for i, (kind, color, label) in enumerate(items):
            yy = y + i * gap
            if kind == "box":
                self.rect(x, yy - 7, 22, 14, fill=PALETTE[color][1], stroke=PALETTE[color][0], sw=1.2, rx=3)
            else:
                c = PALETTE[color][0] if color in PALETTE else color
                self.line([(x, yy), (x + 26, yy)], color=c, dash="5 4" if kind == "dash" else None,
                          end="open" if kind in ("dash", "open") else ("arrow" if kind == "arrow" else None))
            self.text(x + 34, yy, label, size=size, color=MUTED, anchor="start")

    # ── output ──────────────────────────────────────────────────────────
    def svg(self) -> str:
        top = 0
        head = []
        if self.title:
            head.append(
                f'<text x="24" y="30" font-family="{FONT}" font-size="15" font-weight="700" fill="{ACCENT}">{escape(self.title)}</text>'
            )
            if self.subtitle:
                head.append(
                    f'<text x="24" y="50" font-family="{FONT}" font-size="12" fill="{MUTED}">{escape(self.subtitle)}</text>'
                )
        defs = "<defs>" + "".join(self.markers.values()) + "</defs>"
        label = escape(self.title or "Figure")
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
            f'role="img" aria-label="{label}">'
            f"{defs}"
            f'<rect x="0.5" y="0.5" width="{self.w - 1}" height="{self.h - 1}" rx="14" fill="{CARD}" stroke="{CARD_EDGE}"/>'
            + "".join(head)
            + "".join(self.body)
            + "</svg>\n"
        )

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(self.svg())
