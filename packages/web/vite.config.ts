import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split heavy dependencies into separate chunks
                    'react-vendor': ['react', 'react-dom'],
                    'reactflow': ['@xyflow/react'],
                    'elk': ['elkjs'],
                    'zustand': ['zustand'],
                },
            },
        },
    },
});
