// ─── Drawing a view for a driver ─────────────────────────────────────────────
//
// `memo export dhf` puts the picture of a view into a generated document. The picture is the one this
// canvas draws, so the CLI loads the standalone viewer in headless Chromium and calls this function once
// per `{{diagram:ref}}`. It is the export a person gets from the toolbar (`captureSvgDataUrl`), handed
// back to the caller instead of downloaded.
//
// A view is authored: its layout is stored in the view. One with no stored layout is reported, never
// laid out here, so a document never carries a picture nobody drew. Nothing here routes edges; the
// canvas draws the routes it is given.
// ─────────────────────────────────────────────────────────────────────────────

import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { captureSvgDataUrl, rasterize } from './export-diagram';
import { resolveDiagramRef } from './resolve-diagram-ref';

export type HeadlessDiagram =
    | { ok: true; svg: string; /** The same picture as PNG, base64: what a Word file can hold. */ png: string; width: number; height: number; diagramId: string }
    | { ok: false; reason: string };

declare global {
    interface Window {
        __memoRenderDiagram?: (ref: string, layouts: Record<string, DiagramLayout>) => Promise<HeadlessDiagram>;
    }
}

const SETTLE_POLL_MS = 150;
const SETTLE_TIMEOUT_MS = 20_000;

/** Wait until the canvas holds nodes and their number stops changing: the view has finished mounting. */
export async function settled(): Promise<boolean> {
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let last = -1;
    let stable = 0;
    while (Date.now() < deadline) {
        const count = document.querySelectorAll('.react-flow__node').length;
        stable = count > 0 && count === last ? stable + 1 : 0;
        if (stable >= 3) return true;
        last = count;
        await new Promise(resolve => setTimeout(resolve, SETTLE_POLL_MS));
    }
    return false;
}

export async function renderDiagramForDriver(ref: string, layouts: Record<string, DiagramLayout>): Promise<HeadlessDiagram> {
    const store = useModelStore.getState();
    store.mergeDiagramLayouts(layouts);
    const diagram = resolveDiagramRef(useModelStore.getState().model, ref);
    if (!diagram) return { ok: false, reason: `no view answers to "${ref}"` };
    const layout = useModelStore.getState().diagramLayouts[diagram.id];
    if (!layout || Object.keys(layout.nodes ?? {}).length === 0) {
        return { ok: false, reason: `${diagram.name} has no stored layout; lay it out in Architect and save it` };
    }
    store.selectDiagram(diagram.id);
    store.setActiveView({ type: 'diagram', diagramId: diagram.id });
    if (!await settled()) return { ok: false, reason: `${diagram.name} did not finish drawing` };
    const container = document.querySelector<HTMLElement>('.react-flow');
    if (!container) return { ok: false, reason: `${diagram.name} is not drawn on a canvas` };
    const { dataUrl, width, height } = await captureSvgDataUrl(container);
    const comma = dataUrl.indexOf(',');
    const svg = dataUrl.startsWith('data:image/svg+xml;base64,')
        ? atob(dataUrl.slice(comma + 1))
        : decodeURIComponent(dataUrl.slice(comma + 1));
    const canvas = await rasterize(dataUrl, width, height, 2);
    const png = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    return { ok: true, svg, png, width, height, diagramId: diagram.id };
}

if (typeof window !== 'undefined') window.__memoRenderDiagram = renderDiagramForDriver;
