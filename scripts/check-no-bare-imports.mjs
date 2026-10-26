// Guard against shipping a bundle the browser cannot load.
//
// Rollup leaves an import it could not resolve in the output as a bare specifier. The browser has no resolver
// for those, so evaluating the chunk throws `Failed to resolve module specifier` and every route that
// statically depends on it renders blank. Vite reports this as a warning, so the build stays green and the
// breakage only surfaces once a user installs the package — it cannot reproduce in `dev`, which serves source
// rather than chunks.
//
// This is what shipped 0.6.2 with `import"web-worker"` in the elk chunk and broke every diagram. Every
// specifier in dist must be relative or absolute.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = join('dist', 'assets');
if (!existsSync(ASSET_DIR)) {
    console.error(`ERROR: ${ASSET_DIR} not found — run the client build first.`);
    process.exit(1);
}
console.log(`Checking for unresolved bare imports in ${ASSET_DIR}...`);

// A bare specifier is anything after import/from that does not start with / . or a protocol. Matching the
// minified form (no spaces) and the plain one.
const FILE_PATTERN = /(^|[};])(import|export[^"]*from)\s*"[^"./][^":]*"/;
const SPECIFIER = /(import|from)\s*"[^"./][^":]*"/g;

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const hits = walk(ASSET_DIR).filter(file => file.endsWith('.js') && FILE_PATTERN.test(readFileSync(file, 'utf8')));

if (hits.length) {
    console.error('ERROR: Bundled chunks import unresolvable bare specifiers:');
    for (const file of hits) {
        console.error(`  ${file}`);
        const specifiers = [...new Set(readFileSync(file, 'utf8').match(SPECIFIER) ?? [])].sort();
        specifiers.forEach(specifier => console.error(`    ${specifier}`));
    }
    console.error('\nThe browser cannot resolve these and the chunk will throw on load.');
    console.error('Usually a manualChunks entry naming a package instead of the module');
    console.error('the app imports — point it at the exact module path.');
    process.exit(1);
}
console.log('OK: every import in the bundle is resolvable.');
