// ─── SysML Generator Panel (#54) ──────────────────────────────────────────
//
// Natural language → SysML v2. User describes what they want to model;
// LLM generates a draft; the server validates it and may repair it before the
// user copies or saves it. Diagnostics remain advisory, never a save gate.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { sendLlmGenerate } from '../store/ws-client';

interface GenerateResult {
    sysml: string;
    initialSysml?: string;
    explanation: string;
    suggestedFile?: string;
    attempts?: number;
    diagnostics: Array<{ domain: 'sysml' | 'memo-ingest' | 'memo-methodology'; severity: string; message: string; code?: string }>;
    changeRecord?: { guidanceVersion: string; compiler: { id: string; version?: string } };
}

const EXAMPLES = [
    'Add a PressureSensor component with a USB interface and a power port.',
    'Create a hazard: AlarmFailure that causes patient harm in ICU setting.',
    'Define a software item InfusionController with a requirement for dose limit checking.',
    'Add a RiskControlMeasure that mitigates OverInfusion by adding a flow rate sensor.',
];

export function SysmlGenerator() {
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const llmProvider = useModelStore(s => s.llmProvider);
    const llmModel = useModelStore(s => s.llmModel);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);

    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generate = useCallback(async (desc: string) => {
        if (!desc.trim() || loading) return;
        setLoading(true);
        setResult(null);
        setError(null);
        setCopied(false);

        const requestId = `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const res = await new Promise<GenerateResult>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmGenerate(requestId, desc.trim());
                setTimeout(() => reject(new Error('Request timed out after 60 seconds.')), 60000);
            });
            setResult(res);
        } catch (e: any) {
            setError(e?.message ?? 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [loading, registerLlmRequest]);

    const handleCopy = () => {
        if (!result?.sysml) return;
        navigator.clipboard.writeText(result.sysml).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const diagnosticsFor = (domain: GenerateResult['diagnostics'][number]['domain']) =>
        result?.diagnostics.filter(diagnostic => diagnostic.domain === domain) ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F7F5', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '14px 20px 10px', borderBottom: '1px solid #E5E5E0',
                background: '#fff', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>⟨/⟩</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B' }}>SysML Generator</div>
                        <div style={{ fontSize: '11px', color: llmAvailable ? '#059669' : '#dc2626', marginTop: '1px' }}>
                            {llmAvailable
                                ? `${llmProvider ?? 'LLM'} · ${llmModel ?? 'unknown model'} · natural language → SysML v2`
                                : 'No LLM provider — set ANTHROPIC_API_KEY or OPENAI_API_KEY'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {/* Input */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                        Describe what to generate
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={!llmAvailable || loading}
                        rows={4}
                        placeholder="Describe the element(s) to generate in plain English…"
                        style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #E5E5E0',
                            borderRadius: '8px', fontSize: '13px', resize: 'vertical',
                            fontFamily: 'inherit', outline: 'none', background: '#fff',
                            color: '#1B3A4B', lineHeight: '1.5', boxSizing: 'border-box',
                            opacity: !llmAvailable ? 0.5 : 1,
                        }}
                        onFocus={e => { e.target.style.borderColor = '#2DD4A8'; }}
                        onBlur={e => { e.target.style.borderColor = '#E5E5E0'; }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                generate(description);
                            }
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Cmd+Enter to generate</span>
                        <button
                            onClick={() => generate(description)}
                            disabled={!llmAvailable || loading || !description.trim()}
                            style={{
                                padding: '6px 16px', borderRadius: '8px', border: 'none',
                                background: '#1B3A4B', color: '#fff', fontSize: '12px',
                                fontWeight: 600, cursor: 'pointer',
                                opacity: (!llmAvailable || !description.trim()) ? 0.4 : 1,
                            }}
                        >
                            {loading ? 'Generating…' : 'Generate SysML'}
                        </button>
                    </div>
                </div>

                {/* Examples */}
                {!result && !loading && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                            Examples
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {EXAMPLES.map(ex => (
                                <button
                                    key={ex}
                                    onClick={() => { setDescription(ex); }}
                                    disabled={!llmAvailable}
                                    style={{
                                        textAlign: 'left', padding: '7px 11px', borderRadius: '6px',
                                        background: '#fff', border: '1px solid #E5E5E0',
                                        fontSize: '12px', color: '#374151', cursor: 'pointer',
                                        opacity: !llmAvailable ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => { if (llmAvailable) e.currentTarget.style.borderColor = '#2DD4A8'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E0'; }}
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{
                        background: '#fff', border: '1px solid #E5E5E0', borderRadius: '10px',
                        padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px',
                    }}>
                        <div style={{ marginBottom: '8px', fontSize: '20px' }}>⟨/⟩</div>
                        Generating SysML v2…
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                        padding: '12px', color: '#dc2626', fontSize: '13px',
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Result */}
                {result && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Explanation */}
                        <div style={{ background: '#F0FDF9', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#065F46', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Explanation
                            </div>
                            <p style={{ fontSize: '13px', color: '#1B3A4B', margin: 0, lineHeight: '1.6' }}>{result.explanation}</p>
                            {result.suggestedFile && (
                                <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B7280' }}>
                                    Suggested file: <code style={{ background: '#D1FAE5', padding: '1px 5px', borderRadius: '3px' }}>{result.suggestedFile}</code>
                                </div>
                            )}
                        </div>

                        {/* Code block */}
                        <div style={{ background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 14px', borderBottom: '1px solid #334155',
                            }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>SysML v2</span>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        padding: '3px 10px', borderRadius: '4px', border: 'none',
                                        background: copied ? '#059669' : '#334155', color: '#fff',
                                        fontSize: '11px', cursor: 'pointer', fontWeight: 500,
                                    }}
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <pre style={{
                                margin: 0, padding: '14px 16px', fontSize: '12px', lineHeight: '1.6',
                                color: '#e2e8f0', overflowX: 'auto',
                                fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                            }}>
                                <code>{result.sysml}</code>
                            </pre>
                        </div>

                        {/* These are deliberately separate: source changes are
                            not validation findings, and MEMO findings are not
                            a standards verdict. */}
                        <details style={{ background: '#fff', border: '1px solid #E5E5E0', borderRadius: '8px', padding: '10px 12px' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Source diff{result.initialSysml === result.sysml ? ' (no repair changes)' : ''}</summary>
                            <pre style={{ margin: '8px 0 0', fontSize: '11px', whiteSpace: 'pre-wrap' }}>{result.initialSysml ?? result.sysml}{result.initialSysml !== result.sysml ? `\n\n→ repaired to →\n\n${result.sysml}` : ''}</pre>
                        </details>
                        <DiagnosticPanel title="Standards diagnostics" diagnostics={diagnosticsFor('sysml')} empty="No standards diagnostics." />
                        <DiagnosticPanel title="MEMO diagnostics" diagnostics={[...diagnosticsFor('memo-ingest'), ...diagnosticsFor('memo-methodology')]} empty="No MEMO diagnostics." />
                        {result.changeRecord && (
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                Change record: guidance {result.changeRecord.guidanceVersion} · compiler {result.changeRecord.compiler.id}{result.changeRecord.compiler.version ? ` ${result.changeRecord.compiler.version}` : ''}
                            </div>
                        )}

                        <div style={{ fontSize: '11px', color: '#9CA3AF', padding: '4px 0' }}>
                            Review the generated SysML before saving. Copy it into your project's <code>.sysml</code> files. The dev server will pick up the changes automatically.
                        </div>

                        <button
                            onClick={() => { setResult(null); setDescription(''); }}
                            style={{
                                padding: '6px 14px', borderRadius: '6px', border: '1px solid #E5E5E0',
                                background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer',
                                alignSelf: 'flex-start',
                            }}
                        >
                            Generate another
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DiagnosticPanel(props: { title: string; diagnostics: GenerateResult['diagnostics']; empty: string }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #E5E5E0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>{props.title}</div>
            {props.diagnostics.length === 0 ? <div style={{ fontSize: '12px', color: '#6B7280' }}>{props.empty}</div> : props.diagnostics.map((diagnostic, index) => (
                <div key={`${diagnostic.code ?? diagnostic.message}-${index}`} style={{ fontSize: '12px', color: diagnostic.severity === 'error' ? '#B91C1C' : '#92400E', marginTop: '4px' }}>
                    {diagnostic.code ? `[${diagnostic.code}] ` : ''}{diagnostic.message}
                </div>
            ))}
        </div>
    );
}
