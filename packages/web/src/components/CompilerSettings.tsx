// ─── Compiler settings ───────────────────────────────────────────────────────
//
// Which SysML compiler runs, and where its tools are on this machine, are the
// user's own: they are written to the user's settings file, outside the project,
// so they are never checked in and each person on a project chooses for
// themselves. This is the browser side of `memo config set`; both go through the
// same server code, and the server's registry says which settings are the
// user's.
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
};

export function CompilerSettings() {
    const status = useModelStore(s => s.toolchainSettings);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const [open, setOpen] = useState(false);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
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

    const save = useCallback(async (path: string, value: string | undefined) => {
        setSaving(true);
        setNote(null);
        const requestId = `toolchain-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const result = await new Promise<{ appliesOnRestart?: boolean }>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendToolchainSettingsSave(requestId, path, value);
                setTimeout(() => reject(new Error('The save timed out.')), 20_000);
            });
            setDrafts(d => { const { [path]: _gone, ...rest } = d; return rest; });
            setNote(result.appliesOnRestart ? 'Saved. It applies when Architect is restarted.' : 'Saved.');
        } catch (e: any) {
            setNote(e?.message ?? 'The setting could not be saved.');
        } finally {
            setSaving(false);
        }
    }, [registerLlmRequest]);

    if (!status) return null;
    const compiler = status.settings.find(s => s.path === 'compiler');
    const chosen = compiler?.value;
    const machine = status.settings.filter(s => s.path.includes('.'));

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
                title="Which SysML compiler runs. Your setting, not the project's."
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
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Your compiler</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                        Saved in {status.file}, not in the project, so each person on it chooses their own.
                    </div>
                    <div>
                        <label style={label} htmlFor="memo-compiler">Compiler</label>
                        <select
                            id="memo-compiler"
                            style={field}
                            value={drafts.compiler ?? compiler?.layers.find(l => l.layer === 'user settings')?.value ?? ''}
                            disabled={saving}
                            onChange={e => { void save('compiler', e.target.value || undefined); }}
                        >
                            <option value="">(not chosen)</option>
                            {(compiler?.values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {compiler?.layer && compiler.layer !== 'user settings' && (
                            <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>
                                {LAYER_LABEL[compiler.layer] ?? compiler.layer} decides the compiler for this run: {compiler.value}.
                            </div>
                        )}
                    </div>
                    {machine.map(setting => {
                        const saved = setting.layers.find(l => l.layer === 'user settings')?.value ?? '';
                        const draft = drafts[setting.path] ?? saved;
                        return (
                            <div key={setting.path}>
                                <label style={label} htmlFor={`memo-${setting.path}`}>{setting.path}</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        id={`memo-${setting.path}`}
                                        style={field}
                                        value={draft}
                                        placeholder={setting.description}
                                        onChange={e => setDrafts(d => ({ ...d, [setting.path]: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        disabled={saving || draft === saved}
                                        onClick={() => { void save(setting.path, draft || undefined); }}
                                        style={{ fontSize: 11, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F1F5F9', cursor: 'pointer' }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {note && <div role="status" style={{ fontSize: 11, color: '#334155' }}>{note}</div>}
                </div>
            )}
        </div>
    );
}
