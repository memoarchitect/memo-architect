#!/usr/bin/env node
/**
 * pack-kpar.ts — Create a .kpar (KerML Project Archive) from the ontology files.
 *
 * A .kpar file is a ZIP archive containing:
 *   - .project.json  (package metadata)
 *   - .meta.json      (tool & conformance info)
 *   - *.sysml files   (source models)
 *
 * Output: dist/memo-ontology-<version>.kpar
 *
 * Usage: npx tsx scripts/pack-kpar.ts
 */

import { createWriteStream, readFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SYSML_DIR = join(ROOT, 'sysml');
const DIST_DIR = join(ROOT, 'dist');

// Read version from .project.json
const projectJson = JSON.parse(
    readFileSync(join(SYSML_DIR, '.project.json'), 'utf-8')
);
const { name, version } = projectJson;

// Ensure dist directory exists
mkdirSync(DIST_DIR, { recursive: true });

const outputPath = join(DIST_DIR, `${name}-${version}.kpar`);
const output = createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (err: Error) => {
    console.error('Archive error:', err);
    process.exit(1);
});

output.on('close', () => {
    const sizeKB = (archive.pointer() / 1024).toFixed(1);
    console.log(`Created ${outputPath} (${sizeKB} KB)`);
});

archive.pipe(output);

// Add metadata files
archive.file(join(SYSML_DIR, '.project.json'), { name: '.project.json' });
archive.file(join(SYSML_DIR, '.meta.json'), { name: '.meta.json' });

// Add all .sysml files preserving directory structure
function findSysmlFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...findSysmlFiles(full));
        } else if (entry.endsWith('.sysml')) {
            files.push(full);
        }
    }
    return files;
}

const sysmlFiles = findSysmlFiles(SYSML_DIR);
for (const file of sysmlFiles) {
    const relPath = relative(SYSML_DIR, file);
    archive.file(file, { name: relPath });
}

console.log(`Packing ${sysmlFiles.length} SysML files + metadata...`);
archive.finalize();
