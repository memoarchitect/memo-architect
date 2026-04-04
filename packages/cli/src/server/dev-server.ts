// ─── Dev Server ──────────────────────────────────────────────────────────────
//
// HTTP server with:
//   - Vite dev middleware (serves the @memo/web React app)
//   - WebSocket endpoint for pushing model updates to browser
// ─────────────────────────────────────────────────────────────────────────────

import { createServer as createHttpServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type { ServerMessage, ModelUpdateMessage, DiagramDTO } from '@memo/core';

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

    if (vite) {
        // Create Vite dev server in middleware mode
        viteServer = await vite.createServer({
            root: webPackagePath,
            server: { middlewareMode: true, host },
            appType: 'spa',
        });

        server = createHttpServer((req, res) => {
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
                } else if (msg.type === 'diagram:parse') {
                    // Extract element IDs from SysML text by name-matching against current model
                    const modelMsg = initialMessages.find(m => m.type === 'model:update') as ModelUpdateMessage | undefined;
                    const elementIds = extractElementIdsFromText(msg.payload.text, modelMsg?.payload?.elements ?? {});
                    ws.send(JSON.stringify({
                        type: 'diagram:parse:result',
                        payload: { diagramId: msg.payload.diagramId, elementIds, errors: [] },
                    }));
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
