// ─── Feature flags ───────────────────────────────────────────────────────────
//
// The single registry of optional Architect surfaces. Nothing else in the web
// app decides on its own whether a feature is on: components ask
// `isFeatureEnabled(id)` and the answer comes from here.
//
// Grants arrive from the CLI. `memo-architect --experimental` (and
// `memo-architect dev --experimental`, `build --experimental`) makes the server
// splice `window.__MEMO_FLAGS__` into index.html before the bundle runs, so the
// first paint already knows what to show — no flicker, no round trip.
//
// Adding a feature is a single entry below. The CLI needs no change: it grants
// the *stage*, and this registry decides which features that stage covers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `stable` ships to everyone. `experimental` is off unless the CLI granted it —
 * for surfaces that are not ready to be part of the regulated workflow.
 */
export type FeatureStage = 'stable' | 'experimental';

export interface FeatureFlag {
    /** Stable id used by `isFeatureEnabled` and in the `--experimental` docs. */
    id: FeatureId;
    /** Human label, for the flag listing in `memo-architect features`. */
    label: string;
    /** Why the feature is gated. */
    description: string;
    stage: FeatureStage;
}

export type FeatureId = 'ai-tools';

export const FEATURE_FLAGS: readonly FeatureFlag[] = [
    {
        id: 'ai-tools',
        label: 'AI Tools',
        description:
            'Model Assistant (model Q&A and proposed edits) and SysML Generator '
            + '(natural language → SysML v2). Generated content is unreviewed and '
            + 'carries no design-control provenance, so the surface stays off by default.',
        stage: 'experimental',
    },
];

/** Grants injected by the CLI. Absent means "nothing beyond stable". */
export interface FeatureGrants {
    /** Set by `--experimental`; unlocks every `experimental` flag. */
    experimental?: boolean;
}

declare global {
    interface Window {
        __MEMO_FLAGS__?: FeatureGrants;
    }
}

function grants(): FeatureGrants {
    if (typeof window === 'undefined') return {};
    return window.__MEMO_FLAGS__ ?? {};
}

/**
 * Whether `id` is available in this session.
 *
 * Read at render time rather than cached at module load: a static viewer built
 * by `memo-architect build` inlines the grants ahead of the bundle, but tests
 * and stories set them per case.
 */
export function isFeatureEnabled(id: FeatureId): boolean {
    const flag = FEATURE_FLAGS.find(f => f.id === id);
    // An unregistered id is a typo, not a hidden feature — fail closed.
    if (!flag) return false;
    if (flag.stage === 'stable') return true;
    return grants().experimental === true;
}

/** Every flag with its resolved state, for `memo-architect features` and diagnostics. */
export function featureFlagStatus(): { flag: FeatureFlag; enabled: boolean }[] {
    return FEATURE_FLAGS.map(flag => ({ flag, enabled: isFeatureEnabled(flag.id) }));
}
