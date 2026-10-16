// ─── Compiler settings ───────────────────────────────────────────────────────
//
// The project names the compiler it uses, in its own (checked-in) settings, and
// this is where that is changed for everyone on the project. A user who wants
// another for themselves sets their own: it is written to their settings file,
// outside the project, so it overrides the project's for them and is never
// committed. Only the choice is asked: MEMO finds the compiler's tools in the usual
// places. This is the browser side of `memo-architect config set`; both go through the same
// server code, and the server's registry says which settings a user is shown.
//
// A change applies when Architect is restarted: the toolchain is resolved once,
// at start. The panel says so rather than leaving the old compiler running
// under a new label.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { sendToolchainSettingsSave } from '../store/ws-client';

const LAYER_LABEL: Record<string, string> = {
    'command line': 'the command line',
    'environment': 'an environment variable',
    'user settings': 'your settings',
    'project': 'the model',
};

export function CompilerSettings() {
    const status = useModelStore(s => s.toolchainSettings);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const [note, setNote] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const save = useCallback(async (path: string, value: string | undefined, scope: 'user' | 'project') => {
        setSaving(true);
        setNote(null);
        const requestId = `toolchain-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const result = await new Promise<{ appliesOnRestart?: boolean }>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendToolchainSettingsSave(requestId, path, value, scope);
                setTimeout(() => reject(new Error('The save timed out.')), 20_000);
            });
            setNote(scope === 'project'
                ? 'Saved in the model\'s settings file. Architect restarts to apply it; commit the file so everyone working on the model uses it.'
                : result.appliesOnRestart ? 'Saved. It applies when Architect is restarted.' : 'Saved.');
        } catch (e: any) {
            setNote(e?.message ?? 'The setting could not be saved.');
        } finally {
            setSaving(false);
        }
    }, [registerLlmRequest]);

    if (!status) return null;
    const compiler = status.settings.find(s => s.path === 'compiler');
    const chosen = compiler?.value;
    const projectValue = compiler?.layers.find(l => l.layer === 'project')?.value;

    const field: React.CSSProperties = {
        width: '100%', padding: '5px 8px', border: '1px solid #CBD5E1', borderRadius: 6,
        fontSize: 14, background: '#fff', color: '#0B1E2D', fontFamily: 'inherit',
    };
    const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 };

    const fields = (
        <>
            {!chosen && <div role="alert" style={{ fontSize: 13, color: '#B91C1C' }}>No compiler is chosen.</div>}
                    <div>
                        <label style={label} htmlFor="memo-compiler-project">This model uses</label>
                        <select
                            id="memo-compiler-project"
                            style={field}
                            value={projectValue ?? ''}
                            disabled={saving}
                            onChange={e => { void save('compiler', e.target.value || undefined, 'project'); }}
                        >
                            <option value="">(none named)</option>
                            {(compiler?.values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                            Written to the model's settings file, so everyone who opens the model uses it. Commit it.
                        </div>
                    </div>
                    <div>
                        <label style={label} htmlFor="memo-compiler">Just for me</label>
                        <select
                            id="memo-compiler"
                            style={field}
                            value={compiler?.layers.find(l => l.layer === 'user settings')?.value ?? ''}
                            disabled={saving}
                            onChange={e => { void save('compiler', e.target.value || undefined, 'user'); }}
                        >
                            <option value="">(the model's)</option>
                            {(compiler?.values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                            Overrides the model's choice for you only. Saved in {status.file}, not in the model.
                        </div>
                        {compiler?.layer && compiler.layer !== 'user settings' && compiler.layer !== 'project' && (
                            <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
                                {LAYER_LABEL[compiler.layer] ?? compiler.layer} decides the compiler for this run: {compiler.value}.
                            </div>
                        )}
                    </div>
                    {note && <div role="status" style={{ fontSize: 12, color: '#334155' }}>{note}</div>}
        </>
    );

    return (
        <div role="group" aria-label="Compiler settings" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 440, color: '#082744' }}>
            {fields}
        </div>
    );
}
