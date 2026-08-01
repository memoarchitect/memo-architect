import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
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
    },
    server: {
        port: 3000,
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
