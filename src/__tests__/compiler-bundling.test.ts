import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ─── The compiler ships with Architect ──────────────────────────────────────
//
// "The user is responsible for PATH" governs third-party validators. It has
// never governed MEMO's own compiler: a default install has to compile and draw
// with nothing installed and nothing configured. Architect therefore *bundles*
// `sysmlc`, and it bundles it the only way that survives a release — as a
// declared dependency, not as a build step someone remembers.
//
// Resolving and spawning it stays in MEMO Tools (§1.2.2 rule 4). Architect's
// whole part in this is the dependency; that is what this test pins.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('Architect bundles MEMO\'s compiler', () => {
    it('declares the compiler as a runtime dependency', () => {
        expect(Object.keys(manifest.dependencies)).toContain('@memoarchitect/sysmlc');
    });

    it('pins it to the same version as the tools package it compiles with', () => {
        expect(manifest.dependencies['@memoarchitect/sysmlc'])
            .toBe(manifest.dependencies['@memoarchitect/tools']);
    });

    it('does not reach for the compiler itself', () => {
        // Architect calls MEMO Tools; MEMO Tools spawns the compiler. An
        // Architect that knew how to start `sysmlc` would be a second
        // implementation of an operation that already has one.
        const dev = readFileSync(resolve(ROOT, 'src/commands/dev.ts'), 'utf8');
        expect(dev).not.toMatch(/sysmlc/);
    });
});
