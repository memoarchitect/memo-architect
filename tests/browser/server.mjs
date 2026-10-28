// Serve the vehicle example from a temporary copy, so a test run never
// changes the checked-in source.
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const project = mkdtempSync(resolve(tmpdir(), 'memo-browser-'));
cpSync(resolve(repoRoot, 'examples/vehicle-ibd'), project, { recursive: true, filter: path => !path.includes('/.memo') });

const child = spawn(process.execPath, [resolve(repoRoot, 'lib/bin/memo-architect.js'), 'dev',
    '--port', process.argv[2] ?? '32117', '--no-open', '--keep-alive'], { cwd: project, stdio: 'inherit' });
child.on('exit', code => {
    rmSync(project, { recursive: true, force: true });
    process.exit(code ?? 1);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
