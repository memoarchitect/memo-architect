// The Analysis view's connection to JupyterLab.
//
// With `memo-architect dev` the server splices `window.__MEMO_JUPYTER__` into
// the page: a control endpoint that starts Jupyter on request and stops it when
// Architect exits. A static viewer has no such endpoint, so it falls back to a
// Jupyter the person started themselves.

export interface JupyterConnection { url: string; token: string }

export class JupyterUnavailableError extends Error {
    constructor(message: string, readonly kind: 'not-installed' | 'failed' | 'unreachable') {
        super(message);
    }
}

interface JupyterControlInfo { url: string; token: string }

declare global {
    interface Window { __MEMO_JUPYTER__?: JupyterControlInfo }
}

export const MANUAL_JUPYTER_URL = 'http://127.0.0.1:8888';

/** Whether Architect can start Jupyter itself in this page. */
export function jupyterIsManaged(): boolean {
    return typeof window !== 'undefined' && window.__MEMO_JUPYTER__ !== undefined;
}

let inFlight: Promise<JupyterConnection> | undefined;

/** Start Jupyter if needed and return where it is. Concurrent callers share one request. */
export function ensureJupyter(): Promise<JupyterConnection> {
    if (!jupyterIsManaged()) return Promise.resolve({ url: MANUAL_JUPYTER_URL, token: '' });
    inFlight ??= request(window.__MEMO_JUPYTER__!).finally(() => { inFlight = undefined; });
    return inFlight;
}

async function request(control: JupyterControlInfo): Promise<JupyterConnection> {
    let status: { state: string; url?: string; token?: string; message?: string };
    try {
        const response = await fetch(`${control.url}/jupyter/start`, {
            method: 'POST', headers: { 'x-memo-token': control.token },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        status = await response.json();
    } catch {
        throw new JupyterUnavailableError('Architect could not be reached to start JupyterLab. Restart Architect and reload this page.', 'unreachable');
    }
    if (status.state === 'ready' && status.url) return { url: status.url, token: status.token ?? '' };
    throw new JupyterUnavailableError(
        status.message ?? 'JupyterLab could not be started.',
        status.state === 'not-installed' ? 'not-installed' : 'failed',
    );
}

export function jupyterHeaders(connection: JupyterConnection): Record<string, string> {
    return connection.token ? { Authorization: `token ${connection.token}` } : {};
}

/** A link to a notebook in JupyterLab, carrying the token so the tab signs in. */
export function jupyterNotebookLink(connection: JupyterConnection, fileName: string): string {
    const query = connection.token ? `?token=${encodeURIComponent(connection.token)}` : '';
    return `${connection.url}/lab/tree/${encodeURIComponent(fileName)}${query}`;
}

// ─── Managing JupyterLab from Settings ───────────────────────────────────────

/** What Settings shows about JupyterLab: its state, and which executable a start runs and why. */
export interface JupyterReport {
    state: 'stopped' | 'ready' | 'not-installed' | 'failed';
    url?: string;
    token?: string;
    /** False for a server Architect found running and did not start, which it never stops. */
    owned?: boolean;
    message?: string;
    /** The folder it serves. */
    root?: string;
    bin?: string;
    source?: 'environment' | 'setting' | 'path' | 'detected';
    /** The executable chosen in Settings, if one is. */
    setting?: string;
}

async function control(path: string, method: 'GET' | 'POST', body?: unknown): Promise<JupyterReport> {
    const info = window.__MEMO_JUPYTER__;
    if (!info) throw new JupyterUnavailableError('This page was not opened by memo-architect dev, so it cannot manage JupyterLab.', 'unreachable');
    let response: Response;
    try {
        response = await fetch(`${info.url}${path}`, {
            method,
            headers: { 'x-memo-token': info.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    } catch {
        throw new JupyterUnavailableError('Architect could not be reached. Restart Architect and reload this page.', 'unreachable');
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new JupyterUnavailableError(result.error ?? `HTTP ${response.status}`, 'failed');
    return result as JupyterReport;
}

export const jupyterStatus = () => control('/jupyter/status', 'GET');
export const jupyterAction = (action: 'start' | 'stop' | 'restart') => control(`/jupyter/${action}`, 'POST');
/** Choose the `jupyter` executable for this machine; none goes back to finding it. */
export const saveJupyterBin = (bin: string | undefined) => control('/jupyter/settings', 'POST', { bin });
