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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { sendToolchainSettingsSave } from '../store/ws-client';

const LAYER_LABEL: Record<string, string> = {
    'command line': 'the command line',
    'environment': 'an environment variable',
    'user settings': 'your settings',
    'project': 'the project',
};

export function CompilerSettings() {
    const status = useModelStore(s => s.toolchainSettings);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const away = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
    }, [open]);

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
                ? 'Saved in the project\'s settings file. Architect restarts to apply it; commit the file so everyone on the project uses it.'
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
        fontSize: 12, background: '#fff', color: '#0B1E2D', fontFamily: 'inherit',
    };
    const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                title="Which SysML compiler runs. The project names one; your own setting overrides it for you."
                style={{
                    background: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    color: chosen ? 'rgba(255,255,255,0.8)' : '#FCA5A5',
                    border: `1px solid ${chosen ? 'rgba(255,255,255,0.18)' : '#EF4444'}`,
                }}
            >
                Compiler: {chosen ?? 'not chosen'}
            </button>
            {open && (
                <div
                    role="dialog"
                    aria-label="Compiler settings"
                    style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 340, zIndex: 50,
                        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 10,
                        color: '#0B1E2D',
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Compiler</div>
                    <div>
                        <label style={label} htmlFor="memo-compiler-project">This project uses</label>
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
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                            Written to the project's settings file, so everyone who opens the project uses it. Commit it.
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
                            <option value="">(the project's)</option>
                            {(compiler?.values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                            Overrides the project's choice for you only. Saved in {status.file}, not in the project.
                        </div>
                        {compiler?.layer && compiler.layer !== 'user settings' && compiler.layer !== 'project' && (
                            <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>
                                {LAYER_LABEL[compiler.layer] ?? compiler.layer} decides the compiler for this run: {compiler.value}.
                            </div>
                        )}
                    </div>
                    {note && <div role="status" style={{ fontSize: 11, color: '#334155' }}>{note}</div>}
                </div>
            )}
        </div>
    );
}
