// ─── Legends ─────────────────────────────────────────────────────────────────
//
// A legend gives colour a meaning that lives in the model rather than in a
// diagram. Colour otherwise says something no one can look up: it is chosen per
// view, reproducible in no other view, and reviewable by nobody.
//
// Each legend is tied to ONE attribute or enumeration — that is what makes it a
// legend and not a palette. Every entry is a value of that same thing, so the
// key states "this attribute, these values, these colours", and a reader can
// check a colour against the model. A view picks at most one, because colour is
// a single channel and two legends competing for it leave both unreadable.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { COMPOSITION_REL_TYPES } from './composition-tree';

export interface LegendEntry {
    /** The value of the legend's attribute or enumeration this entry is for. */
    value: string;
    /** Shown in the key; falls back to the value. */
    label: string;
    color: string;
}

export interface ResolvedLegend {
    id: string;
    name: string;
    /** The attribute each entry names a value of. */
    attributeName?: string;
    /** The `enum def` each entry names a value of, when keyed on one. */
    enumerationName?: string;
    /** A value the model derives rather than stores. */
    derivedFrom?: 'hierarchyDepth' | 'elementKind';
    /** Constructs this legend colours; empty means every construct it matches. */
    appliesTo: ReadonlySet<string>;
    entries: readonly LegendEntry[];
    /**
     * The colour for an element, or undefined when the legend says nothing.
     *
     * `context.depth` is the element's depth in the hierarchy being drawn, which
     * only the layout knows — the root is 0.
     */
    colorFor(element: MemoElement, context?: { depth?: number }): string | undefined;
}

/** An enum value is written `EnumName::value`; a plain value has no prefix. */
const unqualified = (value: string): string => value.split('::').pop()!.trim();

/**
 * The legend a view names, resolved against the model.
 *
 * `ref legend : MemoLegend[0..1]` reaches the builder as the referenced name,
 * the same way `viewpointDefinition` does, so this looks the legend up by id
 * and then by name.
 */
export function resolveLegend(
    viewElement: MemoElement | undefined,
    model: MemoModelDTO,
): ResolvedLegend | undefined {
    const reference = viewElement?.attributes.legend?.trim();
    if (!reference) return undefined;
    const wanted = unqualified(reference);
    const legend = model.elements[wanted]
        ?? Object.values(model.elements).find(element => element.name === wanted);
    if (!legend) return undefined;

    // Entries are nested parts, which reach the model as composition.
    const entries: LegendEntry[] = [];
    for (const relationship of model.relationships) {
        if (!COMPOSITION_REL_TYPES.has(relationship.type)) continue;
        if (relationship.sourceId !== legend.id) continue;
        const entry = model.elements[relationship.targetId];
        if (!entry) continue;
        const value = unqualified(entry.attributes.value ?? '');
        const color = (entry.attributes.color ?? '').trim();
        if (!value || !color) continue;
        entries.push({ value, color, label: entry.attributes.label?.trim() || value });
    }
    if (entries.length === 0) return undefined;

    const attributeName = legend.attributes.attributeName?.trim() || undefined;
    const derivedRaw = unqualified(legend.attributes.derivedFrom ?? '');
    const derivedFrom = derivedRaw === 'hierarchyDepth' || derivedRaw === 'elementKind'
        ? derivedRaw : undefined;
    const enumerationName = legend.attributes.enumerationName?.trim() || undefined;
    const appliesTo = new Set(
        (legend.attributes.appliesTo ?? '')
            .split(',').map(scope => unqualified(scope)).filter(Boolean));
    const byValue = new Map(entries.map(entry => [entry.value, entry.color]));

    return {
        id: legend.id,
        name: legend.attributes.name?.trim() || legend.name,
        attributeName,
        enumerationName,
        derivedFrom,
        appliesTo,
        entries,
        colorFor(element, context) {
            if (appliesTo.size > 0 && !appliesTo.has(element.construct)) return undefined;
            if (derivedFrom === 'hierarchyDepth') {
                // What "L0 / L1 / L2" means is depth in the hierarchy being
                // drawn, and the tree already computes it. Reading a level back
                // out of an id string would make a naming convention
                // load-bearing and wrong the moment something is re-parented.
                return context?.depth === undefined
                    ? undefined
                    : byValue.get(String(context.depth));
            }
            if (derivedFrom === 'elementKind') {
                // A BDD draws definitions, which carry few attributes but always
                // a kind. The literal comes from the model, which is the
                // sanctioned way to compare a kind at all.
                return byValue.get(element.kind);
            }
            if (attributeName) {
                const raw = element.attributes[attributeName];
                return raw ? byValue.get(unqualified(raw)) : undefined;
            }
            if (enumerationName) {
                // Keyed on an enumeration rather than one attribute: the value
                // carries its own type (`RealizationStageKind::concept`), so the
                // element is asked which of its attributes holds one of THIS
                // enum's values. That is what lets a legend follow an enum
                // wherever a model chose to put it.
                const prefix = `${enumerationName}::`;
                for (const raw of Object.values(element.attributes)) {
                    if (!raw.includes(prefix)) continue;
                    const hit = byValue.get(unqualified(raw));
                    if (hit) return hit;
                }
            }
            return undefined;
        },
    };
}
