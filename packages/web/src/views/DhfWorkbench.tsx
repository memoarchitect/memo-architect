// ─── DHF Workbench (center canvas) ───────────────────────────────────────────
//
// Renders the markdown editor for a selected DHF document.
// The left panel (document tree) lives in ExplorerPanel's DhfExplorerContent.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useRef, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { sendLlmDraft } from '../store/ws-client';
import type { MemoModelDTO } from '@memo/core';

type EditMode = 'edit' | 'preview' | 'split';

export function DhfWorkbench() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const dhfDocuments = useModelStore(s => s.dhfDocuments);
    const updateDhfDocumentContent = useModelStore(s => s.updateDhfDocumentContent);
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);

    const [editMode, setEditMode] = useState<EditMode>('split');
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const [draftLoading, setDraftLoading] = useState(false);
    const [draftError, setDraftError] = useState<string | null>(null);

    const draftWithAI = useCallback(async (docId: string, templateId: string) => {
        setDraftLoading(true);
        setDraftError(null);
        const requestId = `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        // Extract the document type ID from the templateId (e.g. "iso-14971/rmp" → "rmp")
        const docTypeId = templateId.split('/').pop() ?? templateId;
        try {
            const result = await new Promise<{ markdown: string; summary: string }>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendLlmDraft(requestId, docTypeId);
                setTimeout(() => reject(new Error('Request timed out after 120 seconds.')), 120000);
            });
            updateDhfDocumentContent(docId, result.markdown);
        } catch (e: any) {
            setDraftError(e?.message ?? 'Unknown error');
        } finally {
            setDraftLoading(false);
        }
    }, [registerLlmRequest, updateDhfDocumentContent]);

    // Resolve active doc from view state
    const docId = activeView.type === 'dhf-document' ? activeView.docId : null;
    const doc = docId ? dhfDocuments.find(d => d.id === docId) : null;

    // ── Empty state ──────────────────────────────────────────────────────────
    if (!doc) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', background: '#F7F7F5', color: '#9CA3AF', gap: '12px',
            }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>
                        No document selected
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '280px', lineHeight: '1.6' }}>
                        Right-click a group in the explorer to create a document, then click it to open.
                    </div>
                </div>
            </div>
        );
    }

    // ── Editor ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                height: '40px', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0 16px', borderBottom: '1px solid #e5e7eb', background: '#fff',
                flexShrink: 0,
            }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', fontFamily: 'monospace' }}>
                        {doc.id}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>
                        {doc.title}
                    </span>
                </div>

                {/* Draft with AI */}
                <button
                    onClick={() => draftWithAI(doc.id, doc.templateId)}
                    disabled={!llmAvailable || draftLoading}
                    title={llmAvailable ? 'Use AI to draft empty sections from model data' : 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI drafting'}
                    style={{
                        padding: '3px 10px', borderRadius: '6px', border: 'none',
                        background: llmAvailable ? '#2DD4A815' : '#f3f4f6',
                        color: llmAvailable ? '#065F46' : '#9CA3AF',
                        fontSize: '11px', fontWeight: 600,
                        cursor: llmAvailable && !draftLoading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        opacity: draftLoading ? 0.6 : 1,
                    }}
                >
                    <span>✦</span>
                    {draftLoading ? 'Drafting…' : 'Draft with AI'}
                </button>

                {/* Edit/Split/Preview toggle */}
                <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
                    {(['edit', 'split', 'preview'] as EditMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setEditMode(mode)}
                            style={{
                                padding: '3px 10px', borderRadius: '4px', border: 'none',
                                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                                background: editMode === mode ? '#fff' : 'transparent',
                                color: editMode === mode ? '#1B3A4B' : '#6B7280',
                                boxShadow: editMode === mode ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Draft error banner */}
            {draftError && (
                <div style={{
                    padding: '6px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca',
                    fontSize: '12px', color: '#dc2626', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexShrink: 0,
                }}>
                    <span>AI draft failed: {draftError}</span>
                    <button onClick={() => setDraftError(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
            )}

            {/* Content panes */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Edit pane */}
                {(editMode === 'edit' || editMode === 'split') && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        borderRight: editMode === 'split' ? '1px solid #e5e7eb' : 'none',
                    }}>
                        <textarea
                            ref={editorRef}
                            value={doc.content}
                            onChange={e => updateDhfDocumentContent(doc.id, e.target.value)}
                            spellCheck={false}
                            style={{
                                flex: 1, padding: '20px', fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                                fontSize: '13px', lineHeight: '1.7', border: 'none', outline: 'none',
                                resize: 'none', background: '#fafafa', color: '#1B3A4B', tabSize: 2,
                            }}
                            placeholder="Start writing your DHF document here..."
                        />
                    </div>
                )}

                {/* Preview pane */}
                {(editMode === 'preview' || editMode === 'split') && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', background: '#fff' }}>
                        <MarkdownPreview content={doc.content} model={model} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Markdown preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ content, model }: { content: string; model: MemoModelDTO | null }) {
    const html = useMemo(() => renderMarkdown(content, model), [content, model]);
    return (
        <div
            className="memo-md-preview"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown preview
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
                fontSize: '14px', lineHeight: '1.7', color: '#1B3A4B',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
        />
    );
}

function renderMarkdown(md: string, model: MemoModelDTO | null): string {
    // Strip YAML frontmatter
    let content = md.replace(/^---[\s\S]*?---\n/, '');

    // {{ref:ID.attr}} directives
    content = content.replace(/\{\{ref:([^.}]+)(?:\.(\w+))?\}\}/g, (_m, id, attr) => {
        if (!model) return `<code>${id}</code>`;
        const el = model.elements[id];
        if (!el) return `<em>[${id} not found]</em>`;
        if (!attr || attr === 'name') return `<strong>${el.name}</strong>`;
        return String((el as Record<string, unknown>)[attr] ?? el.name);
    });

    // Other directives — show as preview placeholders
    content = content.replace(/\{\{project\.([^}]+)\}\}/g, '<em class="directive">{{project.$1}}</em>');
    content = content.replace(/\{\{toc\}\}/g, '<em class="directive">[TOC — generated on export]</em>');
    content = content.replace(/\{\{glossary\}\}/g, '<em class="directive">[Glossary — generated on export]</em>');
    content = content.replace(/\{\{include:[^}]+\}\}/g, '<em class="directive">[Included snippet — rendered on export]</em>');
    content = content.replace(/\{\{[^}]+\}\}/g, m => `<em class="directive">${m}</em>`);

    // memo-query blocks
    content = content.replace(/```memo-query\n([\s\S]*?)```/g, (_m, block) => {
        const lines = block.split('\n').filter(Boolean);
        const kindLine = lines.find((l: string) => l.startsWith('kind:'));
        const displayLine = lines.find((l: string) => l.startsWith('display:'));
        const emptyLine = lines.find((l: string) => l.startsWith('empty:'));
        const kindStr = kindLine ? kindLine.replace('kind:', '').trim() : '?';
        const displayStr = displayLine ? displayLine.replace('display:', '').trim() : 'table';

        if (!model) {
            return `<div class="query-preview">⟳ <em>memo-query: ${kindStr} (${displayStr})</em></div>`;
        }

        const kinds = kindStr.startsWith('[') || kindStr.startsWith('-')
            ? kindStr.replace(/[\[\]]/g, '').split(/[,\n]/).map((s: string) => s.replace('-', '').trim()).filter(Boolean)
            : [kindStr];

        const els = Object.values(model.elements).filter(el => kinds.includes(el.kind));

        if (els.length === 0) {
            const emptyMsg = emptyLine ? emptyLine.replace('empty:', '').trim().replace(/^['"]|['"]$/g, '') : 'No results found.';
            return `<div class="query-preview empty"><em>${emptyMsg}</em></div>`;
        }

        if (displayStr === 'count') {
            return `<div class="query-preview count"><strong>${els.length}</strong> ${kinds.join(', ')}</div>`;
        }

        const cols = ['name', 'kind', 'layer'];
        const header = cols.map(c => `<th>${c}</th>`).join('');
        const rows = els.slice(0, 10).map(el => {
            const cells = cols.map(c => `<td>${(el as Record<string, unknown>)[c] ?? '—'}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const more = els.length > 10 ? `<tr><td colspan="${cols.length}" style="color:#9CA3AF;font-size:11px">...and ${els.length - 10} more</td></tr>` : '';
        return `<div class="query-preview"><table><thead><tr>${header}</tr></thead><tbody>${rows}${more}</tbody></table></div>`;
    });

    // memo-script blocks
    content = content.replace(/```memo-script\n([\s\S]*?)```/g,
        '<div class="query-preview script"><em>memo-script block — executed on export</em></div>');

    // Standard markdown
    let html = content
        .replace(/```[\w-]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
        .replace(/^---$/gm, '<hr>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^\| (.+) \|$/gm, (line) => {
            const cells = line.slice(2, -2).split(' | ');
            return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        })
        .replace(/<tr>(.*?)<\/tr>/gs, (_, inner) => {
            return inner.includes('---') ? '' : `<tr>${inner}</tr>`;
        })
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li style="margin:2px 0">$1</li>')
        .replace(/^\d+\.\s(.+)$/gm, '<li style="margin:2px 0">$1</li>');

    return `<style>
.memo-md-preview h1{font-size:22px;font-weight:700;color:#1B3A4B;border-bottom:2px solid #2DD4A8;padding-bottom:8px;margin:0 0 20px}
.memo-md-preview h2{font-size:17px;font-weight:700;color:#1B3A4B;margin:28px 0 12px}
.memo-md-preview h3{font-size:14px;font-weight:600;color:#374151;margin:20px 0 8px}
.memo-md-preview h4{font-size:13px;font-weight:600;color:#6B7280;margin:12px 0 6px}
.memo-md-preview table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}
.memo-md-preview th,.memo-md-preview td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}
.memo-md-preview th{background:#f3f4f6;font-weight:600}
.memo-md-preview code{background:#f3f4f6;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px}
.memo-md-preview pre{background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;overflow-x:auto}
.memo-md-preview pre code{background:none;color:inherit;padding:0}
.memo-md-preview blockquote{border-left:3px solid #2DD4A8;margin:12px 0;padding:6px 14px;background:#f0fdf9;font-style:italic;color:#374151}
.memo-md-preview hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
.memo-md-preview em.directive{color:#8B5CF6;font-style:normal;font-size:12px;background:#F5F3FF;padding:1px 4px;border-radius:3px}
.query-preview{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:10px 0;font-size:12px}
.query-preview.empty{color:#9CA3AF}
.query-preview.count strong{font-size:18px;color:#2563eb}
</style>
${html}`;
}
