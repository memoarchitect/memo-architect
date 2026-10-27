// ─── The Guide, for a role ───────────────────────────────────────────────────
//
// The server evaluates every step of the method for a workspace; the role only chooses which of them are
// shown. A role sees the steps written for it and the steps that name no role; with no role, every step.
// Grouping is by level and then stage, in the method's own order. Nothing here names a kind or a stage.
// ─────────────────────────────────────────────────────────────────────────────

import type { GuideResultMessage } from '@memoarchitect/tools/browser';

export type GuideResult = GuideResultMessage['payload'];
export type GuideStepStatus = GuideResult['steps'][number];
export type GuideLinkStatus = GuideStepStatus['links'][number];

export interface StageGroup { stage: string; steps: GuideStepStatus[] }
export interface LevelGroup { level: string; stages: StageGroup[] }

/** The steps a role works at: its own, and those written for nobody in particular. */
export function stepsForRole(steps: readonly GuideStepStatus[], role: string | null): GuideStepStatus[] {
    return role ? steps.filter(step => !step.role || step.role === role) : [...steps];
}

/** Steps grouped by level, then stage, each in the order the method states them. */
export function groupSteps(steps: readonly GuideStepStatus[]): LevelGroup[] {
    const levels: LevelGroup[] = [];
    for (const step of steps) {
        const level = step.level ?? 'steps';
        let group = levels.find(l => l.level === level);
        if (!group) levels.push(group = { level, stages: [] });
        const stage = step.stage ?? 'other';
        let stageGroup = group.stages.find(s => s.stage === stage);
        if (!stageGroup) group.stages.push(stageGroup = { stage, steps: [] });
        stageGroup.steps.push(step);
    }
    return levels;
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
