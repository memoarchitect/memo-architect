// ─── DHF Workbench (center canvas) ───────────────────────────────────────────
//
// Renders the markdown editor for a selected DHF document.
// The left panel (document tree) lives in ExplorerPanel's DhfExplorerContent.
//
// Toolbar features:
//   - Edit / Split / Preview toggle
//   - Draft with AI button
//   - Settings gear (opens DhfSettingsPanel)
//   - Snippets toggle (shows reusable scriptlet library)
//
// Document Properties bar (collapsible, below toolbar):
//   - Per-document authors and approvers (Name | Role, one per line)
//   - Rendered inline in the approval-block section of the preview
//
// Preview rules:
//   - {{project.*}} with a value → rendered as plain text inline
//   - {{project.*}} missing → red error badge "⚠ not set"
//   - {{include:shared/snippets/approval-block.md}} → rendered from per-doc authors/approvers
//   - All other {{include:...}}, {{toc}}, {{glossary}} → grey placeholder
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useModelStore } from '../store/model-store';
import { sendLlmDraft } from '../store/ws-client';
import type { MemoModelDTO } from '@memo/core';
import type { DhfSettings, DhfDoc } from '../store/model-store';

const DhfSettingsPanel = lazy(() =>
    import('./DhfSettingsPanel').then(m => ({ default: m.DhfSettingsPanel }))
);

type EditMode = 'edit' | 'preview' | 'split';

// ─── Built-in snippets ────────────────────────────────────────────────────────

interface Snippet {
    id: string;
    label: string;
    description: string;
    category: 'query' | 'script' | 'include' | 'directive';
    code: string;
}

const BUILT_IN_SNIPPETS: Snippet[] = [
    { id: 'q-hazards', label: 'Hazard Table', description: 'All hazards in the risk layer', category: 'query',
        code: '```memo-query\nkind: Hazard\ndisplay: table\ncolumns: name, layer, doc\nsort: name\nempty: "No hazards defined."\n```' },
    { id: 'q-hazardous-situations', label: 'Hazardous Situations', description: 'All hazardous situations', category: 'query',
        code: '```memo-query\nkind: HazardousSituation\ndisplay: table\ncolumns: name, layer, doc\nsort: name\n```' },
    { id: 'q-risk-controls', label: 'Risk Controls', description: 'All risk control measures', category: 'query',
        code: '```memo-query\nkind: RiskControl\ndisplay: table\ncolumns: name, layer, doc\nsort: name\n```' },
    { id: 'q-requirements', label: 'Requirements', description: 'All system requirements', category: 'query',
        code: '```memo-query\nkind: SystemRequirement\ndisplay: table\ncolumns: name, layer, doc\nsort: name\n```' },
    { id: 'q-soup', label: 'SOUP List', description: 'All SOUP components', category: 'query',
        code: '```memo-query\nkind: SOUPComponent\ndisplay: table\ncolumns: name, layer, doc\n```' },
    { id: 'q-sw-items', label: 'Software Items', description: 'All software items', category: 'query',
        code: '```memo-query\nkind: SoftwareItem\ndisplay: table\ncolumns: name, layer, doc\n```' },
    { id: 'q-test-cases', label: 'Test Cases', description: 'All test cases', category: 'query',
        code: '```memo-query\nkind: TestCase\ndisplay: table\ncolumns: name, layer, doc\n```' },
    { id: 'q-hazard-count', label: 'Hazard Count (metric)', description: 'Metric badge with hazard count', category: 'query',
        code: '```memo-query\nkind: Hazard\ndisplay: count\nlabel: Total hazards\n```' },
    { id: 's-unmitigated', label: 'Unmitigated Hazards', description: 'Hazards without risk controls', category: 'script',
        code: "```memo-script\nconst hazards = query({ kind: 'Hazard' });\nconst unmitigated = hazards.filter(h => h.mitigatedBy?.length === 0);\nif (unmitigated.length === 0) return 'All hazards have associated risk controls.';\nreturn table(unmitigated, ['name', 'layer', 'doc']);\n```" },
    { id: 's-coverage', label: 'Requirements Coverage', description: 'Requirements with/without test cases', category: 'script',
        code: "```memo-script\nconst reqs = query({ kind: 'SystemRequirement' });\nconst covered = reqs.filter(r => r.verifiedBy?.length > 0);\nreturn count(covered, `covered of ${reqs.length} requirements`);\n```" },
    { id: 'i-doc-header', label: 'Document Control Header', description: 'Standard doc control table', category: 'include',
        code: '{{include:shared/snippets/document-control-header.md}}' },
    { id: 'i-approval', label: 'Approval Block', description: 'Reviewer/approver signature table', category: 'include',
        code: '{{include:shared/snippets/approval-block.md}}' },
    { id: 'i-revision', label: 'Revision History', description: 'Revision history table', category: 'include',
        code: '{{include:shared/snippets/revision-history-table.md}}' },
    { id: 'i-references', label: 'References Section', description: 'Normative references block', category: 'include',
        code: '{{include:shared/snippets/references-section.md}}' },
    { id: 'd-toc', label: 'Table of Contents', description: 'Auto-generated TOC (on export)', category: 'directive', code: '{{toc}}' },
    { id: 'd-glossary', label: 'Glossary', description: 'Auto-generated glossary (on export)', category: 'directive', code: '{{glossary}}' },
];

const SNIPPET_CATEGORY_COLORS: Record<Snippet['category'], string> = {
    query: '#2563eb', script: '#7c3aed', include: '#0891b2', directive: '#6B7280',
};
const SNIPPET_CATEGORY_LABELS: Record<Snippet['category'], string> = {
    query: 'Query', script: 'Script', include: 'Snippet', directive: 'Directive',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DhfWorkbench() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const dhfDocuments = useModelStore(s => s.dhfDocuments);
    const updateDhfDocumentContent = useModelStore(s => s.updateDhfDocumentContent);
    const updateDhfDocumentMeta = useModelStore(s => s.updateDhfDocumentMeta);
    const llmAvailable = useModelStore(s => s.llmAvailable);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const dhfSettings = useModelStore(s => s.dhfSettings);

    const [editMode, setEditMode] = useState<EditMode>('split');
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const [draftLoading, setDraftLoading] = useState(false);
    const [draftError, setDraftError] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [snippetsOpen, setSnippetsOpen] = useState(false);
    const [propsOpen, setPropsOpen] = useState(false);
    const [snippetFilter, setSnippetFilter] = useState<Snippet['category'] | 'all'>('all');

    const draftWithAI = useCallback(async (docId: string, templateId: string) => {
        setDraftLoading(true);
        setDraftError(null);
        const requestId = `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

    const insertSnippet = useCallback((snippet: Snippet) => {
        if (!editorRef.current) return;
        const el = editorRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const insertion = `\n\n${snippet.code}\n\n`;
        const newValue = el.value.slice(0, start) + insertion + el.value.slice(end);
        const docId = activeView.type === 'dhf-document' ? activeView.docId : null;
        if (docId) updateDhfDocumentContent(docId, newValue);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + insertion.length;
            el.setSelectionRange(pos, pos);
        });
    }, [activeView, updateDhfDocumentContent]);

    const docId = activeView.type === 'dhf-document' ? activeView.docId : null;
    const doc = docId ? dhfDocuments.find(d => d.id === docId) : null;

    // Incomplete settings check: which project fields are missing
    const missingFields = useMemo(() => {
        const missing: string[] = [];
        if (!dhfSettings.company) missing.push('company');
        if (!dhfSettings.product) missing.push('product');
        return missing;
    }, [dhfSettings]);

    // ── Empty state ──────────────────────────────────────────────────────────
    if (!doc) {
        return (
            <>
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
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>No document selected</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '280px', lineHeight: '1.6' }}>
                            Right-click a group in the explorer to create a document, then click it to open.
                        </div>
                    </div>
                    <button onClick={() => setSettingsOpen(true)} style={{
                        marginTop: '8px', padding: '7px 16px', borderRadius: '6px',
                        border: '1px solid #E5E7EB', background: '#fff',
                        fontSize: '12px', color: '#6B7280', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <GearIcon size={13} /> DHF Settings
                    </button>
                </div>
                {settingsOpen && <Suspense fallback={null}><DhfSettingsPanel onClose={() => setSettingsOpen(false)} /></Suspense>}
            </>
        );
    }

    const filteredSnippets = snippetFilter === 'all' ? BUILT_IN_SNIPPETS : BUILT_IN_SNIPPETS.filter(s => s.category === snippetFilter);

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', overflow: 'hidden' }}>

                {/* ── Toolbar ── */}
                <div style={{
                    height: '40px', display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '0 12px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0,
                }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', fontFamily: 'monospace' }}>{doc.id}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>{doc.title}</span>
                    </div>

                    {/* Document properties toggle */}
                    <button onClick={() => setPropsOpen(v => !v)} title="Document properties (authors, approvers)" style={{
                        padding: '3px 10px', borderRadius: '6px', border: '1px solid',
                        borderColor: propsOpen ? '#6366F1' : '#E5E7EB',
                        background: propsOpen ? '#EEF2FF' : '#fff',
                        color: propsOpen ? '#4338CA' : '#6B7280',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        Authors
                    </button>

                    {/* Snippets toggle */}
                    <button onClick={() => setSnippetsOpen(v => !v)} title="Scriptlets & snippets library" style={{
                        padding: '3px 10px', borderRadius: '6px', border: '1px solid',
                        borderColor: snippetsOpen ? '#2DD4A8' : '#E5E7EB',
                        background: snippetsOpen ? '#F0FDF9' : '#fff',
                        color: snippetsOpen ? '#065F46' : '#6B7280',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                        </svg>
                        Snippets
                    </button>

                    {/* Draft with AI */}
                    <button onClick={() => draftWithAI(doc.id, doc.templateId)} disabled={!llmAvailable || draftLoading}
                        title={llmAvailable ? 'Use AI to draft empty sections from model data' : 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI drafting'}
                        style={{
                            padding: '3px 10px', borderRadius: '6px', border: 'none',
                            background: llmAvailable ? '#2DD4A815' : '#f3f4f6',
                            color: llmAvailable ? '#065F46' : '#9CA3AF',
                            fontSize: '11px', fontWeight: 600,
                            cursor: llmAvailable && !draftLoading ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: '4px', opacity: draftLoading ? 0.6 : 1,
                        }}>
                        <span>✦</span>{draftLoading ? 'Drafting…' : 'Draft with AI'}
                    </button>

                    {/* Edit/Split/Preview toggle */}
                    <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
                        {(['edit', 'split', 'preview'] as EditMode[]).map(mode => (
                            <button key={mode} onClick={() => setEditMode(mode)} style={{
                                padding: '3px 10px', borderRadius: '4px', border: 'none',
                                fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                                background: editMode === mode ? '#fff' : 'transparent',
                                color: editMode === mode ? '#1B3A4B' : '#6B7280',
                                boxShadow: editMode === mode ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                            }}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Settings gear */}
                    <button onClick={() => setSettingsOpen(true)} title="DHF global settings" style={{
                        padding: '4px', borderRadius: '6px', border: '1px solid #E5E7EB',
                        background: '#fff', cursor: 'pointer', color: '#6B7280',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <GearIcon size={14} />
                    </button>
                </div>

                {/* ── Banners ── */}
                {draftError && (
                    <div style={{ padding: '6px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: '12px', color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <span>AI draft failed: {draftError}</span>
                        <button onClick={() => setDraftError(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </div>
                )}
                {missingFields.length > 0 && (
                    <div style={{ padding: '5px 16px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', fontSize: '11px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>Project settings incomplete — <strong>{missingFields.join(', ')}</strong> not set. <code style={{ background: '#FEF3C7', padding: '0 3px', borderRadius: '2px' }}>{'{{project.*}}'}</code> will show as errors in preview.</span>
                        <button onClick={() => setSettingsOpen(true)} style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontWeight: 700, fontSize: '11px', padding: 0, textDecoration: 'underline' }}>Configure</button>
                    </div>
                )}

                {/* ── Document Properties panel ── */}
                {propsOpen && (
                    <DocPropertiesBar doc={doc} onUpdate={(patch) => updateDhfDocumentMeta(doc.id, patch)} />
                )}

                {/* ── Content panes ── */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Editor pane */}
                    {(editMode === 'edit' || editMode === 'split') && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: editMode === 'split' ? '1px solid #e5e7eb' : 'none' }}>
                            <textarea ref={editorRef} value={doc.content} onChange={e => updateDhfDocumentContent(doc.id, e.target.value)}
                                spellCheck={false} style={{
                                    flex: 1, padding: '20px', fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                                    fontSize: '13px', lineHeight: '1.7', border: 'none', outline: 'none',
                                    resize: 'none', background: '#fafafa', color: '#1B3A4B', tabSize: 2,
                                }} placeholder="Start writing your DHF document here..." />
                        </div>
                    )}

                    {/* Preview pane */}
                    {(editMode === 'preview' || editMode === 'split') && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', background: '#fff' }}>
                            <MarkdownPreview content={doc.content} model={model} settings={dhfSettings} doc={doc} />
                        </div>
                    )}

                    {/* Snippets sidebar */}
                    {snippetsOpen && (
                        <div style={{ width: '260px', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', background: '#FAFAFA', flexShrink: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1B3A4B', marginBottom: '8px' }}>Scriptlets & Snippets</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(['all', 'query', 'script', 'include', 'directive'] as const).map(cat => (
                                        <button key={cat} onClick={() => setSnippetFilter(cat)} style={{
                                            padding: '2px 8px', borderRadius: '10px', border: 'none',
                                            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                                            background: snippetFilter === cat ? (cat === 'all' ? '#1B3A4B' : SNIPPET_CATEGORY_COLORS[cat]) : '#E5E7EB',
                                            color: snippetFilter === cat ? '#fff' : '#6B7280',
                                        }}>
                                            {cat === 'all' ? 'All' : SNIPPET_CATEGORY_LABELS[cat]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                                {filteredSnippets.map(snippet => (
                                    <SnippetCard key={snippet.id} snippet={snippet} onInsert={() => insertSnippet(snippet)} />
                                ))}
                                <div style={{ fontSize: '11px', color: '#9CA3AF', padding: '8px 4px', lineHeight: '1.5' }}>
                                    Custom scriptlets can be added to <code style={{ background: '#E5E7EB', padding: '1px 3px', borderRadius: '2px' }}>shared/snippets/</code>.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {settingsOpen && <Suspense fallback={null}><DhfSettingsPanel onClose={() => setSettingsOpen(false)} /></Suspense>}
        </>
    );
}

// ─── Document Properties Bar ─────────────────────────────────────────────────

function DocPropertiesBar({ doc, onUpdate }: {
    doc: DhfDoc;
    onUpdate: (patch: Partial<Pick<DhfDoc, 'authors' | 'approvers'>>) => void;
}) {
    return (
        <div style={{
            borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', padding: '10px 16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flexShrink: 0,
        }}>
            <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                    Authors <span style={{ color: '#9CA3AF', textTransform: 'none', fontWeight: 400 }}>(Name | Role, one per line)</span>
                </label>
                <textarea
                    value={doc.authors}
                    onChange={e => onUpdate({ authors: e.target.value })}
                    placeholder={"Jane Smith | Lead Engineer\nBob Jones | Quality Assurance"}
                    rows={3}
                    style={{
                        width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '5px',
                        fontSize: '12px', color: '#1B3A4B', resize: 'none', fontFamily: 'inherit',
                        background: '#fff', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5',
                    }}
                />
            </div>
            <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                    Approvers <span style={{ color: '#9CA3AF', textTransform: 'none', fontWeight: 400 }}>(Name | Role, one per line)</span>
                </label>
                <textarea
                    value={doc.approvers}
                    onChange={e => onUpdate({ approvers: e.target.value })}
                    placeholder={"Alice Brown | Regulatory Affairs\nDr. Carol White | Clinical Safety"}
                    rows={3}
                    style={{
                        width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '5px',
                        fontSize: '12px', color: '#1B3A4B', resize: 'none', fontFamily: 'inherit',
                        background: '#fff', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5',
                    }}
                />
            </div>
            <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: '#9CA3AF', marginTop: '-4px' }}>
                These populate <code style={{ background: '#E5E7EB', padding: '0 3px', borderRadius: '2px' }}>{'{{include:shared/snippets/approval-block.md}}'}</code> in the preview and exported document.
            </div>
        </div>
    );
}

// ─── Snippet Card ─────────────────────────────────────────────────────────────

function SnippetCard({ snippet, onInsert }: { snippet: Snippet; onInsert: () => void }) {
    const [hovered, setHovered] = useState(false);
    const color = SNIPPET_CATEGORY_COLORS[snippet.category];
    return (
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
            padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
            border: `1px solid ${hovered ? color + '60' : '#E5E7EB'}`,
            background: hovered ? color + '08' : '#fff', cursor: 'default',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: color + '18', color }}>
                    {SNIPPET_CATEGORY_LABELS[snippet.category]}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1B3A4B', flex: 1 }}>{snippet.label}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', lineHeight: '1.4' }}>{snippet.description}</div>
            <button onClick={onInsert} style={{
                padding: '3px 10px', borderRadius: '4px', border: 'none', background: color, color: '#fff',
                fontSize: '10px', fontWeight: 600, cursor: 'pointer', opacity: hovered ? 1 : 0.7,
            }}>Insert</button>
        </div>
    );
}

// ─── Gear icon ────────────────────────────────────────────────────────────────

function GearIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    );
}

// ─── Markdown preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ content, model, settings, doc }: {
    content: string;
    model: MemoModelDTO | null;
    settings: DhfSettings;
    doc: DhfDoc;
}) {
    const html = useMemo(() => renderMarkdown(content, model, settings, doc), [content, model, settings, doc]);
    return (
        <div className="memo-md-preview"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown preview
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontSize: '14px', lineHeight: '1.7', color: '#1B3A4B', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        />
    );
}

// ─── Render helpers ───────────────────────────────────────────────────────────

/** Render authors/approvers list as an HTML table (used for approval-block inline) */
function renderPersonTable(raw: string, role: 'Author' | 'Approver'): string {
    const entries = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (entries.length === 0) {
        return `<tr><td colspan="4" style="color:#9CA3AF;font-style:italic">No ${role.toLowerCase()}s defined</td></tr>`;
    }
    return entries.map(entry => {
        const [name = '', roleStr = ''] = entry.split('|').map(s => s.trim());
        return `<tr>
            <td style="padding:6px 10px;border:1px solid #e5e7eb">${name}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb">${roleStr || role}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;color:#9CA3AF">—</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;color:#9CA3AF">—</td>
        </tr>`;
    }).join('');
}

function renderApprovalBlock(doc: DhfDoc): string {
    const hasAuthors = doc.authors.trim().length > 0;
    const hasApprovers = doc.approvers.trim().length > 0;
    const tableStyle = 'border-collapse:collapse;width:100%;font-size:12px;margin:8px 0';
    const thStyle = 'padding:6px 10px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600;text-align:left';

    return `
<h2>Authors</h2>
<table style="${tableStyle}">
  <thead><tr>
    <th style="${thStyle}">Name</th>
    <th style="${thStyle}">Role</th>
    <th style="${thStyle}">Signature</th>
    <th style="${thStyle}">Date</th>
  </tr></thead>
  <tbody>${renderPersonTable(doc.authors, 'Author')}</tbody>
</table>
${!hasAuthors ? '<p style="font-size:11px;color:#dc2626">⚠ No authors set — open Document Properties to add authors.</p>' : ''}

<h2>Approvers</h2>
<table style="${tableStyle}">
  <thead><tr>
    <th style="${thStyle}">Name</th>
    <th style="${thStyle}">Role</th>
    <th style="${thStyle}">Signature</th>
    <th style="${thStyle}">Date</th>
  </tr></thead>
  <tbody>${renderPersonTable(doc.approvers, 'Approver')}</tbody>
</table>
${!hasApprovers ? '<p style="font-size:11px;color:#dc2626">⚠ No approvers set — open Document Properties to add approvers.</p>' : ''}`;
}

function renderMarkdown(md: string, model: MemoModelDTO | null, settings: DhfSettings, doc: DhfDoc): string {
    // Strip YAML frontmatter
    let content = md.replace(/^---[\s\S]*?---\n/, '');

    // ── {{include:shared/snippets/approval-block.md}} — render from per-doc data ──
    content = content.replace(
        /\{\{include:shared\/snippets\/approval-block\.md\}\}/g,
        renderApprovalBlock(doc)
    );

    // ── Other {{include:...}} — placeholder ──
    content = content.replace(/\{\{include:([^}]+)\}\}/g, (_m, path: string) =>
        `<span class="directive-placeholder">[Snippet: ${path} — rendered on export]</span>`
    );

    // ── {{project.*}} — value if set, red error if missing ──
    const projectMap: Record<string, string> = {
        company: settings.company,
        product: settings.product,
        device_type: settings.deviceType,
        version: settings.version,
        phase: settings.phase,
    };
    content = content.replace(/\{\{project\.([^}]+)\}\}/g, (_m, key: string) => {
        const val = projectMap[key];
        if (val && val.trim()) {
            // Resolved: render as plain text (no wrapper)
            return escapeHtml(val);
        }
        // Missing: red error badge
        return `<span class="directive-error">⚠ {{project.${key}}} — not set</span>`;
    });

    // ── {{ref:ID.attr}} ──
    content = content.replace(/\{\{ref:([^.}]+)(?:\.(\w+))?\}\}/g, (_m, id, attr) => {
        if (!model) return `<code>${escapeHtml(id)}</code>`;
        const el = model.elements[id];
        if (!el) return `<em>[${escapeHtml(id)} not found]</em>`;
        if (!attr || attr === 'name') return escapeHtml(el.name);
        return escapeHtml(String((el as Record<string, unknown>)[attr] ?? el.name));
    });

    // ── Other directives ──
    content = content.replace(/\{\{toc\}\}/g, '<span class="directive-placeholder">[TOC — generated on export]</span>');
    content = content.replace(/\{\{glossary\}\}/g, '<span class="directive-placeholder">[Glossary — generated on export]</span>');
    content = content.replace(/\{\{[^}]+\}\}/g, m => `<span class="directive-placeholder">${escapeHtml(m)}</span>`);

    // ── memo-query blocks ──
    content = content.replace(/```memo-query\n([\s\S]*?)```/g, (_m, block) => {
        const lines = block.split('\n').filter(Boolean);
        const get = (prefix: string) => (lines.find((l: string) => l.startsWith(prefix)) ?? '').replace(prefix, '').trim();
        const kindStr = get('kind:') || '?';
        const displayStr = get('display:') || 'table';
        const emptyMsg = get('empty:').replace(/^['"]|['"]$/g, '') || 'No results found.';
        const labelStr = get('label:') || kindStr;

        if (!model) return `<div class="query-preview">⟳ <em>memo-query: ${escapeHtml(kindStr)} (${escapeHtml(displayStr)})</em></div>`;

        const kinds = kindStr.startsWith('[') || kindStr.startsWith('-')
            ? kindStr.replace(/[\[\]]/g, '').split(/[,\n]/).map((s: string) => s.replace('-', '').trim()).filter(Boolean)
            : [kindStr];

        const els = Object.values(model.elements).filter(el => kinds.includes(el.kind));
        if (els.length === 0) return `<div class="query-preview empty"><em>${escapeHtml(emptyMsg)}</em></div>`;

        if (displayStr === 'count') {
            return `<div class="query-preview count"><strong>${els.length}</strong><span>${escapeHtml(labelStr)}</span></div>`;
        }

        const cols = ['name', 'kind', 'layer'];
        const header = cols.map(c => `<th>${c}</th>`).join('');
        const rows = els.slice(0, 10).map(el => {
            const cells = cols.map(c => `<td>${escapeHtml(String((el as Record<string, unknown>)[c] ?? '—'))}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const more = els.length > 10 ? `<tr><td colspan="${cols.length}" style="color:#9CA3AF;font-size:11px">…and ${els.length - 10} more</td></tr>` : '';
        return `<div class="query-preview"><table><thead><tr>${header}</tr></thead><tbody>${rows}${more}</tbody></table></div>`;
    });

    // ── memo-script blocks ──
    content = content.replace(/```memo-script\n([\s\S]*?)```/g,
        '<div class="query-preview script"><em>memo-script — executed on export</em></div>');

    // ── Standard markdown ──
    const primaryColor = settings.primaryColor || '#1B3A4B';
    const accentColor = '#2DD4A8';

    const html = content
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
        .replace(/^\| (.+) \|$/gm, line => {
            const cells = line.slice(2, -2).split(' | ');
            return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        })
        .replace(/<tr>(.*?)<\/tr>/gs, (_, inner) => inner.includes('---') ? '' : `<tr>${inner}</tr>`)
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li style="margin:2px 0">$1</li>')
        .replace(/^\d+\.\s(.+)$/gm, '<li style="margin:2px 0">$1</li>');

    return `<style>
.memo-md-preview h1{font-size:22px;font-weight:700;color:${primaryColor};border-bottom:2px solid ${accentColor};padding-bottom:8px;margin:0 0 20px}
.memo-md-preview h2{font-size:17px;font-weight:700;color:${primaryColor};margin:28px 0 12px}
.memo-md-preview h3{font-size:14px;font-weight:600;color:#374151;margin:20px 0 8px}
.memo-md-preview h4{font-size:13px;font-weight:600;color:#6B7280;margin:12px 0 6px}
.memo-md-preview table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}
.memo-md-preview th,.memo-md-preview td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}
.memo-md-preview th{background:#f3f4f6;font-weight:600}
.memo-md-preview code{background:#f3f4f6;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px}
.memo-md-preview pre{background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;overflow-x:auto}
.memo-md-preview pre code{background:none;color:inherit;padding:0}
.memo-md-preview blockquote{border-left:3px solid ${accentColor};margin:12px 0;padding:6px 14px;background:#f0fdf9;font-style:italic;color:#374151}
.memo-md-preview hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
.directive-placeholder{color:#8B5CF6;font-style:normal;font-size:12px;background:#F5F3FF;padding:1px 5px;border-radius:3px;display:inline-block}
.directive-error{color:#DC2626;font-size:12px;background:#FEF2F2;border:1px solid #FECACA;padding:1px 6px;border-radius:3px;display:inline-block;font-family:monospace}
.query-preview{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:10px 0;font-size:12px}
.query-preview.empty{color:#9CA3AF}
.query-preview.count{display:flex;align-items:baseline;gap:6px}
.query-preview.count strong{font-size:24px;color:#2563eb;font-weight:700}
.query-preview.count span{font-size:13px;color:#6B7280}
.query-preview.script{color:#7c3aed;font-style:italic}
</style>
${html}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
