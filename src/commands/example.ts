import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve, sep } from 'node:path';
import { architectDevCommand } from './dev.js';

const require = createRequire(import.meta.url);

/** Locate the installed `@memoarchitect/ontology` package that bundles the examples. */
function resolveOntologyRoot(): string {
    return dirname(require.resolve('@memoarchitect/ontology/package.json'));
}

/** Return whether a resolved path is contained by the bundled examples directory. */
function isBundledExample(examplesRoot: string, candidate: string): boolean {
    const pathFromExamples = relative(examplesRoot, candidate);
    return pathFromExamples !== '' &&
        pathFromExamples !== '..' &&
        !pathFromExamples.startsWith(`..${sep}`) &&
        !pathFromExamples.startsWith('/') &&
        !pathFromExamples.startsWith('\\');
}

/**
 * Resolve an example by name. Accepts a manifest example key
 * (`gpca`, `standard-sysml-diagrams`) or a direct examples/<dir> name
 * (`gpca-pump`). Returns the source directory to copy from.
 */
function resolveExampleDir(ontologyRoot: string, name: string): string {
    const examplesRoot = resolve(ontologyRoot, 'examples');
    const manifestPath = resolve(ontologyRoot, 'memo.manifest.yaml');
    if (existsSync(manifestPath)) {
        const manifest = readFileSync(manifestPath, 'utf-8');
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match `  <name>: ./examples/<dir>` under the `examples:` mapping.
        const match = manifest.match(new RegExp(`^\\s+${escaped}:\\s*(\\S+)`, 'm'));
        if (match) {
            const mapped = resolve(ontologyRoot, match[1]);
            if (isBundledExample(examplesRoot, mapped) && existsSync(mapped)) return mapped;
        }
    }
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
        throw new Error(`Example '${name}' is not a valid bundled example name.`);
    }
    const direct = resolve(examplesRoot, name);
    if (existsSync(direct)) return direct;
    throw new Error(
        `Example '${name}' not found. Expected a manifest example key or an examples/<dir> ` +
        `under @memoarchitect/ontology (looked in ${ontologyRoot}).`,
    );
}

/** List the example keys the manifest advertises, for a helpful error/usage hint. */
function listExampleKeys(ontologyRoot: string): string[] {
    const manifestPath = resolve(ontologyRoot, 'memo.manifest.yaml');
    if (!existsSync(manifestPath)) return [];
    const lines = readFileSync(manifestPath, 'utf-8').split(/\r?\n/);
    const keys: string[] = [];
    let inExamples = false;
    for (const line of lines) {
        if (/^examples:\s*$/.test(line)) { inExamples = true; continue; }
        if (!inExamples) continue;
        if (/^\S/.test(line)) break; // dedent ends the mapping
        const m = line.match(/^\s+([A-Za-z0-9._-]+):/);
        if (m) keys.push(m[1]);
    }
    return keys;
}

/**
 * Open a bundled example read-only: copy it to a disposable temp directory and
 * start the dev server there, so any edits are discarded when the process exits.
 */
export async function architectExampleCommand(options: {
    name: string;
    port?: number;
    open?: boolean;
}): Promise<void> {
    const ontologyRoot = resolveOntologyRoot();

    let exampleDir: string;
    try {
        exampleDir = resolveExampleDir(ontologyRoot, options.name);
    } catch (error) {
        const keys = listExampleKeys(ontologyRoot);
        const hint = keys.length ? `\nAvailable examples: ${keys.join(', ')}` : '';
        throw new Error(`${(error as Error).message}${hint}`);
    }

    const slug = options.name.replace(/[^A-Za-z0-9]+/g, '-');
    const tempRoot = mkdtempSync(resolve(tmpdir(), `memo-example-${slug}-`));
    cpSync(exampleDir, tempRoot, { recursive: true });

    const cleanup = () => {
        try { rmSync(tempRoot, { recursive: true, force: true }); } catch { /* best effort */ }
    };
    process.on('exit', cleanup);
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.on(signal, () => { cleanup(); process.exit(0); });
    }

    console.log(`Opening example '${options.name}' read-only (disposable copy; edits are discarded on exit).`);
    process.chdir(tempRoot);
    await architectDevCommand({ port: options.port, open: options.open });
}
