// ─── The page's way to ask for Jupyter ───────────────────────────────────────
//
// MEMO Tools hosts the project server and has no route for starting a process,
// so the supervisor — which already owns the session's life — runs this small
// endpoint beside it. It binds 127.0.0.1 on a free port and answers only the
// Architect page: the origin must match and the per-session token must be sent.
// The page learns both from `window.__MEMO_JUPYTER__`, spliced into the HTML
// next to the feature grants.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { JupyterManager } from './jupyter.js';

/** The environment variable that carries the control endpoint from the supervisor to the runtime child. */
export const JUPYTER_CONTROL_ENV = 'MEMO_ARCHITECT_JUPYTER_CONTROL';

export interface JupyterControlInfo { url: string; token: string }

export interface JupyterControl extends JupyterControlInfo {
    close(): Promise<void>;
}

export async function startJupyterControl(manager: JupyterManager, appOrigins: string[]): Promise<JupyterControl> {
    const token = randomBytes(24).toString('hex');
    const server: Server = createServer((request, response) => {
        const origin = request.headers.origin;
        const allowed = typeof origin === 'string' && appOrigins.includes(origin);
        if (allowed) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Access-Control-Allow-Headers', 'x-memo-token');
            response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
            response.setHeader('Vary', 'Origin');
        }
        const send = (code: number, body?: unknown) => {
            response.writeHead(code, { 'Content-Type': 'application/json' });
            response.end(body === undefined ? undefined : JSON.stringify(body));
        };
        if (!allowed || request.headers['x-memo-token'] !== token) {
            // A preflight carries no token; answer it only for the page's own origin.
            if (allowed && request.method === 'OPTIONS') return send(204);
            return send(403, { error: 'forbidden' });
        }
        if (request.method === 'POST' && request.url === '/jupyter/start') {
            void manager.start().then(status => send(200, status));
        } else if (request.method === 'GET' && request.url === '/jupyter/status') {
            send(200, manager.status() ?? { state: 'stopped' });
        } else {
            send(404, { error: 'not found' });
        }
    });
    await new Promise<void>((resolveListen, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolveListen);
    });
    const { port } = server.address() as { port: number };
    return {
        url: `http://127.0.0.1:${port}`,
        token,
        close: () => new Promise<void>(resolveClose => { server.closeAllConnections(); server.close(() => resolveClose()); }),
    };
}

/** Splice the control endpoint into the client HTML. Idempotent, like `injectFeatureGrants`. */
export function injectJupyterControl(html: string, info: JupyterControlInfo): string {
    if (html.includes('__MEMO_JUPYTER__')) return html;
    const tag = `<script>window.__MEMO_JUPYTER__=${JSON.stringify(info)};</script>`;
    return html.includes('</head>') ? html.replace('</head>', () => `${tag}\n</head>`) : tag + html;
}
