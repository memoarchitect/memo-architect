// ─── Views select relationships through the checked accessor ──────────────────
//
// A view that picks relationships out of the model by a type it spells in its
// own source cannot tell a type the ontology never declared from one the model
// has none of: both select nothing, and the view is empty in every model. The
// accessor `relationshipsOfType` (@memoarchitect/tools) compares each name with
// the model's registries and says so. This keeps selections going through it:
// no `.filter`, `.find`, `.some` or `continue` over `.type` against a literal.
// The literals themselves are checked against the ontology in memo-tools
// (`architect-relation-literals.test.ts`), where the registries are.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

function sources(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name !== '__tests__' && name !== 'node_modules') sources(full, out);
        } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

/** A relationship's `.type` compared with a string literal, on a line that selects. */
const AD_HOC_SELECTION = /\b(rel|relationship|r)\.type(\.toLowerCase\(\))?\s*[!=]==?\s*'[^']*'/;
const SELECTS = /\.filter\(|\.find\(|\.some\(|\bcontinue\b/;

describe('relationship selection in the web sources', () => {
    it('goes through relationshipsOfType, never a literal compared with `.type`', () => {
        const found = sources(root).flatMap(file => readFileSync(file, 'utf8').split('\n')
            .map((text, index) => ({ file: relative(root, file), line: index + 1, text: text.trim() }))
            .filter(({ text }) => !text.startsWith('//') && AD_HOC_SELECTION.test(text) && SELECTS.test(text)));
        expect(found.map(f => `${f.file}:${f.line}  ${f.text}`)).toEqual([]);
    });
});
