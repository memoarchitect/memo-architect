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

import { confirmDialog } from './AppDialogs';

/**
 * Deleting an element takes its relationships with it.
 *
 * `removeElement` deletes the declaration AND every connection referencing it,
 * across every file that holds one — so this is never a one-file edit, and the
 * count is not visible from the button that starts it.
 */
export const confirmElementDelete = (name: string): Promise<boolean> =>
    confirmDialog({
        title: `Delete “${name}”?`, danger: true,
        message: 'All incoming and outgoing relationships will also be deleted. This cannot be undone.',
    });

/**
 * Deleting a view takes its declaration, and nothing else.
 *
 * Worth saying explicitly: the elements a view shows are not deleted with it,
 * and a reader who is told only "this cannot be undone" has no way to know that.
 */
export const confirmViewDelete = (name: string): Promise<boolean> =>
    confirmDialog({
        title: `Delete the “${name}” view?`, danger: true,
        message: 'Its declaration, and any saved layout in it, goes with it. The elements it shows are not deleted. This cannot be undone.',
    });

/** A canvas annotation's text lives in the diagram's layout, not in the model. */
export const confirmAnnotationDelete = (): Promise<boolean> =>
    confirmDialog({
        title: 'Delete this annotation?', danger: true,
        message: "Its text is part of this diagram's saved layout, not the model. This cannot be undone.",
    });

/**
 * Deleting a viewpoint deletes the viewpoints nested inside it and every view bound to it or to them.
 *
 * The counts are the point: a viewpoint row shows neither, and a view left bound to a viewpoint
 * that no longer exists would not compile, so the views cannot be kept.
 */
export const confirmViewpointDelete = (label: string, nestedViewpoints: number, views: number, generatedViews: number): Promise<boolean> => {
    const parts = [
        nestedViewpoints > 0 ? `${nestedViewpoints} nested viewpoint${nestedViewpoints === 1 ? '' : 's'}` : '',
        views > 0 ? `${views} bound view${views === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const gone = parts.length > 0 ? `${parts.join(' and ')} will be deleted with it. The elements those views show are not deleted. ` : '';
    // A generated view has no declaration of its own: it is drawn from the viewpoint, so it goes with it.
    const generated = generatedViews > 0
        ? `${generatedViews} generated view${generatedViews === 1 ? '' : 's'} drawn from it will no longer appear. ` : '';
    return confirmDialog({
        title: `Delete the “${label}” viewpoint?`, danger: true, confirmLabel: parts.length + generatedViews > 0 ? 'Delete all' : 'Delete',
        message: (gone + generated || 'No views or nested viewpoints depend on it. ') + 'This cannot be undone.',
    });
};

/** Deleting a selection takes each element's relationships with it, like deleting them one by one. */
export const confirmBulkElementDelete = (count: number): Promise<boolean> =>
    confirmDialog({
        title: `Delete ${count} selected element${count === 1 ? '' : 's'}?`, danger: true, confirmLabel: `Delete ${count}`,
        message: 'All incoming and outgoing relationships of each will also be deleted. This cannot be undone.',
    });

/**
 * Deleting a package with its contents removes every declaration inside it.
 *
 * The count is the point: "everything it declares" is invisible from a folder
 * row. Other files that refer to the members are not rewritten, so say so.
 */
export const confirmPackageContentsDelete = (name: string, memberCount: number): Promise<boolean> =>
    confirmDialog({
        title: `Delete “${name}” and everything in it?`, danger: true, confirmLabel: 'Delete all',
        message: `${memberCount} element${memberCount === 1 ? '' : 's'} declared inside it will be deleted with it. `
            + 'References to them from other files are not updated and will stop resolving. This cannot be undone.',
    });

/** A DHF document is a file on disk; removing it unlinks that file. */
export const confirmDocumentDelete = (title: string): Promise<boolean> =>
    confirmDialog({
        title: `Remove the document “${title}”?`, danger: true, confirmLabel: 'Remove',
        message: 'Its markdown file is deleted from dhf/documents. This cannot be undone.',
    });
