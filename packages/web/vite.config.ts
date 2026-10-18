import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
const require = createRequire(import.meta.url);
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react()],
    // The local memo-meta workspace links Architect beside the ontology and
    // tools packages. Force peer dependencies such as ReactFlow to share the
    // app's React instance even when Vite itself resolves from the workspace
    // root; two React copies make diagram routes fail with an invalid hook call.
    resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        // pnpm can hoist the worker above Architect's own workspace boundary.
        // Permit that dependency explicitly so ELK workers load in worktrees.
        fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url))), dirname(require.resolve('elkjs/package.json'))] },
        ...(process.env.MEMO_PILOT_HMR_PORT ? { hmr: { host: "127.0.0.1", port: Number(process.env.MEMO_PILOT_HMR_PORT) } } : {}),
        watch: {
            // Model source is NOT application source (design section 13.2).
            //
            // A model save must never trigger HMR, a route replacement, or a
            // React remount: the WebSocket revision updates the affected stores
            // in place, and a Vite reload on top of it would throw away the
            // user's route, selection, drawing mode, and unsaved form state for
            // a change the app already handled.
            //
            // Vite's root is `packages/web`, so a project outside it is not
            // watched anyway. These patterns matter for the memo-meta
            // workspace, where the ontology and a project can sit inside the
            // watched tree, and they state the rule explicitly rather than
            // leaving it to a directory layout that could change.
            ignored: [
                '**/model/catalog/**',
                '**/*.sysml',
                '**/.memo/**',
                '**/memo.lock.yaml',
                // Files the server itself writes while the app is open: ids on
                // first open, preferences, and layout sidecars.
                '**/memo.identity.yaml',
                '**/memo.user.yaml',
                '**/*.viewlayout',
            ],
        },
    },
    build: {
        outDir: '../../dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split heavy dependencies into separate chunks
                    'react-vendor': ['react', 'react-dom'],
                    'reactflow': ['@xyflow/react'],
                    // The exact module the app imports, not the package name.
                    // Bare 'elkjs' resolves to lib/main (elk-api), which nothing
                    // imports and which requires 'web-worker' — a Node-only
                    // optional dependency that is not installed. Rollup left it
                    // as a bare `import "web-worker"` in the chunk, and since the
                    // diagram bundles depend on it statically, the browser threw
                    // on an unresolvable specifier and every diagram route
                    // rendered blank.
                    'elk': ['elkjs/lib/elk.bundled.js'],
                    'zustand': ['zustand'],
                },
            },
        },
    },
});
