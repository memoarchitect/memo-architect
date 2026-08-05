// ─── Element picker options ──────────────────────────────────────────────────
//
// Turns a model into the option list an axis picker shows. Shared by the DSM
// and the traceability matrix so both search elements the same way: by name,
// by kind, and by either id — a user who knows `NDS-FN-003` should not have to
// remember it is called DriveActuator.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { AxisScope } from './AxisScopeSelect';
import type { TypeFilterOption } from './TypeFilterSelect';

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
): TypeFilterOption[] {
    if (!model) return [];
    return Object.values(model.elements)
        .filter(element => (!scope.layer || element.layer === scope.layer)
            && (!scope.kind || element.kind === scope.kind))
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
        .map(element => ({
            value: element.id,
            label: element.name,
            group: element.kind,
            hint: element.shortId,
            keywords: `${element.id} ${element.shortId ?? ''} ${element.package ?? ''}`,
        }));
}
