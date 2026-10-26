// ─── Drawing the views a document embeds, for its Word download ──────────────
//
// A view embedded in a document is a live canvas in the preview. For the download each one is mounted, read-only,
// in a host nobody sees, captured to a PNG with the toolbar's own export (`captureSvgDataUrl`), and unmounted. A
// view with no stored layout is not drawn: a view is authored, never laid out for a document.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { DiagramEmbedContext } from '../diagram/diagram-embed-context';
import { captureSvgDataUrl, rasterize } from '../diagram/export-diagram';
import { settled } from '../diagram/headless-render';
import { resolveDiagramRef } from '../diagram/resolve-diagram-ref';
import { useModelStore } from '../store/model-store';
import type { DrawnView } from './html-to-ir';

const HOST_WIDTH = 1400;
const HOST_HEIGHT = 900;

/** The PNG is drawn at twice the size it is shown at, so a Word file can shrink it without softening. */
const PNG_SCALE = 2;

export interface CapturedViews {
    views: Map<string, DrawnView | undefined>;
    /** Why a view was not drawn, by the reference the document used. */
    notDrawn: Map<string, string>;
}

/** Draw each referenced view to a PNG. A reference that cannot be drawn is named in `notDrawn`. */
export async function captureViews(refs: string[], model: MemoModelDTO | null): Promise<CapturedViews> {
    const views = new Map<string, DrawnView | undefined>();
    const notDrawn = new Map<string, string>();
    const { DiagramCanvas } = await import('../views/DiagramCanvas');
    for (const ref of new Set(refs)) {
        const diagram = resolveDiagramRef(model, ref);
        if (!diagram) { notDrawn.set(ref, 'no view answers to it'); continue; }
        const layout = useModelStore.getState().diagramLayouts[diagram.id];
        if (!layout || Object.keys(layout.nodes ?? {}).length === 0) { notDrawn.set(ref, 'it has no stored layout'); continue; }

        const host = document.createElement('div');
        // On screen but invisible: a canvas off the page is never laid out.
        host.style.cssText = `position:fixed;left:0;top:0;width:${HOST_WIDTH}px;height:${HOST_HEIGHT}px;opacity:0;pointer-events:none;z-index:-1;display:flex`;
        document.body.appendChild(host);
        const root = createRoot(host);
        try {
            root.render(createElement(Suspense, { fallback: null },
                createElement(DiagramEmbedContext.Provider, { value: { diagramId: diagram.id, readOnly: true }, children: createElement(DiagramCanvas) })));
            if (!await settled()) { notDrawn.set(ref, 'it did not finish drawing'); continue; }
            const { dataUrl, width, height } = await captureSvgDataUrl(host);
            const canvas = await rasterize(dataUrl, width, height, PNG_SCALE);
            views.set(ref, {
                base64: canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
                width: canvas.width,
                height: canvas.height,
            });
        } catch (error) {
            notDrawn.set(ref, error instanceof Error ? error.message : String(error));
        } finally {
            root.unmount();
            host.remove();
        }
    }
    return { views, notDrawn };
}
