// ─── Favorites and what was opened last ──────────────────────────────────────
//
// One person's favorites and recents live in memo.user.yaml, beside their role and workspace; memo-tools
// keeps the file and Architect only reads and sends it. A favorite names the model's own id for what it
// points at, so it is read against the model each time: an element, a view or a viewpoint that is gone is
// shown as gone, never dropped quietly, because the person may want to know.
// ─────────────────────────────────────────────────────────────────────────────

import type { FavoriteDTO, MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { elementIdTitle } from './trace-labels';

/** A favorite as the person reads it. */
export interface FavoriteEntry {
    favorite: FavoriteDTO;
    /** The id it is read by, when it has one (`REQ-172`). */
    id?: string;
    title: string;
    /** What kind of thing it is, in words. */
    what: string;
    /** It names something the model no longer has. */
    missing: boolean;
}

/** The elements a package or folder favorite stands for: today's, read from the model. */
export function favoriteMembers(model: MemoModelDTO, favorite: FavoriteDTO): MemoElement[] {
    const elements = Object.values(model.elements);
    const inPackage = (element: MemoElement, name: string) =>
        element.package === name || (element.package ?? '').startsWith(`${name}::`);
    if (favorite.type === 'package') return elements.filter(element => inPackage(element, favorite.ref));
    if (favorite.type === 'folder') {
        return elements.filter(element => element.kind === favorite.ref
            && (!favorite.packageName || inPackage(element, favorite.packageName)));
    }
    return [];
}

/** What a favorite is called, and whether the model still has it. `kindLabel` names an element type. */
export function describeFavorite(model: MemoModelDTO, favorite: FavoriteDTO, kindLabel: (kind: string) => string): FavoriteEntry {
    const gone = (title: string, what: string): FavoriteEntry => ({ favorite, title, what, missing: true });
    switch (favorite.type) {
        case 'element': {
            const element = model.elements[favorite.ref];
            if (!element) return gone(favorite.ref, 'Element');
            const { id, title } = elementIdTitle(element, favorite.ref);
            return { favorite, id, title, what: kindLabel(element.kind), missing: false };
        }
        case 'view': {
            const view = (model.diagrams ?? []).find(diagram => diagram.id === favorite.ref);
            if (!view) return gone(favorite.ref, 'View');
            return { favorite, id: view.shortId, title: view.name, what: 'View', missing: false };
        }
        case 'viewpoint': {
            const viewpoint = (model.viewpoints ?? []).find(candidate => candidate.id === favorite.ref);
            if (!viewpoint) return gone(favorite.ref, 'Viewpoint');
            return { favorite, title: viewpoint.label, what: 'Viewpoint', missing: false };
        }
        case 'package': {
            const title = favorite.ref.split('::').pop() ?? favorite.ref;
            return { favorite, title, what: 'Package', missing: favoriteMembers(model, favorite).length === 0 };
        }
        case 'folder': {
            const where = favorite.packageName ? ` in ${favorite.packageName.split('::').pop()}` : '';
            return { favorite, title: `${kindLabel(favorite.ref)}${where}`, what: 'Folder', missing: favoriteMembers(model, favorite).length === 0 };
        }
    }
}
