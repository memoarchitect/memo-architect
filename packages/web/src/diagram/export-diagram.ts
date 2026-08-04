// ─── Diagram image export ────────────────────────────────────────────────────
//
// Downloads the drawn diagram as SVG, PNG, or PDF.
//
// The export is taken from the live canvas DOM rather than from the notation
// scene. `notationSceneToSvg` exists and is renderer-neutral, but it draws a
// schematic — plain boxes with a centred label — and the ReactFlow canvas draws
// parameter pins, swimlanes, allocation badges, guard labels, and per-item flow
// colours. Exporting through the projector would hand the user a file that does
// not look like the diagram they are looking at, which is worse than no export.
//
// What is captured is the ReactFlow *viewport* element, not the visible canvas
// rectangle: the viewport holds every node at full extent, so the file contains
// the whole diagram regardless of the current pan and zoom. The transform is
// neutralised for the capture and restored afterwards.
// ─────────────────────────────────────────────────────────────────────────────

import { toSvg } from 'html-to-image';

export type DiagramExportFormat = 'svg' | 'png' | 'pdf';

/** Canvas background, so a transparent PNG does not read as a broken file. */
const EXPORT_BACKGROUND = '#FFFFFF';

/** Margin around the drawn content, in px at 1× zoom. */
const EXPORT_PADDING = 24;

/** PNG is rendered at this multiple of CSS pixels so text stays legible. */
const PNG_SCALE = 2;

interface DiagramContentBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Bounding box of the drawn nodes, in flow coordinates.
 *
 * Read from each node element's own `transform` plus its rendered size. Two
 * shorter routes do not work here, and both fail by cropping rather than by
 * erroring:
 *
 *   - `offsetLeft`/`offsetTop` are always 0, because ReactFlow positions nodes
 *     with a CSS transform.
 *   - `getNodesBounds` over the store nodes returns positions with zero-size
 *     boxes for any node whose dimensions were never measured, so the box stops
 *     at the last node's top-left corner and the final row and column of the
 *     diagram fall outside the file.
 *
 * The node transforms are unscaled — zoom lives on the viewport — so what is
 * read here is already in flow coordinates.
 */
/**
 * Flow-coordinate position of one node, from the `translate(Xpx, Ypx)` that
 * ReactFlow writes on it. Parsed rather than read through `DOMMatrixReadOnly`,
 * which jsdom does not implement, so the bounds stay testable.
 */
function nodeTranslation(node: HTMLElement): [number, number] {
    const match = /translate\(\s*(-?[\d.]+)px[,\s]+(-?[\d.]+)px/.exec(node.style.transform);
    return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function contentBounds(viewport: HTMLElement): DiagramContentBounds {
    const nodes = [...viewport.querySelectorAll<HTMLElement>('.react-flow__node')];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
        const [x, y] = nodeTranslation(node);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + node.offsetWidth);
        maxY = Math.max(maxY, y + node.offsetHeight);
    }
    if (!Number.isFinite(minX)) {
        return { x: 0, y: 0, width: viewport.scrollWidth || 1, height: viewport.scrollHeight || 1 };
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Serialize the canvas to an SVG data URL at full diagram extent. */
async function captureSvgDataUrl(
    container: HTMLElement,
): Promise<{ dataUrl: string; width: number; height: number }> {
    const viewport = container.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport) throw new Error('No diagram canvas to export');

    const bounds = contentBounds(viewport);
    const width = Math.max(1, Math.ceil(bounds.width) + EXPORT_PADDING * 2);
    const height = Math.max(1, Math.ceil(bounds.height) + EXPORT_PADDING * 2);

    // The framing goes to the *clone*, through `style`, and the live canvas is
    // never touched. Setting the transform on the live viewport instead
    // produces a correctly sized but entirely blank file: html-to-image lays
    // the clone out in its own detached box, where a mutation made for the
    // on-screen element does not survive. ReactFlow's viewport transform maps
    // flow coordinates to screen, so this puts the top-left of the content at
    // the padding origin at 1× zoom — the current pan and zoom do not decide
    // what lands in the file.
    const dataUrl = await toSvg(viewport, {
        width, height,
        backgroundColor: EXPORT_BACKGROUND,
        // Web fonts are served cross-origin, and reading their rules throws a
        // SecurityError that html-to-image logs on every capture. The clone
        // carries the same font-family declarations, so a viewer with the font
        // installed still renders it.
        skipFonts: true,
        // The controls, minimap, and background grid are canvas furniture, not
        // diagram content.
        filter: node => !(node instanceof Element && (
            node.classList.contains('react-flow__controls')
            || node.classList.contains('react-flow__minimap')
            || node.classList.contains('react-flow__background')
            || node.classList.contains('react-flow__attribution')
        )),
        style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${EXPORT_PADDING - bounds.x}px, ${EXPORT_PADDING - bounds.y}px) scale(1)`,
        },
    });
    return { dataUrl, width, height };
}

/** Draw an SVG data URL onto a raster canvas at `scale`. */
async function rasterize(dataUrl: string, width: number, height: number, scale: number): Promise<HTMLCanvasElement> {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.fillStyle = EXPORT_BACKGROUND;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function triggerDownload(href: string, filename: string): void {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
}

/** Internals reached by tests; not part of the module's contract. */
export const __testing = { contentBounds };

/** Filesystem-safe stem for the downloaded file. */
export function exportFileName(diagramName: string | undefined, format: DiagramExportFormat): string {
    const stem = (diagramName ?? 'diagram')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'diagram';
    return `${stem}.${format}`;
}

/**
 * Export the diagram inside `container` and start the download.
 *
 * `container` is the ReactFlow root; the caller holds the ref, so this module
 * stays free of ReactFlow hooks and can be reused by any DOM-backed renderer.
 */
export async function exportDiagram(
    container: HTMLElement,
    format: DiagramExportFormat,
    diagramName?: string,
): Promise<void> {
    const filename = exportFileName(diagramName, format);
    const { dataUrl, width, height } = await captureSvgDataUrl(container);

    if (format === 'svg') {
        triggerDownload(dataUrl, filename);
        return;
    }

    const canvas = await rasterize(dataUrl, width, height, PNG_SCALE);

    if (format === 'png') {
        triggerDownload(canvas.toDataURL('image/png'), filename);
        return;
    }

    // PDF: one page sized to the diagram, so nothing is cropped or reflowed.
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
        orientation: width >= height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
        compress: true,
    });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
    pdf.save(filename);
}
