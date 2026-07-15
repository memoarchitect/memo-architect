// ─── DHF Document Renderer ────────────────────────────────────────────────────
//
// Renders a DHF document's markdown to HTML for the workbench preview and for
// export. Handles the memo directive set before markdown:
//
//   - {{project.*}}                → value from settings, or a red error badge
//   - {{ref:ID.attr}}              → element lookup in the live model
//   - {{include:...approval-block}} → rendered from per-doc authors/approvers
//   - other {{include}}/{{toc}}/{{glossary}} → grey placeholder ({{toc}} is
//     resolved to a real list when `resolveToc` is set, used on export)
//   - ```memo-query```             → live query against the model
//   - ```memo-script```            → placeholder (executed by the CLI on export)
//
// The markdown pass is a small block parser (headings, tables, lists, quotes,
// code fences, paragraphs). Raw HTML lines pass through untouched so directive
// output survives. Styling lives in document-theme.ts, not here.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memo/core';
import type { DhfSettings, DhfDoc } from '../store/model-store';

export interface RenderOptions {
    /** Replace {{toc}} with a generated table of contents (export) instead of a placeholder (preview) */
    resolveToc?: boolean;
    /**
     * How {{diagram:id}} renders: 'marker' (default) emits an empty
     * `.memo-doc-diagram` div the preview replaces with a live diagram card;
     * 'note' emits a static reference note (export).
     */
    diagrams?: 'marker' | 'note';
}

/** Marker element the preview splits on to mount live diagram embeds */
export const DIAGRAM_MARKER_RE = /<div class="memo-doc-diagram" data-diagram-id="([^"]*)"><\/div>/;

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Directive resolution ────────────────────────────────────────────────────

/** Render authors/approvers list as HTML table rows */
function renderPersonRows(raw: string, role: 'Author' | 'Approver'): string {
    const entries = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (entries.length === 0) {
        return `<tr><td colspan="4" style="color:#9CA3AF;font-style:italic">No ${role.toLowerCase()}s defined</td></tr>`;
    }
    return entries.map(entry => {
        const [name = '', roleStr = ''] = entry.split('|').map(s => s.trim());
        return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(roleStr || role)}</td><td style="color:#9CA3AF">—</td><td style="color:#9CA3AF">—</td></tr>`;
    }).join('');
}

function renderApprovalBlock(doc: DhfDoc): string {
    const hasAuthors = doc.authors.trim().length > 0;
    const hasApprovers = doc.approvers.trim().length > 0;
    const head = '<thead><tr><th>Name</th><th>Role</th><th>Signature</th><th>Date</th></tr></thead>';
    return `
<h2>Authors</h2>
<table>${head}<tbody>${renderPersonRows(doc.authors, 'Author')}</tbody></table>
${!hasAuthors ? '<p style="font-size:11px;color:#dc2626">⚠ No authors set — open Document Properties to add authors.</p>' : ''}
<h2>Approvers</h2>
<table>${head}<tbody>${renderPersonRows(doc.approvers, 'Approver')}</tbody></table>
${!hasApprovers ? '<p style="font-size:11px;color:#dc2626">⚠ No approvers set — open Document Properties to add approvers.</p>' : ''}`;
}

function generateToc(md: string): string {
    const items: string[] = [];
    const headingRe = /^(#{2,4})\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(md)) !== null) {
        const indent = (m[1].length - 2) * 18;
        items.push(`<div style="margin-left:${indent}px">${escapeHtml(m[2].trim())}</div>`);
    }
    if (items.length === 0) return '';
    return `<h2>Table of Contents</h2><div class="memo-doc-toc">${items.join('')}</div>`;
}

function resolveDirectives(
    content: string,
    model: MemoModelDTO | null,
    settings: DhfSettings,
    doc: DhfDoc,
    opts: RenderOptions,
): string {
    // {{include:...approval-block.md}} — rendered from per-doc authors/approvers
    content = content.replace(
        /\{\{include:shared\/snippets\/approval-block\.md\}\}/g,
        () => renderApprovalBlock(doc)
    );

    // Other {{include:...}} — placeholder
    content = content.replace(/\{\{include:([^}]+)\}\}/g, (_m, path: string) =>
        `<span class="directive-placeholder">[Snippet: ${escapeHtml(path)} — rendered on export]</span>`
    );

    // {{project.*}} — value if set, red error badge if missing
    const projectMap: Record<string, string> = {
        company: settings.company,
        product: settings.product,
        device_type: settings.deviceType,
        version: settings.version,
        phase: settings.phase,
    };
    content = content.replace(/\{\{project\.([^}]+)\}\}/g, (_m, key: string) => {
        const val = projectMap[key];
        if (val && val.trim()) return escapeHtml(val);
        return `<span class="directive-error">⚠ {{project.${escapeHtml(key)}}} — not set</span>`;
    });

    // {{ref:ID.attr}} — element lookup
    content = content.replace(/\{\{ref:([^.}]+)(?:\.(\w+))?\}\}/g, (_m, id, attr) => {
        if (!model) return `<code>${escapeHtml(id)}</code>`;
        const el = model.elements[id];
        if (!el) return `<em>[${escapeHtml(id)} not found]</em>`;
        if (!attr || attr === 'name') return escapeHtml(el.name);
        return escapeHtml(String((el as unknown as Record<string, unknown>)[attr] ?? el.name));
    });

    // {{diagram:id}} — live embed marker in preview, reference note on export
    content = content.replace(/\{\{diagram:([^}]+)\}\}/g, (_m, id: string) =>
        opts.diagrams === 'note'
            ? `<p><strong>[Diagram: ${escapeHtml(id.trim())}]</strong> <em>— view in MEMO Architect</em></p>`
            : `<div class="memo-doc-diagram" data-diagram-id="${escapeHtml(id.trim())}"></div>`);

    // {{toc}} / {{glossary}} / any other directive
    content = content.replace(/\{\{toc\}\}/g, () => opts.resolveToc
        ? generateToc(content)
        : '<span class="directive-placeholder">[TOC — generated on export]</span>');
    content = content.replace(/\{\{glossary\}\}/g, '<span class="directive-placeholder">[Glossary — generated on export]</span>');
    content = content.replace(/\{\{[^}]+\}\}/g, m => `<span class="directive-placeholder">${escapeHtml(m)}</span>`);

    // ```memo-query``` — live query against the model
    content = content.replace(/```memo-query\r?\n([\s\S]*?)```/g, (_m, block) => {
        const lines = block.split('\n').filter(Boolean);
        const get = (prefix: string) => (lines.find((l: string) => l.startsWith(prefix)) ?? '').replace(prefix, '').trim();
        const kindStr = get('kind:') || '?';
        const displayStr = get('display:') || 'table';
        const emptyMsg = get('empty:').replace(/^['"]|['"]$/g, '') || 'No results found.';
        const labelStr = get('label:') || kindStr;

        if (!model) return `<div class="query-preview">⟳ <em>memo-query: ${escapeHtml(kindStr)} (${escapeHtml(displayStr)})</em></div>`;

        const kinds = kindStr.startsWith('[') || kindStr.startsWith('-')
            ? kindStr.replace(/[\[\]]/g, '').split(/[,\n]/).map((s: string) => s.replace('-', '').trim()).filter(Boolean)
            : [kindStr];

        const els = Object.values(model.elements).filter(el => kinds.includes(el.kind));
        if (els.length === 0) return `<div class="query-preview empty"><em>${escapeHtml(emptyMsg)}</em></div>`;

        if (displayStr === 'count') {
            return `<div class="query-preview count"><strong>${els.length}</strong><span>${escapeHtml(labelStr)}</span></div>`;
        }

        const cols = ['name', 'kind', 'layer'];
        const header = cols.map(c => `<th>${c}</th>`).join('');
        const rows = els.slice(0, 10).map(el => {
            const cells = cols.map(c => `<td>${escapeHtml(String((el as unknown as Record<string, unknown>)[c] ?? '—'))}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const more = els.length > 10 ? `<tr><td colspan="${cols.length}" style="color:#9CA3AF;font-size:11px">…and ${els.length - 10} more</td></tr>` : '';
        return `<div class="query-preview"><table><thead><tr>${header}</tr></thead><tbody>${rows}${more}</tbody></table></div>`;
    });

    // ```memo-script``` — placeholder
    content = content.replace(/```memo-script\r?\n([\s\S]*?)```/g,
        '<div class="query-preview script"><em>memo-script — executed on export</em></div>');

    return content;
}

// ─── Markdown block parser ────────────────────────────────────────────────────

function inline(text: string): string {
    return text
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const TABLE_SEPARATOR_RE = /^\|\s*:?-{2,}.*\|$/;

/** Convert markdown (with embedded raw HTML lines) to HTML block by block */
export function renderMarkdownBody(md: string): string {
    const out: string[] = [];
    const lines = md.split(/\r?\n/);
    let i = 0;

    let paragraph: string[] = [];
    const flushParagraph = () => {
        if (paragraph.length > 0) {
            out.push(`<p>${inline(paragraph.join(' '))}</p>`);
            paragraph = [];
        }
    };

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Blank line — paragraph boundary
        if (trimmed === '') { flushParagraph(); i++; continue; }

        // Raw HTML passthrough (directive output, hand-written HTML)
        if (trimmed.startsWith('<')) { flushParagraph(); out.push(line); i++; continue; }

        // Fenced code block
        const fence = trimmed.match(/^```(\w[\w-]*)?/);
        if (fence) {
            flushParagraph();
            const code: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
            i++; // closing fence
            out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
            continue;
        }

        // Heading
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            const level = heading[1].length;
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            i++; continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,})$/.test(trimmed)) { flushParagraph(); out.push('<hr>'); i++; continue; }

        // Blockquote (merge consecutive lines)
        if (trimmed.startsWith('> ') || trimmed === '>') {
            flushParagraph();
            const quote: string[] = [];
            while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
                quote.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
            continue;
        }

        // Table: consecutive lines starting and ending with '|'
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            flushParagraph();
            const rows: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                rows.push(lines[i].trim());
                i++;
            }
            const cellsOf = (row: string) => row.slice(1, -1).split('|').map(c => c.trim());
            const hasHeader = rows.length > 1 && TABLE_SEPARATOR_RE.test(rows[1]);
            const bodyRows = hasHeader ? rows.slice(2) : rows;
            let html = '<table>';
            if (hasHeader) {
                html += `<thead><tr>${cellsOf(rows[0]).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
            }
            html += `<tbody>${bodyRows
                .filter(r => !TABLE_SEPARATOR_RE.test(r))
                .map(r => `<tr>${cellsOf(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`)
                .join('')}</tbody></table>`;
            out.push(html);
            continue;
        }

        // Lists (unordered/ordered, consecutive items; indented lines continue an item)
        const isUl = /^[-*]\s+/.test(trimmed);
        const isOl = /^\d+\.\s+/.test(trimmed);
        if (isUl || isOl) {
            flushParagraph();
            const tag = isUl ? 'ul' : 'ol';
            const itemRe = isUl ? /^[-*]\s+/ : /^\d+\.\s+/;
            const items: string[] = [];
            while (i < lines.length) {
                const t = lines[i].trim();
                if (itemRe.test(t)) { items.push(t.replace(itemRe, '')); i++; }
                else if (t !== '' && /^\s{2,}/.test(lines[i]) && items.length > 0) {
                    items[items.length - 1] += ` ${t}`; i++;
                }
                else break;
            }
            out.push(`<${tag}>${items.map(it => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
            continue;
        }

        // Paragraph text
        paragraph.push(trimmed);
        i++;
    }
    flushParagraph();
    return out.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Render a DHF document's markdown to themed-classes HTML (no styles inlined —
 * pair with documentThemeCss() from document-theme.ts).
 */
export function renderDhfDocumentHtml(
    content: string,
    model: MemoModelDTO | null,
    settings: DhfSettings,
    doc: DhfDoc,
    opts: RenderOptions = {},
): string {
    // Strip YAML frontmatter
    const body = content.replace(/^---[\s\S]*?---\r?\n/, '');
    const resolved = resolveDirectives(body, model, settings, doc, opts);
    return renderMarkdownBody(resolved);
}
