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

/** Standalone HTML page for a document — shared by HTML and PDF export */
export function buildExportHtml(
    doc: DhfDoc,
    model: MemoModelDTO | null,
    settings: DhfSettings,
): string {
    const body = renderDhfDocumentHtml(doc.content, model, settings, doc, { resolveToc: true, diagrams: 'note' });
    const content = `<div class="memo-doc">${body}</div>`;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeAttr(doc.id)} — ${escapeAttr(doc.title)}</title>
<style>${documentThemeCss(settings)}${PAGE_CSS}</style>
</head>
<body>${content}</body>
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

export function exportDocumentHtml(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): void {
    downloadFile(`${doc.id}.html`, buildExportHtml(doc, model, settings), 'text/html;charset=utf-8');
}

/**
 * The Word download: a real .docx, built from the same document model the command line writes (MEMO Tools'
 * `buildDocxDocument`). Each embedded view is drawn to a PNG and sits in the page, shrunk to the text width; one that
 * cannot be drawn (it has no stored layout) stays as a note naming it. Returns the views it could not draw.
 */
export async function exportDocumentWord(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): Promise<string[]> {
    const html = renderDhfDocumentHtml(doc.content, model, settings, doc, { resolveToc: true });
    const refs = [...html.matchAll(new RegExp(EMBED_MARKER_RE.source, 'g'))]
        .map(m => parseEmbedSpec(m[1]))
        .filter((spec): spec is NonNullable<typeof spec> => spec?.kind === 'diagram')
        .map(spec => spec.ref);
    const { views, notDrawn } = await captureViews(refs, model);
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

/** Open the print dialog on a rendered copy — "Save as PDF" produces the PDF */
export function exportDocumentPdf(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): void {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildExportHtml(doc, model, settings));
    w.document.close();
    // Give the new window a paint before opening the dialog
    w.setTimeout(() => { w.focus(); w.print(); }, 150);
}
