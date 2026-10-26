// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { docxToBlob } from '@memoarchitect/tools/browser';
import { renderDhfDocumentHtml } from '../document-renderer';
import { htmlToDhfDocument } from '../html-to-ir';

// A 1x1 PNG.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const MARKDOWN = `# Heater

Intro with **bold**, *italic* and \`code\`.

## Purpose

- one
- two

{{diagram:heaterIBD}}

{{diagram:other}}

## Table

| A | B |
|---|---|
| 1 | 2 |
`;

const settings = { company: '', product: '', deviceType: '', version: '', phase: '' } as never;
const doc = { id: 'DOC-1', title: 'Heater', content: MARKDOWN, authors: '', approvers: '' } as never;
const html = renderDhfDocumentHtml(MARKDOWN, null, settings, doc, { resolveToc: true });
const meta = { id: 'DOC-1', title: 'Heater' };

describe('a rendered document as the document model', () => {
    const views = new Map([['heaterIBD', { base64: PNG, width: 2, height: 2 }], ['other', undefined]]);
    const ir = htmlToDhfDocument(html, meta, views);
    const blocks = ir.sections.flatMap(s => s.blocks);

    it('splits sections at each second-level heading and drops the title heading', () => {
        expect(ir.sections.map(s => s.title)).toEqual(['', 'Purpose', 'Table']);
    });

    it('keeps bold, italic and code, lists and tables', () => {
        const paragraph = blocks.find(b => b.type === 'paragraph');
        expect(paragraph).toMatchObject({ content: expect.arrayContaining([
            expect.objectContaining({ value: 'bold', bold: true }),
            expect.objectContaining({ value: 'italic', italic: true }),
            expect.objectContaining({ value: 'code', code: true }),
        ]) });
        expect(blocks.find(b => b.type === 'list')).toMatchObject({ ordered: false });
        expect(blocks.find(b => b.type === 'table')).toMatchObject({ headers: [expect.anything(), expect.anything()], rows: [expect.anything()] });
    });

    it('puts a drawn view in as an image, and names one that was not drawn', () => {
        const image = blocks.find(b => b.type === 'image');
        expect(image).toMatchObject({ alt: 'heaterIBD', data: { mime: 'image/png', width: 2, height: 2 } });
        const note = blocks.filter(b => b.type === 'paragraph').map(b => JSON.stringify(b)).find(t => t.includes('[Diagram: other'));
        expect(note).toBeDefined();
    });

    it('becomes a .docx with the picture inside', async () => {
        const blob = await docxToBlob(ir);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
        expect(new TextDecoder('latin1').decode(bytes)).toContain('word/media/');
    });
});
