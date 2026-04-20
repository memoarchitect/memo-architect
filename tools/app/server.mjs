import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    DEFAULT_DATA_DIR,
    listElements,
    getElementById,
    upsertElement,
    deleteElement,
    sanitizeId,
} from './lib/element-store.mjs';
import { regenerateDocsFromElements } from './lib/docs-sync.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3210);
const APP_DIR = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(APP_DIR, 'public');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
};

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload, null, 2);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

function sendText(res, status, text) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

async function readJsonBody(req) {
    const chunks = [];
    let total = 0;
    const MAX_BYTES = 1_000_000;

    for await (const chunk of req) {
        total += chunk.length;
        if (total > MAX_BYTES) throw new Error('Request body too large');
        chunks.push(chunk);
    }

    if (chunks.length === 0) return {};
    const text = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(text);
}

function withCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function deriveGraph(elements, id) {
    const outgoing = [];
    const incoming = [];

    const selected = elements.find((el) => el.id === id);
    if (!selected) return { selected: null, incoming, outgoing };

    for (const el of elements) {
        if (el.id === id) continue;
        const links = Array.isArray(el.links) ? el.links : [];
        if (links.includes(id)) incoming.push(el.id);
    }

    for (const link of selected.links || []) {
        if (elements.some((el) => el.id === link)) outgoing.push(link);
    }

    return {
        selected: selected.id,
        incoming: [...new Set(incoming)].sort((a, b) => a.localeCompare(b)),
        outgoing: [...new Set(outgoing)].sort((a, b) => a.localeCompare(b)),
    };
}

function tryServeStatic(req, res, pathname) {
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = normalize(filePath).replace(/^\.+/, '');
    const fullPath = resolve(PUBLIC_DIR, `.${filePath}`);

    if (!fullPath.startsWith(PUBLIC_DIR)) {
        sendText(res, 403, 'Forbidden');
        return true;
    }

    if (!existsSync(fullPath)) {
        return false;
    }

    const stat = statSync(fullPath);
    if (!stat.isFile()) return false;

    const ext = extname(fullPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = readFileSync(fullPath);

    res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': content.length,
    });
    res.end(content);
    return true;
}

function syncDocs(reason = 'manual') {
    const elements = listElements();
    if (reason === 'server:start' && elements.length === 0) {
        console.warn('[Docs Sync] skipped on startup because no elements are present');
        return {
            skipped: true,
            reason,
            counts: { total: 0 },
            files: [],
        };
    }
    const result = regenerateDocsFromElements(elements);
    console.log(
        `[Docs Sync] reason=${reason} elements=${result.counts.total} files=${result.files.length}`,
    );
    return result;
}

const server = createServer(async (req, res) => {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const pathname = url.pathname;

    try {
        if (pathname === '/api/health' && req.method === 'GET') {
            sendJson(res, 200, { ok: true, data_dir: DEFAULT_DATA_DIR });
            return;
        }

        if (pathname === '/api/elements' && req.method === 'GET') {
            const elements = listElements();
            sendJson(res, 200, { elements, count: elements.length });
            return;
        }

        if (pathname === '/api/elements' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const saved = upsertElement(body);
            const sync = syncDocs('element:create');
            sendJson(res, 201, { element: saved, docs_sync: sync });
            return;
        }

        if (pathname === '/api/docs/regenerate' && req.method === 'POST') {
            const elements = listElements();
            const result = regenerateDocsFromElements(elements);
            sendJson(res, 200, {
                ok: true,
                message: 'Markdown regenerated from app data',
                ...result,
            });
            return;
        }

        if (pathname.startsWith('/api/elements/')) {
            const id = sanitizeId(pathname.replace('/api/elements/', ''));
            if (!id) {
                sendJson(res, 400, { error: 'Invalid element id' });
                return;
            }

            if (req.method === 'GET') {
                const element = getElementById(id);
                if (!element) {
                    sendJson(res, 404, { error: `Element not found: ${id}` });
                    return;
                }
                sendJson(res, 200, { element });
                return;
            }

            if (req.method === 'PUT') {
                const body = await readJsonBody(req);
                const toSave = { ...body, id };
                const saved = upsertElement(toSave);
                const sync = syncDocs('element:update');
                sendJson(res, 200, { element: saved, docs_sync: sync });
                return;
            }

            if (req.method === 'DELETE') {
                const removed = deleteElement(id);
                const sync = syncDocs('element:delete');
                sendJson(res, 200, { removed, id, docs_sync: sync });
                return;
            }
        }

        if (pathname.startsWith('/api/graph/') && req.method === 'GET') {
            const id = sanitizeId(pathname.replace('/api/graph/', ''));
            const elements = listElements();
            const graph = deriveGraph(elements, id);
            sendJson(res, 200, graph);
            return;
        }

        if (tryServeStatic(req, res, pathname)) return;

        // SPA fallback
        if (tryServeStatic(req, res, '/index.html')) return;

        sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
        sendJson(res, 500, {
            error: error instanceof Error ? error.message : String(error),
        });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`MEMO Trace App running at http://${HOST}:${PORT}`);
    console.log(`Data directory: ${DEFAULT_DATA_DIR}`);
    try {
        syncDocs('server:start');
    } catch (error) {
        console.error('[Docs Sync] startup sync failed:', error);
    }
});
