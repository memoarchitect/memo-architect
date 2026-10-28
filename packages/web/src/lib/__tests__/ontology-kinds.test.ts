import { describe, expect, it } from 'vitest';
import { OntologyKindCatalog, type RegistryKind } from '../ontology-kinds';

const kind = (name: string, extra: Partial<RegistryKind> = {}): RegistryKind =>
    ({ name, label: name, construct: 'part def', layer: 'x', namespace: ['assurance', 'requirements'], origin: 'ontology', ...extra });

const kinds: RegistryKind[] = [
    kind('Requirement'),
    kind('SecurityRequirement', { superType: 'Requirement', namespace: ['assurance', 'cybersecurity'] }),
    kind('Need', { namespace: ['assurance', 'requirements'] }),
    kind('Hazard', { namespace: ['assurance', 'safety_risk'] }),
    kind('System', { namespace: ['architecture', 'logical'] }),
    kind('MemoPart', { isAbstract: true }),
    kind('RequirementTypeKind', { construct: 'enum def' }),
    kind('VerifiedBy', { construct: 'connection def' }),
    kind('Unused'),
    // the project's own definitions
    kind('AfferaHexaFlowSystem', { superType: 'System', origin: 'project', namespace: ['architecture', 'logical'] }),
];
// one entry per element
const elements = ['Requirement', 'Requirement', 'SecurityRequirement', 'Need', 'Hazard', 'AfferaHexaFlowSystem', 'AfferaHexaFlowSystem'];

describe('OntologyKindCatalog', () => {
    const catalog = new OntologyKindCatalog(kinds, elements);

    it('offers the ontology\'s element types the model holds, and nothing else', () => {
        expect(catalog.elementKinds().map(k => k.name)).toEqual(['Hazard', 'Need', 'Requirement', 'SecurityRequirement', 'System']);
    });

    it('leaves out the project\'s own definitions, abstract bases, enums, connections and unused types', () => {
        const names = catalog.elementKinds().map(k => k.name);
        for (const left of ['AfferaHexaFlowSystem', 'MemoPart', 'RequirementTypeKind', 'VerifiedBy', 'Unused']) expect(names).not.toContain(left);
    });

    it('reaches a project definition by the ontology type it specializes', () => {
        expect(catalog.total('System')).toBe(2);              // both elements are of the project's own kind
        expect(catalog.exactly('System')).toBe(0);
        expect(catalog.total('Requirement')).toBe(3);         // plus the type that specializes it
        expect(catalog.exactly('Requirement')).toBe(2);
    });

    it('can ask for types with elements of exactly that kind, which is what filtering a list needs', () => {
        expect(catalog.elementKinds({ withSubtypes: false }).map(k => k.name)).toEqual(['Hazard', 'Need', 'Requirement', 'SecurityRequirement']);
    });

    it('lists each type with its count under its ontology domain', () => {
        const options = catalog.options();
        expect(options.find(option => option.value === 'Requirement')).toMatchObject({ group: 'Assurance', hint: '3', label: 'Requirement' });
        expect(options.find(option => option.value === 'SecurityRequirement')).toMatchObject({ group: 'Assurance', hint: '1' });
        expect(options.find(option => option.value === 'System')).toMatchObject({ group: 'Architecture', hint: '2' });
        expect(options.map(option => option.group)).toEqual([...options.map(option => option.group)].sort());
    });

    it('exposes the specialization chain of every kind, for expanding a type to its family', () => {
        expect(catalog.parents.get('SecurityRequirement')).toBe('Requirement');
        expect(catalog.parents.get('AfferaHexaFlowSystem')).toBe('System');
    });
});

describe('OntologyKindCatalog pass-through types', () => {
    const chain: RegistryKind[] = [
        kind('MemoNeed'), kind('Need', { superType: 'MemoNeed' }),
        kind('Base'), kind('A', { superType: 'Base' }), kind('B', { superType: 'Base' }),
    ];

    it('leaves out a type that only repeats its one populated child', () => {
        const names = new OntologyKindCatalog(chain, ['Need', 'Need']).elementKinds().map(k => k.name);
        expect(names).toEqual(['Need']);
    });

    it('keeps a type that brings together several populated children', () => {
        const names = new OntologyKindCatalog(chain, ['A', 'B']).elementKinds().map(k => k.name);
        expect(names).toEqual(['A', 'B', 'Base']);
    });

    it('keeps a type that has elements of its own', () => {
        const names = new OntologyKindCatalog(chain, ['MemoNeed', 'Need']).elementKinds().map(k => k.name);
        expect(names).toEqual(['MemoNeed', 'Need']);
    });
});

describe('OntologyKindCatalog with a registry that does not say where a kind comes from', () => {
    const unmarked = kinds.map(({ origin: _origin, ...rest }) => rest);

    it('asks the fallback', () => {
        const onlyOntology = new Set(['Requirement', 'Need', 'Hazard', 'System', 'SecurityRequirement']);
        const catalog = new OntologyKindCatalog(unmarked, elements, name => onlyOntology.has(name));
        expect(catalog.elementKinds().map(k => k.name)).not.toContain('AfferaHexaFlowSystem');
        expect(catalog.elementKinds().map(k => k.name)).toContain('Hazard');
    });

    it('offers everything held when the fallback is the default', () => {
        const catalog = new OntologyKindCatalog(unmarked, elements);
        expect(catalog.elementKinds().map(k => k.name)).toContain('AfferaHexaFlowSystem');
    });
});

describe('OntologyKindCatalog.of', () => {
    it('is empty for no model', () => {
        expect(OntologyKindCatalog.of(null).options()).toEqual([]);
    });
});

describe('OntologyKindCatalog hierarchy', () => {
    const anatomy = (name: string, superType?: string, extra: Partial<RegistryKind> = {}) =>
        kind(name, { superType, namespace: ['vocabulary'], ...extra });
    const registry: RegistryKind[] = [
        anatomy('AnatomyEntity', 'MemoPart', { isAbstract: true }),
        anatomy('AnatomicalEntity', 'AnatomyEntity'),
        anatomy('Organ', 'AnatomicalEntity'),
        anatomy('Stomach', 'Organ'),
        anatomy('Jejunum', 'Organ'),
        kind('MemoPart', { isAbstract: true, namespace: ['core', 'common'] }),
    ];
    const tree = new OntologyKindCatalog(registry, ['Stomach', 'Jejunum', 'Stomach']).hierarchy();

    it('puts each type under the type it specializes, headings included, and stops where the domain ends', () => {
        expect(tree.parentOf.get('Stomach')).toBe('Organ');
        expect(tree.parentOf.get('Jejunum')).toBe('Organ');
        expect(tree.parentOf.get('Organ')).toBe('AnatomicalEntity');
        expect(tree.parentOf.get('AnatomicalEntity')).toBe('AnatomyEntity');
        expect(tree.parentOf.has('AnatomyEntity')).toBe(false); // MemoPart is another domain
        expect(tree.options.map(option => option.value).sort()).toEqual(['AnatomicalEntity', 'AnatomyEntity', 'Jejunum', 'Organ', 'Stomach']);
    });

    it('counts a heading by the elements beneath it', () => {
        expect(tree.options.find(option => option.value === 'Organ')?.hint).toBe('3');
    });
});
