import { readdirSync, rmSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertElement, DEFAULT_DATA_DIR } from '../lib/element-store.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(startDir = SCRIPT_DIR) {
    let current = resolve(startDir);
    for (let i = 0; i < 20; i++) {
        const marker = join(current, 'docs', 'src', 'developers', 'requirements');
        if (existsSync(marker)) return current;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    throw new Error('Could not locate repository root containing docs/src/developers/requirements');
}

const ROOT = findRepoRoot();

function read(filePath) {
    const full = resolve(ROOT, filePath);
    return readFileSync(full, 'utf8');
}

function parseTableRows(markdown) {
    const rows = [];
    const lines = markdown.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim().startsWith('|')) continue;
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 2) continue;
        const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
        if (isSeparator) continue;
        rows.push(cells);
    }

    // Drop header rows heuristically
    return rows.filter((cells) => {
        const first = cells[0] || '';
        return !/^(Need ID|Requirement ID|Feature ID|Test ID)$/i.test(first);
    });
}

function extractIds(text) {
    return [...new Set((String(text).match(/\b(?:UN|SR|FEAT|TST)-[A-Z]{3}-\d{3}\b/g) || []))];
}

function parseTags(text) {
    return String(text || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

function normalizeStatus(value, fallback = 'draft') {
    const status = String(value || '').trim().toLowerCase();
    if (!status) return fallback;
    if (['active', 'draft', 'gap', 'implemented', 'obsolete'].includes(status)) return status;
    return fallback;
}

function domainFromId(id) {
    const parts = String(id).split('-');
    return parts.length > 1 ? parts[1] : 'GEN';
}

function makeTitle(text, fallback) {
    const clean = String(text || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return fallback;
    return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

function parseDomainHeaders(markdown) {
    const domains = [];
    const lines = String(markdown || '').split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^##\s+([A-Z]{3}):\s+(.+)$/);
        if (!match) continue;
        domains.push({
            domain: match[1],
            label: match[2].trim(),
        });
    }
    return domains;
}

function buildFallbackElements() {
    const treeMd = read('docs/src/developers/requirements/functional-decomposition-tree.md');
    const runtimeMd = read('docs/src/developers/requirements/runtime-surfaces.md');
    const domains = parseDomainHeaders(treeMd);
    const runtimeSurfaceLine = runtimeMd.split(/\r?\n/).find((l) => l.startsWith('This document captures')) || '';
    const elements = [];

    for (const { domain, label } of domains) {
        const unId = `UN-${domain}-001`;
        const srId = `SR-${domain}-001`;
        const featId = `FEAT-${domain}-001`;
        const tstId = `TST-${domain}-001`;

        elements.push({
            id: unId,
            type: 'user_need',
            domain,
            title: `${label} need`,
            description: `Stakeholder: MEMO practitioner. Objective: perform ${label.toLowerCase()} reliably. Problem: without this domain capability, engineering workflow quality and throughput degrade.`,
            status: 'active',
            tags: ['sop-ish', 'fallback-generated'],
            links: [],
            source: 'docs/src/developers/requirements/functional-decomposition-tree.md',
        });

        elements.push({
            id: srId,
            type: 'software_requirement',
            domain,
            title: `${label} requirement`,
            description: `When a user executes ${label.toLowerCase()} workflows, the system shall provide deterministic behavior, persistence, and feedback for this domain.`,
            status: 'active',
            tags: ['ears', 'pattern:when', 'fallback-generated'],
            links: [unId],
            source: 'docs/src/developers/requirements/functional-decomposition-tree.md',
        });

        elements.push({
            id: featId,
            type: 'feature',
            domain,
            title: `${label} feature`,
            description: `${label} capability surface inferred from architecture decomposition and runtime contracts.`,
            status: 'active',
            tags: ['capability', 'fallback-generated'],
            links: [srId],
            source: 'docs/src/developers/requirements/functional-decomposition-tree.md',
        });

        elements.push({
            id: tstId,
            type: 'verification_test',
            domain,
            title: `${label} verification`,
            description: `Verify the ${label.toLowerCase()} flow end-to-end via CLI and/or web runtime surface. ${runtimeSurfaceLine}`,
            status: 'draft',
            tags: ['verification', 'fallback-generated'],
            links: [srId],
            source: 'docs/src/developers/requirements/runtime-surfaces.md',
        });
    }

    return elements;
}

function cleanExisting(dataDir) {
    mkdirSync(dataDir, { recursive: true });
    for (const file of readdirSync(dataDir)) {
        if (file.endsWith('.yaml')) rmSync(resolve(dataDir, file));
    }
}

async function main() {
    const userNeedsMd = read('docs/src/developers/requirements/user-needs.md');
    const softwareReqMd = read('docs/src/developers/requirements/software-requirements.md');
    const featureMd = read('docs/src/developers/requirements/feature-catalog.md');
    const testsMd = read('docs/src/developers/requirements/verification-tests.md');
    const appSyncedInput =
        userNeedsMd.includes('App-Synced') &&
        softwareReqMd.includes('App-Synced') &&
        featureMd.includes('App-Synced') &&
        testsMd.includes('App-Synced');

    const allElements = [];

    if (!appSyncedInput) {
        for (const row of parseTableRows(userNeedsMd)) {
            const id = row[0];
            if (!/^UN-[A-Z]{3}-\d{3}$/.test(id)) continue;
            const statement = row[1] || '';
            const col2 = String(row[2] || '').trim();
            const hasPriority = /^(high|medium|low)$/i.test(col2);
            const status = hasPriority
                ? col2.toLowerCase() === 'high'
                    ? 'active'
                    : 'draft'
                : normalizeStatus(col2, 'draft');
            const tags = ['sop-ish'];
            if (hasPriority) tags.push(`priority:${col2.toLowerCase()}`);
            tags.push(...parseTags(row[4] || ''));
            allElements.push({
                id,
                type: 'user_need',
                domain: domainFromId(id),
                title: makeTitle(statement, id),
                description: statement,
                status,
                tags: [...new Set(tags)],
                links: extractIds(row[3] || ''),
                source: 'docs/src/developers/requirements/user-needs.md',
            });
        }

        for (const row of parseTableRows(softwareReqMd)) {
            const id = row[0];
            if (!/^SR-[A-Z]{3}-\d{3}$/.test(id)) continue;
            const earsPattern = row[1] || '';
            const statement = row[2] || '';
            const links = extractIds(row[3] || '');
            allElements.push({
                id,
                type: 'software_requirement',
                domain: domainFromId(id),
                title: makeTitle(statement, id),
                description: statement,
                status: normalizeStatus(row[4] || 'active', 'active'),
                tags: [
                    ...new Set([
                        'ears',
                        `pattern:${String(earsPattern).toLowerCase().replace(/\s+/g, '_')}`,
                        ...parseTags(row[5] || ''),
                    ]),
                ],
                links,
                source: 'docs/src/developers/requirements/software-requirements.md',
            });
        }

        for (const row of parseTableRows(featureMd)) {
            const id = row[0];
            if (!/^FEAT-[A-Z]{3}-\d{3}$/.test(id)) continue;
            const desc = row[1] || '';
            const reqIdsFromCol2 = extractIds(row[2] || '');
            const reqIds = reqIdsFromCol2.length > 0 ? reqIdsFromCol2 : extractIds(row[3] || '');
            allElements.push({
                id,
                type: 'feature',
                domain: domainFromId(id),
                title: makeTitle(desc, id),
                description: desc,
                status: normalizeStatus(row[3] || 'active', 'active'),
                tags: [...new Set(['capability', ...parseTags(row[4] || '')])],
                links: reqIds,
                source: 'docs/src/developers/requirements/feature-catalog.md',
            });
        }

        for (const row of parseTableRows(testsMd)) {
            const id = row[0];
            if (!/^TST-[A-Z]{3}-\d{3}$/.test(id)) continue;
            const isAppSyncedShape = row.length <= 5;
            const intent = isAppSyncedShape ? (row[1] || '') : (row[2] || '');
            const reqIds = isAppSyncedShape ? extractIds(row[2] || '') : extractIds(row[5] || '');
            const status = isAppSyncedShape ? normalizeStatus(row[3] || 'draft', 'draft') : normalizeStatus(row[6] || 'draft', 'draft');
            const description = isAppSyncedShape
                ? intent
                : `${intent}\n\nProcedure: ${row[3] || ''}\nPass criteria: ${row[4] || ''}`;
            allElements.push({
                id,
                type: 'verification_test',
                domain: domainFromId(id),
                title: makeTitle(intent, id),
                description,
                status,
                tags: [...new Set(['verification', ...parseTags(isAppSyncedShape ? row[4] || '' : '')])],
                links: reqIds,
                source: 'docs/src/developers/requirements/verification-tests.md',
            });
        }
    }

    const dedup = new Map();
    for (const element of allElements) dedup.set(element.id, element);

    if (dedup.size === 0) {
        for (const element of buildFallbackElements()) {
            dedup.set(element.id, element);
        }
    }

    if (dedup.size === 0) {
        throw new Error('No elements could be derived from docs; refusing to overwrite existing YAML data');
    }

    cleanExisting(DEFAULT_DATA_DIR);

    const saved = [];
    for (const element of dedup.values()) {
        saved.push(upsertElement(element));
    }

    console.log(`Bootstrapped ${saved.length} elements into ${DEFAULT_DATA_DIR}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
