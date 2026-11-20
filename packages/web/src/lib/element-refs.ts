// ─── How a saved choice names an element ─────────────────────────────────────
//
// memo.user.yaml names an element by its short id (`SYS-7`), never by its element id (the qualified
// name, `pkg::Owner::name`): the short id keeps across a rename or a move to another package, and the
// qualified name does not. In memory Architect keeps element ids; these two functions are the only
// crossing between them, one on save and one on load.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';

/** The short id to save for an element, or the id itself when the element has none (or is not loaded). */
export function savedRef(model: MemoModelDTO | null | undefined, id: string): string {
    return model?.elements[id]?.shortId ?? id;
}

const byShortId = new WeakMap<MemoModelDTO, Map<string, string>>();

/** The element id a saved reference names: by short id, or as it is when it is already an element id. */
export function elementIdOf(model: MemoModelDTO | null | undefined, saved: string): string {
    if (!model || model.elements[saved]) return saved;
    let index = byShortId.get(model);
    if (!index) {
        index = new Map();
        for (const [id, element] of Object.entries(model.elements)) if (element.shortId) index.set(element.shortId, id);
        byShortId.set(model, index);
    }
    return index.get(saved) ?? saved;
}
