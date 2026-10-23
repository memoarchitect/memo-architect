// ─── The Interfaces page: choosing two parts and keeping the answer ───────────
//
// The page asks one question of the model — what interfaces are there between part A and part B — and
// `interfacesBetween` (memo-tools) answers it. Saving the answer writes a dashboard whose body names the two
// parts in an `{{interfaces:A | B}}` directive, so the file holds the question, not a copy of the answer: it
// is read from the model each time the page opens.

import type { DashboardDTO, MemoModelDTO, MemoElement } from '@memoarchitect/tools/browser';
import { parseInterfacesPair } from '../dhf/document-renderer';
import { kindsUnder, type KindParents } from '../analysis/kind-hierarchy';
import { portFamiliesByPart } from './interface-compat';

/**
 * The parts an interface can be about: usages, not definitions, in a layer where the ontology defines ports or
 * interfaces, or that own a port themselves. Risks, actors, stakeholders and the like are parts to SysML and have
 * nothing to interface with, so listing them buried the components in Affera under a few hundred other rows.
 */
export function selectableParts(model: MemoModelDTO | null): MemoElement[] {
    if (!model) return [];
    const kinds = ((model.registries?.kinds ?? []) as unknown) as { construct?: string; layer?: string }[];
    const layers = new Set(kinds.filter(k => k.construct === 'port def' || k.construct === 'interface def').map(k => k.layer));
    const withPorts = portFamiliesByPart(model);
    return Object.values(model.elements)
        .filter(element => element.construct === 'part' && !element.isDefinition && (layers.has(element.layer) || withPorts.has(element.id)))
        .sort((x, y) => x.name.localeCompare(y.name) || x.id.localeCompare(y.id));
}

/** The parts matching the types (each with the types that specialize it) and a piece of the name; none for an empty filter. */
export function filterParts(parts: readonly MemoElement[], filter: { kinds: readonly string[]; contains: string }, parents: KindParents): MemoElement[] {
    const text = filter.contains.trim().toLowerCase();
    if (filter.kinds.length === 0 && !text) return [];
    const universe = [...new Set(parts.map(part => part.kind))];
    const wanted = new Set(filter.kinds.flatMap(kind => kindsUnder(kind, parents, universe)));
    return parts.filter(part =>
        (wanted.size === 0 || wanted.has(part.kind)) && (!text || part.name.toLowerCase().includes(text) || part.id.toLowerCase().includes(text)));
}

/** The title a saved interface page gets by default. */
export function defaultInterfacesTitle(model: MemoModelDTO | null, a: string, b: string): string {
    const name = (id: string) => model?.elements[id]?.name ?? id;
    return `Interfaces between ${name(a)} and ${name(b)}`;
}

/** The dashboard file for a pair of parts. Ids are qualified, so the file survives a rename of the label. */
export function interfacesMarkdown(model: MemoModelDTO | null, a: string, b: string, title: string): string {
    const name = (id: string) => model?.elements[id]?.name ?? id;
    const clean = title.replace(/\n/g, ' ').trim();
    return `---
title: ${clean}
---
# ${clean}

The interfaces between **${name(a)}** and **${name(b)}**, read from the model each time this page opens.

{{interfaces:${a} | ${b}}}
`;
}

/** A saved interfaces page: the dashboard that holds it and the two parts it asks about. */
export interface SavedInterfaces { dashboard: DashboardDTO; a: string; b: string }

/** The dashboards that are an interfaces page, found by their directive, so the page can list and reopen them. */
export function savedInterfaces(dashboards: readonly DashboardDTO[]): SavedInterfaces[] {
    const found: SavedInterfaces[] = [];
    for (const dashboard of dashboards) {
        const body = /\{\{interfaces:([^}]+)\}\}/.exec(dashboard.content)?.[1];
        const pair = body ? parseInterfacesPair(body) : null;
        if (pair) found.push({ dashboard, a: pair[0], b: pair[1] });
    }
    return found;
}
