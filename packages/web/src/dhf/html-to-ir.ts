// ─── A rendered document, as the document model ──────────────────────────────
//
// The in-app Word download writes a real .docx from the same document model the command line uses, built by
// `buildDocxDocument` in MEMO Tools. The preview and the export render a document to HTML
// (`renderDhfDocumentHtml`); this reads that HTML back into the model: sections at each `##`, headings,
// paragraphs with bold, italic and code, lists, tables, rules, and each embedded view as an image block (a PNG
// captured from the live canvas) or, when it could not be drawn, a note naming it.
// ─────────────────────────────────────────────────────────────────────────────

import type { DhfBlock, DhfCell, DhfDocument, DhfDocumentSection, DhfInline, DhfRow } from '@memoarchitect/tools/browser';
import { parseEmbedSpec } from './document-renderer';

/** A view drawn for the document: its PNG, and the pixel size of that PNG. */
export interface DrawnView {
    base64: string;
    width: number;
    height: number;
}

export interface DocumentMeta {
    id: string;
    title: string;
    project?: string;
    organization?: string;
    version?: string;
    phase?: string;
    authors?: string[];
    approvers?: { name: string; role: string; date?: string }[];
}

type Style = { bold?: boolean; italic?: boolean; code?: boolean };

/** The inline runs of an element: text with the bold, italic and code it sits inside. */
function inlines(node: Node, style: Style = {}): DhfInline[] {
    const out: DhfInline[] = [];
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            const value = (child.textContent ?? '').replace(/\s+/g, ' ');
            if (value.trim() !== '' || (out.length > 0 && value === ' ')) out.push({ type: 'text', value, ...style });
        } else if (child instanceof Element) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'br') { out.push({ type: 'text', value: '\n', ...style }); return; }
            const next: Style = {
                ...style,
                ...(tag === 'strong' || tag === 'b' ? { bold: true } : {}),
                ...(tag === 'em' || tag === 'i' ? { italic: true } : {}),
                ...(tag === 'code' ? { code: true } : {}),
            };
            out.push(...inlines(child, next));
        }
    });
    return out;
}

const textOf = (element: Element): string => (element.textContent ?? '').replace(/\s+/g, ' ').trim();

function tableOf(table: Element): DhfBlock {
    const cells = (row: Element, header: boolean): DhfCell[] =>
        [...row.children].filter(c => /^t[hd]$/i.test(c.tagName)).map(c => ({ content: trimmed(inlines(c)), header: header || c.tagName.toLowerCase() === 'th' }));
    const rows = [...table.querySelectorAll('tr')];
    const headerRows = rows.filter(r => r.closest('thead') || [...r.children].every(c => c.tagName.toLowerCase() === 'th'));
    const bodyRows = rows.filter(r => !headerRows.includes(r));
    return {
        type: 'table',
        headers: headerRows.length > 0 ? cells(headerRows[0], true) : [],
        rows: bodyRows.map((r): DhfRow => ({ cells: cells(r, false) })),
    };
}

/** A text run with nothing in it (a cross-reference or badge always has something). */
const isEmptyText = (run: DhfInline): boolean => 'value' in run && run.value === '';

/** Collapse the whitespace at the ends of a run of inlines. */
function trimmed(runs: DhfInline[]): DhfInline[] {
    const out = runs.filter(r => !isEmptyText(r));
    const first = out[0];
    const last = out[out.length - 1];
    if (first && 'value' in first) first.value = first.value.replace(/^\s+/, '');
    if (last && 'value' in last) last.value = last.value.replace(/\s+$/, '');
    return out.length > 0 ? out : [{ type: 'text', value: '' }];
}

function blocksOf(parent: Element, views: ReadonlyMap<string, DrawnView | undefined>): DhfBlock[] {
    const blocks: DhfBlock[] = [];
    for (const element of parent.children) {
        const tag = element.tagName.toLowerCase();
        if (element.classList.contains('memo-doc-embed')) {
            const spec = parseEmbedSpec(element.getAttribute('data-embed') ?? '');
            if (!spec) continue;
            if (spec.kind === 'widget') {
                blocks.push({ type: 'paragraph', content: [{ type: 'text', value: `[Widget: ${spec.ref} — live in MEMO Architect]`, italic: true }] });
                continue;
            }
            const drawn = views.get(spec.ref);
            blocks.push(drawn
                ? { type: 'image', alt: spec.ref, src: spec.ref, data: { mime: 'image/png', ...drawn } }
                : { type: 'paragraph', content: [{ type: 'text', value: `[Diagram: ${spec.ref} — view in MEMO Architect]`, italic: true }] });
        } else if (/^h[1-6]$/.test(tag)) {
            const level = Number(tag[1]);
            blocks.push({ type: 'heading', level: Math.min(Math.max(level, 3), 4) as 3 | 4, text: textOf(element) });
        } else if (tag === 'p') {
            const content = trimmed(inlines(element));
            if (content.some(r => !isEmptyText(r))) blocks.push({ type: 'paragraph', content });
        } else if (tag === 'ul' || tag === 'ol') {
            blocks.push({ type: 'list', ordered: tag === 'ol', items: [...element.children].filter(c => c.tagName.toLowerCase() === 'li').map(li => trimmed(inlines(li))) });
        } else if (tag === 'table') {
            blocks.push(tableOf(element));
        } else if (tag === 'hr') {
            blocks.push({ type: 'divider' });
        } else if (tag === 'pre') {
            blocks.push({ type: 'paragraph', content: [{ type: 'text', value: element.textContent ?? '', code: true }] });
        } else if (tag === 'blockquote') {
            blocks.push({ type: 'paragraph', content: [{ type: 'text', value: textOf(element), italic: true }] });
        } else if (element.classList.contains('memo-doc-toc')) {
            // Word has its own table-of-contents field.
        } else if (element.children.length > 0) {
            blocks.push(...blocksOf(element, views));
        } else if (textOf(element) !== '') {
            blocks.push({ type: 'paragraph', content: trimmed(inlines(element)) });
        }
    }
    return blocks;
}

/** The rendered HTML of a document as the document model, with each drawn view as an image. */
export function htmlToDhfDocument(html: string, meta: DocumentMeta, views: ReadonlyMap<string, DrawnView | undefined>): DhfDocument {
    const body = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html').getElementById('root')!;
    const sections: DhfDocumentSection[] = [];
    let current: DhfDocumentSection = { id: 'overview', title: '', blocks: [] };
    const flush = () => { if (current.blocks.length > 0 || current.title) sections.push(current); };
    let titleSeen = false;
    const walk = (root: Element) => {
        for (const element of root.children) {
            const tag = element.tagName.toLowerCase();
            if (tag === 'h1' && !titleSeen) { titleSeen = true; continue; }
            if (tag === 'h2') {
                flush();
                current = { id: `section-${sections.length + 1}`, title: textOf(element), blocks: [] };
            } else if (element.children.length > 0 && !['p', 'ul', 'ol', 'table', 'pre', 'blockquote', 'h1', 'h3', 'h4', 'h5', 'h6'].includes(tag)
                && !element.classList.contains('memo-doc-embed') && !element.classList.contains('memo-doc-toc')) {
                walk(element);
            } else {
                const holder = document.createElement('div');
                holder.appendChild(element.cloneNode(true));
                current.blocks.push(...blocksOf(holder, views));
            }
        }
    };
    walk(body);
    flush();
    return {
        frontmatter: {
            documentId: meta.id, title: meta.title, project: meta.project, organization: meta.organization, version: meta.version,
            phase: meta.phase, authors: meta.authors, approvers: meta.approvers, generatedAt: new Date().toISOString(),
        },
        sections,
        status: 'complete', totalElements: 0, totalGaps: 0,
    } as DhfDocument;
}
