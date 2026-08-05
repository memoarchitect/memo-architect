import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ─── Architect delegates compiler selection to tools ─────────────────────────
//
// "The user is responsible for PATH" governs third-party validators. It has
// never governed MEMO's own compiler: a default install has to compile and draw
// with nothing installed and nothing configured. Architect therefore *bundles*
// its bundled `memo-sysmlc` default, SysIDE, or another configured provider.
//
// Resolving and spawning it stays in MEMO Tools (§1.2.2 rule 4). Architect's
// whole part in this is the tools dependency; that is what this test pins.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('Architect delegates compiler selection to tools', () => {
    it('declares tools, not a fixed compiler, as its runtime dependency', () => {
        expect(Object.keys(manifest.dependencies)).toContain('@memoarchitect/tools');
        expect(Object.keys(manifest.dependencies)).not.toContain('@memoarchitect/sysmlc');
    });

    it('does not declare a second compiler package', () => {
        expect(manifest.dependencies['@memoarchitect/sysmlc']).toBeUndefined();
    });

    it('does not reach for the compiler itself', () => {
        // Architect calls MEMO Tools; MEMO Tools spawns the compiler. An
        // Architect that knew how to start `memo-sysmlc` would be a second
        // implementation of an operation that already has one.
        const dev = readFileSync(resolve(ROOT, 'src/commands/dev.ts'), 'utf8');
        expect(dev).not.toMatch(/memo-sysmlc/);
    });
});
