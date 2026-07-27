// ─── LLM Settings ────────────────────────────────────────────────────────────
//
// Provider, model, and API key configuration.
//
// The key is write-only from here: it is posted to the CLI server, which stores
// it in ~/.memo/credentials.json (0600) — outside the project, so it can never
// be committed. The server never sends a key back; the panel only ever learns
// whether one exists and which source it came from.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { LlmSettingsStatus, LlmSettingsOrigin } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { sendLlmSettingsSave } from '../store/ws-client';

const ORIGIN_LABEL: Record<LlmSettingsOrigin, string> = {
    'env': 'an environment variable',
    'env-file': 'the project .env file',
    'project-settings': 'project settings',
    'user-credentials': 'your saved credentials',
    'default': 'the default',
};

const MODEL_PLACEHOLDER: Record<string, string> = {
    anthropic: 'claude-opus-5',
    openai: 'gpt-4o',
};

export function LlmSettings({ onClose }: { onClose: () => void }) {
    const settings = useModelStore(s => s.llmSettings);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);

    const [provider, setProvider] = useState<string>(settings?.provider ?? 'anthropic');
    const [model, setModel] = useState<string>(settings?.model ?? '');
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    const save = useCallback(async () => {
        setSaving(true);
        setNote(null);
        const requestId = `llmset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            await new Promise<LlmSettingsStatus>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmSettingsSave(requestId, {
                    provider,
                    model: model.trim() || undefined,
                    // Only send a key when one was typed — an empty field means
                    // "leave it alone", not "clear it".
                    ...(apiKey ? { apiKey } : {}),
                });
                setTimeout(() => reject(new Error('The save timed out.')), 20_000);
            });
            setApiKey('');
            setNote('Saved.');
        } catch (e: any) {
            setNote(e?.message ?? 'The settings could not be saved.');
        } finally {
            setSaving(false);
        }
    }, [provider, model, apiKey, registerLlmRequest]);

    const clearKey = useCallback(async () => {
        setSaving(true);
        setNote(null);
        const requestId = `llmclear-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            await new Promise<LlmSettingsStatus>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmSettingsSave(requestId, { provider, apiKey: '' });
                setTimeout(() => reject(new Error('The request timed out.')), 20_000);
            });
            setNote('Key removed.');
        } catch (e: any) {
            setNote(e?.message ?? 'The key could not be removed.');
        } finally {
            setSaving(false);
        }
    }, [provider, registerLlmRequest]);

    const labelStyle: React.CSSProperties = {
        fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px',
    };
    const fieldStyle: React.CSSProperties = {
        width: '100%', padding: '6px 10px', border: '1px solid #E5E5E0',
        borderRadius: '6px', fontSize: '12px', outline: 'none',
        background: '#fff', color: '#1B3A4B', fontFamily: 'inherit',
    };

    return (
        <div style={{
            padding: '14px 20px', background: '#fff', borderBottom: '1px solid #E5E5E0',
            display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#1B3A4B' }}>LLM settings</div>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '14px', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: '0 0 130px' }}>
                    <label style={labelStyle}>Provider</label>
                    <select
                        value={provider}
                        onChange={e => setProvider(e.target.value)}
                        style={{ ...fieldStyle, cursor: 'pointer' }}
                    >
                        <option value="anthropic">Anthropic</option>
                        <option value="openai">OpenAI-compatible</option>
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Model</label>
                    <input
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        placeholder={MODEL_PLACEHOLDER[provider] ?? ''}
                        style={fieldStyle}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>API key</label>
                {settings && !settings.keyEditable && settings.configured ? (
                    <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
                        A key is already supplied by {ORIGIN_LABEL[settings.keyOrigin ?? 'default']}, which takes
                        precedence over anything saved here. Remove it there to set a key from this screen.
                    </div>
                ) : (
                    <>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder={settings?.configured ? 'Saved — type a new key to replace it' : 'sk-…'}
                            autoComplete="off"
                            style={fieldStyle}
                        />
                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', lineHeight: 1.5 }}>
                            Stored in <code>~/.memo/credentials.json</code> with owner-only permissions —
                            outside this project, so it is never committed. You can also set{' '}
                            <code>ANTHROPIC_API_KEY</code> in the environment or a project <code>.env</code>.
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        padding: '6px 14px', borderRadius: '6px', border: 'none',
                        background: '#1B3A4B', color: '#fff', fontSize: '11px',
                        fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                        opacity: saving ? 0.5 : 1,
                    }}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                {settings?.configured && settings.keyEditable && (
                    <button
                        onClick={clearKey}
                        disabled={saving}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #E5E5E0',
                            background: 'transparent', color: '#dc2626', fontSize: '11px', cursor: 'pointer',
                        }}
                    >
                        Remove saved key
                    </button>
                )}
                {note && <span style={{ fontSize: '11px', color: '#6B7280' }}>{note}</span>}
            </div>
        </div>
    );
}
