// ─── Element picker options ──────────────────────────────────────────────────
//
// Turns a model into the option list an axis picker shows. Shared by the DSM
// and the traceability matrix so both search elements the same way: by name,
// by kind, and by either id — a user who knows `NDS-FN-003` should not have to
// remember it is called DriveActuator.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { kindsUnder, type KindParents } from '../analysis/kind-hierarchy';
import type { AxisScope } from './AxisScopeSelect';
import type { TypeFilterOption } from './TypeFilterSelect';

/**
 * The element kinds a scope stands for: the chosen kind and everything that
 * specializes it. An axis set to `Requirement` shows the `SecurityRequirement`s
 * too, because the picker nested them under it and said so.
 *
 * With no ontology loaded the scope is just the one kind — the same behaviour
 * this had before the picker learned the hierarchy.
 */
export function scopeKinds(
    scope: AxisScope,
    model: MemoModelDTO | null,
    parents?: KindParents,
): string[] {
    if (!scope.kind) return [];
    if (!parents || !model) return [scope.kind];
    const universe = new Set(Object.values(model.elements).map(element => element.kind));
    return kindsUnder(scope.kind, parents, universe);
}

/**
 * One option per element, grouped under its kind.
 *
 * The scope narrows the list to what the axis already holds, so the two
 * controls compose: set the axis to the logical layer, and the element picker
 * offers that layer's blocks rather than the whole model.
 */
export function elementFilterOptions(
    model: MemoModelDTO | null,
    scope: AxisScope,
    parents?: KindParents,
): TypeFilterOption[] {
    if (!model) return [];
    const kinds = new Set(scopeKinds(scope, model, parents));
    return Object.values(model.elements)
        .filter(element => (!scope.layer || element.layer === scope.layer)
            && (kinds.size === 0 || kinds.has(element.kind)))
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
        .map(element => ({
            value: element.id,
            label: element.name,
            group: element.kind,
            hint: element.shortId,
            keywords: `${element.id} ${element.shortId ?? ''} ${element.package ?? ''}`,
        }));
}
