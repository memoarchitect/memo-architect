// ─── Model Chat Panel ────────────────────────────────────────────────────────
//
// Conversational assistant over the model. Multi-turn: the raw transcript
// (including tool calls) is kept here and replayed to the server each turn,
// because the server holds no per-conversation state.
//
// When "Suggest edits" is on, the assistant can stage model changes. Those are
// proposals only — nothing is written until the engineer ticks a change and
// presses Apply. The SysML source is the regulated record, so the approval step
// is deliberate and cannot be skipped from here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ProposedChange } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { sendLlmChat, sendLlmApply } from '../store/ws-client';
import { LlmSettings } from './LlmSettings';

/** One rendered bubble. Distinct from the wire transcript, which also has tool traffic. */
interface Bubble {
    role: 'user' | 'assistant';
    content: string;
    error?: boolean;
    /** Proposals staged by this turn, keyed for approval. */
    changes?: ProposedChange[];
}

const STARTER_QUESTIONS = [
    'What hazards have no risk controls?',
    'Show trace from requirements to verification.',
    'Which layers have the most gaps?',
    'How many unmitigated hazards are there?',
    'List all SOUP components.',
];

const REQUEST_TIMEOUT_MS = 120_000;

export function ChatPanel() {
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const llmProvider = useModelStore(s => s.llmProvider);
    const llmModel = useModelStore(s => s.llmModel);
    const model = useModelStore(s => s.model);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);

    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    /** The wire transcript — tool calls and all. Sent back verbatim each turn. */
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [allowEdits, setAllowEdits] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [applying, setApplying] = useState(false);
    const [approved, setApproved] = useState<Set<string>>(new Set());
    const [applyNote, setApplyNote] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [bubbles, loading]);

    /** Await a server reply keyed by request id, with a timeout so the UI can't wedge. */
    const request = useCallback(<T,>(requestId: string, send: () => void): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            registerLlmRequest(requestId, resolve, reject);
            send();
            setTimeout(() => reject(new Error('The request timed out after 2 minutes.')), REQUEST_TIMEOUT_MS);
        });
    }, [registerLlmRequest]);

    const sendQuestion = useCallback(async (question: string) => {
        if (!question.trim() || loading) return;
        const q = question.trim();
        setInput('');
        setBubbles(prev => [...prev, { role: 'user', content: q }]);
        setLoading(true);
        setApplyNote(null);

        const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        try {
            const result = await request<{
                answer: string;
                proposedChanges: ProposedChange[];
                messages: ChatMessage[];
                truncated?: boolean;
            }>(requestId, () => sendLlmChat(requestId, q, history, allowEdits));

            setHistory(result.messages);
            setBubbles(prev => [...prev, {
                role: 'assistant',
                content: result.truncated
                    ? `${result.answer}\n\n_(Stopped at the tool-call limit for one turn — ask again to continue.)_`
                    : result.answer,
                changes: result.proposedChanges.length ? result.proposedChanges : undefined,
            }]);
            // Proposals start approved: the engineer opts out of ones they reject,
            // which matches how they read a diff.
            if (result.proposedChanges.length) {
                setApproved(prev => {
                    const next = new Set(prev);
                    for (const c of result.proposedChanges) next.add(c.id);
                    return next;
                });
            }
        } catch (e: any) {
            setBubbles(prev => [...prev, { role: 'assistant', content: e?.message ?? 'Unknown error', error: true }]);
        } finally {
            setLoading(false);
        }
    }, [loading, history, allowEdits, request]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion(input);
        }
    };

    const toggleApproval = (id: string) => {
        setApproved(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const applyChanges = useCallback(async (changes: ProposedChange[]) => {
        const selected = changes.filter(c => approved.has(c.id));
        if (selected.length === 0 || applying) return;
        setApplying(true);
        setApplyNote(null);

        const requestId = `apply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const result = await request<{ applied: string[]; failed: Array<{ id: string; error: string }> }>(
                requestId, () => sendLlmApply(requestId, selected),
            );
            // Applied changes are gone from the proposal list; the model reloads
            // from the file watcher, so the panel does not touch model state.
            const appliedIds = new Set(result.applied);
            setBubbles(prev => prev.map(b => b.changes
                ? { ...b, changes: b.changes.filter(c => !appliedIds.has(c.id)) }
                : b));
            setApplyNote(result.failed.length
                ? `Applied ${result.applied.length}. Failed: ${result.failed.map(f => f.error).join('; ')}`
                : `Applied ${result.applied.length} change${result.applied.length === 1 ? '' : 's'} to the model source.`);
        } catch (e: any) {
            setApplyNote(e?.message ?? 'The changes could not be applied.');
        } finally {
            setApplying(false);
        }
    }, [approved, applying, request]);

    const discardChanges = (changes: ProposedChange[]) => {
        const ids = new Set(changes.map(c => c.id));
        setBubbles(prev => prev.map(b => b.changes
            ? { ...b, changes: b.changes.filter(c => !ids.has(c.id)) }
            : b));
    };

    const clearConversation = () => {
        setBubbles([]);
        setHistory([]);
        setApproved(new Set());
        setApplyNote(null);
    };

    if (!model) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                Waiting for model data…
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F7F5', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #E5E5E0', background: '#fff', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>✦</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B' }}>Model Assistant</div>
                        <div style={{ fontSize: '11px', color: llmAvailable ? '#059669' : '#dc2626', marginTop: '1px' }}>
                            {llmAvailable
                                ? `${llmProvider ?? 'LLM'} · ${llmModel ?? 'unknown model'}`
                                : 'No API key configured'}
                        </div>
                    </div>
                    <button
                        onClick={() => setSettingsOpen(o => !o)}
                        title="LLM settings"
                        style={{
                            background: settingsOpen ? '#F3F4F6' : 'none', border: '1px solid #E5E5E0',
                            borderRadius: '6px', padding: '4px 8px', fontSize: '12px',
                            color: '#374151', cursor: 'pointer',
                        }}
                    >
                        ⚙ Settings
                    </button>
                </div>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                    fontSize: '11px', color: '#6B7280', cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={allowEdits}
                        onChange={e => setAllowEdits(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    Suggest edits — the assistant may propose model changes for your approval
                </label>
            </div>

            {settingsOpen && <LlmSettings onClose={() => setSettingsOpen(false)} />}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bubbles.length === 0 && (
                    <div style={{ paddingTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
                            Ask about your model in plain English. The assistant can look up any element,
                            follow traceability chains, and read validation gaps.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {STARTER_QUESTIONS.map(q => (
                                <button
                                    key={q}
                                    onClick={() => sendQuestion(q)}
                                    disabled={!llmAvailable || loading}
                                    style={{
                                        textAlign: 'left', padding: '8px 12px', borderRadius: '8px',
                                        background: '#fff', border: '1px solid #E5E5E0',
                                        fontSize: '12px', color: '#374151', cursor: 'pointer',
                                        transition: 'border-color 0.1s',
                                        opacity: !llmAvailable ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => { if (llmAvailable) e.currentTarget.style.borderColor = '#2DD4A8'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E0'; }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {bubbles.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            gap: '8px', alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: msg.role === 'user' ? '#1B3A4B' : '#2DD4A815',
                                fontSize: '10px', fontWeight: 700,
                                color: msg.role === 'user' ? '#fff' : '#2DD4A8',
                                marginTop: '2px',
                            }}>
                                {msg.role === 'user' ? 'U' : '✦'}
                            </div>
                            <div style={{
                                maxWidth: '85%', padding: '10px 12px', borderRadius: '10px',
                                background: msg.role === 'user' ? '#1B3A4B' : msg.error ? '#fef2f2' : '#fff',
                                color: msg.role === 'user' ? '#fff' : msg.error ? '#dc2626' : '#1B3A4B',
                                fontSize: '13px', lineHeight: '1.6',
                                border: msg.role === 'assistant' ? `1px solid ${msg.error ? '#fecaca' : '#E5E5E0'}` : 'none',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {msg.content}
                            </div>
                        </div>

                        {msg.changes && msg.changes.length > 0 && (
                            <ProposedChanges
                                changes={msg.changes}
                                approved={approved}
                                onToggle={toggleApproval}
                                onApply={() => applyChanges(msg.changes!)}
                                onDiscard={() => discardChanges(msg.changes!)}
                                applying={applying}
                            />
                        )}
                    </div>
                ))}

                {applyNote && (
                    <div style={{
                        fontSize: '11px', color: '#374151', background: '#fff',
                        border: '1px solid #E5E5E0', borderRadius: '8px', padding: '8px 12px',
                    }}>
                        {applyNote}
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: '#2DD4A815', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '10px', color: '#2DD4A8', fontWeight: 700,
                        }}>✦</div>
                        <div style={{
                            padding: '10px 14px', borderRadius: '10px', background: '#fff',
                            border: '1px solid #E5E5E0', display: 'flex', gap: '4px', alignItems: 'center',
                        }}>
                            <LoadingDots />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E5E0', background: '#fff', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!llmAvailable || loading}
                        placeholder={llmAvailable ? 'Ask a question… (Enter to send, Shift+Enter for newline)' : 'Add an API key in Settings to start'}
                        rows={2}
                        style={{
                            flex: 1, padding: '8px 12px', border: '1px solid #E5E5E0',
                            borderRadius: '8px', fontSize: '13px', resize: 'none',
                            fontFamily: 'inherit', outline: 'none', background: '#F7F7F5',
                            color: '#1B3A4B', lineHeight: '1.5',
                            opacity: !llmAvailable ? 0.5 : 1,
                        }}
                        onFocus={e => { e.target.style.borderColor = '#2DD4A8'; }}
                        onBlur={e => { e.target.style.borderColor = '#E5E5E0'; }}
                    />
                    <button
                        onClick={() => sendQuestion(input)}
                        disabled={!llmAvailable || loading || !input.trim()}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none',
                            background: '#1B3A4B', color: '#fff', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            opacity: (!llmAvailable || !input.trim()) ? 0.4 : 1,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        Send
                    </button>
                </div>
                {bubbles.length > 0 && (
                    <button
                        onClick={clearConversation}
                        style={{
                            marginTop: '6px', background: 'none', border: 'none',
                            color: '#9CA3AF', fontSize: '11px', cursor: 'pointer', padding: 0,
                        }}
                    >
                        Clear conversation
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Proposed change review ──────────────────────────────────────────────────

function ProposedChanges({ changes, approved, onToggle, onApply, onDiscard, applying }: {
    changes: ProposedChange[];
    approved: Set<string>;
    onToggle: (id: string) => void;
    onApply: () => void;
    onDiscard: () => void;
    applying: boolean;
}) {
    const selectedCount = changes.filter(c => approved.has(c.id)).length;

    return (
        <div style={{
            marginLeft: '32px', border: '1px solid #FCD34D', borderRadius: '10px',
            background: '#FFFBEB', overflow: 'hidden',
        }}>
            <div style={{
                padding: '8px 12px', borderBottom: '1px solid #FDE68A',
                fontSize: '11px', fontWeight: 700, color: '#92400E',
            }}>
                {changes.length} proposed change{changes.length === 1 ? '' : 's'} — nothing is written until you apply
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {changes.map(change => (
                    <label
                        key={change.id}
                        style={{
                            display: 'flex', gap: '8px', alignItems: 'flex-start',
                            padding: '8px 12px', borderBottom: '1px solid #FDE68A',
                            cursor: 'pointer', fontSize: '12px',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={approved.has(change.id)}
                            onChange={() => onToggle(change.id)}
                            style={{ marginTop: '2px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1B3A4B' }}>{changeTitle(change)}</div>
                            <div style={{ color: '#92400E', marginTop: '2px' }}>{change.summary}</div>
                            <ChangeDetail change={change} />
                        </div>
                    </label>
                ))}
            </div>

            <div style={{ padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    onClick={onApply}
                    disabled={selectedCount === 0 || applying}
                    style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none',
                        background: '#92400E', color: '#fff', fontSize: '11px', fontWeight: 600,
                        cursor: selectedCount === 0 || applying ? 'default' : 'pointer',
                        opacity: selectedCount === 0 || applying ? 0.4 : 1,
                    }}
                >
                    {applying ? 'Applying…' : `Apply ${selectedCount} selected`}
                </button>
                <button
                    onClick={onDiscard}
                    disabled={applying}
                    style={{
                        padding: '6px 12px', borderRadius: '6px',
                        border: '1px solid #FDE68A', background: 'transparent',
                        color: '#92400E', fontSize: '11px', cursor: 'pointer',
                    }}
                >
                    Discard all
                </button>
            </div>
        </div>
    );
}

function changeTitle(change: ProposedChange): string {
    switch (change.kind) {
        case 'create-element':
            return `Create ${change.elementKind} · ${change.elementId}`;
        case 'update-element':
            return `Update · ${change.elementId}`;
        case 'create-relationship':
            return `Relate · ${change.sourceId} → ${change.targetId}`;
        case 'delete-relationship':
            return `Remove relationship · ${change.relationshipId}`;
    }
}

/** The specifics a reviewer needs to judge the change without leaving the panel. */
function ChangeDetail({ change }: { change: ProposedChange }) {
    const rowStyle: React.CSSProperties = {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px', color: '#374151', marginTop: '4px',
    };

    if (change.kind === 'create-element') {
        const attrs = Object.entries(change.attributes ?? {});
        return (
            <div style={rowStyle}>
                <div>name = {change.name}</div>
                {change.layer && <div>layer = {change.layer}</div>}
                {attrs.map(([k, v]) => <div key={k}>{k} = {v}</div>)}
            </div>
        );
    }

    if (change.kind === 'update-element') {
        const keys = new Set([
            ...Object.keys(change.changes.attributes ?? {}),
            ...(change.changes.name !== undefined ? ['name'] : []),
            ...(change.changes.doc !== undefined ? ['doc'] : []),
        ]);
        return (
            <div style={rowStyle}>
                {[...keys].map(key => {
                    const before = key === 'name' ? change.before.name
                        : key === 'doc' ? change.before.doc
                        : change.before.attributes?.[key];
                    const after = key === 'name' ? change.changes.name
                        : key === 'doc' ? change.changes.doc
                        : change.changes.attributes?.[key];
                    return (
                        <div key={key}>
                            {key}: <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{before || '∅'}</span>
                            {' → '}
                            <span style={{ color: '#059669' }}>{after}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (change.kind === 'create-relationship') {
        return <div style={rowStyle}>{change.sourceId} —{change.relationshipType}→ {change.targetId}</div>;
    }

    return <div style={rowStyle}>{change.sourceId} —{change.relationshipType}→ {change.targetId}</div>;
}

function LoadingDots() {
    return (
        <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    style={{
                        width: '5px', height: '5px', borderRadius: '50%', background: '#9CA3AF',
                        animation: 'llm-pulse 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                    }}
                />
            ))}
            <style>{`@keyframes llm-pulse{0%,80%,100%{opacity:0.3}40%{opacity:1}}`}</style>
        </span>
    );
}
