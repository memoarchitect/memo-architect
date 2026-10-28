// ─── The element types the ontology offers ────────────────────────────────────
//
// A type picker (the explorer's type filter, a matrix axis) should offer the ontology's own element types,
// not every definition a project made for itself: `AfferaHexaFlowSystem` is a `System`, and choosing
// `System` reaches it. The catalog answers "which types, how many elements each, and under which heading"
// from the model's kind registry, so every picker that asks gets the same answer.
//
// What it needs from the outside is narrow and passed in: the registry's kinds, the element counts, and a
// fallback for a registry that does not say where a kind comes from. Nothing here knows a kind by name.

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { TypeFilterOption } from '../components/TypeFilterSelect';
import { kindsUnder, type KindParents } from '../analysis/kind-hierarchy';

/** A kind definition as the model's registry carries it (the fields a picker reads). */
export interface RegistryKind {
    name: string;
    label?: string;
    layer?: string;
    construct?: string;
    superType?: string;
    isAbstract?: boolean;
    namespace?: string[];
    /** Absent on a registry from a server that does not record it. */
    origin?: 'ontology' | 'project';
}

/** What a picker needs of a catalog: the options to show. */
export interface KindCatalog {
    options(): TypeFilterOption[];
}

/** Definitions that are not element types: you cannot have an element "of" one. */
const NOT_ELEMENT_TYPES = /^(enum|attribute|metadata|connection) def$/;

const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).replace(/[-_]/g, ' ');

export class OntologyKindCatalog implements KindCatalog {
    private readonly byName = new Map<string, RegistryKind>();
    private readonly counts = new Map<string, number>();
    private readonly parentOf = new Map<string, string>();
    private readonly childrenOf = new Map<string, string[]>();
    private readonly universe: string[];

    /**
     * @param kinds the model's kind registry
     * @param elementKinds the kind of each element in the model (one entry per element)
     * @param isOntologyKind decides for a registry that does not mark where a kind comes from
     */
    constructor(
        kinds: readonly RegistryKind[],
        elementKinds: Iterable<string>,
        private readonly isOntologyKind: (name: string) => boolean = () => true,
    ) {
        for (const kind of kinds) {
            this.byName.set(kind.name, kind);
            if (kind.superType) {
                this.parentOf.set(kind.name, kind.superType);
                this.childrenOf.set(kind.superType, [...(this.childrenOf.get(kind.superType) ?? []), kind.name]);
            }
        }
        for (const kind of elementKinds) this.counts.set(kind, (this.counts.get(kind) ?? 0) + 1);
        this.universe = [...this.counts.keys()];
    }

    static of(model: MemoModelDTO | null, isOntologyKind?: (name: string) => boolean): OntologyKindCatalog {
        const kinds = ((model?.registries?.kinds ?? []) as unknown) as RegistryKind[];
        return new OntologyKindCatalog(kinds, Object.values(model?.elements ?? {}).map(element => element.kind), isOntologyKind);
    }

    /** The specialization chain of every kind in the registry, for expanding a chosen type to its family. */
    get parents(): KindParents {
        return this.parentOf;
    }

    /** Elements of a type, counting the types that specialize it. */
    total(name: string): number {
        return kindsUnder(name, this.parentOf, this.universe).reduce((sum, kind) => sum + (this.counts.get(kind) ?? 0), 0);
    }

    private isOntology(kind: RegistryKind): boolean {
        return kind.origin ? kind.origin === 'ontology' : this.isOntologyKind(kind.name);
    }

    /** Elements whose kind is exactly this one. */
    exactly(name: string): number {
        return this.counts.get(name) ?? 0;
    }

    /**
     * A type no element is exactly of, whose only populated type below is another ontology type, says nothing its
     * child does not (`MemoNeed` over `Need`): offering both is noise.
     */
    private passesThrough(name: string): boolean {
        if (this.exactly(name) > 0) return false;
        const populated = (this.childrenOf.get(name) ?? []).filter(child => this.total(child) > 0);
        // Only when that child is itself an ontology type: a type reached only through the project's own
        // specialization (`System` over `AfferaHexaFlowSystem`) is the way to those elements, and stays.
        return populated.length === 1 && this.isOntology(this.byName.get(populated[0])!);
    }

    /**
     * The ontology's element types the model holds. By default a type counts when any element of it or of a type
     * that specializes it exists (choosing it reaches them all); `withSubtypes: false` asks for types that have
     * elements of exactly that kind, which is what filtering a list by kind needs.
     */
    elementKinds({ withSubtypes = true }: { withSubtypes?: boolean } = {}): RegistryKind[] {
        const held = (name: string) => (withSubtypes ? this.total(name) > 0 && !this.passesThrough(name) : this.exactly(name) > 0);
        return [...this.byName.values()]
            .filter(kind => !kind.isAbstract && !NOT_ELEMENT_TYPES.test(kind.construct ?? '') && this.isOntology(kind) && held(kind.name))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * The same options as a tree: each type under the type it specializes, within its domain, so a family such as
     * anatomy opens from its root (`AnatomyEntity`, then organ, then stomach) instead of listing every class flat.
     * A type that no element is exactly of but that holds others stays as a heading; the climb stops where the
     * specialization leaves the domain (into `MemoPart`), because that root would hold the whole model.
     */
    hierarchy(): { options: TypeFilterOption[]; parentOf: Map<string, string> } {
        const domainOf = (kind: RegistryKind) => kind.namespace?.[0] ?? kind.layer ?? 'other';
        const included = new Map<string, RegistryKind>();
        const parentOf = new Map<string, string>();
        for (const kind of this.elementKinds()) {
            let current: RegistryKind | undefined = kind;
            while (current && !included.has(current.name)) {
                included.set(current.name, current);
                const parent: RegistryKind | undefined = current.superType ? this.byName.get(current.superType) : undefined;
                if (!parent || domainOf(parent) !== domainOf(current) || NOT_ELEMENT_TYPES.test(parent.construct ?? '') || !this.isOntology(parent)) break;
                parentOf.set(current.name, parent.name);
                current = parent;
            }
        }
        const options = [...included.values()]
            .map(kind => ({ kind, group: titleCase(domainOf(kind)) }))
            .sort((a, b) => a.group.localeCompare(b.group) || (a.kind.label ?? a.kind.name).localeCompare(b.kind.label ?? b.kind.name))
            .map(({ kind, group }) => ({
                value: kind.name, label: kind.label ?? kind.name, group, hint: String(this.total(kind.name)), keywords: kind.name,
            }));
        return { options, parentOf };
    }

    /** One option per type, grouped under its ontology domain, with its element count. */
    options(): TypeFilterOption[] {
        return this.elementKinds()
            .map(kind => ({ kind, group: titleCase(kind.namespace?.[0] ?? kind.layer ?? 'other') }))
            .sort((a, b) => a.group.localeCompare(b.group) || (a.kind.label ?? a.kind.name).localeCompare(b.kind.label ?? b.kind.name))
            .map(({ kind, group }) => ({
                value: kind.name, label: kind.label ?? kind.name, group, hint: String(this.total(kind.name)), keywords: kind.name,
            }));
    }
}
