// Guard against persisting server-owned ontology and model state in the browser.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STORE_DIR = join('packages', 'web', 'src', 'store');
console.log(`Checking for forbidden persisted ontology/model state in ${STORE_DIR}...`);

const walk = (dir) => !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const lines = walk(STORE_DIR).flatMap(file =>
    readFileSync(file, 'utf8').split('\n').map((text, index) => ({ at: `${file}:${index + 1}:${text}`, text })));

let failed = false;
const persistHits = lines.filter(line => line.text.includes('persist('));
if (persistHits.length) {
    console.error('ERROR: Found persist() in the web store:');
    persistHits.forEach(line => console.error(line.at));
    failed = true;
}
const storageHits = lines.filter(line => line.text.includes('localStorage.setItem') && /ontology|model|kind|relationship/i.test(line.at));
if (storageHits.length) {
    console.error('ERROR: Found ontology/model localStorage writes:');
    storageHits.forEach(line => console.error(line.at));
    failed = true;
}
if (failed) process.exit(1);
console.log('OK: ontology and model state remain server-owned.');
