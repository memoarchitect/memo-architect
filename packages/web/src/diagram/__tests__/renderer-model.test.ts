import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { rendererModel, retainRendererModel } from '../renderer-model';
const model = (hash = 'semantic'): MemoModelDTO => ({ elements: {}, relationships: [], errors: [], sourceHashes: { 'model/views.sysml': hash } });
describe('native renderer ownership across settled layout publications', () => {
    it('retains the semantic owner across publications and never stores native objects', () => {
        const a = { ...model(), metadata: { version: '0.15.3-dev.1' } }, b = { ...model(), revision: 2, metadata: { version: '0.15.3-dev.2' } }, c = { ...model(), revision: 3, metadata: { version: '0.15.3-dev.3' } };
        retainRendererModel(a, b); retainRendererModel(b, c);
        expect(rendererModel(b)).toBe(a); expect(rendererModel(c)).toBe(a);
        expect(c).toEqual({ ...model(), revision: 3, metadata: { version: '0.15.3-dev.3' } });
    });
    it('invalidates for semantic source, ontology contract or project changes, and absent hashes', () => {
        const a = model();
        for (const b of [model('changed'), { ...model(), diagrams: [] }, { ...model(), ontologyHash: 'new-library-content' }, { ...model(), metadata: { modelName: 'other' } }, { ...model(), enumerations: [{ name: 'NewKind', literals: [] }] }, { ...model(), sourceHashes: undefined }]) {
            retainRendererModel(a, b); expect(rendererModel(b)).toBe(b);
        }
    });
});
