// ─── Dev Server ──────────────────────────────────────────────────────────────
//
// HTTP server with:
//   - Vite dev middleware (serves the @memo/web React app)
//   - WebSocket endpoint for pushing model updates to browser
// ─────────────────────────────────────────────────────────────────────────────

import { createServer as createHttpServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import type { ServerMessage } from '@memo/core';

export interface DevServerOptions {
    port: number;
    webPackagePath: string;
    initialMessages: ServerMessage[];
}

export interface DevServer {
    broadcast(messages: ServerMessage[]): void;
    close(): void;
}

export async function createDevServer(options: DevServerOptions): Promise<DevServer> {
    const { port, webPackagePath, initialMessages } = options;

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
            server: { middlewareMode: true },
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

    wss.on('connection', (ws: any) => {
        clients.add(ws);

        // Send initial state to new connections
        for (const msg of initialMessages) {
            ws.send(JSON.stringify(msg));
        }

        ws.on('close', () => clients.delete(ws));

        ws.on('message', (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'request:refresh') {
                    // Re-send current state
                    for (const m of initialMessages) {
                        ws.send(JSON.stringify(m));
                    }
                }
            } catch {
                // ignore invalid messages
            }
        });
    });

    // Start listening
    await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
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
