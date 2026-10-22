// ─── MEMO URL Router ─────────────────────────────────────────────────────────
//
// Defines the URL scheme for deep-linking into model elements, diagrams, etc.
//
//  /                               → Welcome / home
//  /catalog                        → All element families summary
//  /catalog/:family                → All elements in a kind-family (e.g. /catalog/SW)
//  /catalog/:family/:shortId       → Element detail (e.g. /catalog/SW/SW-REQ-4291)
//  /viewpoints                     → The viewpoints and their views (the menu's Viewpoints)
//  /viewpoints/:diagramType        → All views of a type (e.g. /viewpoints/bdd)
//  /viewpoints/:diagramType/:id    → Specific view
//
// The "family" is the compiled model's `idFamily` for the element; nothing here derives it.
// ─────────────────────────────────────────────────────────────────────────────

/** Build the URL for an element detail page, from the family and id the compiled model carries. */
export function elementUrl(element: { id: string; shortId?: string; idFamily?: string }): string {
    return `/catalog/${element.idFamily ?? '_'}/${element.shortId ?? element.id}`;
}

/** Build the URL for a kind-family collection page. */
export function familyUrl(family: string): string {
    return `/catalog/${family}`;
}

/** Build the URL for a diagram detail page. */
export function diagramUrl(diagramType: string, diagramId: string): string {
    const typeSlug = diagramType.toLowerCase().replace(/\s+/g, '-');
    return `/viewpoints/${typeSlug}/${encodeURIComponent(diagramId)}`;
}

/** Build the URL for a diagram-type collection page. */
export function diagramTypeUrl(diagramType: string): string {
    const typeSlug = diagramType.toLowerCase().replace(/\s+/g, '-');
    return `/viewpoints/${typeSlug}`;
}
