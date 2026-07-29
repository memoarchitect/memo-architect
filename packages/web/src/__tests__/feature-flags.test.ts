import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FEATURE_FLAGS, featureFlagStatus, isFeatureEnabled } from '../config/feature-flags';

// ─── Feature flags ──────────────────────────────────────────────────────────
//
// The guard that matters: an experimental surface must be invisible unless the
// CLI granted it. A feature that ships on by default because someone forgot the
// stage, or a gate that a deep link can walk around, fails here.

function grant(grants: unknown): void {
    (globalThis as any).window = { __MEMO_FLAGS__: grants };
}

afterEach(() => {
    delete (globalThis as any).window;
});

describe('feature flag registry', () => {
    it('hides experimental features when nothing was granted', () => {
        grant(undefined);
        expect(isFeatureEnabled('ai-tools')).toBe(false);
    });

    it('hides experimental features when the grant is absent from an existing object', () => {
        grant({});
        expect(isFeatureEnabled('ai-tools')).toBe(false);
    });

    it('reveals experimental features once --experimental granted them', () => {
        grant({ experimental: true });
        expect(isFeatureEnabled('ai-tools')).toBe(true);
    });

    it('treats a non-true grant as absent, so a truthy string cannot unlock a feature', () => {
        grant({ experimental: 'false' });
        expect(isFeatureEnabled('ai-tools')).toBe(false);
    });

    it('fails closed on an unregistered id', () => {
        grant({ experimental: true });
        expect(isFeatureEnabled('not-a-feature' as any)).toBe(false);
    });

    it('reports every flag with its resolved state', () => {
        grant({ experimental: true });
        const status = featureFlagStatus();
        expect(status).toHaveLength(FEATURE_FLAGS.length);
        expect(status.find(s => s.flag.id === 'ai-tools')?.enabled).toBe(true);
    });

    it('gives every flag a stage and a reason it is gated', () => {
        for (const flag of FEATURE_FLAGS) {
            expect(['stable', 'experimental']).toContain(flag.stage);
            expect(flag.description.length).toBeGreaterThan(20);
        }
    });
});

// The AI surfaces are the reason the flag exists. These read the source rather
// than rendering, so they stay honest if someone reintroduces an entry point.
describe('AI tools stay behind the gate', () => {
    const webSrc = resolve(__dirname, '..');

    it('is registered as experimental, not stable', () => {
        const aiTools = FEATURE_FLAGS.find(f => f.id === 'ai-tools');
        expect(aiTools?.stage).toBe('experimental');
    });

    it('gates the ask and generate routes in App, not only the nav', () => {
        const app = readFileSync(resolve(webSrc, 'App.tsx'), 'utf8');
        const gated = app.match(/case 'ai':[\s\S]{0,400}?isFeatureEnabled\('ai-tools'\)/);
        expect(gated, "App.tsx must gate 'ai'/'ask'/'sysml-generator' on the ai-tools flag").toBeTruthy();
        // All three view types have to fall through to the same guarded branch.
        const branch = app.slice(app.indexOf("case 'ai':"), app.indexOf("isFeatureEnabled('ai-tools')"));
        expect(branch).toContain("case 'ask':");
        expect(branch).toContain("case 'sysml-generator':");
    });

    it('leaves no ungated entry point in the Explorer sidebar', () => {
        const explorer = readFileSync(resolve(webSrc, 'components/ExplorerPanel.tsx'), 'utf8');
        expect(explorer).not.toContain("type: 'ask'");
        expect(explorer).not.toContain("type: 'sysml-generator'");
    });

    it('marks the nav entry with the flag that gates it', () => {
        const nav = readFileSync(resolve(webSrc, 'components/ModeSwitcher.tsx'), 'utf8');
        expect(nav).toContain("feature: 'ai-tools'");
        expect(nav).toContain('isFeatureEnabled(mode.feature)');
    });
});
