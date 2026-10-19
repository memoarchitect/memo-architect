import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The app draws its own dialogs (components/AppDialogs.tsx). A browser dialog is
// another application's window, and nothing in the app may open one.

const root = join(__dirname, '..');
function sources(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
        return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
}

describe('browser dialogs', () => {
    it('are not used anywhere in the app', () => {
        const offenders = sources(root).filter(file => /\bwindow\.(confirm|prompt|alert)\s*\(/.test(readFileSync(file, 'utf8')));
        expect(offenders).toEqual([]);
    });
});
