// Model source is not application source (design section 13.2, 18.4 deliverable 5).
//
// A model save reaches the browser as a workspace revision over the WebSocket,
// which updates the affected stores in place. If Vite ALSO sees the change, it
// triggers HMR on top of that and the user loses route, selection, drawing
// mode, and unsaved form state — for an edit the app had already applied
// correctly. The two paths must not both fire.
//
// This asserts the configuration rather than the behaviour, which is the honest
// limit of a unit test: it catches the regression where someone edits
// vite.config.ts and quietly drops the exclusion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf-8');

describe('vite watch boundary', () => {
    it('excludes project catalog paths from application-source watching', () => {
        expect(config).toMatch(/watch:\s*\{/);
        expect(config).toContain('**/model/catalog/**');
    });

    it('excludes SysML source anywhere in the watched tree', () => {
        // The catalog is the conventional location, not the normative one:
        // section 6.2 says parsed package ownership decides origin, so a
        // project may reorganize beneath `model/`. Matching `.sysml` covers
        // what the path pattern misses.
        expect(config).toContain('**/*.sysml');
    });

    it('excludes transient workspace state', () => {
        // `.memo/architect/` is regenerable and written by the server during
        // normal operation; watching it would reload the app on its own writes.
        expect(config).toContain('**/.memo/**');
    });
});

describe('no full-page reload path', () => {
    it('never calls window.location.reload in the web app', async () => {
        // Section 13.2: a manual full-page reload is a recovery fallback for a
        // protocol or bundle version mismatch, never a way to apply a model
        // change. The revision protocol exists precisely so this is unnecessary.
        const { execSync } = await import('node:child_process');
        const src = resolve(__dirname, '..');
        const hits = execSync(
            `grep -rn "location.reload" ${JSON.stringify(src)} --include=*.ts --include=*.tsx || true`,
            { encoding: 'utf-8' },
        )
            .split('\n')
            // This file names the call in order to forbid it.
            .filter(line => line.trim() && !line.includes('vite-watch-boundary.test.ts'));
        expect(hits).toEqual([]);
    });
});
