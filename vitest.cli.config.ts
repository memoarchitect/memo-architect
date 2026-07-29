import { defineConfig } from 'vitest/config';

// The web app has its own config rooted at packages/web. This one covers the
// CLI in src/ — the commands, and the feature grants they inject.
export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['dist/**', 'lib/**', 'node_modules/**'],
    },
});
