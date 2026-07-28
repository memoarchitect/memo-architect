// ─── What can actually be edited, and why ────────────────────────────────────
//
// The profile surfaces mix three very different things: values the user may
// change, values that identify the element, and values the build derived from
// SysML source. Rendering all three as plain text — which is what the detail
// page used to do — leaves no way to tell them apart short of clicking and
// seeing whether a cursor appears.
//
// This module is the single answer to "is this editable?", so the page and the
// side panel cannot disagree, and every non-editable value carries a reason the
// UI can show instead of silently ignoring the click.
// ─────────────────────────────────────────────────────────────────────────────

/** Why a value cannot be edited in place, or that it can. */
export type Editability =
    | { kind: 'editable' }
    /** Names the element in the model; changing it is a source-wide rename. */
    | { kind: 'identity'; reason: string }
    /** Computed by the build from SysML; the source is the only way to change it. */
    | { kind: 'derived'; reason: string };

export const EDITABLE: Editability = { kind: 'editable' };

/**
 * Attributes that identify the element rather than describe it.
 *
 * The side panel already hid `name` from its attribute list, which lost the
 * information entirely. Classifying instead of hiding lets both surfaces show
 * the value and explain why it is not a text box.
 */
const IDENTITY_ATTRIBUTES: Record<string, string> = {
    id: 'The model identifier. It is referenced by relationships and views, so it is not editable here.',
    name: 'The element name in SysML. Renaming touches every reference, so do it in the source file.',
};

/** How an element attribute may be edited. */
export function attributeEditability(key: string): Editability {
    const reason = IDENTITY_ATTRIBUTES[key];
    return reason ? { kind: 'identity', reason } : EDITABLE;
}

/**
 * How a built-in element field may be edited.
 *
 * `doc` is the only free-text field the server round-trips; everything else on
 * the element record is a projection of the parsed source.
 */
export function fieldEditability(field: string): Editability {
    if (field === 'doc') return EDITABLE;
    return {
        kind: 'derived',
        reason: `"${field}" is derived from the SysML source when the model is built.`,
    };
}

/** True when the value may be changed from the UI. */
export function isEditable(editability: Editability): boolean {
    return editability.kind === 'editable';
}

/** Short label for the affordance legend and per-value tooltips. */
export function editabilityLabel(editability: Editability): string {
    switch (editability.kind) {
        case 'editable': return 'Click to edit';
        case 'identity': return 'Identifier — not editable here';
        case 'derived': return 'Derived from source — not editable';
    }
}
