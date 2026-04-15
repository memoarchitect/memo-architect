// ─── Model Q&A Panel (#52) ─────────────────────────────────────────────────
//
// Chat interface for asking natural language questions about the model.
// LLM calls are proxied through the CLI dev server (which holds the API key).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { sendLlmAsk } from '../store/ws-client';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    error?: boolean;
}

const STARTER_QUESTIONS = [
    'What hazards have no risk controls?',
    'Show trace from requirements to verification.',
    'Which layers have the most gaps?',
    'How many unmitigated hazards are there?',
    'List all SOUP components.',
];

export function AskPanel() {
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const llmProvider = useModelStore(s => s.llmProvider);
    const llmModel = useModelStore(s => s.llmModel);
    const model = useModelStore(s => s.model);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendQuestion = useCallback(async (question: string) => {
        if (!question.trim() || loading) return;
        const q = question.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setLoading(true);

        const requestId = `ask-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        try {
            const answer = await new Promise<string>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmAsk(requestId, q);
                // Timeout after 60s
                setTimeout(() => reject(new Error('Request timed out after 60 seconds.')), 60000);
            });
            setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: e?.message ?? 'Unknown error', error: true }]);
        } finally {
            setLoading(false);
        }
    }, [loading, registerLlmRequest]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion(input);
        }
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
            <div style={{
                padding: '14px 20px 10px', borderBottom: '1px solid #E5E5E0',
                background: '#fff', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>✦</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B' }}>Model Q&A</div>
                        <div style={{ fontSize: '11px', color: llmAvailable ? '#059669' : '#dc2626', marginTop: '1px' }}>
                            {llmAvailable
                                ? `${llmProvider ?? 'LLM'} · ${llmModel ?? 'unknown model'}`
                                : 'No LLM provider — set ANTHROPIC_API_KEY or OPENAI_API_KEY'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 && (
                    <div style={{ paddingTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
                            Ask questions about your model in plain English.
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

                {messages.map((msg, i) => (
                    <div key={i} style={{
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
                ))}

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
            <div style={{
                padding: '12px 16px', borderTop: '1px solid #E5E5E0',
                background: '#fff', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!llmAvailable || loading}
                        placeholder={llmAvailable ? 'Ask a question… (Enter to send, Shift+Enter for newline)' : 'LLM not configured'}
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
                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
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
