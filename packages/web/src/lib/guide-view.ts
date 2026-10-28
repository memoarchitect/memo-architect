// ─── The Guide, for a role ───────────────────────────────────────────────────
//
// The server evaluates every step of the method for a workspace; the role only chooses which of them are
// shown. A role sees the steps written for it and the steps that name no role; with no role, every step.
// Nothing here names a kind or a stage.
// ─────────────────────────────────────────────────────────────────────────────

import type { GuideResultMessage } from '@memoarchitect/tools/browser';

export type GuideResult = GuideResultMessage['payload'];
export type GuideStepStatus = GuideResult['steps'][number];
export type GuideLinkStatus = GuideStepStatus['links'][number];

/** The steps a role works at: its own, and those written for nobody in particular. */
export function stepsForRole(steps: readonly GuideStepStatus[], role: string | null): GuideStepStatus[] {
    return role ? steps.filter(step => !step.role || step.role === role) : [...steps];
}

/** The first step in the list that is open: the next thing to do for whoever is looking. */
export function nextStep(steps: readonly GuideStepStatus[]): GuideStepStatus | undefined {
    return steps.find(step => step.state === 'open');
}

/** `systemOfSystems` as `System of systems`, `humanFactors` as `Human factors`. */
export function words(name: string): string {
    const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
