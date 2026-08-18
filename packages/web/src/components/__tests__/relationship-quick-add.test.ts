// The typeahead behind inline relationship authoring: what a typed fragment
// matches, in what order, and how matches are segregated by element type.

import { describe, it, expect } from 'vitest';
import type { MemoElement, OntologyRegistriesDTO } from '@memoarchitect/tools/browser';
import { legalRelationshipTypes } from '@memoarchitect/tools/browser';
import { matchElements, groupMatchesByKind, matchLegalElements } from '../RelationshipQuickAdd';

function element(
    id: string,
    kind: string,
    name: string,
    extra: Partial<MemoElement> = {},
): MemoElement {
    return {
        id, name, kind, construct: 'part',
        layer: kind === 'SoftwareRequirement' ? 'requirements' : 'software',
        file: 'model/catalog.sysml', attributes: {}, ...extra,
    };
}

const elements: Record<string, MemoElement> = {
    pumpController: element('pumpController', 'SoftwareComponent', 'Pump Controller', { shortId: 'SW-1' }),
    pumpMonitor: element('pumpMonitor', 'SoftwareComponent', 'Pump Monitor', { shortId: 'SW-2' }),
    sr104: element('sr104', 'SoftwareRequirement', 'Occlusion detection', { shortId: 'SW-REQ-104' }),
    sr210: element('sr210', 'SoftwareRequirement', 'Air-in-line detection', { shortId: 'SW-REQ-210' }),
    doseCalculator: element('doseCalculator', 'SoftwareComponent', 'Dose Calculator', { shortId: 'SW-3' }),
};

describe('matchElements', () => {
    it('matches on element ID', () => {
        expect(matchElements(elements, { query: 'pumpMon', excludeId: 'x' }).map(e => e.id))
            .toEqual(['pumpMonitor']);
    });

    it('matches on short ID, which is what the user usually has in hand', () => {
        expect(matchElements(elements, { query: 'SW-REQ-104', excludeId: 'x' }).map(e => e.id))
            .toEqual(['sr104']);
    });

    it('matches on name', () => {
        expect(matchElements(elements, { query: 'occlusion', excludeId: 'x' }).map(e => e.id))
            .toEqual(['sr104']);
    });

    it('matches on kind, so a user can pull up every element of a type', () => {
        expect(matchElements(elements, { query: 'SoftwareRequirement', excludeId: 'x' }).map(e => e.id).sort())
            .toEqual(['sr104', 'sr210']);
    });

    it('is case-insensitive', () => {
        expect(matchElements(elements, { query: 'PUMPCONTROLLER', excludeId: 'x' }).map(e => e.id))
            .toEqual(['pumpController']);
    });

    it('ranks an exact ID above a substring match', () => {
        const withPrefix = {
            ...elements,
            pump: element('pump', 'SoftwareComponent', 'Zulu Pump'),
        };
        expect(matchElements(withPrefix, { query: 'pump', excludeId: 'x' })[0].id).toBe('pump');
    });

    it('ranks a prefix match above a mid-string match', () => {
        const withMidMatch = {
            alpha: element('alpha', 'SoftwareComponent', 'Alpha'),
            betaAlpha: element('betaAlpha', 'SoftwareComponent', 'Beta Alpha'),
        };
        expect(matchElements(withMidMatch, { query: 'alpha', excludeId: 'x' }).map(e => e.id))
            .toEqual(['alpha', 'betaAlpha']);
    });

    it('never offers the element being inspected — a self-link is not authorable', () => {
        expect(matchElements(elements, { query: 'pump', excludeId: 'pumpController' }).map(e => e.id))
            .not.toContain('pumpController');
    });

    it('returns nothing for an empty or whitespace query', () => {
        expect(matchElements(elements, { query: '', excludeId: 'x' })).toEqual([]);
        expect(matchElements(elements, { query: '   ', excludeId: 'x' })).toEqual([]);
    });

    it('returns nothing when nothing matches', () => {
        expect(matchElements(elements, { query: 'zzzz', excludeId: 'x' })).toEqual([]);
    });

    it('caps the result set so the list stays a typeahead', () => {
        const many: Record<string, MemoElement> = {};
        for (let i = 0; i < 100; i++) {
            many[`part${i}`] = element(`part${i}`, 'SoftwareComponent', `Part ${i}`);
        }
        expect(matchElements(many, { query: 'part', excludeId: 'x', limit: 5 })).toHaveLength(5);
    });
});

describe('groupMatchesByKind', () => {
    it('segregates matches by element type', () => {
        const groups = groupMatchesByKind(matchElements(elements, { query: 'e', excludeId: 'x' }));
        const byKind = Object.fromEntries(groups.map(g => [g.kind, g.elements.map(e => e.id)]));

        expect(Object.keys(byKind).sort()).toEqual(['SoftwareComponent', 'SoftwareRequirement']);
        expect(byKind.SoftwareRequirement.sort()).toEqual(['sr104', 'sr210']);
    });

    it('carries the layer through, so a group can be colour-coded', () => {
        const groups = groupMatchesByKind(matchElements(elements, { query: 'sr', excludeId: 'x' }));
        expect(groups[0]).toMatchObject({ kind: 'SoftwareRequirement', layer: 'requirements' });
    });

    it('orders groups by match rank, not alphabetically', () => {
        // "SW-REQ-104" is an exact short ID, so its kind must lead even though
        // SoftwareComponent sorts first alphabetically.
        const groups = groupMatchesByKind(matchElements(elements, { query: 'sw-req-104', excludeId: 'x' }));
        expect(groups[0].kind).toBe('SoftwareRequirement');
    });

    it('groups nothing when nothing matched', () => {
        expect(groupMatchesByKind([])).toEqual([]);
    });
});

// ─── Legality of the pair, once a target is picked ──────────────────────────

describe('relationship choices for a picked pair', () => {
    const registries: OntologyRegistriesDTO = {
        kinds: [
            { name: 'MemoPart', label: 'Memo Part', layer: 'core', construct: 'part def', isAbstract: true },
            { name: 'VerifiableElement', label: 'Verifiable Element', layer: 'core', construct: 'requirement def', isAbstract: true },
            { name: 'SoftwareComponent', label: 'Software Component', layer: 'software', construct: 'part def', superType: 'MemoPart' },
            { name: 'SoftwareRequirement', label: 'Software Requirement', layer: 'requirements', construct: 'requirement def', superType: 'VerifiableElement' },
        ],
        relationships: [
            {
                name: 'satisfiedBy', sysmlName: 'SatisfiedBy', label: 'Satisfied By', layer: 'requirements',
                sourceEnd: { name: 'satisfyingElement', type: 'MemoPart' },
                targetEnd: { name: 'requiredElement', type: 'VerifiableElement' },
            },
            {
                name: 'tracesTo', sysmlName: 'TracesTo', label: 'Traces To', layer: 'core',
                sourceEnd: { name: 'tracingElement', type: 'MemoPart' },
                targetEnd: { name: 'tracedElement', type: 'MemoPart' },
            },
        ],
    };

    it('offers every legal type between the two picked elements, in both directions', () => {
        const options = legalRelationshipTypes(
            elements.pumpController, elements.sr104, registries);

        // Only satisfiedBy fits: tracesTo stays within the MemoPart family.
        expect(options.map(o => `${o.definition.name}:${o.direction}`).sort())
            .toEqual(['satisfiedBy:outgoing']);
    });

    it('puts the picked element on the correct end for an incoming choice', () => {
        const incoming = legalRelationshipTypes(elements.pumpController, elements.pumpMonitor, registries)
            .find(option => option.direction === 'incoming')!;

        expect(incoming.sourceId).toBe('pumpMonitor');
        expect(incoming.targetId).toBe('pumpController');
    });

    it('offers nothing when the ontology permits nothing between the two kinds', () => {
        const satisfiedByOnly: OntologyRegistriesDTO = {
            kinds: registries.kinds,
            relationships: [registries.relationships[0]],
        };
        expect(legalRelationshipTypes(elements.sr104, elements.sr210, satisfiedByOnly)).toEqual([]);
    });

    it('filters typeahead results to MEMO-legal trace targets before applying the result cap', () => {
        const manyIllegal = Object.fromEntries(Array.from({ length: 50 }, (_, index) => {
            const item = element(`matchingRequirement${index}`, 'SoftwareRequirement', `Matching requirement ${index}`);
            return [item.id, item];
        }));
        const legal = element('matchingController', 'SoftwareComponent', 'Matching controller');
        const source = elements.sr104;
        const candidates = { ...manyIllegal, [legal.id]: legal, [source.id]: source };

        const satisfiedByOnly: OntologyRegistriesDTO = {
            kinds: registries.kinds,
            relationships: [registries.relationships[0]],
        };

        expect(matchLegalElements(candidates, {
            query: 'matching', source, registries: satisfiedByOnly, limit: 5,
        }).map(candidate => candidate.id)).toEqual(['matchingController']);
    });
});
