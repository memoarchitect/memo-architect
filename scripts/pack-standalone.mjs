// ─── pack-standalone ──────────────────────────────────────────────────────────
//
// Builds Architect against its published dependencies, packs Architect locally, downloads the exact
// dependency tarballs, and verifies all three together.
// ─────────────────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist-standalone');
const windows = process.platform === 'win32';

/** npm, corepack and the package-bin shims are .cmd files on Windows, which only a shell can start. */
function sh(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, stdio: ['ignore', 'ignore', 'inherit'], shell: windows });
    if (result.status !== 0) {
        console.error(`✖ ${command} ${args.join(' ')} failed in ${cwd}`);
        process.exit(result.status ?? 1);
    }
}
const bin = (dir, name) => join(dir, 'node_modules', '.bin', name);
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

console.log('▸ Building Architect against published npm dependencies');
sh('corepack', ['pnpm', 'run', 'build'], ROOT);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log(`▸ Packing ${manifest.name}`);
sh('corepack', ['pnpm', 'pack', '--pack-destination', OUT], ROOT);

const spec = name => `${name}@${manifest.dependencies[name]}`;
sh('npm', ['pack', spec('@memoarchitect/ontology'), spec('@memoarchitect/tools')], OUT);

writeFileSync(join(OUT, 'README.md'), `# MEMO npm distribution

Each tarball is independently publishable. Install only the level you need:

\`\`\`bash
npm install @memoarchitect/ontology
npm install @memoarchitect/tools
npm install @memoarchitect/architect
\`\`\`

For these local tarballs:

\`\`\`bash
npm install ./memoarchitect-ontology-*.tgz ./memoarchitect-tools-*.tgz ./memoarchitect-architect-*.tgz
\`\`\`

Dependency direction is:

\`@memoarchitect/ontology\` ← \`@memoarchitect/tools\` ← \`@memoarchitect/architect\`
`);

console.log('▸ Verifying a clean npm consumer without a source checkout');
const verify = mkdtempSync(join(tmpdir(), 'memo-standalone-'));
try {
    const tarballs = readdirSync(OUT).filter(file => file.endsWith('.tgz')).map(file => join(OUT, file));
    sh('npm', ['init', '-y'], verify);
    sh('npm', ['install', ...tarballs], verify);
    sh(bin(verify, 'memo'), ['--help'], verify);
    sh(bin(verify, 'memo-architect'), ['--help'], verify);
    sh(bin(verify, 'memo'), ['init', 'device', '--archetype', 'blank'], verify);
    const device = join(verify, 'device');
    sh(bin(verify, 'memo'), ['validate', '.'], device);
    sh(bin(verify, 'memo'), ['pack', '--output', 'device.kpar'], device);
    sh(bin(verify, 'memo-architect'), ['build', '--output', 'viewer'], device);
    for (const expected of [
        join(verify, 'node_modules', '@memoarchitect', 'ontology', 'memo.manifest.yaml'),
        join(verify, 'node_modules', '@memoarchitect', 'tools', 'packages', 'tools', 'lib', 'index.js'),
        join(verify, 'node_modules', '@memoarchitect', 'architect', 'dist', 'index.html'),
        join(device, 'device.kpar'),
        join(device, 'viewer', 'index.html'),
    ]) {
        if (!existsSync(expected)) { console.error(`✖ missing ${expected}`); process.exit(1); }
    }
} finally {
    rmSync(verify, { recursive: true, force: true });
}

const count = readdirSync(OUT).filter(file => file.endsWith('.tgz')).length;
if (count !== 3) { console.error(`✖ expected 3 tarballs in ${OUT}, found ${count}`); process.exit(1); }
console.log(`✓ Three verified npm tarballs in ${OUT}`);
