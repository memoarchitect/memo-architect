import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ─── The standalone distribution is one file with nothing to fetch ───────────
//
// `memo-architect build --standalone` exists so a viewer can be opened off
// disk. Two things make that possible and neither is visible in the source: the
// build must leave no reference to a second file, and it must not reach the
// network. Both were broken before — the flag inlined the entry script but left
// its chunk imports pointing at `/assets/…`, so the page 404'd when served and
// died on CORS when opened, and it did that silently, as a blank screen.
//
// These assertions are on the built artefact rather than on the config, because
// the config is not what the user opens.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INDEX = resolve(ROOT, 'dist-standalone/index.html');

const built = existsSync(INDEX);
const html = built ? readFileSync(INDEX, 'utf8') : '';

// The distribution is a build output, so a source checkout may not have one.
// Skipping keeps `pnpm test` honest without pretending the file was checked.
const describeBuilt = built ? describe : describe.skip;

describeBuilt('standalone distribution', () => {
    it('is a single file', () => {
        expect(statSync(INDEX).isFile()).toBe(true);
    });

    it('references no sibling asset', () => {
        // Only fetchable paths count. The inlined bundle contains plenty of
        // attribute-shaped text — `href="${url}"`, `href="$2"` — which is
        // library code writing markup at runtime, not a reference this file has.
        const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
            .map(match => match[1])
            .filter(url => /^(?:\/|\.\.?\/)/.test(url) || /\.(?:js|mjs|css|png|svg|woff2?)$/.test(url))
            .filter(url => !url.includes('$'));
        expect(refs).toEqual([]);
    });

    it('loads nothing over the network', () => {
        expect(html).not.toMatch(/(?:src|href)="https?:\/\//);
        expect(html).not.toContain('fonts.googleapis.com');
    });

    it('carries no unresolved Vite preload marker', () => {
        // A bare `__VITE_PRELOAD__` is a ReferenceError on load: the token is
        // substituted in a hook that runs after the one that inlines the chunk.
        expect(html).not.toContain('__VITE_PRELOAD__');
    });

    it('emits no ELK layout worker beside it', () => {
        expect(existsSync(resolve(ROOT, 'dist-standalone/elk-worker.min.js'))).toBe(false);
    });
});
