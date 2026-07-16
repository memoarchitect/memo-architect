// ─── DHF Dashboard ───────────────────────────────────────────────────────────
//
// Card grid of all 18 DHF documents with status + gap summary.
// Click → drilldown: section status, gaps, model elements.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import type { MemoModelDTO, MemoElement, MemoRelationship } from '@memo/tools/browser';
import type { ValidationResult, CompletenessReport, Violation } from '@memo/tools/browser';

// ─── Inline document registry (lightweight, no core DHF dep for web) ────────

interface DocType {
    id: string;
    title: string;
    standards: string[];
    layers: string[];
    relevantKinds: string[];
    group: 'risk' | 'design' | 'verification' | 'compliance' | 'all';
}

const DOC_TYPES: DocType[] = [
    { id: 'rmp', title: 'Risk Management Plan', standards: ['ISO 14971:2019 §4.4'], layers: ['risk'], relevantKinds: ['Hazard', 'HazardousSituation', 'Harm', 'RiskControl', 'RiskAcceptabilityCriteria'], group: 'risk' },
    { id: 'har', title: 'Hazard Analysis Report', standards: ['ISO 14971:2019 §5', 'ISO 14971:2019 §6'], layers: ['risk'], relevantKinds: ['Hazard', 'HazardousSituation', 'Harm', 'RiskControl'], group: 'risk' },
    { id: 'fmea', title: 'Failure Mode and Effects Analysis', standards: ['IEC 60812:2018'], layers: ['risk', 'functional', 'physical'], relevantKinds: ['Hazard', 'RiskControl', 'Function', 'Component', 'Subsystem'], group: 'risk' },
    { id: 'rtm', title: 'Requirements Traceability Matrix', standards: ['IEC 62304:2006 §5.1.1'], layers: ['requirements', 'functional', 'verification'], relevantKinds: ['Requirement', 'Requirement', 'DesignInput', 'DesignOutput', 'TestCase', 'VerificationActivity'], group: 'design' },
    { id: 'sad', title: 'System Architecture Description', standards: ['ISO/IEC/IEEE 42010:2022'], layers: ['functional', 'logical', 'physical', 'software', 'interfaces'], relevantKinds: ['Function', 'Component', 'Subsystem', 'Interface', 'Port', 'SoftwareItem', 'SOUPComponent'], group: 'design' },
    { id: 'sds', title: 'Software Design Specification', standards: ['IEC 62304:2006 §5.4'], layers: ['software'], relevantKinds: ['SoftwareItem', 'SoftwareUnit', 'SoftwareSystem', 'SOUPComponent', 'Interface'], group: 'design' },
    { id: 'soup', title: 'SOUP List', standards: ['IEC 62304:2006 §8.1.2'], layers: ['software'], relevantKinds: ['SOUPComponent'], group: 'design' },
    { id: 'dip', title: 'Design Input Plan', standards: ['ISO 13485:2016 §7.3.3'], layers: ['requirements', 'business'], relevantKinds: ['DesignInput', 'Requirement', 'StakeholderNeed', 'UseCase'], group: 'design' },
    { id: 'dop', title: 'Design Output Plan', standards: ['ISO 13485:2016 §7.3.4'], layers: ['functional', 'physical', 'software'], relevantKinds: ['DesignOutput', 'Component', 'SoftwareItem', 'Function'], group: 'design' },
    { id: 'vvp', title: 'Verification & Validation Plan', standards: ['ISO 13485:2016 §7.3.6'], layers: ['verification'], relevantKinds: ['TestCase', 'VerificationActivity', 'ValidationActivity', 'TestProtocol'], group: 'verification' },
    { id: 'vvr', title: 'Verification & Validation Report', standards: ['ISO 13485:2016 §7.3.7'], layers: ['verification'], relevantKinds: ['TestCase', 'VerificationActivity', 'ValidationActivity', 'TestResult'], group: 'verification' },
    { id: 'sdp', title: 'Software Development Plan', standards: ['IEC 62304:2006 §5.1'], layers: ['software', 'verification'], relevantKinds: ['SoftwareItem', 'SoftwareUnit', 'SoftwareSystem', 'TestCase'], group: 'compliance' },
    { id: 'csr', title: 'Clinical Safety Report', standards: ['ISO 14971:2019 §10'], layers: ['risk', 'verification'], relevantKinds: ['Hazard', 'RiskControl', 'ClinicalEvidence', 'ValidationActivity'], group: 'compliance' },
    { id: 'uer', title: 'Usability Engineering Report', standards: ['IEC 62366-1:2015'], layers: ['ui', 'requirements'], relevantKinds: ['UseCase', 'UserActivity', 'UserInterface', 'UsabilityRequirement'], group: 'compliance' },
    { id: 'cybersecurity', title: 'Cybersecurity Documentation', standards: ['IEC 81001-5-1:2021'], layers: ['software', 'interfaces'], relevantKinds: ['ThreatModel', 'SecurityControl', 'Interface', 'SOUPComponent'], group: 'compliance' },
    { id: 'labeling', title: 'Labeling Specification', standards: ['21 CFR 801'], layers: ['requirements', 'ui'], relevantKinds: ['LabelingRequirement', 'Requirement'], group: 'compliance' },
    { id: 'dhf-index', title: 'Design History File Index', standards: ['ISO 13485:2016 §4.2.4'], layers: [], relevantKinds: [], group: 'all' },
    { id: 'change-log', title: 'Design Change Log', standards: ['ISO 13485:2016 §7.3.9'], layers: [], relevantKinds: [], group: 'all' },
];

const GROUP_LABELS: Record<string, string> = {
    risk: 'Risk Management',
    design: 'Design & Architecture',
    verification: 'Verification & Validation',
    compliance: 'Compliance & Standards',
    all: 'General',
};

const GROUP_COLORS: Record<string, string> = {
    risk: '#E74C3C',
    design: '#4A90D9',
    verification: '#2ECC71',
    compliance: '#8E44AD',
    all: '#6B7280',
};

// ─── Helper: compute doc status from model data ─────────────────────────────

interface DocStatus {
    elementCount: number;
    gapCount: number;
    status: 'complete' | 'partial' | 'empty';
    violations: Violation[];
}

function computeDocStatus(
    doc: DocType,
    model: MemoModelDTO,
    validation: ValidationResult | null,
): DocStatus {
    const elements = Object.values(model.elements).filter(el =>
        doc.relevantKinds.includes(el.kind)
    );

    const violations = (validation?.violations || []).filter(v =>
        doc.relevantKinds.includes(v.elementKind) ||
        doc.layers.includes(v.layer)
    );

    const gaps = violations.filter(v => v.severity === 'error').length;

    return {
        elementCount: elements.length,
        gapCount: gaps,
        status: elements.length === 0 ? 'empty' : gaps === 0 ? 'complete' : 'partial',
        violations,
    };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DhfDashboard() {
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const completeness = useModelStore(s => s.completeness);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [filterGroup, setFilterGroup] = useState<string | null>(null);

    const docStatuses = useMemo(() => {
        if (!model) return new Map<string, DocStatus>();
        const map = new Map<string, DocStatus>();
        for (const doc of DOC_TYPES) {
            map.set(doc.id, computeDocStatus(doc, model, validation));
        }
        return map;
    }, [model, validation]);

    const filteredDocs = useMemo(() => {
        if (!filterGroup) return DOC_TYPES;
        return DOC_TYPES.filter(d => d.group === filterGroup || d.group === 'all');
    }, [filterGroup]);

    const groupedDocs = useMemo(() => {
        const groups = new Map<string, DocType[]>();
        for (const doc of filteredDocs) {
            const group = doc.group;
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group)!.push(doc);
        }
        return groups;
    }, [filteredDocs]);

    // Summary stats
    const summary = useMemo(() => {
        let complete = 0, partial = 0, empty = 0;
        for (const status of docStatuses.values()) {
            if (status.status === 'complete') complete++;
            else if (status.status === 'partial') partial++;
            else empty++;
        }
        return { complete, partial, empty, total: DOC_TYPES.length };
    }, [docStatuses]);

    if (!model) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                Waiting for model data...
            </div>
        );
    }

    const selectedDocType = selectedDoc ? DOC_TYPES.find(d => d.id === selectedDoc) : null;
    const selectedStatus = selectedDoc ? docStatuses.get(selectedDoc) : null;

    return (
        <div style={{ height: '100%', overflow: 'auto', background: '#F7F7F5', padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1B3A4B', margin: 0 }}>
                    Design History File Dashboard
                </h2>
                <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px' }}>
                    {summary.total} documents | {summary.complete} complete | {summary.partial} partial | {summary.empty} empty
                    {completeness && ` | Overall completeness: ${completeness.overall}%`}
                </p>
            </div>

            {/* Summary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <MetricCard label="Complete" value={summary.complete} color="#059669" />
                <MetricCard label="Partial" value={summary.partial} color="#d97706" />
                <MetricCard label="Empty" value={summary.empty} color="#dc2626" />
                <MetricCard label="Completeness" value={`${completeness?.overall || 0}%`} color="#2563eb" />
            </div>

            {/* Group filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <FilterPill label="All" active={!filterGroup} onClick={() => setFilterGroup(null)} />
                {Object.entries(GROUP_LABELS).filter(([k]) => k !== 'all').map(([key, label]) => (
                    <FilterPill key={key} label={label} active={filterGroup === key}
                        onClick={() => setFilterGroup(filterGroup === key ? null : key)}
                        color={GROUP_COLORS[key]} />
                ))}
            </div>

            {/* Document cards by group */}
            {selectedDoc ? (
                <DrilldownView
                    doc={selectedDocType!}
                    status={selectedStatus!}
                    model={model}
                    validation={validation}
                    onBack={() => setSelectedDoc(null)}
                />
            ) : (
                Array.from(groupedDocs.entries()).map(([group, docs]) => (
                    <div key={group} style={{ marginBottom: '24px' }}>
                        <h3 style={{
                            fontSize: '14px', fontWeight: 600, color: GROUP_COLORS[group] || '#374151',
                            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: GROUP_COLORS[group] || '#6B7280', display: 'inline-block' }} />
                            {GROUP_LABELS[group] || group}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {docs.map(doc => {
                                const status = docStatuses.get(doc.id)!;
                                return (
                                    <DocCard key={doc.id} doc={doc} status={status}
                                        onClick={() => setSelectedDoc(doc.id)} />
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '14px 16px', textAlign: 'center',
        }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

function FilterPill({ label, active, onClick, color }: {
    label: string; active: boolean; onClick: () => void; color?: string;
}) {
    return (
        <button onClick={onClick} style={{
            padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 500,
            border: `1px solid ${active ? (color || '#2DD4A8') : '#e5e7eb'}`,
            background: active ? (color || '#2DD4A8') + '15' : '#fff',
            color: active ? (color || '#1B3A4B') : '#6B7280',
            cursor: 'pointer',
        }}>
            {label}
        </button>
    );
}

function DocCard({ doc, status, onClick }: { doc: DocType; status: DocStatus; onClick: () => void }) {
    const statusColor = status.status === 'complete' ? '#059669'
        : status.status === 'partial' ? '#d97706' : '#dc2626';
    const statusBg = status.status === 'complete' ? '#ecfdf5'
        : status.status === 'partial' ? '#fffbeb' : '#fef2f2';
    const statusLabel = status.status === 'complete' ? 'Complete'
        : status.status === 'partial' ? 'Partial' : 'Empty';

    return (
        <div onClick={onClick} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#2DD4A8';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>
                    {doc.id.toUpperCase()}
                </span>
                <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                    background: statusBg, color: statusColor,
                }}>
                    {statusLabel}
                </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1B3A4B', marginBottom: '6px' }}>
                {doc.title}
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>
                {doc.standards[0]}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
                <span>{status.elementCount} elements</span>
                {status.gapCount > 0 && (
                    <span style={{ color: '#dc2626' }}>{status.gapCount} gaps</span>
                )}
            </div>
        </div>
    );
}

// ─── Drilldown View ──────────────────────────────────────────────────────────

function DrilldownView({ doc, status, model, validation, onBack }: {
    doc: DocType;
    status: DocStatus;
    model: MemoModelDTO;
    validation: ValidationResult | null;
    onBack: () => void;
}) {
    const elements = Object.values(model.elements).filter(el =>
        doc.relevantKinds.includes(el.kind)
    );

    const elementsByKind = new Map<string, MemoElement[]>();
    for (const el of elements) {
        if (!elementsByKind.has(el.kind)) elementsByKind.set(el.kind, []);
        elementsByKind.get(el.kind)!.push(el);
    }

    return (
        <div>
            {/* Back button + header */}
            <div style={{ marginBottom: '20px' }}>
                <button onClick={onBack} style={{
                    background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer',
                    fontSize: '13px', padding: 0, marginBottom: '8px',
                }}>
                    &larr; Back to dashboard
                </button>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1B3A4B', margin: 0 }}>
                    {doc.title}
                </h3>
                <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                    {doc.id.toUpperCase()} | {doc.standards.join(', ')}
                </p>
            </div>

            {/* Status summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <MetricCard label="Elements" value={status.elementCount} color="#2563eb" />
                <MetricCard label="Gaps" value={status.gapCount} color={status.gapCount > 0 ? '#dc2626' : '#059669'} />
                <MetricCard label="Status" value={status.status} color={
                    status.status === 'complete' ? '#059669' : status.status === 'partial' ? '#d97706' : '#dc2626'
                } />
            </div>

            {/* Elements by kind */}
            {Array.from(elementsByKind.entries()).sort().map(([kind, els]) => (
                <div key={kind} style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        {kind} ({els.length})
                    </h4>
                    <div style={{
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px',
                        overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f3f4f6' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Name</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Layer</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {els.slice(0, 50).map(el => (
                                    <tr key={el.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 10px', color: '#2563eb', fontWeight: 500 }}>{el.name}</td>
                                        <td style={{ padding: '6px 10px', color: '#6B7280' }}>{el.layer}</td>
                                        <td style={{ padding: '6px 10px', color: '#6B7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {el.doc || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {els.length > 50 && (
                            <div style={{ padding: '8px 10px', fontSize: '11px', color: '#9CA3AF', background: '#f9fafb' }}>
                                ...and {els.length - 50} more
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Violations */}
            {status.violations.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
                        Validation Issues ({status.violations.length})
                    </h4>
                    <div style={{
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px',
                        overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f3f4f6' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Severity</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Rule</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Element</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {status.violations.slice(0, 50).map((v, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 10px' }}>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px',
                                                background: v.severity === 'error' ? '#fef2f2' : '#fffbeb',
                                                color: v.severity === 'error' ? '#dc2626' : '#d97706',
                                            }}>
                                                {v.severity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '6px 10px', color: '#6B7280', fontFamily: 'monospace', fontSize: '11px' }}>{v.ruleId}</td>
                                        <td style={{ padding: '6px 10px', color: '#2563eb' }}>{v.elementName}</td>
                                        <td style={{ padding: '6px 10px', color: '#6B7280' }}>{v.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {elements.length === 0 && (
                <div style={{
                    padding: '40px', textAlign: 'center', color: '#9CA3AF',
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                }}>
                    <p style={{ fontSize: '14px', marginBottom: '4px' }}>No model elements found for this document type.</p>
                    <p style={{ fontSize: '12px' }}>Add elements of kinds: {doc.relevantKinds.join(', ')}</p>
                </div>
            )}
        </div>
    );
}
