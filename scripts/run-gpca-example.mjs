import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ontologyRoot = dirname(require.resolve('@memoarchitect/ontology/package.json'));
const installedExample = resolve(ontologyRoot, 'examples/gpca-pump');
const exampleRoot = mkdtempSync(resolve(tmpdir(), 'memo-gpca-'));
cpSync(installedExample, exampleRoot, { recursive: true });
// The sample runs from a disposable directory so it cannot modify the bundled
// example. Give that copy an explicit identity; otherwise config loading falls
// back to mkdtemp's random directory suffix and leaks it into the UI title.
writeFileSync(resolve(exampleRoot, 'memo.package.yaml'), [
    'name: GPCA Sample',
    'version: 1.0.0',
    'entrypoint: model/catalog/project.sysml',
    'include: [model]',
    'toolchain:',
    '  validator: syside',
].join('\n') + '\n');
const architectCli = resolve(repoRoot, 'lib/bin/memo-architect.js');

const child = spawn(process.execPath, [architectCli, 'dev', '--port', '3000'], {
    cwd: exampleRoot,
    stdio: 'inherit',
});

child.on('exit', code => {
    rmSync(exampleRoot, { recursive: true, force: true });
    process.exit(code ?? 1);
});
