// ─── LiveDiagramEmbed ────────────────────────────────────────────────────────
//
// A `{{diagram:ref}}` in a dashboard or document: the real canvas, read-only,
// live. It is not an image — the canvas re-renders from the store whenever the
// model or the diagram's layout changes. Editing happens on the diagram's own
// page, reached through "Open diagram".
//
// The canvas mounts when the embed first scrolls near the viewport, so a long
// page does not lay out every diagram at load.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../../store/model-store';
import { DiagramEmbedContext } from '../../diagram/diagram-embed-context';
import { resolveDiagramRef } from '../../diagram/resolve-diagram-ref';

// The ReactFlow canvas directly, not DiagramSurface: it is the renderer with a
// read-only mode, and a page is not the place to choose a rendering engine.
const DiagramCanvas = lazy(() => import('../../views/DiagramCanvas').then(m => ({ default: m.DiagramCanvas })));

const DEFAULT_HEIGHT = 480;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 2000;

function embedHeight(raw: string | undefined): number {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(n))) : DEFAULT_HEIGHT;
}

function useNearViewport<T extends Element>(): [React.RefObject<T>, boolean] {
    const ref = useRef<T>(null);
    const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
    useEffect(() => {
        if (near || !ref.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) { setNear(true); observer.disconnect(); }
        }, { rootMargin: '400px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [near]);
    return [ref, near];
}

export function LiveDiagramEmbed({ diagramRef, model, options }: {
    diagramRef: string;
    model: MemoModelDTO | null;
    options: Record<string, string>;
}) {
    const selectDiagram = useModelStore(s => s.selectDiagram);
    const setActiveView = useModelStore(s => s.setActiveView);
    const [containerRef, near] = useNearViewport<HTMLDivElement>();

    const diagram = resolveDiagramRef(model, diagramRef);
    const height = embedHeight(options.height);

    if (!model) {
        return <div className="memo-embed-note">Loading model…</div>;
    }

    if (!diagram) {
        return (
            <div data-testid="diagram-embed-missing" style={{
                margin: '10px 0', padding: '10px 14px', borderRadius: '6px',
                border: '1px dashed #FCA5A5', background: '#FEF2F2', fontSize: '12px', color: '#DC2626',
            }}>
                ⚠ Diagram <code style={{ background: '#FEE2E2', padding: '0 4px', borderRadius: '3px' }}>{diagramRef}</code> not
                found in the model — check the reference in <code style={{ background: '#FEE2E2', padding: '0 4px', borderRadius: '3px' }}>{'{{diagram:…}}'}</code>.
            </div>
        );
    }

    const openDiagram = () => {
        selectDiagram(diagram.id);
        setActiveView({ type: 'diagram', diagramId: diagram.id });
    };

    return (
        <figure data-testid="diagram-embed" data-diagram-id={diagram.id} style={{
            margin: '14px 0', borderRadius: '10px', border: '1px solid #E2E8F0',
            background: '#FFFFFF', overflow: 'hidden',
        }}>
            <figcaption style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                borderBottom: '1px solid #EEF2F6', background: '#F8FAFC',
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {diagram.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        {diagram.viewKind || diagram.diagramType}
                        <span style={{ marginLeft: 6, color: '#94A3B8' }}>· live · read-only</span>
                    </div>
                </div>
                <button type="button" onClick={openDiagram} style={{
                    padding: '5px 12px', borderRadius: '6px', border: '1px solid #D8E0E4', background: '#FFFFFF',
                    color: '#1B3A4B', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}>
                    Open diagram →
                </button>
            </figcaption>
            <div ref={containerRef} style={{ height, display: 'flex', position: 'relative' }}>
                {near ? (
                    <Suspense fallback={<div className="memo-embed-note" style={{ margin: 'auto' }}>Loading diagram…</div>}>
                        <DiagramEmbedContext.Provider value={{ diagramId: diagram.id, readOnly: true }}>
                            <DiagramCanvas />
                        </DiagramEmbedContext.Provider>
                    </Suspense>
                ) : null}
            </div>
        </figure>
    );
}
