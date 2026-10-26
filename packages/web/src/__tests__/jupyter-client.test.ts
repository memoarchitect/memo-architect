import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureJupyter, JupyterUnavailableError, jupyterNotebookLink, MANUAL_JUPYTER_URL } from '../analysis/jupyter-client';

const control = { url: 'http://127.0.0.1:9', token: 'ctl' };
const respond = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 403, json: async () => body });

afterEach(() => { vi.unstubAllGlobals(); });

describe('ensureJupyter', () => {
    it('falls back to a Jupyter the person started when the page has no control endpoint', async () => {
        vi.stubGlobal('window', {});
        expect(await ensureJupyter()).toEqual({ url: MANUAL_JUPYTER_URL, token: '' });
    });

    it('asks Architect to start Jupyter and returns where it is', async () => {
        const fetchMock = respond({ state: 'ready', url: 'http://127.0.0.1:5555', token: 'abc' });
        vi.stubGlobal('window', { __MEMO_JUPYTER__: control });
        vi.stubGlobal('fetch', fetchMock);
        expect(await ensureJupyter()).toEqual({ url: 'http://127.0.0.1:5555', token: 'abc' });
        expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:9/jupyter/start', { method: 'POST', headers: { 'x-memo-token': 'ctl' } });
    });

    it('surfaces a missing Jupyter with its install message', async () => {
        vi.stubGlobal('window', { __MEMO_JUPYTER__: control });
        vi.stubGlobal('fetch', respond({ state: 'not-installed', message: 'Install it with pip.' }));
        await expect(ensureJupyter()).rejects.toMatchObject({ kind: 'not-installed', message: 'Install it with pip.' });
        await expect(ensureJupyter()).rejects.toBeInstanceOf(JupyterUnavailableError);
    });
});

describe('jupyterNotebookLink', () => {
    it('carries the token so the new tab signs in', () => {
        expect(jupyterNotebookLink({ url: 'http://127.0.0.1:5', token: 'a b' }, 'My nb.ipynb'))
            .toBe('http://127.0.0.1:5/lab/tree/My%20nb.ipynb?token=a%20b');
        expect(jupyterNotebookLink({ url: MANUAL_JUPYTER_URL, token: '' }, 'x.ipynb')).toBe(`${MANUAL_JUPYTER_URL}/lab/tree/x.ipynb`);
    });
});
