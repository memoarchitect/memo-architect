// DOM outerHTML uses HTML's nbsp entity; standalone SVG uses XML character refs.
// Preserve the unmodified DOM snapshots in *.svg.json.
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = resolve(process.argv[2]);
for (const name of readdirSync(directory).filter(name => name.endsWith('.svg'))) {
    const path = resolve(directory, name);
    const source = readFileSync(path, 'utf8');
    if (!source.trim()) unlinkSync(path); // No SVG existed on the dashboard.
    else writeFileSync(path, source.replaceAll('&nbsp;', '&#160;'));
}
