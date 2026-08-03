// SysML graphical-notation registry.
//
// These entries are the browser-safe projection of the activity productions in
// the vendored OMG SysML Graphical BNF.  Keep the mapping semantic: renderers
// receive a glyph selected from metaclass/definition/view metadata, never from
// a CSS class or a renderer-specific node type.

import type { NotationGlyph } from './notation-scene';
export { GRAPHICAL_BNF_SOURCE } from './notation-bnf.generated';

export interface NotationSubject {
    metaclass?: string;
    isDefinition: boolean;
    viewKind?: string;
}

/** Pinned normative source for this browser-safe generated projection. */

const ACTIVITY_GLYPHS: Readonly<Record<string, NotationGlyph>> = {
    AcceptActionUsage: 'accept',
    SendActionUsage: 'send',
    DecisionNodeUsage: 'decision',
    MergeNodeUsage: 'merge',
    ForkNodeUsage: 'fork',
    JoinNodeUsage: 'join',
    TerminateActionUsage: 'activity-final',
    ActivityFinalNodeUsage: 'activity-final',
    FlowFinalNodeUsage: 'flow-final',
};

const ACTIVITY_ROLES: Readonly<Record<string, NotationGlyph>> = {
    action: 'usage', accept: 'accept', send: 'send', decision: 'decision',
    merge: 'merge', fork: 'fork', join: 'join', activityFinal: 'activity-final', flowFinal: 'flow-final',
};

/** Resolve notation from the semantic subject, with a safe generic usage fallback. */
export function resolveNotationGlyph(subject: NotationSubject): NotationGlyph {
    if (subject.isDefinition) return 'definition';
    if (subject.metaclass && ACTIVITY_GLYPHS[subject.metaclass]) return ACTIVITY_GLYPHS[subject.metaclass];
    if (subject.metaclass && ACTIVITY_ROLES[subject.metaclass]) return ACTIVITY_ROLES[subject.metaclass];
    return 'usage';
}
