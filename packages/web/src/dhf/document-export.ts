// ─── DHF Document Export ──────────────────────────────────────────────────────
//
// Client-side export of DHF documents. The export renders exactly what the
// preview shows (same renderer, same theme stylesheet) with {{toc}} resolved:
//
//   - HTML      → standalone .html file
//   - Word      → .docx file, built from the document model (see exportDocumentWord)
//   - PDF       → print view in a new window; the browser's print dialog
//                 saves to PDF with proper page breaks
//   - Markdown  → the raw document source
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { DhfDoc, DhfSettings } from '../store/model-store';
import { docxToBlob } from '@memoarchitect/tools/browser';
import { captureViews } from './capture-views';
import { htmlToDhfDocument } from './html-to-ir';
import { EMBED_MARKER_RE, parseEmbedSpec, renderDhfDocumentHtml } from './document-renderer';
import { documentThemeCss } from './document-theme';

const PAGE_CSS = `
body{margin:0;padding:40px;background:#fff}
.memo-doc{max-width:800px;margin:0 auto}
@media print{body{padding:0}}
`;

/** The marker divs a document's embedded views render to, for the exports that draw them. */
const EMBED_MARKERS = () => new RegExp(EMBED_MARKER_RE.source, 'g');

/** The views a rendered document embeds, by the reference it used. */
function viewRefsIn(html: string): string[] {
    return [...html.matchAll(EMBED_MARKERS())]
        .map(m => parseEmbedSpec(m[1]))
        .filter((spec): spec is NonNullable<typeof spec> => spec?.kind === 'diagram')
        .map(spec => spec.ref);
}

/**
 * The document's HTML with each embedded view drawn in as a picture (a PNG inline in the page) in place of the live
 * canvas. A view that cannot be drawn (it has no stored layout) stays a note naming it, and a widget a note too.
 * Returns the views it could not draw.
 */
async function bodyWithViews(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): Promise<{ body: string; notDrawn: string[] }> {
    const html = renderDhfDocumentHtml(doc.content, model, settings, doc, { resolveToc: true });
    const { views, notDrawn } = await captureViews(viewRefsIn(html), model);
    const body = html.replace(EMBED_MARKERS(), (_marker, raw: string) => {
        const spec = parseEmbedSpec(raw);
        if (!spec) return '';
        if (spec.kind === 'widget') return `<p><em>[Widget: ${escapeAttr(spec.ref)} \u2014 live in MEMO Architect]</em></p>`;
        const drawn = views.get(spec.ref);
        // The PNG is drawn at twice the size it is shown at; the page may shrink it, never enlarge it.
        return drawn
            ? `<figure class="memo-doc-figure"><img src="data:image/png;base64,${drawn.base64}" alt="${escapeAttr(spec.ref)}" width="${Math.round(drawn.width / 2)}" style="max-width:100%;height:auto"></figure>`
            : `<p><strong>[Diagram: ${escapeAttr(spec.ref)}]</strong> <em>\u2014 view in MEMO Architect</em></p>`;
    });
    return { body, notDrawn: [...notDrawn].map(([ref, why]) => `${ref}: ${why}`) };
}

/** Standalone HTML page for a document, from its body HTML: shared by the HTML and PDF exports. */
function buildExportHtml(doc: DhfDoc, settings: DhfSettings, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeAttr(doc.id)} — ${escapeAttr(doc.title)}</title>
<style>${documentThemeCss(settings)}${PAGE_CSS}.memo-doc-figure{margin:16px 0;text-align:center}</style>
</head>
<body><div class="memo-doc">${body}</div></body>
</html>`;
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function downloadFile(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** The HTML download, with each embedded view drawn in. Returns the views it could not draw. */
export async function exportDocumentHtml(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): Promise<string[]> {
    const { body, notDrawn } = await bodyWithViews(doc, model, settings);
    downloadFile(`${doc.id}.html`, buildExportHtml(doc, settings, body), 'text/html;charset=utf-8');
    return notDrawn;
}

/**
 * The Word download: a real .docx, built from the same document model the command line writes (MEMO Tools'
 * `buildDocxDocument`). Each embedded view is drawn to a PNG and sits in the page, shrunk to the text width; one that
 * cannot be drawn (it has no stored layout) stays as a note naming it. Returns the views it could not draw.
 */
export async function exportDocumentWord(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): Promise<string[]> {
    const html = renderDhfDocumentHtml(doc.content, model, settings, doc, { resolveToc: true });
    const { views, notDrawn } = await captureViews(viewRefsIn(html), model);
    const ir = htmlToDhfDocument(html, {
        id: doc.id, title: doc.title, project: settings.product || undefined, organization: settings.company || undefined,
        version: settings.version || undefined, phase: settings.phase || undefined,
    }, views);
    const blob = await docxToBlob(ir);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.id}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    return [...notDrawn].map(([ref, why]) => `${ref}: ${why}`);
}

export function exportDocumentMarkdown(doc: DhfDoc): void {
    downloadFile(`${doc.id}.md`, doc.content, 'text/markdown;charset=utf-8');
}

/**
 * Open the print dialog on a rendered copy, with each embedded view drawn in: "Save as PDF" produces the PDF. The window
 * opens first, in the click, because a browser blocks one opened after a wait. Returns the views it could not draw.
 */
export async function exportDocumentPdf(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): Promise<string[]> {
    const w = window.open('', '_blank');
    if (!w) return [];
    w.document.write('<p style="font:14px sans-serif;padding:24px">Preparing the document\u2026</p>');
    const { body, notDrawn } = await bodyWithViews(doc, model, settings);
    w.document.open();
    w.document.write(buildExportHtml(doc, settings, body));
    w.document.close();
    // Give the new window a paint before opening the dialog
    w.setTimeout(() => { w.focus(); w.print(); }, 150);
    return notDrawn;
}
