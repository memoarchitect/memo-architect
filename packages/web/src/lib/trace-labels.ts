// ─── How an element is named in a trace ───────────────────────────────────────
//
// An element is read by the id the model gives it, then its title. The id is the compiled `displayId`: the
// reference the import authored (a Matrix user need `REQ-156`, a requirement `SPEC-1059`), else the short id. It is
// the same one the explorer shows, so the same element is never two things on two screens.

import type { MemoElement } from '@memoarchitect/tools/browser';

/** The Matrix reference a failure mode was imported from (`RISK-738`), kept in its source reference. */
const matrixRef = (element: { attributes?: Record<string, unknown> }): string | undefined => {
    const source = element.attributes?.sourceReference;
    return typeof source === 'string' ? /^Matrix\s+([A-Z]+-\d+)/.exec(source)?.[1] : undefined;
};

export function elementLabel(
    element: (Pick<MemoElement, 'displayId' | 'shortId' | 'name'> & { attributes?: Record<string, unknown> }) | undefined,
    fallback: string,
): string {
    if (!element) return fallback;
    const id = (element.attributes && matrixRef(element)) ?? element.displayId ?? element.shortId;
    return id && !element.name.startsWith(id) ? `${id} ${element.name}` : element.name;
}
