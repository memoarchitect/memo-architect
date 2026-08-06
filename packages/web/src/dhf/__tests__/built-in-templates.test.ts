// The built-in template loader resolves DHF markdown out of the ontology
// package with an `import.meta.glob` literal. A glob that matches nothing is
// not a build error, so when the templates moved to `src/artifacts/templates/dhf/`
// the loader kept pointing at the old `src/compliance/dhf-templates/` path and
// every template in the New Document wizard came up blank — with nothing red
// anywhere. These tests are the tripwire for the next such move.

import { describe, it, expect } from 'vitest';
import { builtInTemplateCount, getBuiltInTemplate } from '../built-in-templates';

describe('built-in DHF templates', () => {
    it('resolves the ontology template directory at all', () => {
        expect(builtInTemplateCount).toBeGreaterThan(0);
    });

    it('loads a known template by id', () => {
        const rmp = getBuiltInTemplate('iso-14971/rmp');
        expect(rmp).not.toBeNull();
        expect(rmp!.length).toBeGreaterThan(0);
    });

    it('resolves {{include:}} directives rather than leaving them in the body', () => {
        const rmp = getBuiltInTemplate('iso-14971/rmp');
        expect(rmp).not.toMatch(/\{\{include:/);
    });

    it('returns null for an unknown template id', () => {
        expect(getBuiltInTemplate('no-such-standard/no-such-doc')).toBeNull();
    });
});
