import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

// The example runs from a disposable copy so editing the diagram cannot modify
// the checked-in source.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = mkdtempSync(resolve(tmpdir(), 'memo-vehicle-'));
cpSync(resolve(repoRoot, 'examples/vehicle-ibd'), exampleRoot, { recursive: true, filter: path => !path.includes('/.memo') });

const child = spawn(process.execPath, [resolve(repoRoot, 'lib/bin/memo-architect.js'), 'dev', '--port', process.env.PORT ?? '3000'], {
    cwd: exampleRoot,
    stdio: 'inherit',
});
child.on('exit', code => {
    rmSync(exampleRoot, { recursive: true, force: true });
    process.exit(code ?? 1);
});
