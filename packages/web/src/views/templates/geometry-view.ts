// ─── Geometry View Template (KK-9) ───────────────────────────────────────────
//
// Data preparation for the SysML v2 `geometry` view kind: a captured screen
// image with the UIElement tree drawn over it at each element's authored bounds.
//
// Bounds are normalized 0..1 **to the parent element**, not to the frame, so a
// child's box is stated against its parent exactly as the containment tree
// asserts. This module walks the Composes tree accumulating transforms; a box
// rendered frame-relative would be wrong for every element below the root.
//
// Geometry only — no traceability is read here. An element's requirements,
// functions, use errors, and risk controls hang off the element itself and are
// resolved by the properties panel, the same as for any other part.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';

/** A rectangle in frame coordinates: 0..1 of the capture, origin top-left. */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** One UIElement placed on the capture. */
export interface ScreenLayoutNode {
    element: MemoElement;
    /** Absolute rect in frame coordinates, after accumulating parent transforms. */
    rect: Rect;
    /** Depth below the captured screen; the screen itself is 0. */
    depth: number;
    /** Ids of the direct children, in declaration order. */
    childIds: string[];
    parentId?: string;
    formKind: string;
    disclosureKind: string;
    /** CSS colour token from the model, when the modeller set one. */
    boundaryColor?: string;
    /** Modelled fill opacity (0..1) used to reveal the capture below a region. */
    boundaryOpacity: number;
    /** True when bounds came from automatic detection and no one confirmed them. */
    unconfirmed: boolean;
    detectionConfidence?: number;
    /** Target screen element id when activating this element navigates away. */
    navigatesToId?: string;
}

export interface ScreenLayoutScene {
    capture?: MemoElement;
    /** The screen UIElement the capture depicts. */
    screen?: MemoElement;
    imageUri?: string;
    pixelWidth?: number;
    pixelHeight?: number;
    nodes: ScreenLayoutNode[];
    /** Why the scene is empty, when it is — surfaced instead of a blank canvas. */
    emptyReason?: string;
}

/** Disclosure kinds that are drawn over the parent and siblings, never clipped. */
const OVERLAY_DISCLOSURES = new Set(['overlay', 'transient']);

/** Strip the enum type prefix: "UIElementFormKind::field" → "field". */
function enumValue(raw: string | undefined): string {
    if (!raw) return '';
    const i = raw.lastIndexOf('::');
    return i >= 0 ? raw.slice(i + 2) : raw;
}

function num(raw: string | undefined): number | undefined {
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
}

/**
 * Read `bounds` off an element. The builder flattens structured attribute values
 * to dotted keys, so `attribute :>> bounds { attribute :>> x = 0.1; }` arrives as
 * `bounds.x`. An element with no bounds is not laid out and is skipped.
 */
export function readBounds(el: MemoElement): Rect | undefined {
    const a = el.attributes ?? {};
    const x = num(a['bounds.x']);
    const y = num(a['bounds.y']);
    const width = num(a['bounds.width']);
    const height = num(a['bounds.height']);
    if (x === undefined || y === undefined || width === undefined || height === undefined) return undefined;
    return { x, y, width, height };
}

/** Place a child's parent-relative bounds into frame coordinates. */
export function toFrame(parent: Rect, child: Rect): Rect {
    return {
        x: parent.x + child.x * parent.width,
        y: parent.y + child.y * parent.height,
        width: child.width * parent.width,
        height: child.height * parent.height,
    };
}

function relatedIds(rels: MemoRelationship[], type: string): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const r of rels) {
        if (r.type.toLowerCase() !== type) continue;
        const list = out.get(r.sourceId) ?? [];
        list.push(r.targetId);
        out.set(r.sourceId, list);
    }
    return out;
}

/**
 * Build the scene for one capture. `captureId` selects which ScreenCapture is the
 * backdrop; when omitted the first capture in the model is used, so a view that
 * exposes a single screen needs no extra configuration.
 */
export function computeScreenLayout(
    model: MemoModelDTO,
    options: { captureId?: string } = {},
): ScreenLayoutScene {
    const elements = Object.values(model.elements ?? {});
    const byId = new Map(elements.map(e => [e.id, e]));
    const rels = model.relationships ?? [];

    const captures = elements.filter(e => e.kind === 'ScreenCapture');
    const capture = options.captureId
        ? captures.find(c => c.id === options.captureId)
        : captures[0];
    if (!capture) {
        return { nodes: [], emptyReason: 'No ScreenCapture in this view.' };
    }

    // CapturesScreen: capture → the screen UIElement it depicts.
    const capturesScreen = relatedIds(rels, 'capturesscreen');
    const screenId = (capturesScreen.get(capture.id) ?? [])[0];
    const screen = screenId ? byId.get(screenId) : undefined;
    if (!screen) {
        return {
            capture,
            nodes: [],
            emptyReason: `"${capture.name}" is not linked to a screen by CapturesScreen.`,
        };
    }

    const composes = relatedIds(rels, 'composes');
    const navigates = relatedIds(rels, 'navigatesto');

    // A capture may depict a full screen or a recursively focused sub-region.
    // Its captured root always owns the full frame; authored bounds remain
    // parent-relative only when that same element is seen from its parent view.
    const screenBounds = { x: 0, y: 0, width: 1, height: 1 };
    const nodes: ScreenLayoutNode[] = [];
    const seen = new Set<string>();
    const capturedRoots = new Set(
        [...capturesScreen.values()].flat(),
    );

    const walk = (el: MemoElement, rect: Rect, depth: number, parentId?: string) => {
        if (seen.has(el.id)) return; // CR-ONT-001 forbids cycles; tolerate anyway
        seen.add(el.id);

        const a = el.attributes ?? {};
        const detection = enumValue(a['detectionMethod']);
        const childIds = (composes.get(el.id) ?? []).filter(id => {
            const child = byId.get(id);
            return !!child && child.kind === 'UIElement' && !!readBounds(child);
        });

        nodes.push({
            element: el,
            rect,
            depth,
            childIds,
            parentId,
            formKind: enumValue(a['formKind']),
            disclosureKind: enumValue(a['disclosureKind']) || 'inline',
            boundaryColor: a['boundaryColor'] || undefined,
            boundaryOpacity: Math.max(0, Math.min(1, num(a['boundaryOpacity']) ?? 0.12)),
            unconfirmed: detection === 'automatic' && !(a['confirmedBy'] ?? '').trim(),
            detectionConfidence: num(a['detectionConfidence']),
            navigatesToId: (navigates.get(el.id) ?? [])[0],
        });

        // A child with its own capture is an encapsulated recursion boundary:
        // show the region here, then reveal its children in the focused capture.
        if (el.id !== screen.id && capturedRoots.has(el.id)) return;

        for (const id of childIds) {
            const child = byId.get(id)!;
            walk(child, toFrame(rect, readBounds(child)!), depth + 1, el.id);
        }
    };

    walk(screen, screenBounds, 0);

    return {
        capture,
        screen,
        imageUri: normalizeCaptureUri(capture.attributes?.['imageUri']),
        pixelWidth: num(capture.attributes?.['pixelWidth']),
        pixelHeight: num(capture.attributes?.['pixelHeight']),
        nodes,
    };
}

/** Project-relative capture paths must remain root-relative on nested routes. */
function normalizeCaptureUri(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    if (raw.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
    return `/${raw}`;
}

/** Every capture in the model, for the view's backdrop picker and click-through. */
export function listCaptures(model: MemoModelDTO): MemoElement[] {
    return Object.values(model.elements ?? {}).filter(e => e.kind === 'ScreenCapture');
}

/**
 * The capture depicting a given screen, used to follow a NavigatesTo edge from
 * one layout to the next.
 */
export function captureForScreen(model: MemoModelDTO, screenId: string): MemoElement | undefined {
    const rels = model.relationships ?? [];
    const rel = rels.find(r => r.type.toLowerCase() === 'capturesscreen' && r.targetId === screenId);
    if (!rel) return undefined;
    // Project DTO dictionaries may be keyed by authored usage name while
    // relationship endpoints carry the stable authored id. Resolve by value id
    // as well as dictionary key so recursive captures work in both shapes.
    return (model.elements ?? {})[rel.sourceId]
        ?? Object.values(model.elements ?? {}).find(element => element.id === rel.sourceId);
}

/**
 * Capture whose coordinate frame contains a selected element. The element's
 * own capture is deliberately not used: selecting a captured region should
 * show that region in its parent frame; selecting one of its descendants
 * opens the region's capture so the descendant can actually be highlighted.
 */
export function captureForSelectionContext(
    model: MemoModelDTO,
    rootScreenId: string,
    selectedElementId: string,
): MemoElement | undefined {
    const composedParent = new Map(
        (model.relationships ?? [])
            .filter(relationship => relationship.type.toLowerCase() === 'composes')
            .map(relationship => [relationship.targetId, relationship.sourceId]),
    );
    const seen = new Set<string>();
    let ancestorId = composedParent.get(selectedElementId);
    while (ancestorId && ancestorId !== rootScreenId && !seen.has(ancestorId)) {
        seen.add(ancestorId);
        const capture = captureForScreen(model, ancestorId);
        if (capture) return capture;
        ancestorId = composedParent.get(ancestorId);
    }
    return captureForScreen(model, rootScreenId);
}

/** True when the element is drawn over its parent and must not be clipped. */
export function isOverlay(node: ScreenLayoutNode): boolean {
    return OVERLAY_DISCLOSURES.has(node.disclosureKind);
}
