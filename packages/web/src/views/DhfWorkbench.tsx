// ─── DHF Workbench ────────────────────────────────────────────────────────────
//
// Full DHF authoring environment:
//   Left:   Document tree grouped by manifest groups, status indicators
//   Center: Markdown editor (textarea + CodeMirror-style highlighting) + live preview
//   Right:  Insert panel — elements, diagrams, query snippets
//   Bottom: Export controls, document status summary
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useModelStore } from '../store/model-store';
import type { MemoModelDTO, MemoElement } from '@memo/core';
import type { ValidationResult } from '@memo/core';

// ─── Document registry (local — no core DHF dep) ─────────────────────────────

interface DocEntry {
    id: string;
    title: string;
    standard: string;
    group: string;
    relevantKinds: string[];
}

const BUILT_IN_DOCS: DocEntry[] = [
    // Risk Management
    { id: 'iso-14971/rmp', title: 'Risk Management Plan', standard: 'ISO 14971:2019 §4.4', group: 'Risk Management', relevantKinds: ['Hazard', 'RiskControl', 'HazardousSituation'] },
    { id: 'iso-14971/har', title: 'Hazard Analysis Report', standard: 'ISO 14971:2019 §5-7', group: 'Risk Management', relevantKinds: ['Hazard', 'HazardousSituation', 'Harm'] },
    { id: 'iso-14971/fmea', title: 'FMEA', standard: 'IEC 60812:2018', group: 'Risk Management', relevantKinds: ['Component', 'Hazard', 'RiskControl'] },
    { id: 'iso-14971/fta', title: 'Fault Tree Analysis', standard: 'ISO 14971:2019 §5', group: 'Risk Management', relevantKinds: ['Hazard', 'Harm'] },
    { id: 'iso-14971/risk-benefit', title: 'Risk-Benefit Analysis', standard: 'ISO 14971:2019 §8', group: 'Risk Management', relevantKinds: ['Hazard'] },
    { id: 'iso-14971/rmr', title: 'Risk Management Report', standard: 'ISO 14971:2019 §9', group: 'Risk Management', relevantKinds: ['Hazard', 'RiskControl'] },
    // Software
    { id: 'iec-62304/sdp', title: 'Software Development Plan', standard: 'IEC 62304 §5.1', group: 'Software', relevantKinds: ['SoftwareItem', 'SoftwareSystem'] },
    { id: 'iec-62304/srs', title: 'Software Requirements Spec', standard: 'IEC 62304 §5.2', group: 'Software', relevantKinds: ['SoftwareRequirement', 'SystemRequirement'] },
    { id: 'iec-62304/sad', title: 'Software Architecture Description', standard: 'IEC 62304 §5.3', group: 'Software', relevantKinds: ['SoftwareItem', 'SoftwareUnit', 'Interface'] },
    { id: 'iec-62304/detailed-design', title: 'Software Detailed Design', standard: 'IEC 62304 §5.4', group: 'Software', relevantKinds: ['SoftwareUnit'] },
    { id: 'iec-62304/integration-test', title: 'Integration Test Plan', standard: 'IEC 62304 §5.6', group: 'Software', relevantKinds: ['TestCase'] },
    { id: 'iec-62304/system-test', title: 'System Test Plan', standard: 'IEC 62304 §5.7', group: 'Software', relevantKinds: ['TestCase', 'SystemRequirement'] },
    { id: 'iec-62304/soup', title: 'SOUP List', standard: 'IEC 62304 §8.1.2', group: 'Software', relevantKinds: ['SOUPComponent'] },
    { id: 'iec-62304/sbom', title: 'Software Bill of Materials', standard: 'IEC 62304 §8.1.2', group: 'Software', relevantKinds: ['SOUPComponent', 'SoftwareItem'] },
    { id: 'iec-62304/sw-traceability', title: 'SW Traceability Matrix', standard: 'IEC 62304 §5.7.5', group: 'Software', relevantKinds: ['SoftwareRequirement', 'TestCase'] },
    { id: 'iec-62304/change-control', title: 'Change Control Log', standard: 'IEC 62304 §6', group: 'Software', relevantKinds: [] },
    // Usability
    { id: 'iec-62366/ue-plan', title: 'Usability Engineering Plan', standard: 'IEC 62366-1 §4', group: 'Usability', relevantKinds: ['UseCase', 'UserActivity'] },
    { id: 'iec-62366/use-spec', title: 'Intended Use Specification', standard: 'IEC 62366-1 §5.1', group: 'Usability', relevantKinds: ['UseCase'] },
    { id: 'iec-62366/ui-spec', title: 'User Interface Specification', standard: 'IEC 62366-1 §5.6', group: 'Usability', relevantKinds: ['UserInterface'] },
    { id: 'iec-62366/task-analysis', title: 'Task Analysis', standard: 'IEC 62366-1 §5.4', group: 'Usability', relevantKinds: ['UserActivity'] },
    { id: 'iec-62366/urra', title: 'Use-Related Risk Analysis', standard: 'IEC 62366-1 §5', group: 'Usability', relevantKinds: ['UseCase', 'Hazard'] },
    { id: 'iec-62366/formative-eval', title: 'Formative Evaluation', standard: 'IEC 62366-1 §5.7', group: 'Usability', relevantKinds: [] },
    { id: 'iec-62366/summative-eval', title: 'Summative Evaluation', standard: 'IEC 62366-1 §5.9', group: 'Usability', relevantKinds: ['ValidationActivity'] },
    // Design Controls
    { id: '21cfr820/user-needs', title: 'User Needs', standard: '21 CFR 820.30(c)', group: 'Design Controls', relevantKinds: ['StakeholderNeed', 'UseCase'] },
    { id: '21cfr820/design-input', title: 'Design Input Plan', standard: '21 CFR 820.30(c)', group: 'Design Controls', relevantKinds: ['DesignInput', 'SystemRequirement'] },
    { id: '21cfr820/design-output', title: 'Design Output Plan', standard: '21 CFR 820.30(d)', group: 'Design Controls', relevantKinds: ['DesignOutput', 'Component'] },
    { id: '21cfr820/design-review', title: 'Design Review Record', standard: '21 CFR 820.30(e)', group: 'Design Controls', relevantKinds: [] },
    { id: '21cfr820/vv-plan', title: 'V&V Plan', standard: '21 CFR 820.30(f-g)', group: 'Design Controls', relevantKinds: ['TestCase', 'VerificationActivity'] },
    { id: '21cfr820/vv-report', title: 'V&V Report', standard: '21 CFR 820.30(f-g)', group: 'Design Controls', relevantKinds: ['TestCase', 'ValidationActivity'] },
    { id: '21cfr820/transfer-plan', title: 'Design Transfer Plan', standard: '21 CFR 820.30(h)', group: 'Design Controls', relevantKinds: ['DesignOutput'] },
    { id: '21cfr820/design-verification', title: 'Design Verification', standard: '21 CFR 820.30(f)', group: 'Design Controls', relevantKinds: ['VerificationActivity'] },
    { id: '21cfr820/design-validation', title: 'Design Validation', standard: '21 CFR 820.30(g)', group: 'Design Controls', relevantKinds: ['ValidationActivity'] },
    { id: '21cfr820/change-record', title: 'Design Change Record', standard: '21 CFR 820.30(i)', group: 'Design Controls', relevantKinds: [] },
    { id: '21cfr820/dhf-index', title: 'DHF Index', standard: '21 CFR 820.30(j)', group: 'Design Controls', relevantKinds: [] },
    // Cybersecurity
    { id: 'fda-cybersecurity/threat-model', title: 'Threat Model', standard: 'FDA Cybersecurity 2023', group: 'Cybersecurity', relevantKinds: ['ThreatModel', 'SecurityControl'] },
    { id: 'fda-cybersecurity/security-arch', title: 'Security Architecture', standard: 'FDA Cybersecurity 2023', group: 'Cybersecurity', relevantKinds: ['SecurityControl', 'Interface'] },
    { id: 'fda-cybersecurity/vuln-assessment', title: 'Vulnerability Assessment', standard: 'FDA Cybersecurity 2023', group: 'Cybersecurity', relevantKinds: ['SOUPComponent'] },
    { id: 'fda-cybersecurity/postmarket-surveillance', title: 'Post-Market Surveillance', standard: 'FDA Cybersecurity 2023', group: 'Cybersecurity', relevantKinds: ['SOUPComponent'] },
    { id: 'fda-cybersecurity/incident-response', title: 'Incident Response Plan', standard: 'FDA Cybersecurity 2023', group: 'Cybersecurity', relevantKinds: [] },
];

const GROUP_COLORS: Record<string, string> = {
    'Risk Management': '#dc2626',
    'Software': '#2563eb',
    'Usability': '#7c3aed',
    'Design Controls': '#0891b2',
    'Cybersecurity': '#d97706',
};

// ─── Document status helper ───────────────────────────────────────────────────

function computeDocStatus(doc: DocEntry, model: MemoModelDTO | null): 'complete' | 'partial' | 'empty' {
    if (!model) return 'empty';
    if (doc.relevantKinds.length === 0) return 'partial';
    const elements = Object.values(model.elements).filter(el => doc.relevantKinds.includes(el.kind));
    return elements.length === 0 ? 'empty' : elements.length >= 2 ? 'complete' : 'partial';
}

// ─── Query snippet builder ────────────────────────────────────────────────────

function buildQuerySnippet(kinds: string[]): string {
    if (kinds.length === 0) return '```memo-query\ndisplay: table\ncolumns: name, kind, layer, doc\n```';
    const kindStr = kinds.length === 1 ? `kind: ${kinds[0]}` : `kind:\n${kinds.map(k => `  - ${k}`).join('\n')}`;
    return `\`\`\`memo-query\n${kindStr}\ndisplay: table\ncolumns: name, layer, doc\nsort: name\nempty: "No ${kinds[0]} elements found."\n\`\`\``;
}

// ─── Panel components ─────────────────────────────────────────────────────────

type EditMode = 'edit' | 'preview' | 'split';

interface WorkbenchState {
    selectedDocId: string | null;
    editMode: EditMode;
    editorContent: Record<string, string>; // docId → markdown content
    insertFilter: string;
}

// ─── Main Workbench Component ─────────────────────────────────────────────────

export function DhfWorkbench() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);

    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<EditMode>('split');
    const [editorContent, setEditorContent] = useState<Record<string, string>>({});
    const [insertFilter, setInsertFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState('md');
    const editorRef = useRef<HTMLTextAreaElement>(null);

    const docStatuses = useMemo(() => {
        const map = new Map<string, 'complete' | 'partial' | 'empty'>();
        for (const doc of BUILT_IN_DOCS) {
            map.set(doc.id, computeDocStatus(doc, model));
        }
        return map;
    }, [model]);

    const groups = useMemo(() => {
        const g = new Map<string, DocEntry[]>();
        for (const doc of BUILT_IN_DOCS) {
            if (groupFilter && doc.group !== groupFilter) continue;
            if (!g.has(doc.group)) g.set(doc.group, []);
            g.get(doc.group)!.push(doc);
        }
        return g;
    }, [groupFilter]);

    const selectedDoc = selectedDocId ? BUILT_IN_DOCS.find(d => d.id === selectedDocId) : null;
    const currentContent = selectedDocId ? (editorContent[selectedDocId] ?? defaultContent(selectedDoc)) : '';

    function setDocContent(docId: string, content: string): void {
        setEditorContent(prev => ({ ...prev, [docId]: content }));
    }

    function insertAtCursor(text: string): void {
        const ta = editorRef.current;
        if (!ta || !selectedDocId) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = ta.value.slice(0, start);
        const after = ta.value.slice(end);
        const newContent = before + '\n' + text + '\n' + after;
        setDocContent(selectedDocId, newContent);
        // Restore cursor
        setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = start + text.length + 2;
            ta.focus();
        }, 0);
    }

    const summary = useMemo(() => {
        let complete = 0, partial = 0, empty = 0;
        for (const s of docStatuses.values()) {
            if (s === 'complete') complete++;
            else if (s === 'partial') partial++;
            else empty++;
        }
        return { complete, partial, empty, total: BUILT_IN_DOCS.length };
    }, [docStatuses]);

    if (!model) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '32px' }}>📋</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>DHF Workbench</div>
                <div style={{ fontSize: '12px' }}>Waiting for model data...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F7F5', overflow: 'hidden' }}>
            {/* Main workbench area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* ── Left panel: Document tree ── */}
                <div style={{
                    width: '240px', flexShrink: 0, background: '#1B3A4B', color: '#E5E7EB',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#2DD4A8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            DHF Workbench
                        </div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                            {summary.complete} complete · {summary.partial} partial · {summary.empty} empty
                        </div>
                    </div>

                    {/* Group filter pills */}
                    <div style={{ padding: '6px 10px', display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => setGroupFilter(null)} style={pillStyle(!groupFilter)}>All</button>
                        {Object.keys(GROUP_COLORS).map(g => (
                            <button key={g} onClick={() => setGroupFilter(g === groupFilter ? null : g)} style={pillStyle(groupFilter === g, GROUP_COLORS[g])}>
                                {g.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Document tree */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                        {Array.from(groups.entries()).map(([group, docs]) => (
                            <div key={group}>
                                <div style={{
                                    padding: '6px 14px 2px',
                                    fontSize: '10px', fontWeight: 700, color: GROUP_COLORS[group] ?? '#9CA3AF',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    {group}
                                </div>
                                {docs.map(doc => {
                                    const status = docStatuses.get(doc.id) ?? 'empty';
                                    const isSelected = selectedDocId === doc.id;
                                    return (
                                        <button
                                            key={doc.id}
                                            onClick={() => setSelectedDocId(doc.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                width: '100%', padding: '5px 14px',
                                                background: isSelected ? 'rgba(45,212,168,0.12)' : 'transparent',
                                                border: 'none', color: isSelected ? '#2DD4A8' : '#D1D5DB',
                                                fontSize: '12px', textAlign: 'left', cursor: 'pointer',
                                                borderLeft: isSelected ? '2px solid #2DD4A8' : '2px solid transparent',
                                            }}
                                        >
                                            <span style={{
                                                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                                background: status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : '#6b7280',
                                            }} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Center: Editor + Preview ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedDoc ? (
                        <>
                            {/* Editor toolbar */}
                            <div style={{
                                height: '40px', display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '0 16px', borderBottom: '1px solid #e5e7eb', background: '#fff',
                                flexShrink: 0,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>
                                        {selectedDoc.title}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '8px' }}>
                                        {selectedDoc.standard}
                                    </span>
                                </div>
                                {/* Mode toggles */}
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
                            </div>

                            {/* Editor / Preview panes */}
                            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                {/* Edit pane */}
                                {(editMode === 'edit' || editMode === 'split') && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: editMode === 'split' ? '1px solid #e5e7eb' : 'none' }}>
                                        <textarea
                                            ref={editorRef}
                                            value={currentContent}
                                            onChange={e => setDocContent(selectedDocId!, e.target.value)}
                                            spellCheck={false}
                                            style={{
                                                flex: 1, padding: '20px', fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                                                fontSize: '13px', lineHeight: '1.7', border: 'none', outline: 'none',
                                                resize: 'none', background: '#fafafa', color: '#1B3A4B',
                                                tabSize: 2,
                                            }}
                                            placeholder="Start writing your DHF document here..."
                                        />
                                    </div>
                                )}

                                {/* Preview pane */}
                                {(editMode === 'preview' || editMode === 'split') && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', background: '#fff' }}>
                                        <MarkdownPreview content={currentContent} model={model} />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <DhfOverview summary={summary} docStatuses={docStatuses} model={model} onSelectDoc={setSelectedDocId} />
                    )}
                </div>

                {/* ── Right panel: Insert ── */}
                {selectedDoc && (
                    <div style={{
                        width: '220px', flexShrink: 0, borderLeft: '1px solid #e5e7eb',
                        background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Insert
                            </div>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
                            <input
                                value={insertFilter}
                                onChange={e => setInsertFilter(e.target.value)}
                                placeholder="Search elements..."
                                style={{
                                    width: '100%', padding: '4px 8px', fontSize: '12px',
                                    border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none',
                                }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                            {/* Query snippets */}
                            <div style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Queries</div>
                            {selectedDoc.relevantKinds.map(kind => (
                                <InsertButton key={kind}
                                    label={`${kind} table`}
                                    onClick={() => insertAtCursor(buildQuerySnippet([kind]))}
                                />
                            ))}
                            {selectedDoc.relevantKinds.length > 1 && (
                                <InsertButton
                                    label="All relevant elements"
                                    onClick={() => insertAtCursor(buildQuerySnippet(selectedDoc.relevantKinds))}
                                />
                            )}
                            <InsertButton
                                label="Count query"
                                onClick={() => insertAtCursor('```memo-query\nkind: ' + (selectedDoc.relevantKinds[0] ?? 'Element') + '\ndisplay: count\nlabel: Total\n```')}
                            />

                            {/* Directives */}
                            <div style={{ padding: '8px 10px 4px', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Directives</div>
                            <InsertButton label="{{toc}}" onClick={() => insertAtCursor('{{toc}}')} />
                            <InsertButton label="{{glossary}}" onClick={() => insertAtCursor('{{glossary}}')} />
                            <InsertButton label="{{project.product}}" onClick={() => insertAtCursor('{{project.product}}')} />
                            <InsertButton label="{{project.company}}" onClick={() => insertAtCursor('{{project.company}}')} />
                            <InsertButton label="Approval block" onClick={() => insertAtCursor('{{include:shared/snippets/approval-block.md}}')} />
                            <InsertButton label="Revision history" onClick={() => insertAtCursor('{{include:shared/snippets/revision-history-table.md}}')} />
                            <InsertButton label="References section" onClick={() => insertAtCursor('{{include:shared/snippets/references-section.md}}')} />

                            {/* Model elements */}
                            {model && (
                                <>
                                    <div style={{ padding: '8px 10px 4px', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Elements</div>
                                    <ModelElementsList
                                        model={model}
                                        filter={insertFilter}
                                        kinds={selectedDoc.relevantKinds}
                                        onInsert={(el) => insertAtCursor(`{{ref:${el.id}.name}}`)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom bar: Export controls ── */}
            <div style={{
                height: '44px', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '0 16px', borderTop: '1px solid #e5e7eb', background: '#fff',
                flexShrink: 0,
            }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {summary.total} documents · {summary.complete} complete · {summary.partial} partial · {summary.empty} empty
                </div>
                <div style={{ flex: 1 }} />

                {/* Export format picker */}
                <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value)}
                    style={{
                        padding: '4px 8px', fontSize: '12px', border: '1px solid #e5e7eb',
                        borderRadius: '4px', background: '#fff', color: '#374151', cursor: 'pointer',
                    }}
                >
                    <option value="md">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="docx">Word (DOCX)</option>
                    <option value="pdf">PDF</option>
                </select>

                {/* Export button (triggers CLI via instructions) */}
                <button
                    onClick={() => {
                        const cmd = `memo dhf export --format ${exportFormat}${selectedDocId ? ` --target ${selectedDocId.split('/').pop()}` : ''}`;
                        const msg = `To export, run:\n\n  ${cmd}`;
                        alert(msg);
                    }}
                    style={{
                        padding: '5px 14px', fontSize: '12px', fontWeight: 600,
                        background: '#2DD4A8', color: '#1B3A4B', border: 'none', borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    Export {selectedDocId ? 'Document' : 'All'}
                </button>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function pillStyle(active: boolean, color?: string) {
    return {
        padding: '2px 7px', fontSize: '10px', fontWeight: 600,
        borderRadius: '10px', border: 'none', cursor: 'pointer',
        background: active ? (color ?? '#2DD4A8') + '22' : 'transparent',
        color: active ? (color ?? '#2DD4A8') : '#9CA3AF',
    } as React.CSSProperties;
}

function InsertButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            display: 'block', width: '100%', padding: '4px 12px',
            textAlign: 'left', background: 'none', border: 'none',
            fontSize: '12px', color: '#374151', cursor: 'pointer',
            fontFamily: label.startsWith('{{') ? 'monospace' : 'inherit',
        }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
            {label}
        </button>
    );
}

function ModelElementsList({ model, filter, kinds, onInsert }: {
    model: MemoModelDTO;
    filter: string;
    kinds: string[];
    onInsert: (el: MemoElement) => void;
}) {
    const elements = useMemo(() => {
        const all = Object.values(model.elements);
        const filtered = kinds.length > 0
            ? all.filter(el => kinds.includes(el.kind))
            : all;
        const lf = filter.toLowerCase();
        return lf
            ? filtered.filter(el => el.name.toLowerCase().includes(lf) || el.kind.toLowerCase().includes(lf))
            : filtered.slice(0, 50);
    }, [model, filter, kinds]);

    if (elements.length === 0) {
        return <div style={{ padding: '4px 12px', fontSize: '11px', color: '#9CA3AF' }}>No elements</div>;
    }

    return (
        <>
            {elements.slice(0, 30).map(el => (
                <button key={el.id} onClick={() => onInsert(el)} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    width: '100%', padding: '4px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                    <span style={{ fontSize: '10px', color: '#2563eb', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{el.kind}</span>
                    <span style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.name}</span>
                </button>
            ))}
            {elements.length > 30 && (
                <div style={{ padding: '2px 12px', fontSize: '10px', color: '#9CA3AF' }}>+{elements.length - 30} more</div>
            )}
        </>
    );
}

// ─── Markdown preview (lightweight, no external dep) ─────────────────────────

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
    // Handle {{ref:ID.attr}} directives client-side
    let content = md.replace(/\{\{ref:([^.}]+)(?:\.(\w+))?\}\}/g, (_m, id, attr) => {
        if (!model) return `<code>${id}</code>`;
        const el = model.elements[id];
        if (!el) return `<em>[${id} not found]</em>`;
        if (!attr || attr === 'name') return `<strong>${el.name}</strong>`;
        return String((el as Record<string, unknown>)[attr] ?? el.name);
    });

    // Handle {{project.*}} — show as italic placeholder
    content = content.replace(/\{\{project\.([^}]+)\}\}/g, '<em class="directive">{{project.$1}}</em>');

    // Handle {{toc}} / {{glossary}} — show placeholder in preview
    content = content.replace(/\{\{toc\}\}/g, '<em class="directive">[Table of Contents — generated on export]</em>');
    content = content.replace(/\{\{glossary\}\}/g, '<em class="directive">[Glossary — generated on export]</em>');
    content = content.replace(/\{\{include:[^}]+\}\}/g, '<em class="directive">[Included snippet — rendered on export]</em>');

    // Handle memo-query blocks: render a simple element count/preview
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

        // Render as mini table
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
    content = content.replace(/```memo-script\n([\s\S]*?)```/g, '<div class="query-preview script"><em>memo-script block — executed on export</em></div>');

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
            const isHeader = inner.includes('---');
            return isHeader ? '' : `<tr>${inner}</tr>`;
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

// ─── DHF Overview (no document selected) ─────────────────────────────────────

function DhfOverview({ summary, docStatuses, model, onSelectDoc }: {
    summary: { complete: number; partial: number; empty: number; total: number };
    docStatuses: Map<string, 'complete' | 'partial' | 'empty'>;
    model: MemoModelDTO;
    onSelectDoc: (id: string) => void;
}) {
    const groups = new Map<string, DocEntry[]>();
    for (const doc of BUILT_IN_DOCS) {
        if (!groups.has(doc.group)) groups.set(doc.group, []);
        groups.get(doc.group)!.push(doc);
    }

    const elementCount = Object.keys(model.elements).length;

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1B3A4B', margin: '0 0 4px' }}>
                Design History File
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px' }}>
                {elementCount} model elements · {summary.complete} documents complete · {summary.partial} partial · {summary.empty} empty
            </p>

            {/* Summary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Complete', value: summary.complete, color: '#10b981' },
                    { label: 'Partial', value: summary.partial, color: '#f59e0b' },
                    { label: 'Empty', value: summary.empty, color: '#6b7280' },
                    { label: 'Total Docs', value: summary.total, color: '#2563eb' },
                ].map(m => (
                    <div key={m.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{m.label}</div>
                    </div>
                ))}
            </div>

            {/* Document groups */}
            {Array.from(groups.entries()).map(([group, docs]) => (
                <div key={group} style={{ marginBottom: '20px' }}>
                    <h3 style={{
                        fontSize: '13px', fontWeight: 700, color: GROUP_COLORS[group] ?? '#374151',
                        margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: GROUP_COLORS[group] ?? '#6B7280', display: 'inline-block' }} />
                        {group}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                        {docs.map(doc => {
                            const status = docStatuses.get(doc.id) ?? 'empty';
                            const statusColor = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : '#6b7280';
                            const elementCount = model ? Object.values(model.elements).filter(el => doc.relevantKinds.includes(el.kind)).length : 0;
                            return (
                                <button key={doc.id} onClick={() => onSelectDoc(doc.id)} style={{
                                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px',
                                    padding: '12px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2DD4A8'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                                            {doc.id.split('/').pop()?.toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor,
                                            background: statusColor + '15', padding: '1px 5px', borderRadius: '3px' }}>
                                            {status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1B3A4B', marginBottom: '2px' }}>{doc.title}</div>
                                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                        {doc.standard} {elementCount > 0 && `· ${elementCount} elements`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Default content for a document ──────────────────────────────────────────

function defaultContent(doc: DocEntry | null | undefined): string {
    if (!doc) return '';
    return [
        `---`,
        `id: ${doc.id.split('/').pop()}`,
        `title: ${doc.title}`,
        `standard: ${doc.standard}`,
        `---`,
        ``,
        `{{include:shared/snippets/document-control-header.md}}`,
        ``,
        `{{toc}}`,
        ``,
        `---`,
        ``,
        `## 1. Purpose`,
        ``,
        `_[TODO: State the purpose and scope of this document]_`,
        ``,
        `---`,
        ``,
        `## 2. Model Data`,
        ``,
        ...(doc.relevantKinds.length > 0 ? [buildQuerySnippet(doc.relevantKinds), ``] : []),
        `---`,
        ``,
        `{{include:shared/snippets/revision-history-table.md}}`,
        ``,
        `{{include:shared/snippets/approval-block.md}}`,
        ``,
        `{{include:shared/snippets/references-section.md}}`,
    ].join('\n');
}
