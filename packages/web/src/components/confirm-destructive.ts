// ─── Confirming a destructive edit ───────────────────────────────────────────
//
// One prompt per kind of loss, in one place, because the value of a
// confirmation is that it means the same thing everywhere it appears. The
// element wording was already duplicated across the explorer tree row and the
// explorer's context menu, and a third copy was about to be added for the
// Properties panel's trash icon — which had no prompt at all.
//
// What deserves a prompt is what destroys authored content, not what rearranges
// a view. Removing an edge or a node FROM a diagram only changes local canvas
// state and leaves the model alone; confirming those would put a dialog in
// front of an action performed constantly while laying a diagram out, which
// teaches people to dismiss dialogs without reading them.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deleting an element takes its relationships with it.
 *
 * `removeElement` deletes the declaration AND every connection referencing it,
 * across every file that holds one — so this is never a one-file edit, and the
 * count is not visible from the button that starts it.
 */
export const confirmElementDelete = (name: string): boolean =>
    window.confirm(`Delete “${name}”?\n\n`
        + 'All incoming and outgoing relationships will also be deleted. This cannot be undone.');

/**
 * Deleting a view takes its saved layout, and nothing else.
 *
 * Worth saying explicitly: the elements a view shows are not deleted with it,
 * and a reader who is told only "this cannot be undone" has no way to know that.
 */
export const confirmViewDelete = (name: string): boolean =>
    window.confirm(`Delete the “${name}” view?\n\n`
        + 'Its saved layout goes with it. The elements it shows are not deleted. This cannot be undone.');

/** A canvas annotation's text lives in the diagram's layout, not in the model. */
export const confirmAnnotationDelete = (): boolean =>
    window.confirm('Delete this annotation?\n\n'
        + "Its text is part of this diagram's saved layout, not the model. This cannot be undone.");

/** A DHF document is a file on disk; removing it unlinks that file. */
export const confirmDocumentDelete = (title: string): boolean =>
    window.confirm(`Remove the document “${title}”?\n\n`
        + 'Its markdown file is deleted from dhf/documents. This cannot be undone.');
