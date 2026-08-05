import { describe, it, expect } from 'vitest';
import { supervisedChildArgs } from '../commands/dev.js';

// ─── Supervised child argv ──────────────────────────────────────────────────
//
// The supervisor rebuilds argv rather than forwarding it, so every flag the
// session was started with has to be restated. A dropped flag is invisible:
// the server starts, serves, and simply behaves as though the user never
// passed it — which is how `--experimental dev` came to serve a client with
// no Traceability, Ontology, Import or AI surfaces.

const ENTRY = '/usr/local/bin/memo-architect.js';

describe('supervisedChildArgs', () => {
    it('carries the experimental grant to the child that serves the client', () => {
        const args = supervisedChildArgs(ENTRY, { featureGrants: { experimental: true } }, true);
        expect(args).toContain('--experimental');
    });

    it('does not invent a grant the session was started without', () => {
        expect(supervisedChildArgs(ENTRY, { featureGrants: { experimental: false } }, true))
            .not.toContain('--experimental');
        expect(supervisedChildArgs(ENTRY, {}, true)).not.toContain('--experimental');
    });

    it('keeps the toolchain selection across a relaunch', () => {
        const args = supervisedChildArgs(
            ENTRY,
            { toolchainArgv: ['--toolchain.validator=syside'] },
            false,
        );
        expect(args).toContain('--toolchain.validator=syside');
    });

    it('opens a browser once, and never again on a relaunch', () => {
        expect(supervisedChildArgs(ENTRY, { open: true }, true)).not.toContain('--no-open');
        expect(supervisedChildArgs(ENTRY, { open: true }, false)).toContain('--no-open');
        expect(supervisedChildArgs(ENTRY, { open: false }, true)).toContain('--no-open');
    });

    it('passes the resolved port, defaulting to 3000', () => {
        expect(supervisedChildArgs(ENTRY, { port: 4100 }, true)).toEqual(
            [ENTRY, 'dev', '--port', '4100'],
        );
        expect(supervisedChildArgs(ENTRY, {}, true)).toContain('3000');
    });
});
