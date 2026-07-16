// ─── DHF Document Renderer Tests ─────────────────────────────────────────────
//
// Markdown block parsing (tables, lists, paragraphs) and memo directive
// resolution ({{project.*}}, memo-query, approval block).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { renderMarkdownBody, renderDhfDocumentHtml } from '../document-renderer';
import type { DhfDoc, DhfSettings } from '../../store/model-store';
import type { MemoModelDTO } from '@memo/tools/browser';

const settings = (over: Partial<DhfSettings> = {}): DhfSettings => ({
    company: 'Acme Medical', product: 'GPCA Pump', deviceType: 'Infusion pump',
    version: '1.0', phase: 'design', logoUrl: '', compactLogoUrl: '',
    primaryColor: '#1B3A4B', compactMode: false, headerTemplate: '', footerTemplate: '',
    documentNumberingPrefix: 'DOC', ...over,
});

const doc = (over: Partial<DhfDoc> = {}): DhfDoc => ({
    id: 'DOC-UN-001', title: 'User Needs', group: 'Requirements',
    templateId: '21cfr820/user-needs', content: '', createdAt: 0,
    authors: 'Jane Smith | Lead Engineer', approvers: '', ...over,
});

const model = {
    elements: {
        H1: { id: 'H1', name: 'AirInLine', kind: 'Hazard', layer: 'risk' },
        H2: { id: 'H2', name: 'Overdose', kind: 'Hazard', layer: 'risk' },
    },
} as unknown as MemoModelDTO;

describe('renderMarkdownBody', () => {
    it('renders a pipe table with header into thead/tbody', () => {
        const html = renderMarkdownBody([
            '| Standard | Notes |',
            '| --- | --- |',
            '| ISO 14971 | Risk management |',
            '| IEC 62304 | Software lifecycle |',
        ].join('\n'));
        expect(html).toContain('<thead><tr><th>Standard</th><th>Notes</th></tr></thead>');
        expect(html).toContain('<td>ISO 14971</td><td>Risk management</td>');
        expect(html).toContain('<td>IEC 62304</td><td>Software lifecycle</td>');
        expect(html).not.toContain('---');
    });

    it('wraps consecutive list items in ul/ol', () => {
        const html = renderMarkdownBody('- alpha\n- beta\n\n1. one\n2. two\n');
        expect(html).toContain('<ul><li>alpha</li><li>beta</li></ul>');
        expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
    });

    it('wraps loose text in paragraphs and applies inline formatting', () => {
        const html = renderMarkdownBody('This is **bold** and `code`.\n\nSecond paragraph.');
        expect(html).toContain('<p>This is <strong>bold</strong> and <code>code</code>.</p>');
        expect(html).toContain('<p>Second paragraph.</p>');
    });

    it('passes raw HTML lines through unchanged', () => {
        const html = renderMarkdownBody('<div class="query-preview">x</div>\n\ntext');
        expect(html).toContain('<div class="query-preview">x</div>');
        expect(html).toContain('<p>text</p>');
    });

    it('renders headings, hr, blockquote and code fences', () => {
        const html = renderMarkdownBody('# Title\n\n---\n\n> quoted\n\n```\nlet x = 1;\n```');
        expect(html).toContain('<h1>Title</h1>');
        expect(html).toContain('<hr>');
        expect(html).toContain('<blockquote>quoted</blockquote>');
        expect(html).toContain('<pre><code>let x = 1;</code></pre>');
    });
});

describe('renderDhfDocumentHtml', () => {
    it('substitutes {{project.*}} values and flags missing ones', () => {
        const html = renderDhfDocumentHtml(
            'Product: {{project.product}} / Phase: {{project.phase}}',
            null, settings({ phase: '' }), doc(),
        );
        expect(html).toContain('GPCA Pump');
        expect(html).toContain('directive-error');
        expect(html).toContain('{{project.phase}}');
    });

    it('executes memo-query blocks against the model', () => {
        const md = '```memo-query\nkind: Hazard\ndisplay: table\n```';
        const html = renderDhfDocumentHtml(md, model, settings(), doc());
        expect(html).toContain('AirInLine');
        expect(html).toContain('Overdose');
        expect(html).toContain('query-preview');
    });

    it('renders memo-query count display', () => {
        const md = '```memo-query\nkind: Hazard\ndisplay: count\nlabel: Total hazards\n```';
        const html = renderDhfDocumentHtml(md, model, settings(), doc());
        expect(html).toContain('<strong>2</strong>');
        expect(html).toContain('Total hazards');
    });

    it('renders the approval block from document authors', () => {
        const md = '{{include:shared/snippets/approval-block.md}}';
        const html = renderDhfDocumentHtml(md, null, settings(), doc());
        expect(html).toContain('Jane Smith');
        expect(html).toContain('Lead Engineer');
        expect(html).toContain('No approvers set');
    });

    it('strips YAML frontmatter', () => {
        const html = renderDhfDocumentHtml('---\nid: X\n---\n\n# Hello', null, settings(), doc());
        expect(html).not.toContain('id: X');
        expect(html).toContain('<h1>Hello</h1>');
    });

    it('resolves {{toc}} on export and shows a placeholder in preview', () => {
        const md = '{{toc}}\n\n## Purpose\n\n## Scope';
        const preview = renderDhfDocumentHtml(md, null, settings(), doc());
        expect(preview).toContain('TOC — generated on export');
        const exported = renderDhfDocumentHtml(md, null, settings(), doc(), { resolveToc: true });
        expect(exported).toContain('Table of Contents');
        expect(exported).toContain('Purpose');
    });
});
