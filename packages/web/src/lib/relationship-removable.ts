import type { MemoRelationship } from '@memoarchitect/tools/browser';

/**
 * Whether the server can remove this relationship from source: a named declaration is found by its name,
 * an anonymous statement (`satisfy r by x;`, a flow) by the range the compile recorded for it. Only one with
 * neither cannot be addressed.
 */
export function isRemovable(relationship: Pick<MemoRelationship, 'named' | 'sourceRange'>): boolean {
    return relationship.named === true || relationship.sourceRange !== undefined;
}
