// ─── DHF Document Export ──────────────────────────────────────────────────────
//
// Client-side export of DHF documents. The export renders exactly what the
// preview shows (same renderer, same theme stylesheet) with {{toc}} resolved:
//
//   - HTML      → standalone .html file
//   - Word      → .doc file (Word-compatible HTML with Office page setup)
//   - PDF       → print view in a new window; the browser's print dialog
//                 saves to PDF with proper page breaks
//   - Markdown  → the raw document source
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memo/core';
import type { DhfDoc, DhfSettings } from '../store/model-store';
import { renderDhfDocumentHtml } from './document-renderer';
import { documentThemeCss } from './document-theme';

const PAGE_CSS = `
body{margin:0;padding:40px;background:#fff}
.memo-doc{max-width:800px;margin:0 auto}
@media print{body{padding:0}}
`;

// Word page setup: US Letter, 1in margins, numbered footer. Mirrors the
// engine's docx exporter (kept in sync by hand — importing runtime values
// from @memo/core would pull node builtins into the browser bundle).
const WORD_SECTION_CSS = `
@page WordSection1{size:8.5in 11.0in;margin:1.0in;mso-header-margin:0.5in;mso-footer-margin:0.5in;mso-footer:f1}
div.WordSection1{page:WordSection1}
p.MsoFooter{font-size:9pt;color:#6B7280}
`;

/** Word field-code helper: MSO field with a visible placeholder */
function msoField(code: string, placeholder: string): string {
    return `<!--[if supportFields]><span style="mso-element:field-begin"></span><span> ${code} </span><span style="mso-element:field-separator"></span><![endif]-->${placeholder}<!--[if supportFields]><span style="mso-element:field-end"></span><![endif]-->`;
}

const WORD_TOC_FIELD = `<h2>Table of Contents</h2><p>${msoField('TOC \\o "1-3" \\h \\z \\u',
    '<span style="color:#6B7280"><i>Right-click here and choose "Update Field" (or press F9) to generate the table of contents.</i></span>')}</p>`;

const WORD_PAGE_FOOTER = `<div style="mso-element:footer" id="f1"><p class="MsoFooter" align="center" style="text-align:center">Page ${msoField('PAGE', '1')} of ${msoField('NUMPAGES', '1')}</p></div>`;

/** Standalone HTML page for a document — shared by HTML, Word, and PDF export */
export function buildExportHtml(
    doc: DhfDoc,
    model: MemoModelDTO | null,
    settings: DhfSettings,
    opts: { word?: boolean } = {},
): string {
    let body = renderDhfDocumentHtml(doc.content, model, settings, doc, { resolveToc: true, diagrams: 'note' });
    if (opts.word) {
        // Swap the static TOC for a real Word TOC field (with page numbers,
        // populated by Word on Update Field)
        body = body.replace(
            /<h2>Table of Contents<\/h2><div class="memo-doc-toc">[\s\S]*?<\/div>/,
            WORD_TOC_FIELD,
        );
    }
    const content = opts.word
        ? `<div class="WordSection1"><div class="memo-doc">${body}</div></div>\n${WORD_PAGE_FOOTER}`
        : `<div class="memo-doc">${body}</div>`;
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${escapeAttr(doc.id)} — ${escapeAttr(doc.title)}</title>
${opts.word ? '<meta name="ProgId" content="Word.Document"><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->' : ''}
<style>${documentThemeCss(settings)}${PAGE_CSS}${opts.word ? WORD_SECTION_CSS : ''}</style>
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

export function exportDocumentWord(doc: DhfDoc, model: MemoModelDTO | null, settings: DhfSettings): void {
    downloadFile(`${doc.id}.doc`, buildExportHtml(doc, model, settings, { word: true }), 'application/msword');
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
