import { describe, expect, it } from 'vitest';
import { viewNaming } from '../constants';

describe('how a view is named', () => {
    it('uses the diagram type the author drew when it is a kind of the view kind', () => {
        expect(viewNaming({ viewKind: 'general', diagramType: 'context' })).toMatchObject({ code: 'CTX', fullName: 'System Context Diagram' });
        expect(viewNaming({ viewKind: 'general', diagramType: 'bdd' })).toMatchObject({ code: 'BDD' });
    });

    it('keeps the view kind when the type is of another kind, or is not a known type', () => {
        // An interconnection view is not a block definition diagram, whatever type it states.
        expect(viewNaming({ viewKind: 'interconnection', diagramType: 'bdd' })).toMatchObject({ code: 'INT' });
        expect(viewNaming({ viewKind: 'general', diagramType: 'unheard-of' })).toMatchObject({ code: 'GEN', fullName: 'General View' });
    });

    it('falls back to the type when no view kind is stated, and to nothing when neither is known', () => {
        expect(viewNaming({ diagramType: 'ibd' })).toMatchObject({ code: 'IBD' });
        expect(viewNaming({ diagramType: 'nope' })).toBeUndefined();
    });
});
