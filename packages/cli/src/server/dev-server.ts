// ─── Dev Server ──────────────────────────────────────────────────────────────
//
// HTTP server with:
//   - Vite dev middleware (serves the @memo/web React app)
//   - WebSocket endpoint for pushing model updates to browser
// ─────────────────────────────────────────────────────────────────────────────

import { createServer as createHttpServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, createReadStream, statSync, readdirSync } from 'node:fs';
import { extname } from 'node:path';
import type { ServerMessage, ModelUpdateMessage, DiagramDTO, DiagramLayout } from '@memo/core';

export interface DevServerOptions {
    port: number;
    projectRoot: string;
    webPackagePath: string;
    initialMessages: ServerMessage[];
}

export interface DevServer {
    broadcast(messages: ServerMessage[]): void;
    close(): void;
}

// ─── Sidecar layout persistence ────────────────────────────────────────────

function layoutsDir(projectRoot: string): string {
    return resolve(projectRoot, '.memo', 'layouts');
}

function layoutPath(projectRoot: string, diagramId: string): string {
    return resolve(layoutsDir(projectRoot), `${diagramId}.yaml`);
}

function loadDiagramLayout(projectRoot: string, diagramId: string): DiagramLayout | null {
    const p = layoutPath(projectRoot, diagramId);
    if (!existsSync(p)) return null;
    try {
        const { parse } = require('yaml');
        return parse(readFileSync(p, 'utf8')) as DiagramLayout;
    } catch { return null; }
}

function saveDiagramLayout(projectRoot: string, diagramId: string, layout: DiagramLayout): void {
    const dir = layoutsDir(projectRoot);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const { stringify } = require('yaml');
    writeFileSync(layoutPath(projectRoot, diagramId), stringify(layout), 'utf8');
}

function loadAllLayouts(projectRoot: string): Record<string, DiagramLayout> {
    const dir = layoutsDir(projectRoot);
    if (!existsSync(dir)) return {};
    const layouts: Record<string, DiagramLayout> = {};
    try {
        for (const file of readdirSync(dir)) {
            if (!file.endsWith('.yaml')) continue;
            const diagramId = file.replace(/\.yaml$/, '');
            const layout = loadDiagramLayout(projectRoot, diagramId);
            if (layout) layouts[diagramId] = layout;
        }
    } catch { /* ignore */ }
    return layouts;
}

// ─── User-diagram persistence helpers ──────────────────────────────────────

function userDiagramsPath(projectRoot: string): string {
    return resolve(projectRoot, '.memo', 'user-diagrams.json');
}

function loadUserDiagrams(projectRoot: string): DiagramDTO[] {
    const p = userDiagramsPath(projectRoot);
    if (!existsSync(p)) return [];
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return []; }
}

function saveUserDiagrams(projectRoot: string, diagrams: DiagramDTO[]): void {
    const dir = resolve(projectRoot, '.memo');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(userDiagramsPath(projectRoot), JSON.stringify(diagrams, null, 2), 'utf8');
}

export async function createDevServer(options: DevServerOptions): Promise<DevServer> {
    const { port, webPackagePath, initialMessages } = options;
    const host = '127.0.0.1';

    // Dynamic import Vite (it's a dev dependency of @memo/web)
    let vite: any;
    try {
        vite = await import('vite');
    } catch {
        // Vite not available — fall back to static serving
        console.warn('Vite not found, using static file serving');
    }

    let server: Server;
    let viteServer: any;

    // Resolve docs/dist relative to the repo root (two levels up from cli package)
    const docsDistPath = resolve(webPackagePath, '../../docs/dist');
    const hasLocalDocs = existsSync(resolve(docsDistPath, 'index.html'));

    /** Serve a static file from docsDistPath. Returns true if handled. */
    function serveHelp(req: any, res: any): boolean {
        if (!hasLocalDocs) return false;
        const url: string = req.url ?? '/';
        if (!url.startsWith('/help')) return false;

        // Strip /help prefix, default to index.html
        let filePath = url.slice('/help'.length) || '/';
        if (filePath.endsWith('/')) filePath += 'index.html';
        const fullPath = resolve(docsDistPath, filePath.replace(/^\//, ''));

        if (!existsSync(fullPath)) {
            // MkDocs 404 page
            const notFound = resolve(docsDistPath, '404.html');
            if (existsSync(notFound)) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                createReadStream(notFound).pipe(res);
            } else {
                res.writeHead(404); res.end('Not found');
            }
            return true;
        }

        const MIME: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.css':  'text/css',
            '.js':   'application/javascript',
            '.json': 'application/json',
            '.svg':  'image/svg+xml',
            '.png':  'image/png',
            '.ico':  'image/x-icon',
            '.woff2': 'font/woff2',
            '.woff':  'font/woff',
            '.xml':  'application/xml',
            '.gz':   'application/gzip',
        };
        const mime = MIME[extname(fullPath)] ?? 'application/octet-stream';
        const size = statSync(fullPath).size;
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': size });
        createReadStream(fullPath).pipe(res);
        return true;
    }

    if (vite) {
        // Create Vite dev server in middleware mode
        viteServer = await vite.createServer({
            root: webPackagePath,
            server: { middlewareMode: true, host },
            appType: 'spa',
        });

        server = createHttpServer((req, res) => {
            if (serveHelp(req, res)) return;
            viteServer.middlewares(req, res);
        });
    } else {
        // Fallback: serve a basic page that connects via WebSocket
        server = createHttpServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>MEMO Dev</title></head>
                <body>
                    <h1>MEMO Dev Server</h1>
                    <p>Web package not found at ${webPackagePath}. Install @memo/web.</p>
                    <pre id="log"></pre>
                    <script>
                        const ws = new WebSocket('ws://' + location.host);
                        ws.onmessage = (e) => {
                            const msg = JSON.parse(e.data);
                            document.getElementById('log').textContent += JSON.stringify(msg.type) + '\\n';
                        };
                    </script>
                </body>
                </html>
            `);
        });
    }

    // WebSocket setup
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ server });
    const clients = new Set<any>();

    /** Push an updated model:update message (with modified diagrams) to all clients */
    function broadcastDiagramChange(changedDiagram: DiagramDTO, op: 'create' | 'update' | 'delete'): void {
        const modelMsgIdx = initialMessages.findIndex(m => m.type === 'model:update');
        if (modelMsgIdx < 0) return;
        const prev = initialMessages[modelMsgIdx] as ModelUpdateMessage;
        let diagrams: DiagramDTO[] = prev.payload.diagrams ?? [];
        if (op === 'create') {
            diagrams = [...diagrams, changedDiagram];
        } else if (op === 'update') {
            diagrams = diagrams.map(d => d.id === changedDiagram.id ? { ...d, ...changedDiagram } : d);
        } else {
            diagrams = diagrams.filter(d => d.id !== changedDiagram.id);
        }
        const updatedMsg: ModelUpdateMessage = { type: 'model:update', payload: { ...prev.payload, diagrams } };
        initialMessages[modelMsgIdx] = updatedMsg;
        for (const client of clients) {
            if (client.readyState === 1) client.send(JSON.stringify(updatedMsg));
        }
    }

    /** Extract element IDs from a SysML text snippet by matching names against the model */
    function extractElementIdsFromText(text: string, elements: Record<string, any>): string[] {
        // Match `part|requirement|action|port|item|attribute <name> :` patterns
        const regex = /\b(?:part|requirement|action|port|item|attribute|connection)\s+(\w+)\s*:/g;
        const ids: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
            const name = m[1];
            if (elements[name]) ids.push(name);
        }
        return ids;
    }

    wss.on('connection', (ws: any) => {
        clients.add(ws);

        // Send initial state to new connections
        for (const msg of initialMessages) {
            ws.send(JSON.stringify(msg));
        }

        // Send all sidecar layouts on connect
        const layouts = loadAllLayouts(options.projectRoot);
        if (Object.keys(layouts).length > 0) {
            ws.send(JSON.stringify({ type: 'diagram:layout', payload: { layouts } }));
        }

        ws.on('close', () => clients.delete(ws));

        ws.on('message', async (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'request:refresh') {
                    // Re-send current state
                    for (const m of initialMessages) {
                        ws.send(JSON.stringify(m));
                    }
                } else if (msg.type === 'element:update' || msg.type === 'element:create') {
                    // 1. Persist to FS
                    const { saveElementToFile } = await import('./persistor.js');
                    const { projectRoot } = options;

                    const result = saveElementToFile(projectRoot, msg.payload);
                    if (result.success) {
                        // The file watcher will catch this change and broadcast to all clients
                        console.log(`[Persisted] ${msg.type} to ${result.filePath}`);
                    }
                } else if (msg.type === 'diagram:create') {
                    const { projectRoot } = options;
                    const diagram: DiagramDTO = { ...msg.payload, auto: false };
                    const userDiagrams = loadUserDiagrams(projectRoot);
                    userDiagrams.push(diagram);
                    saveUserDiagrams(projectRoot, userDiagrams);
                    broadcastDiagramChange(diagram, 'create');
                    console.log(`[Diagram] Created: ${diagram.name} (${diagram.id})`);
                } else if (msg.type === 'diagram:update') {
                    const { projectRoot } = options;
                    const userDiagrams = loadUserDiagrams(projectRoot);
                    const idx = userDiagrams.findIndex(d => d.id === msg.payload.id);
                    if (idx >= 0) {
                        userDiagrams[idx] = { ...userDiagrams[idx], ...msg.payload };
                        saveUserDiagrams(projectRoot, userDiagrams);
                        broadcastDiagramChange(userDiagrams[idx], 'update');
                    }
                } else if (msg.type === 'diagram:delete') {
                    const { projectRoot } = options;
                    const userDiagrams = loadUserDiagrams(projectRoot);
                    const filtered = userDiagrams.filter(d => d.id !== msg.payload.id);
                    saveUserDiagrams(projectRoot, filtered);
                    broadcastDiagramChange({ id: msg.payload.id } as DiagramDTO, 'delete');
                    console.log(`[Diagram] Deleted: ${msg.payload.id}`);
                } else if (msg.type === 'diagram:layout:update') {
                    const { diagramId, layout } = msg.payload;
                    saveDiagramLayout(options.projectRoot, diagramId, layout);
                    // Broadcast to other clients (not the sender)
                    const layoutMsg = JSON.stringify({ type: 'diagram:layout', payload: { layouts: { [diagramId]: layout } } });
                    for (const client of clients) {
                        if (client !== ws && client.readyState === 1) client.send(layoutMsg);
                    }
                } else if (msg.type === 'relationship:add') {
                    const { saveRelationshipToFile } = await import('./persistor.js');
                    const { projectRoot } = options;
                    const result = saveRelationshipToFile(projectRoot, msg.payload);
                    if (result.success) {
                        console.log(`[Persisted] relationship:add (${msg.payload.type}) to ${result.filePath}`);
                    } else {
                        console.error(`[Error] relationship:add failed: ${result.error}`);
                    }
                } else if (msg.type === 'diagram:parse') {
                    // Extract element IDs from SysML text by name-matching against current model
                    const modelMsg = initialMessages.find(m => m.type === 'model:update') as ModelUpdateMessage | undefined;
                    const elementIds = extractElementIdsFromText(msg.payload.text, modelMsg?.payload?.elements ?? {});
                    ws.send(JSON.stringify({
                        type: 'diagram:parse:result',
                        payload: { diagramId: msg.payload.diagramId, elementIds, errors: [] },
                    }));
                } else if (msg.type === 'ontology:save-selection') {
                    // Persist ontology selection to the project config file
                    const { projectRoot } = options;
                    const configCandidates = ['memo.package.yaml', 'memo.package.yml', 'memo.config.yaml', 'memo.config.yml'];
                    let configPath = '';
                    for (const name of configCandidates) {
                        const p = resolve(projectRoot, name);
                        if (existsSync(p)) { configPath = p; break; }
                    }
                    if (configPath) {
                        try {
                            const { parse, stringify } = require('yaml');
                            const content = readFileSync(configPath, 'utf8');
                            const doc = parse(content) as Record<string, any>;
                            const selected: string[] = msg.payload?.selected ?? [];
                            // Preserve existing entries (keep version etc.); add new ones as name-only
                            const existingMap = new Map<string, any>(
                                (doc.ontologies ?? []).map((e: any) => [e.name, e])
                            );
                            doc.ontologies = selected.map(name => existingMap.get(name) ?? { name });
                            writeFileSync(configPath, stringify(doc), 'utf8');
                            console.log(`[Ontology] Saved selection (${selected.length} packages) to ${configPath}`);
                        } catch (e) {
                            console.error('[Ontology] Failed to save selection:', e);
                        }
                    }
                } else if (msg.type === 'ontology:install') {
                    // Install an ontology from git URL, npm package, or local path
                    const { projectRoot } = options;
                    const source = msg.payload?.source;
                    if (!source) {
                        ws.send(JSON.stringify({ type: 'ontology:install:result', payload: { success: false, error: 'No source provided' } }));
                    } else {
                        try {
                            const { execSync } = await import('node:child_process');
                            const { detectInstallMode } = await import('../commands/install.js');
                            const mode = detectInstallMode(source);
                            const memoPkgsDir = resolve(projectRoot, 'memo_packages');
                            if (!existsSync(memoPkgsDir)) mkdirSync(memoPkgsDir, { recursive: true });

                            if (mode === 'git') {
                                // Clone into memo_packages/<repo-name>
                                const repoName = source.split('/').pop()?.replace('.git', '') ?? 'ontology';
                                const destDir = resolve(memoPkgsDir, repoName);
                                if (!existsSync(destDir)) {
                                    execSync(`git clone --depth 1 ${source} ${destDir}`, { stdio: 'pipe' });
                                }
                            } else if (mode === 'local') {
                                // Symlink local path
                                const { basename: bn } = await import('node:path');
                                const { symlinkSync } = await import('node:fs');
                                const resolvedSource = resolve(projectRoot, source);
                                const destDir = resolve(memoPkgsDir, bn(resolvedSource));
                                if (!existsSync(destDir)) {
                                    symlinkSync(resolvedSource, destDir);
                                }
                            }

                            // Refresh packages and broadcast
                            const { getPackageMetadata } = await import('@memo/core');
                            const packages = getPackageMetadata(projectRoot);
                            const pkgMsg = { type: 'ontology:packages' as const, payload: { packages } };
                            for (const client of clients) {
                                if (client.readyState === 1) client.send(JSON.stringify(pkgMsg));
                            }
                            ws.send(JSON.stringify({
                                type: 'ontology:install:result',
                                payload: { success: true, packageName: source },
                            }));
                            console.log(`[Ontology] Installed package from ${source}`);
                        } catch (e: any) {
                            ws.send(JSON.stringify({
                                type: 'ontology:install:result',
                                payload: { success: false, error: e?.message ?? String(e) },
                            }));
                            console.error('[Ontology] Install failed:', e);
                        }
                    }
                } else if (msg.type === 'ontology:remove') {
                    // Remove an installed ontology package
                    const { projectRoot } = options;
                    const pkgName = msg.payload?.packageName;
                    if (!pkgName) {
                        ws.send(JSON.stringify({ type: 'ontology:remove:result', payload: { success: false, packageName: '', error: 'No package name' } }));
                    } else {
                        try {
                            const shortName = pkgName.replace('@memo/', '');
                            const memoPkgsPath = resolve(projectRoot, 'memo_packages', shortName);
                            if (existsSync(memoPkgsPath)) {
                                const { rmSync } = await import('node:fs');
                                rmSync(memoPkgsPath, { recursive: true, force: true });
                            }
                            // Refresh and broadcast
                            const { getPackageMetadata } = await import('@memo/core');
                            const packages = getPackageMetadata(projectRoot);
                            const pkgMsg = { type: 'ontology:packages' as const, payload: { packages } };
                            for (const client of clients) {
                                if (client.readyState === 1) client.send(JSON.stringify(pkgMsg));
                            }
                            ws.send(JSON.stringify({
                                type: 'ontology:remove:result',
                                payload: { success: true, packageName: pkgName },
                            }));
                            console.log(`[Ontology] Removed package ${pkgName}`);
                        } catch (e: any) {
                            ws.send(JSON.stringify({
                                type: 'ontology:remove:result',
                                payload: { success: false, packageName: pkgName, error: e?.message ?? String(e) },
                            }));
                            console.error('[Ontology] Remove failed:', e);
                        }
                    }
                }
            } catch (e) {
                console.error('WebSocket Error:', e);
            }
        });
    });

    // Start listening
    await new Promise<void>((resolve) => {
        server.listen(port, host, () => resolve());
    });

    return {
        broadcast(messages: ServerMessage[]) {
            // Update initial messages for new connections
            initialMessages.length = 0;
            initialMessages.push(...messages);

            for (const client of clients) {
                if (client.readyState === 1) { // WebSocket.OPEN
                    for (const msg of messages) {
                        client.send(JSON.stringify(msg));
                    }
                }
            }
        },
        close() {
            wss.close();
            viteServer?.close();
            server.close();
        },
    };
}
