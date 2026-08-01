// ─── ScreenLayoutView ────────────────────────────────────────────────────────
//
// Renderer for the Geometry view kind (KK-9): a captured screen image with the
// UIElement tree drawn over it at each element's authored bounds.
//
// Selection isolates. On a dense medical screen a dozen simultaneously outlined
// boxes is unreadable, so unselected elements drop to low-opacity hairlines
// while the selected element and its direct children keep full-strength
// boundaries. That is the behaviour the feature was specified for, not a
// styling preference.
//
// Overlay and transient elements (dropdown, popover, modal, tooltip) draw on top
// and are never clipped: escaping the parent box is correct for them, and only
// `disclosureKind` distinguishes that from a layout defect.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { DiagramDTO, MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { FONT } from '../styles/tokens';
import {
    computeScreenLayout, captureForScreen, isOverlay,
    type Rect, type ScreenLayoutNode,
} from './templates/geometry-view';

interface ScreenLayoutViewProps {
    diagram: DiagramDTO;
    model: MemoModelDTO;
    captureId?: string;
    viewpointFilter?: (el: MemoElement) => boolean;
    editable?: boolean;
    drawMode?: boolean;
    newElementDefaultName?: string;
    onCreateBounds?: (bounds: Rect, name: string) => void;
    onBoundsChange?: (elementId: string, bounds: Rect) => void;
    proposals?: ScreenRegionProposal[];
    onAcceptProposal?: (id: string) => void;
    onRejectProposal?: (id: string) => void;
}

export interface ScreenRegionProposal {
    id: string;
    bounds: Rect;
    confidence: number;
    parentId?: string;
    status: 'pending' | 'accepted' | 'rejected';
}

/** Fallback stroke per form kind, used when the model sets no boundaryColor. */
const FORM_COLORS: Record<string, string> = {
    screen: '#1B3A4B',
    panel: '#2DD4A8',
    dialog: '#A855F7',
    field: '#E4572E',
    button: '#A855F7',
    selector: '#F59E0B',
    table: '#3B82F6',
    chart: '#3B82F6',
    decoration: '#9CA3AF',
};

const strokeFor = (n: ScreenLayoutNode) =>
    n.boundaryColor || FORM_COLORS[n.formKind] || '#6B7280';

type Gesture =
    | { kind: 'draw'; startX: number; startY: number; currentX: number; currentY: number }
    | {
        kind: 'move' | 'resize';
        node?: ScreenLayoutNode;
        baseRect: Rect;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
    };

type BoundaryDraft =
    | { kind: 'create'; rect: Rect; name: string }
    | { kind: 'edit'; node: ScreenLayoutNode; rect: Rect };

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function ScreenLayoutView({
    diagram, model, captureId, viewpointFilter, editable = false, drawMode = false,
    newElementDefaultName = 'New UIElement', onCreateBounds, onBoundsChange,
    proposals = [], onAcceptProposal, onRejectProposal,
}: ScreenLayoutViewProps) {
    // A geometry canvas owns its route. Selection updates the shared inspector
    // state without replacing the workspace with the element-detail route.
    const selectElement = useModelStore(s => s.inspectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);

    // Backdrop stack: following a NavigatesTo edge pushes the target capture and
    // leaves a breadcrumb, so a reviewer walks the interface as a user does.
    const [trail, setTrail] = useState<string[]>([]);
    const [gesture, setGesture] = useState<Gesture | null>(null);
    const [boundaryDraft, setBoundaryDraft] = useState<BoundaryDraft | null>(null);
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const activeCaptureId = trail[trail.length - 1] ?? captureId;

    // Sidebar navigation owns capture context. Clear any prior canvas drill-in
    // trail when it selects a different capture so both surfaces stay aligned.
    useEffect(() => setTrail([]), [captureId]);
    useEffect(() => {
        if (!drawMode) setBoundaryDraft(current => current?.kind === 'create' ? null : current);
    }, [drawMode]);

    const scene = useMemo(
        () => computeScreenLayout(model, { captureId: activeCaptureId }),
        [model, activeCaptureId],
    );

    const visible = useMemo(() => {
        if (!viewpointFilter) return scene.nodes;
        return scene.nodes.filter(n => viewpointFilter(n.element));
    }, [scene.nodes, viewpointFilter]);

    const selectedNode = visible.find(n => n.element.id === selectedElementId);
    const hoveredNode = visible.find(n => n.element.id === hoveredElementId);
    const isolatingNode = hoveredNode ?? selectedNode;
    const childrenOfIsolating = new Set(isolatingNode?.childIds ?? []);

    const follow = useCallback((node: ScreenLayoutNode) => {
        // NavigatesTo changes screens; a capture attached directly to this
        // region recursively opens its internal geometry, like decomposition in
        // an activity diagram.
        const targetElementId = node.navigatesToId ?? node.element.id;
        const target = captureForScreen(model, targetElementId);
        if (target?.id === activeCaptureId) return;
        if (target) setTrail(t => [...t, target.id]);
    }, [model, activeCaptureId]);

    if (!scene.nodes.length) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ maxWidth: 420 }}>
                    <h3 style={{ fontSize: FONT.lg, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        {diagram.name}
                    </h3>
                    <p style={{ fontSize: FONT.md, color: '#9CA3AF', lineHeight: 1.6 }}>
                        {scene.emptyReason ?? 'Nothing to lay out in this view.'}
                    </p>
                </div>
            </div>
        );
    }

    // Paint parents before children, and overlays last so they cover siblings.
    const painted = [...visible].sort((a, b) => {
        const ao = isOverlay(a) ? 1 : 0;
        const bo = isOverlay(b) ? 1 : 0;
        return ao - bo || a.depth - b.depth;
    });

    const aspect = scene.pixelWidth && scene.pixelHeight
        ? scene.pixelHeight / scene.pixelWidth
        : 0.625;

    const point = (clientX: number, clientY: number) => {
        const rect = frameRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: clamp((clientX - rect.left) / rect.width),
            y: clamp((clientY - rect.top) / rect.height),
        };
    };
    const gestureRect = (current: Gesture): Rect => {
        if (current.kind === 'draw') {
            return {
                x: Math.min(current.startX, current.currentX),
                y: Math.min(current.startY, current.currentY),
                width: Math.abs(current.currentX - current.startX),
                height: Math.abs(current.currentY - current.startY),
            };
        }
        const dx = current.currentX - current.startX;
        const dy = current.currentY - current.startY;
        if (current.kind === 'move') {
            return {
                ...current.baseRect,
                x: clamp(current.baseRect.x + dx, 0, 1 - current.baseRect.width),
                y: clamp(current.baseRect.y + dy, 0, 1 - current.baseRect.height),
            };
        }
        return {
            ...current.baseRect,
            width: clamp(current.baseRect.width + dx, 0.01, 1 - current.baseRect.x),
            height: clamp(current.baseRect.height + dy, 0.01, 1 - current.baseRect.y),
        };
    };
    const parentRelative = (node: ScreenLayoutNode, rect: Rect): Rect => {
        const parent = node.parentId ? scene.nodes.find(n => n.element.id === node.parentId)?.rect : undefined;
        if (!parent) return rect;
        return {
            x: (rect.x - parent.x) / parent.width,
            y: (rect.y - parent.y) / parent.height,
            width: rect.width / parent.width,
            height: rect.height / parent.height,
        };
    };
    const finishGesture = () => {
        if (!gesture) return;
        const rect = gestureRect(gesture);
        if (gesture.kind === 'draw') {
            if (rect.width >= 0.01 && rect.height >= 0.01) {
                setBoundaryDraft({ kind: 'create', rect, name: newElementDefaultName });
            }
        } else {
            const moved = Math.abs(gesture.currentX - gesture.startX) >= 0.002
                || Math.abs(gesture.currentY - gesture.startY) >= 0.002;
            if (moved) setBoundaryDraft(gesture.node
                ? { kind: 'edit', node: gesture.node, rect }
                : {
                    kind: 'create', rect,
                    name: boundaryDraft?.kind === 'create' ? boundaryDraft.name : newElementDefaultName,
                });
        }
        setGesture(null);
    };
    const startAdjustment = (
        event: React.PointerEvent,
        kind: 'move' | 'resize',
        draft: BoundaryDraft,
    ) => {
        event.stopPropagation();
        const p = point(event.clientX, event.clientY);
        frameRef.current?.setPointerCapture(event.pointerId);
        setGesture({
            kind,
            node: draft.kind === 'edit' ? draft.node : undefined,
            baseRect: draft.rect,
            startX: p.x,
            startY: p.y,
            currentX: p.x,
            currentY: p.y,
        });
    };
    const confirmBoundary = () => {
        if (!boundaryDraft) return;
        if (boundaryDraft.kind === 'create') {
            const name = boundaryDraft.name.trim();
            if (!name) return;
            onCreateBounds?.(boundaryDraft.rect, name);
        }
        else onBoundsChange?.(
            boundaryDraft.node.element.id,
            parentRelative(boundaryDraft.node, boundaryDraft.rect),
        );
        setBoundaryDraft(null);
    };

    return (
        <div className="flex-1 flex flex-col overflow-auto" style={{ background: '#F7F7F5' }}>
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <span style={{ fontSize: FONT.sm, fontWeight: 600, color: '#374151' }}>
                    {scene.screen?.name}
                </span>
                {trail.length > 0 && (
                    <button
                        onClick={() => setTrail(t => t.slice(0, -1))}
                        style={{
                            fontSize: FONT.xs, padding: '2px 8px', marginLeft: 'auto',
                            border: '1px solid #E5E5E0', borderRadius: 6, background: '#FFFFFF',
                            color: '#374151', cursor: 'pointer',
                        }}
                    >
                        ← Back
                    </button>
                )}
            </div>

            <div className="p-4">
                <div
                    ref={frameRef}
                    role="application"
                    aria-label="Screen region canvas"
                    onPointerDown={e => {
                        if (!editable || !drawMode || boundaryDraft || e.target !== e.currentTarget) return;
                        const p = point(e.clientX, e.clientY);
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setGesture({ kind: 'draw', startX: p.x, startY: p.y, currentX: p.x, currentY: p.y });
                    }}
                    onPointerMove={e => {
                        if (!gesture) return;
                        const p = point(e.clientX, e.clientY);
                        setGesture(current => current ? { ...current, currentX: p.x, currentY: p.y } : null);
                    }}
                    onPointerUp={finishGesture}
                    onPointerCancel={() => setGesture(null)}
                    style={{
                        position: 'relative', width: '100%', maxWidth: 900,
                        paddingBottom: `${aspect * 100}%`, margin: '0 auto',
                        background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 8,
                        backgroundImage: scene.imageUri ? `url(${scene.imageUri})` : undefined,
                        backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                        // A crosshair is the conventional boundary-selection
                        // pointer and makes the active authoring mode visible
                        // everywhere on the capture, not only in the toolbar.
                        cursor: drawMode && !boundaryDraft ? 'crosshair' : 'default',
                    }}
                >
                    {!scene.imageUri && (
                        <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ fontSize: FONT.xs, color: '#9CA3AF' }}
                        >
                            No image at this capture&rsquo;s imageUri — boxes shown without a backdrop
                        </div>
                    )}

                    {!drawMode && painted.map(node => {
                        const isSelected = node.element.id === selectedElementId;
                        const isHovered = node.element.id === hoveredElementId;
                        const isIsolating = node.element.id === isolatingNode?.element.id;
                        const isChildOfIsolating = childrenOfIsolating.has(node.element.id);
                        // Hover takes temporary precedence over persistent selection.
                        // Unrelated regions fade so the pointer target reads clearly.
                        const recede = !!isolatingNode && !isIsolating && !isChildOfIsolating;
                        const stroke = strokeFor(node);
                        const drillCapture = captureForScreen(model, node.navigatesToId ?? node.element.id);
                        const canOpen = !!drillCapture && drillCapture.id !== activeCaptureId;
                        return (
                            <div
                                key={node.element.id}
                                onClick={e => { e.stopPropagation(); selectElement(node.element.id); }}
                                onDoubleClick={e => { e.stopPropagation(); follow(node); }}
                                onMouseEnter={() => setHoveredElementId(node.element.id)}
                                onMouseLeave={() => setHoveredElementId(current => current === node.element.id ? null : current)}
                                onPointerDown={e => {
                                    if (!editable || drawMode || boundaryDraft || node.depth === 0) return;
                                    e.stopPropagation();
                                    selectElement(node.element.id);
                                    const p = point(e.clientX, e.clientY);
                                    frameRef.current?.setPointerCapture(e.pointerId);
                                    setGesture({
                                        kind: 'move', node, baseRect: node.rect,
                                        startX: p.x, startY: p.y, currentX: p.x, currentY: p.y,
                                    });
                                }}
                                title={`${node.element.name} · ${node.formKind}${canOpen ? ' · double-click to open' : ''}`}
                                style={{
                                    position: 'absolute',
                                    left: `${node.rect.x * 100}%`,
                                    top: `${node.rect.y * 100}%`,
                                    width: `${node.rect.width * 100}%`,
                                    height: `${node.rect.height * 100}%`,
                                    border: `${isSelected || isHovered ? 2 : 1}px ${node.unconfirmed ? 'dashed' : 'solid'} ${recede ? '#9CA3AF' : stroke}`,
                                    borderRadius: 3,
                                    background: recede
                                        ? '#6B728012'
                                        : `color-mix(in srgb, ${stroke} ${Math.round(Math.min(1, node.boundaryOpacity + (isHovered ? 0.12 : isSelected ? 0.06 : 0)) * 100)}%, transparent)`,
                                    boxShadow: isOverlay(node) ? '0 2px 10px rgba(0,0,0,0.18)' : undefined,
                                    opacity: recede ? 0.18 : 1,
                                    pointerEvents: drawMode ? 'none' : 'auto',
                                    cursor: editable && isSelected ? 'move' : 'pointer',
                                    transition: 'opacity 120ms ease, border-width 120ms ease',
                                }}
                            >
                                {(isSelected || !selectedNode) && node.depth > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute', top: -2, left: 2, transform: 'translateY(-100%)',
                                            fontSize: 9, fontWeight: 600, color: stroke,
                                            background: '#FFFFFFDD', padding: '0 3px', borderRadius: 2,
                                            whiteSpace: 'nowrap', pointerEvents: 'none',
                                        }}
                                    >
                                        {node.element.name}
                                        {node.unconfirmed && node.detectionConfidence !== undefined
                                            && ` · ${Math.round(node.detectionConfidence * 100)}%?`}
                                    </span>
                                )}
                                {canOpen && (
                                    <button
                                        type="button"
                                        aria-label={`Open ${node.element.name}`}
                                        onClick={e => { e.stopPropagation(); follow(node); }}
                                        style={{
                                            position: 'absolute', top: 3, right: 3, zIndex: 3,
                                            width: 22, height: 22, borderRadius: 5,
                                            border: `1px solid ${stroke}`, background: '#FFFFFFE8',
                                            color: stroke, fontSize: 13, lineHeight: '18px', cursor: 'pointer',
                                            opacity: recede ? 0.25 : 1,
                                        }}
                                        title={`Open nested region ${node.element.name}`}
                                    >
                                        ↗
                                    </button>
                                )}
                                {editable && isSelected && node.depth > 0 && (
                                    <span
                                        onPointerDown={e => {
                                            e.stopPropagation();
                                            const p = point(e.clientX, e.clientY);
                                            frameRef.current?.setPointerCapture(e.pointerId);
                                            setGesture({
                                                kind: 'resize', node, baseRect: node.rect,
                                                startX: p.x, startY: p.y, currentX: p.x, currentY: p.y,
                                            });
                                        }}
                                        title="Drag to resize"
                                        style={{
                                            position: 'absolute', width: 10, height: 10, right: -5, bottom: -5,
                                            borderRadius: 2, background: stroke, border: '1px solid #FFFFFF',
                                            cursor: 'nwse-resize',
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                    {!drawMode && proposals.filter(proposal => proposal.status === 'pending').map((proposal, index) => (
                        <div key={proposal.id} title={`Detected boundary · ${Math.round(proposal.confidence * 100)}% confidence`} style={{
                            position: 'absolute', zIndex: 20 + index,
                            left: `${proposal.bounds.x * 100}%`, top: `${proposal.bounds.y * 100}%`,
                            width: `${proposal.bounds.width * 100}%`, height: `${proposal.bounds.height * 100}%`,
                            border: '2px dashed #2563EB', borderRadius: 3, background: '#2563EB12',
                            pointerEvents: 'none',
                        }}>
                            <span style={{
                                position: 'absolute', top: 2, right: 2, display: 'inline-flex', gap: 3,
                                pointerEvents: 'auto', background: '#FFFFFFEE', padding: 2, borderRadius: 5,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.16)',
                            }}>
                                <button type="button" aria-label={`Accept detected region ${proposal.id}`}
                                    onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onAcceptProposal?.(proposal.id); }}
                                    title="Accept region" style={{ width: 22, height: 20, border: 0, borderRadius: 4, background: '#DCFCE7', color: '#15803D', cursor: 'pointer' }}>✓</button>
                                <button type="button" aria-label={`Reject detected region ${proposal.id}`}
                                    onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onRejectProposal?.(proposal.id); }}
                                    title="Reject region" style={{ width: 22, height: 20, border: 0, borderRadius: 4, background: '#FEE2E2', color: '#DC2626', cursor: 'pointer' }}>×</button>
                            </span>
                        </div>
                    ))}
                    {gesture && (
                        <div style={{
                            position: 'absolute',
                            left: `${gestureRect(gesture).x * 100}%`,
                            top: `${gestureRect(gesture).y * 100}%`,
                            width: `${gestureRect(gesture).width * 100}%`,
                            height: `${gestureRect(gesture).height * 100}%`,
                            border: '2px dashed #0F766E', background: '#2DD4A81A',
                            pointerEvents: 'none',
                        }} />
                    )}
                    {boundaryDraft && !gesture && (
                        <div
                            aria-label={boundaryDraft.kind === 'create' ? 'New region boundary draft' : 'Edited region boundary draft'}
                            onPointerDown={event => startAdjustment(event, 'move', boundaryDraft)}
                            style={{
                                position: 'absolute', zIndex: 80,
                                left: `${boundaryDraft.rect.x * 100}%`,
                                top: `${boundaryDraft.rect.y * 100}%`,
                                width: `${boundaryDraft.rect.width * 100}%`,
                                height: `${boundaryDraft.rect.height * 100}%`,
                                border: '2px dashed #0F766E', borderRadius: 3,
                                background: '#2DD4A824', cursor: 'move',
                                boxShadow: '0 0 0 1px #FFFFFF99',
                            }}
                        >
                            <span style={{
                                position: 'absolute', top: 4, left: 4, display: 'flex', gap: 4,
                                padding: 3, borderRadius: 6, background: '#FFFFFFF2',
                                boxShadow: '0 1px 5px rgba(15,23,42,0.18)',
                            }}>
                                {boundaryDraft.kind === 'create' && (
                                    <input
                                        autoFocus
                                        aria-label="New UIElement name"
                                        placeholder="UIElement name"
                                        value={boundaryDraft.name}
                                        onPointerDown={event => event.stopPropagation()}
                                        onFocus={event => event.currentTarget.select()}
                                        onChange={event => setBoundaryDraft(current => current?.kind === 'create'
                                            ? { ...current, name: event.target.value }
                                            : current)}
                                        onKeyDown={event => {
                                            if (event.key === 'Enter') confirmBoundary();
                                            if (event.key === 'Escape') setBoundaryDraft(null);
                                        }}
                                        style={{ width: 150, border: '1px solid #CBD5E1', borderRadius: 4, padding: '3px 6px', color: '#1F2937', fontSize: 10 }}
                                    />
                                )}
                                <button type="button" disabled={boundaryDraft.kind === 'create' && !boundaryDraft.name.trim()}
                                    onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); confirmBoundary(); }}
                                    aria-label="Confirm region boundary" title="Save this boundary"
                                    style={{ border: 0, borderRadius: 4, padding: '3px 7px', background: '#DCFCE7', color: '#15803D', cursor: boundaryDraft.kind === 'create' && !boundaryDraft.name.trim() ? 'not-allowed' : 'pointer', opacity: boundaryDraft.kind === 'create' && !boundaryDraft.name.trim() ? 0.5 : 1, fontSize: 10, fontWeight: 700 }}>✓ Confirm</button>
                                <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setBoundaryDraft(null); }}
                                    aria-label="Cancel region boundary" title="Discard this boundary change"
                                    style={{ border: 0, borderRadius: 4, padding: '3px 7px', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>× Cancel</button>
                            </span>
                            <span
                                aria-label="Resize region boundary draft"
                                onPointerDown={event => startAdjustment(event, 'resize', boundaryDraft)}
                                title="Drag to resize before confirming"
                                style={{
                                    position: 'absolute', width: 12, height: 12, right: -6, bottom: -6,
                                    borderRadius: 2, background: '#0F766E', border: '2px solid #FFFFFF',
                                    cursor: 'nwse-resize',
                                }}
                            />
                        </div>
                    )}
                    {drawMode && !gesture && !boundaryDraft && (
                        <div style={{
                            position: 'absolute', zIndex: 70, left: 8, top: 8,
                            padding: '5px 8px', borderRadius: 6, pointerEvents: 'none',
                            background: '#0F766EEB', color: '#FFFFFF', fontSize: 10, fontWeight: 650,
                        }}>Click and drag to define a region</div>
                    )}
                </div>
            </div>
        </div>
    );
}
