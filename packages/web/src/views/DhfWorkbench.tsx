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
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { DhfSettings, DhfDoc } from '../store/model-store';
import { renderDhfDocumentHtml, DIAGRAM_MARKER_RE } from '../dhf/document-renderer';
import { documentThemeCss } from '../dhf/document-theme';
import { exportDocumentWord, exportDocumentPdf, exportDocumentHtml, exportDocumentMarkdown } from '../dhf/document-export';

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
        code: '```memo-query\nkind: Requirement\ndisplay: table\ncolumns: name, layer, doc\nsort: name\n```' },
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
        code: "```memo-script\nconst reqs = query({ kind: 'Requirement' });\nconst covered = reqs.filter(r => r.verifiedBy?.length > 0);\nreturn count(covered, `covered of ${reqs.length} requirements`);\n```" },
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
                            Use <strong>+ New Document</strong> in the explorer to create one, then click it to open.
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

                    {/* Export dropdown */}
                    <ExportButton doc={doc} model={model} settings={dhfSettings} />

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

// ─── Export dropdown ──────────────────────────────────────────────────────────

function ExportButton({ doc, model, settings }: {
    doc: DhfDoc;
    model: MemoModelDTO | null;
    settings: DhfSettings;
}) {
    const [open, setOpen] = useState(false);

    const items: Array<{ label: string; hint: string; run: () => void }> = [
        { label: 'Word (.doc)', hint: 'Opens in Word / Pages', run: () => exportDocumentWord(doc, model, settings) },
        { label: 'PDF', hint: 'Via the print dialog', run: () => exportDocumentPdf(doc, model, settings) },
        { label: 'HTML', hint: 'Standalone web page', run: () => exportDocumentHtml(doc, model, settings) },
        { label: 'Markdown', hint: 'Raw document source', run: () => exportDocumentMarkdown(doc) },
    ];

    return (
        <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(v => !v)} title="Export this document" style={{
                padding: '3px 10px', borderRadius: '6px', border: '1px solid',
                borderColor: open ? '#1B3A4B' : '#E5E7EB',
                background: open ? '#F1F5F9' : '#fff', color: '#1B3A4B',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
            }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
            </button>
            {open && (
                <>
                    {/* click-away backdrop */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute', top: '28px', right: 0, zIndex: 9998,
                        background: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0', minWidth: '200px',
                    }}>
                        {items.map(item => (
                            <button key={item.label}
                                onClick={() => { setOpen(false); item.run(); }}
                                style={{
                                    display: 'flex', flexDirection: 'column', width: '100%', padding: '7px 14px',
                                    background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1B3A4B' }}>{item.label}</span>
                                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{item.hint}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
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
//
// Rendering lives in ../dhf/document-renderer.ts; styling in ../dhf/document-theme.ts
// so exports share the exact same output. {{diagram:id}} markers are split out
// of the HTML and replaced with live diagram cards.

function MarkdownPreview({ content, model, settings, doc }: {
    content: string;
    model: MemoModelDTO | null;
    settings: DhfSettings;
    doc: DhfDoc;
}) {
    const html = useMemo(() => renderDhfDocumentHtml(content, model, settings, doc), [content, model, settings, doc]);
    const css = useMemo(() => documentThemeCss(settings), [settings]);
    const segments = useMemo(() => html.split(new RegExp(DIAGRAM_MARKER_RE, 'g')), [html]);

    // split() with one capture group alternates [html, diagramId, html, ...]
    return (
        <div className="memo-doc">
            <style>{css}</style>
            {segments.map((seg, i) => i % 2 === 0 ? (
                <div key={i}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown preview
                    dangerouslySetInnerHTML={{ __html: seg }}
                />
            ) : (
                <DiagramEmbedCard key={i} diagramRef={seg} model={model} />
            ))}
        </div>
    );
}

// ─── Diagram embed card ───────────────────────────────────────────────────────

function DiagramEmbedCard({ diagramRef, model }: { diagramRef: string; model: MemoModelDTO | null }) {
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectDiagram = useModelStore(s => s.selectDiagram);

    // Match tolerantly: exact id, then case/punctuation-insensitive with an
    // optional "view" suffix, then containment ({{diagram:software-architecture}}
    // should find "GPCA_SoftwareArchitectureView").
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/view$/, '');
    const ref = norm(diagramRef);
    const diagrams = model?.diagrams ?? [];
    const diagram =
        diagrams.find(d => d.id === diagramRef)
        ?? diagrams.find(d => norm(d.id) === ref || norm(d.name) === ref)
        ?? diagrams.find(d => ref.length >= 6 && (norm(d.name).includes(ref) || norm(d.id).includes(ref)));

    if (!diagram) {
        return (
            <div style={{
                margin: '10px 0', padding: '10px 14px', borderRadius: '6px',
                border: '1px dashed #FCA5A5', background: '#FEF2F2', fontSize: '12px', color: '#DC2626',
            }}>
                ⚠ Diagram <code style={{ background: '#FEE2E2', padding: '0 4px', borderRadius: '3px' }}>{diagramRef}</code> not
                found in the model — check the id in <code style={{ background: '#FEE2E2', padding: '0 4px', borderRadius: '3px' }}>{'{{diagram:…}}'}</code>.
            </div>
        );
    }

    const openDiagram = () => {
        selectDiagram(diagram.id);
        setActiveView({ type: 'diagram', diagramId: diagram.id });
    };

    return (
        <div style={{
            margin: '10px 0', borderRadius: '8px', border: '1px solid #E2E8F0',
            background: '#F8FAFC', overflow: 'hidden',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2DD4A8" strokeWidth="1.8">
                    <rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
                    <rect x="8.5" y="16" width="7" height="5" rx="1"/>
                    <path d="M6.5 8v4h11V8M12 12v4"/>
                </svg>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>{diagram.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        {diagram.viewKind || diagram.diagramType}
                        {diagram.elementIds?.length ? ` · ${diagram.elementIds.length} elements` : ''}
                    </div>
                </div>
                <button onClick={openDiagram} style={{
                    padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#1B3A4B',
                    color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>
                    Open diagram →
                </button>
            </div>
        </div>
    );
}

