import { describe, it, expect } from 'vitest';
import { injectFeatureGrants, resolveFeatureGrants } from '../feature-grants.js';

// ─── Feature grants (CLI side) ──────────────────────────────────────────────
//
// Grants have to reach the client before its bundle runs, or gated nav renders
// and then vanishes. `__MEMO_FLAGS__` is Architect's vocabulary: Tools serves
// the shell through a generic transform and never learns what a grant means.

const SHELL = '<!DOCTYPE html><html><head><title>t</title></head><body></body></html>';

describe('resolveFeatureGrants', () => {
    it('grants the experimental stage only when the flag was passed', () => {
        expect(resolveFeatureGrants({ experimental: true })).toEqual({ experimental: true });
        expect(resolveFeatureGrants({})).toEqual({ experimental: false });
    });

    it('states the grant explicitly rather than omitting it, so the client never guesses', () => {
        expect(resolveFeatureGrants({ experimental: undefined }))
            .toHaveProperty('experimental', false);
    });
});

describe('injectFeatureGrants', () => {
    it('splices grants into head, ahead of the bundle', () => {
        const html = injectFeatureGrants(SHELL, { experimental: true });
        expect(html).toContain('window.__MEMO_FLAGS__={"experimental":true}');
        expect(html.indexOf('__MEMO_FLAGS__')).toBeLessThan(html.indexOf('<body>'));
    });

    it('is idempotent — a viewer built with baked grants keeps its own', () => {
        const baked = SHELL.replace(
            '</head>',
            '<script>window.__MEMO_FLAGS__={"experimental":true};</script></head>',
        );
        expect(injectFeatureGrants(baked, { experimental: false })).toBe(baked);
    });

    it('still delivers grants when the document has no head', () => {
        const html = injectFeatureGrants('<div id="root"></div>', { experimental: true });
        expect(html.startsWith('<script>window.__MEMO_FLAGS__=')).toBe(true);
    });
});
