// ─── MEMO URL Router ─────────────────────────────────────────────────────────
//
// Defines the URL scheme for deep-linking into model elements, diagrams, etc.
//
//  /                               → Welcome / home
//  /catalog                        → All element families summary
//  /catalog/:family                → All elements in a kind-family (e.g. /catalog/SW)
//  /catalog/:family/:shortId       → Element detail (e.g. /catalog/SW/SW-REQ-4291)
//  /diagrams                       → All diagrams
//  /diagrams/:diagramType          → All diagrams of a type (e.g. /diagrams/BDD)
//  /diagrams/:diagramType/:id      → Specific diagram
//
// The "family" is the first hyphen-segment of an element's shortId prefix.
// e.g. shortId "SW-REQ-4291" → prefix "SW-REQ" → family "SW"
// ─────────────────────────────────────────────────────────────────────────────

import { prefixToFamily, kindToPrefix } from './short-id';

/** Build the family segment from a kind name. */
export function kindToFamily(kind: string): string {
    return prefixToFamily(kindToPrefix(kind));
}

/** Build the URL for an element detail page. */
export function elementUrl(shortId: string): string {
    const family = shortId.split('-')[0];
    return `/catalog/${family}/${shortId}`;
}

/** Build the URL for a kind-family collection page. */
export function familyUrl(family: string): string {
    return `/catalog/${family}`;
}

/** Build the URL for a diagram detail page. */
export function diagramUrl(diagramType: string, diagramId: string): string {
    const typeSlug = diagramType.toLowerCase().replace(/\s+/g, '-');
    const idSlug = diagramId.toLowerCase().replace(/\s+/g, '-');
    return `/diagrams/${typeSlug}/${idSlug}`;
}

/** Build the URL for a diagram-type collection page. */
export function diagramTypeUrl(diagramType: string): string {
    const typeSlug = diagramType.toLowerCase().replace(/\s+/g, '-');
    return `/diagrams/${typeSlug}`;
}
