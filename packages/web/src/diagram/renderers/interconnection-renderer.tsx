// ─── Interconnection renderer hierarchy ──────────────────────────────────────
//
// The interconnection (IBD) view is drawn by a small set of overridable methods
// — how a port is glyphed, coloured, sized and labelled; how its nested-port
// housing looks; how a connector line is routed; and a few interaction switches.
// A *renderer* is one class implementing those methods.
//
//   BaseInterconnectionRenderer   → default SysML IBD notation. Every view uses
//                                   it unless it opts into a subclass, so a view
//                                   can never regress by adding one.
//   IbdInterconnectionRenderer    → a stricter dedicated IBD canvas. Extends the
//                   extends Base     base and overrides only the methods it needs
//                                   (square wall ports, solid housings, orthogonal
//                                   crossing-bridge routing, monochrome shading).
//
// The hierarchy is real inheritance, not object spread: a subclass overrides a
// method and may call `super.method(...)` to build on its parent. A project adds
// a "Custom IBD" renderer as `class CustomIbd extends IbdInterconnectionRenderer`
// and overrides just what differs — the Base → IBD → Custom chain.
//
// A view selects its renderer through its layout companion (`canvas.renderer`),
// resolved per view in DiagramCanvas and supplied to the node/edge components
// through context.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { PortInfo, PortSide } from '../../views/templates/interconnection-view';
import {
    INTERCONNECTION_PORT_SIZE, NESTED_PITCH, NESTED_PIN_INSET, NESTED_HOUSING_DEPTH,
    PORT_DIR_COLORS,
} from '../../views/templates/interconnection-view';

export type RouteQuality = 'direct' | 'tidy';

export interface Point { x: number; y: number }

export interface PortLabelContext {
    /** Distance from the port square to its caption. */
    labelOffset: number;
}

export interface EdgePathContext {
    edgeId: string;
    /** Every routed edge on the canvas — a renderer may draw crossing bridges. */
    allEdges: ReadonlyArray<{ id: string; points?: Point[] }>;
}

export interface NodeStyleContext {
    isFrame: boolean;
    isContainer: boolean;
    hasChildren: boolean;
    hovered: boolean;
    /** Layer/automatic colour for this node (accent + fallbacks). */
    color: string;
    /** Per-diagram fill override authored on the layout, if any. */
    bgColor?: string;
    /** Per-diagram border override authored on the layout, if any. */
    borderColor?: string;
}

export interface NodeContainerStyle {
    background: string;
    border: string;
    borderTop?: string;
}

const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
    top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

const NEUTRAL_PORT = '#6B7280';
const GROUP_PAD = 7;

/** Rounded orthogonal path through the given waypoints (default connector look). */
export function roundedPath(points: Point[], radius = 7): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1], cur = points[i], next = points[i + 1];
        const incoming = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const outgoing = Math.hypot(next.x - cur.x, next.y - cur.y);
        const r = Math.min(radius, incoming / 2, outgoing / 2);
        const inX = cur.x - Math.sign(cur.x - prev.x) * r;
        const inY = cur.y - Math.sign(cur.y - prev.y) * r;
        const outX = cur.x + Math.sign(next.x - cur.x) * r;
        const outY = cur.y + Math.sign(next.y - cur.y) * r;
        path += ` L ${inX},${inY} Q ${cur.x},${cur.y} ${outX},${outY}`;
    }
    const last = points[points.length - 1];
    return `${path} L ${last.x},${last.y}`;
}

// ─── Base renderer: the default SysML IBD notation ────────────────────────────

/**
 * The root of the renderer hierarchy. Every method here is the default the whole
 * app has always used; subclasses override individual methods (and may call
 * `super`). Methods are pure — they take everything they need as arguments, so a
 * React node/edge component can call them from render.
 */
export class BaseInterconnectionRenderer {
    get id(): string { return 'memo.renderer.reactflow'; }

    // ── Ports ────────────────────────────────────────────────────────────────
    /** Direction → square colour (border + glyph). */
    portColor(direction: PortInfo['direction'], _port: PortInfo): string {
        return direction ? PORT_DIR_COLORS[direction] : NEUTRAL_PORT;
    }

    /** Glyph drawn inside the square. May be text or an SVG arrow. */
    portGlyph(direction: PortInfo['direction'], side: PortSide, _port: PortInfo): ReactNode {
        if (direction === 'inout') return '⇄';
        if (!direction) return '';
        const inward = direction === 'in';
        switch (side) {
            case 'left': return inward ? '→' : '←';
            case 'right': return inward ? '←' : '→';
            case 'top': return inward ? '↓' : '↑';
            default: return inward ? '↑' : '↓';
        }
    }

    /** On-screen square edge length. */
    portSize(port: PortInfo): number {
        return port.size ?? INTERCONNECTION_PORT_SIZE;
    }

    /** When a profile draws every port at ONE size regardless of the authored
     *  `port.size`, this is that size — connector anchoring uses it so the line
     *  meets the rendered square, not the authored one. Undefined = honour size. */
    get forcedPortSize(): number | undefined { return undefined; }

    /** Corner radius of the square. */
    portBoxBorderRadius(_port: PortInfo): number { return 5; }

    /** Rectangle (node-local) enclosing a parent port and its nested squares.
     *  Matches the scene's nested-pin placement, so a subclass restyling the
     *  housing keeps it aligned with the pins. */
    protected nestedHousingRect(port: PortInfo): { left: number; top: number; width: number; height: number } {
        // The parent port's own body: a box straddling its owner's wall, long
        // enough to carry its column of child ports. The children are bound to
        // THIS box's edge (SysML nested ports), not to the owner's wall.
        const vertical = port.side === 'left' || port.side === 'right';
        const count = Math.max(port.nestedCount ?? 1, 1);
        const alongStart = vertical ? port.y : port.x;
        const alongLen = (count - 1) * NESTED_PITCH + INTERCONNECTION_PORT_SIZE + NESTED_PIN_INSET * 2;
        const crossStart = vertical ? port.x : port.y;
        return {
            left: vertical ? crossStart : alongStart,
            top: vertical ? alongStart : crossStart,
            width: vertical ? NESTED_HOUSING_DEPTH : alongLen,
            height: vertical ? alongLen : NESTED_HOUSING_DEPTH,
        };
    }

    /** Visual style of the housing frame. Subclasses override just this. */
    protected nestedHousingStyle(): CSSProperties {
        return {
            background: 'rgba(148,163,184,0.30)',
            border: '1px solid rgba(100,116,139,0.45)',
            borderRadius: 9,
            pointerEvents: 'none',
        };
    }

    /** Whether the housing carries the connector's own name as a group title.
     *  A boundary feature that gathers several pins is one named thing on the
     *  case ("Return Electrode LEDs"), so naming the group is what lets a reader
     *  tell the cluster apart from a run of unrelated squares. */
    get nestedGroupLabels(): boolean { return false; }

    /** The outline/housing drawn behind a parent port and its nested squares. */
    nestedPortHousing(port: PortInfo, _ctx?: { showText?: boolean }): ReactNode {
        // The group title is the boundary FEATURE's identity ("Return Electrode
        // LEDs"), not a per-port caption, so it survives `showPortText: false` —
        // the setting that hides the individual pin names on a dense board.
        const labelled = this.nestedGroupLabels && Boolean(port.name);
        const rect = this.nestedHousingRect(port);
        const vertical = port.side === 'left' || port.side === 'right';
        // Child ports straddle the body's faces, so they stick out half a square
        // past it; the title has to clear that overhang, not just the body.
        const clear = INTERCONNECTION_PORT_SIZE / 2 + 8;
        return (
            <div
                aria-hidden
                // Grabbing the connector body must move the body, not pan the board
                // or drag the part it sits on.
                className="nodrag nopan"
                style={{ position: 'absolute', zIndex: 0, ...rect, ...this.nestedHousingStyle() }}
            >
                {labelled && (
                    <span style={{
                        position: 'absolute',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.01em',
                        color: '#475569', pointerEvents: 'none',
                        // Never longer than the body it names, so two neighbouring
                        // groups can never run their titles into each other.
                        ...(vertical
                            ? { maxHeight: rect.height, writingMode: 'vertical-rl' as const }
                            : { maxWidth: rect.width }),
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        ...(port.side === 'left'
                            ? { right: '100%', marginRight: clear, top: 0, transform: 'rotate(180deg)' }
                            : port.side === 'right'
                            ? { left: '100%', marginLeft: clear, top: 0 }
                            : port.side === 'top'
                            ? { bottom: '100%', marginBottom: clear, left: 0 }
                            : { top: '100%', marginTop: clear, left: 0 }),
                    }}>
                        {port.name}
                    </span>
                )}
            </div>
        );
    }

    /** Absolute-positioning style for a port's caption, keyed on its wall. */
    portLabelPlacement(port: PortInfo, { labelOffset }: PortLabelContext): CSSProperties {
        return port.side === 'left' ? { left: labelOffset, bottom: '50%', marginBottom: 2 }
            : port.side === 'right' ? { right: labelOffset, bottom: '50%', marginBottom: 2, textAlign: 'right' }
            : { bottom: labelOffset, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' };
    }

    /** Whether a part draws implicit in/out proxy squares for direct edges. */
    renderImplicitPorts(): boolean { return true; }

    /** Whether a port face accepts connector-draw gestures. */
    portConnectable(_port: PortInfo): boolean { return true; }

    // ── Node styling ───────────────────────────────────────────────────────────
    /** Full container fill/border/top-accent for a node. A per-diagram override
     *  still wins, so a reviewer's fill/border colour is never lost. */
    nodeContainerStyle(ctx: NodeStyleContext): NodeContainerStyle {
        const { isFrame, hovered, color, bgColor, borderColor } = ctx;
        return {
            background: bgColor || '#FFFFFF',
            border: isFrame
                ? `1.5px solid ${borderColor ?? '#94A3B8'}`
                : `1px solid ${borderColor ?? (hovered ? color + '9A' : '#CBD5E1')}`,
            borderTop: isFrame ? undefined : `3px solid ${borderColor ?? color}`,
        };
    }

    /** Background of the «IBD» badge in the frame bar. */
    frameBadgeBackground(color: string): string { return color; }

    // ── Lines ──────────────────────────────────────────────────────────────────
    /** SVG path for a routed connector. */
    edgePath(points: Point[], _ctx: EdgePathContext): string {
        return roundedPath(points);
    }

    /** Stroke colour for a connector, given the style the template supplied. */
    edgeStroke(styleStroke: string | undefined): string {
        return styleStroke ?? '#2563EB';
    }

    /** Auto-route quality used when a view first lays its edges out. */
    get routeQuality(): RouteQuality { return 'direct'; }

    // ── Interaction ──────────────────────────────────────────────────────────────
    /** Dragging a part carries its nested child parts with it. */
    get dragChildrenWithParent(): boolean { return false; }
    /** Resizing a part keeps its boundary ports pinned to the perimeter walls. */
    get wallSnapPortsOnResize(): boolean { return false; }
    /**
     * Whether the canvas may AUTHOR model content — draw a connector between
     * two ports, drop a kind from the palette, double-click to create a part.
     *
     * Disabled, because a view is a reading of the model and not a place to
     * write one. Dragging from a port used to open the relationship picker and
     * write a SysML relationship; the gesture is indistinguishable from trying
     * to pan or select, and a diagram that silently authors is a diagram you
     * cannot explore safely.
     *
     * Relationships are still authored — in the SysML, or in the traceability
     * matrix, which exists to establish trace and says so. This only removes
     * authoring from the drawing.
     *
     * It stays a renderer property rather than a constant so a project can
     * subclass and opt back in, the way every other interaction rule here can
     * be overridden.
     */
    get disableOnCanvasAuthoring(): boolean { return true; }
    /** A port drag snaps to whichever of the four walls the cursor is nearest and
     *  slides along it (vs. the default vertical-only nudge). */
    get multiWallPortDrag(): boolean { return false; }
    /** Dragging a part may not leave it overlapping a sibling (only a parent may
     *  contain a child); an overlapping drop reverts. */
    get preventPartOverlap(): boolean { return false; }
}

// ─── Dedicated IBD renderer: strict wall ports, orthogonal crossing lines ──────

/** The automatic per-layer fill tints. When one of these lands on a node as its
 *  `bgColor` it is a layout default, not authored markup, so the IBD renderer
 *  replaces it with its depth-based grey. Any other `#rrggbb` is kept. */
const IBD_LAYER_TINTS = new Set([
    '#828d9c', '#cbd5e1', '#f1f5f9', '#dcfce7', '#bbf7d0', '#fef3c7', '#fef9c3',
    '#e0f2fe', '#e0e7ff', '#f0fdf4', '#fffbeb', '#fefce8', '#f8fafc', '#f0f9ff',
]);

/** SVG direction arrow for the IBD port square. */
function ibdArrowPath(direction: PortInfo['direction'], side: PortSide): string | null {
    const d = String(direction ?? '').toLowerCase();
    if (!d) return null;
    const isV = side === 'top' || side === 'bottom';
    if (d === 'inout') {
        return isV
            ? 'M5 1.5v7M2.5 3.5L5 1.5l2.5 2M2.5 6.5L5 8.5l2.5-2'
            : 'M1.5 5h7M3.5 2.5L1.5 5l2 2.5M6.5 2.5L8.5 5l-2 2.5';
    }
    const isIn = d === 'in';
    switch (side) {
        case 'left': return isIn ? 'M2 5h6M5.5 2.5L8 5l-2.5 2.5' : 'M8 5H2M4.5 2.5L2 5l2.5 2.5';
        case 'right': return isIn ? 'M8 5H2M4.5 2.5L2 5l2.5 2.5' : 'M2 5h6M5.5 2.5L8 5l-2.5 2.5';
        case 'top': return isIn ? 'M5 2v6M2.5 5.5L5 8l2.5-2.5' : 'M5 8V2M2.5 4.5L5 2l2.5 2.5';
        default: return isIn ? 'M5 8V2M2.5 4.5L5 2l2.5 2.5' : 'M5 2v6M2.5 5.5L5 8l2.5-2.5';
    }
}

export class IbdInterconnectionRenderer extends BaseInterconnectionRenderer {
    override get id(): string { return 'memo.renderer.ibd'; }

    // portColor is inherited: the in=orange/out=green convention now lives in the
    // base PORT_DIR_COLORS, so every view (not just this one) follows it.

    override portGlyph(direction: PortInfo['direction'], side: PortSide, port: PortInfo): ReactNode {
        // A nested output pin sits on the housing's inner wall, so its arrow
        // reads against the opposite wall to the parent connector's inputs.
        const glyphSide = port.nested && direction === 'out' ? OPPOSITE_SIDE[side] : side;
        const d = ibdArrowPath(direction, glyphSide);
        if (!d) return null;
        return (
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor"
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ display: 'block', pointerEvents: 'none' }}>
                <path d={d} />
            </svg>
        );
    }

    // Fixed square: declaration-specific sizes must not change notation.
    override portSize(): number { return INTERCONNECTION_PORT_SIZE; }
    override get forcedPortSize(): number { return INTERCONNECTION_PORT_SIZE; }

    override portBoxBorderRadius(): number { return 2; }

    // Solid grabbable housing, on the same rect the base computes (so it stays
    // aligned with the scene's nested pins).
    override get nestedGroupLabels(): boolean { return true; }

    protected override nestedHousingStyle(): CSSProperties {
        return {
            background: '#F1F5F9',
            border: '1.5px solid #94A3B8',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
            pointerEvents: 'auto',
            cursor: 'grab',
        };
    }

    override portLabelPlacement(port: PortInfo, { labelOffset: o }: PortLabelContext): CSSProperties {
        const isOutputish = port.x > 0 || String(port.id ?? '').toLowerCase().includes('output');
        if (port.side === 'left' && isOutputish)
            return { left: o + 6, bottom: '50%', marginBottom: 2, textAlign: 'left', writingMode: 'horizontal-tb', whiteSpace: 'nowrap', width: 'auto' };
        if (port.side === 'right' && port.x < 1800)
            return { right: o + 6, bottom: '50%', marginBottom: 2, textAlign: 'right', writingMode: 'horizontal-tb', whiteSpace: 'nowrap', width: 'auto' };
        if (port.side === 'left')
            return { right: port.nested ? o + 20 : o, bottom: '50%', marginBottom: 2, textAlign: 'right', writingMode: 'horizontal-tb', whiteSpace: 'nowrap', width: 'auto' };
        if (port.side === 'right')
            return { left: port.nested ? o + 20 : o, bottom: '50%', marginBottom: 2, textAlign: 'left', writingMode: 'horizontal-tb', whiteSpace: 'nowrap', width: 'auto' };
        if (port.side === 'top')
            return { bottom: port.nested ? o + 20 : o, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', writingMode: 'vertical-rl', whiteSpace: 'nowrap', width: 'auto' };
        return { top: port.nested ? o + 20 : o, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', writingMode: 'vertical-rl', whiteSpace: 'nowrap', width: 'auto' };
    }

    override renderImplicitPorts(): boolean { return false; }

    override portConnectable(): boolean { return false; }

    // Monochrome shading: parts read as light grey→white by depth (frame darkest,
    // then container, then leaf), NOT the automatic per-layer tints. A per-diagram
    // fill that is a real authored colour (not one of the layer tints below) still
    // wins, so a reviewer's markup survives. Borders and the top accent go grey too.
    override nodeContainerStyle(ctx: NodeStyleContext): NodeContainerStyle {
        const { isFrame, isContainer, bgColor } = ctx;
        const mono = isFrame ? '#e9ecef' : isContainer ? '#f4f6f8' : '#ffffff';
        const keepsFill = bgColor && bgColor.startsWith('#') && !IBD_LAYER_TINTS.has(bgColor.toLowerCase());
        // Borders and the top accent are uniform grey — the automatic per-layer
        // border colour is deliberately dropped so the drawing reads by structure,
        // not colour.
        const line = isContainer ? '#cbd5e1' : '#e2e8f0';
        return {
            background: keepsFill ? bgColor! : mono,
            border: isFrame ? '1.5px solid #94a3b8' : `1px solid ${line}`,
            borderTop: isFrame ? undefined : `3px solid ${line}`,
        };
    }

    override frameBadgeBackground(): string { return '#475569'; }

    // Uniform slate connectors: a physical IBD reads its wiring by routing and
    // ports, not by a per-flow-kind colour wash.
    override edgeStroke(): string { return '#334155'; }

    /** Crossing-bridge orthogonal path: forces axis-aligned segments, arcs over
     *  perpendicular wires it crosses, and rounds its own corners. */
    override edgePath(rawPoints: Point[], ctx: EdgePathContext): string {
        const t = 7;
        if (!rawPoints || rawPoints.length < 2) return '';
        // 1. Force every segment orthogonal by inserting an elbow midpoint.
        const pts: Point[] = [rawPoints[0]];
        for (let i = 1; i < rawPoints.length; i++) {
            const p0 = pts[pts.length - 1], p1 = rawPoints[i];
            if (Math.abs(p0.x - p1.x) > 1 && Math.abs(p0.y - p1.y) > 1) {
                const mx = (p0.x + p1.x) / 2;
                pts.push({ x: mx, y: p0.y }, { x: mx, y: p1.y });
            }
            pts.push(p1);
        }
        // 2. Collect vertical segments of OTHER edges, to bridge where crossed.
        const vSegs: Array<{ x: number; yMin: number; yMax: number }> = [];
        for (const ed of ctx.allEdges) {
            if (ed.id === ctx.edgeId || !ed.points || ed.points.length < 2) continue;
            for (let j = 1; j < ed.points.length; j++) {
                const a = ed.points[j - 1], b = ed.points[j];
                if (Math.abs(a.x - b.x) < 0.5) vSegs.push({ x: (a.x + b.x) / 2, yMin: Math.min(a.y, b.y), yMax: Math.max(a.y, b.y) });
            }
        }
        let s = `M ${pts[0].x},${pts[0].y}`;
        const R = 5.5;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1], cur = pts[i], isLast = i === pts.length - 1;
            const isH = Math.abs(prev.y - cur.y) < 0.5;
            if (isH && vSegs.length) {
                const y = (prev.y + cur.y) / 2, xMin = Math.min(prev.x, cur.x), xMax = Math.max(prev.x, cur.x), fwd = cur.x > prev.x;
                let cxs = vSegs.filter(v => v.x > xMin + 10 && v.x < xMax - 10 && y > v.yMin + 2 && y < v.yMax - 2).map(v => v.x);
                cxs.sort((a, b) => (fwd ? a - b : b - a));
                cxs = cxs.filter((cx, idx) => idx === 0 || Math.abs(cx - cxs[idx - 1]) > 12);
                for (const cx of cxs) {
                    const stX = fwd ? cx - R : cx + R, enX = fwd ? cx + R : cx - R;
                    s += ` L ${stX},${y} A ${R} ${R} 0 0 0 ${enX} ${y}`;
                }
            }
            if (!isLast) {
                const next = pts[i + 1];
                const back = Math.hypot(cur.x - prev.x, cur.y - prev.y), fwd = Math.hypot(next.x - cur.x, next.y - cur.y);
                const j = Math.min(t, back / 2, fwd / 2);
                const inX = cur.x - Math.sign(cur.x - prev.x) * j, inY = cur.y - Math.sign(cur.y - prev.y) * j;
                const outX = cur.x + Math.sign(next.x - cur.x) * j, outY = cur.y + Math.sign(next.y - cur.y) * j;
                s += ` L ${inX},${inY} Q ${cur.x},${cur.y} ${outX},${outY}`;
            } else {
                s += ` L ${cur.x},${cur.y}`;
            }
        }
        return s;
    }

    override get routeQuality(): RouteQuality { return 'tidy'; }

    override get dragChildrenWithParent(): boolean { return true; }
    override get wallSnapPortsOnResize(): boolean { return true; }
    override get multiWallPortDrag(): boolean { return true; }
    override get preventPartOverlap(): boolean { return true; }
}

/** The renderer type used across the app is the base class; every subclass is
 *  assignable to it. */
export type InterconnectionRenderer = BaseInterconnectionRenderer;

// ── Registry + per-view resolution ────────────────────────────────────────────

const RENDERER_ID_PREFIX = 'memo.renderer.';
const registry = new Map<string, InterconnectionRenderer>();

export const baseInterconnectionRenderer = new BaseInterconnectionRenderer();
export const ibdInterconnectionRenderer = new IbdInterconnectionRenderer();

export function registerInterconnectionRenderer(renderer: InterconnectionRenderer): void {
    registry.set(renderer.id, renderer);
}

registerInterconnectionRenderer(baseInterconnectionRenderer);
registerInterconnectionRenderer(ibdInterconnectionRenderer);

/** Resolve a view's `canvas.renderer` (id or short name) to a renderer; the base
 *  renderer answers for absent/unknown ids, so a view never fails to render. */
export function resolveInterconnectionRenderer(id: string | null | undefined): InterconnectionRenderer {
    const trimmed = id?.trim();
    if (!trimmed) return baseInterconnectionRenderer;
    const full = trimmed.includes('.') ? trimmed : `${RENDERER_ID_PREFIX}${trimmed}`;
    return registry.get(full) ?? baseInterconnectionRenderer;
}

export const InterconnectionRendererContext =
    createContext<InterconnectionRenderer>(baseInterconnectionRenderer);

export function useInterconnectionRenderer(): InterconnectionRenderer {
    return useContext(InterconnectionRendererContext);
}
