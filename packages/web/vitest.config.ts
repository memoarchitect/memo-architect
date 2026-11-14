import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

// Tests that hold the router to a wall-clock budget. They run after the rest of the
// suite, on an otherwise idle machine, because another file's load slows them past it.
const TIMED = ['src/views/__tests__/connector-routing.test.ts'];

export default defineConfig({
    // The built-in DHF templates are `?raw` imports from the ontology package. When the
    // ontology is a link to a checkout beside this repository, its real path is outside the
    // workspace root, and Vite serves only allowed paths.
    server: {
        fs: {
            allow: [
                searchForWorkspaceRoot(root),
                realpathSync(fileURLToPath(new URL('../../node_modules/@memoarchitect/ontology', import.meta.url))),
            ],
        },
    },
    test: {
        exclude: ['dist/**', 'node_modules/**'],
        projects: [
            {
                extends: true,
                test: {
                    name: 'web',
                    include: ['src/**/*.{test,spec}.{ts,tsx}'],
                    exclude: ['dist/**', 'node_modules/**', ...TIMED],
                    sequence: { groupOrder: 0 },
                },
            },
            {
                extends: true,
                test: {
                    name: 'timed',
                    include: TIMED,
                    sequence: { groupOrder: 1 },
                },
            },
        ],
    },
});
