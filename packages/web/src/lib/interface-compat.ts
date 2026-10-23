// ─── Which parts an interface can join ────────────────────────────────────────
//
// An interface joins two PORTS, and the ontology types ports in families: `PhysicalPort`, `SoftwarePort`
// and `LogicalPort` are each a specialization of the root `MemoPort`, and its interface definitions type
// their ends with one family (`PhysicalInterface` ends are `PhysicalPort`). So a software part and a hardware
// part have no interface between them: their ports are in different families, and what joins them is an
// allocation. This reads that from the registry's specialization chains and the ports' kinds. It names no kind.
//
// A part that owns no port says nothing either way, so it is never ruled out; the page says it has no ports.

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { InterfaceBetween } from '@memoarchitect/tools/browser';

interface RegistryKind { name: string; construct?: string; superType?: string; layer?: string }

const kindsOf = (model: MemoModelDTO): RegistryKind[] => ((model.registries?.kinds ?? []) as unknown) as RegistryKind[];

/** The port family of each port kind: the kind just under the root port definition, or the root itself. */
function familyByPortKind(model: MemoModelDTO): Map<string, string> {
    const byName = new Map(kindsOf(model).map(kind => [kind.name, kind]));
    const family = new Map<string, string>();
    for (const kind of byName.values()) {
        if (kind.construct !== 'port def') continue;
        let current = kind;
        const seen = new Set<string>();
        // Walk up while the parent is itself a port definition that has a parent: stop one below the root.
        while (current.superType && !seen.has(current.name)) {
            seen.add(current.name);
            const parent = byName.get(current.superType);
            if (!parent || parent.construct !== 'port def' || !parent.superType) break;
            current = parent;
        }
        family.set(kind.name, current.name);
    }
    return family;
}

/** The ownership chain of an element, nearest first, ending at the element. */
function chain(model: MemoModelDTO, id: string): string[] {
    const found: string[] = [];
    const seen = new Set<string>();
    for (let current: string | undefined = id; current && !seen.has(current); current = model.elements[current]?.owner) {
        seen.add(current);
        found.push(current);
    }
    return found;
}

/** The family of one port, or undefined when its kind is not a port definition the registry knows. */
export function portFamily(model: MemoModelDTO, portId: string, families = familyByPortKind(model)): string | undefined {
    const kind = model.elements[portId]?.kind;
    return kind ? families.get(kind) : undefined;
}

/** For each part, the port families of the ports it owns, nested parts' ports included. */
export function portFamiliesByPart(model: MemoModelDTO): Map<string, Set<string>> {
    const families = familyByPortKind(model);
    const result = new Map<string, Set<string>>();
    for (const element of Object.values(model.elements)) {
        if (element.construct !== 'port') continue;
        const family = families.get(element.kind);
        if (!family) continue;
        for (const owner of chain(model, element.id).slice(1)) {
            let set = result.get(owner);
            if (!set) result.set(owner, set = new Set());
            set.add(family);
        }
    }
    return result;
}

export type Compatibility =
    | { ok: true; note?: 'no-ports' }
    | { ok: false; reason: string };

/** Whether an interface can join two parts: they share a port family, or one of them has no ports to say. */
export function interfaceCompatibility(
    model: MemoModelDTO, a: string, b: string, families = portFamiliesByPart(model),
): Compatibility {
    const ofA = families.get(a);
    const ofB = families.get(b);
    if (!ofA || !ofB) return { ok: true, note: 'no-ports' };
    if ([...ofA].some(family => ofB.has(family))) return { ok: true };
    const name = (id: string) => model.elements[id]?.name ?? id;
    return {
        ok: false,
        reason: `${name(a)} has ${[...ofA].join(', ')} ports and ${name(b)} has ${[...ofB].join(', ')} ports. The ontology types an interface's ends with one port family, so these two are related by allocation, not by an interface.`,
    };
}

/** Interfaces found between two parts whose end ports are in different families: the model states one the ontology does not allow. */
export function crossFamilyInterfaces(model: MemoModelDTO, found: readonly InterfaceBetween[]): InterfaceBetween[] {
    const families = familyByPortKind(model);
    return found.filter(f => {
        const from = portFamily(model, f.from.portId, families);
        const to = portFamily(model, f.to.portId, families);
        return from !== undefined && to !== undefined && from !== to;
    });
}
