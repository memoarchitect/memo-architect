import { useState, useMemo } from 'react';
import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { LAYER_COLORS, KIND_TO_GROUP } from '../constants';
import { FONT, COLOR, SHADOW } from '../styles/tokens';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';

// ─── Scenario kinds ───────────────────────────────────────────────────────────
const SCENARIO_KINDS = new Set(['Scenario', 'UseCase', 'UserActivity']);

interface ScenarioStep { index: number; text: string; }

function parseSteps(doc: string): ScenarioStep[] {
    if (!doc) return [];
    return doc.split('\n')
        .filter(l => l.trim())
        .map((line, i) => {
            const match = line.match(/^\d+\.\s*(.*)/);
            return { index: i, text: match ? match[1].trim() : line.trim() };
        });
}

// ─── Scenario Flowchart ───────────────────────────────────────────────────────
function ScenarioFlowchart({ element, layerColor }: { element: MemoElement; layerColor: string }) {
    const steps = useMemo(() => parseSteps(element.doc || ''), [element.doc]);
    const [editingDoc, setEditingDoc] = useState(false);
    const updateElementField = useModelStore(s => s.updateElementField);
    const applyEdit = useModelStore(s => s.applyEdit);
    const pendingEdits = useModelStore(s => s.pendingEdits);
    const pendingEdit = pendingEdits.get(element.id);
    const currentDoc = pendingEdit?.doc ?? element.doc ?? '';

    if (steps.length === 0 && !editingDoc) {
        return (
            <div
                className="rounded-lg p-4 cursor-pointer text-center"
                style={{ background: layerColor + '08', border: `1px dashed ${layerColor}40`, color: COLOR.faint, fontSize: FONT.sm }}
                onClick={() => setEditingDoc(true)}
            >
                No steps defined. Click to add scenario steps (one per line, numbered).
            </div>
        );
    }

    if (editingDoc) {
        const handleSave = () => {
            applyEdit(element.id);
            setEditingDoc(false);
        };
        return (
            <div>
                <p style={{ fontSize: FONT.xs, color: COLOR.faint, marginBottom: '6px' }}>
                    Enter numbered steps, one per line: <code>1. User does something</code>
                </p>
                <textarea
                    value={currentDoc}
                    onChange={e => updateElementField(element.id, 'doc', e.target.value)}
                    className="w-full rounded-lg p-3 focus:outline-none"
                    style={{ border: `1px solid ${COLOR.accent}`, background: COLOR.surface, color: COLOR.primary, fontSize: FONT.sm, minHeight: '120px', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.7 }}
                    autoFocus
                />
                <div className="flex gap-2 mt-2">
                    <button onClick={handleSave} className="px-3 py-1.5 rounded-md font-medium" style={{ background: COLOR.accent, color: COLOR.accentDark, fontSize: FONT.xs }}>Save</button>
                    <button onClick={() => setEditingDoc(false)} className="px-3 py-1.5 rounded-md" style={{ color: COLOR.muted, fontSize: FONT.xs, border: `1px solid ${COLOR.border}` }}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Edit button */}
            <button
                onClick={() => setEditingDoc(true)}
                style={{ position: 'absolute', top: 0, right: 0, fontSize: FONT.xs, color: COLOR.faint, padding: '2px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', background: COLOR.surface, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLOR.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLOR.border}
            >
                Edit steps
            </button>

            {/* Flowchart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: '4px' }}>
                {/* Start node */}
                <div style={{
                    padding: '6px 20px', borderRadius: '999px', fontSize: FONT.xs, fontWeight: 700,
                    background: layerColor, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                    Start
                </div>

                {steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {/* Arrow */}
                        <div style={{ width: '2px', height: '20px', background: layerColor + '50', position: 'relative' }}>
                            <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${layerColor}80` }} />
                        </div>

                        {/* Step box */}
                        <div style={{
                            width: '100%', maxWidth: '560px',
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            background: COLOR.surface, border: `1px solid ${layerColor}30`,
                            borderRadius: '8px', padding: '10px 14px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}>
                            <span style={{
                                flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: layerColor + '18', color: layerColor, fontSize: FONT.xs, fontWeight: 700,
                            }}>
                                {idx + 1}
                            </span>
                            <span style={{ fontSize: FONT.sm, color: COLOR.primary, lineHeight: 1.5, paddingTop: '3px' }}>
                                {step.text}
                            </span>
                        </div>
                    </div>
                ))}

                {/* End arrow + node */}
                <div style={{ width: '2px', height: '20px', background: layerColor + '50', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${layerColor}80` }} />
                </div>
                <div style={{
                    padding: '6px 20px', borderRadius: '999px', fontSize: FONT.xs, fontWeight: 700,
                    background: layerColor + '20', color: layerColor, letterSpacing: '0.06em', textTransform: 'uppercase',
                    border: `1px solid ${layerColor}40`,
                }}>
                    End
                </div>
            </div>
        </div>
    );
}

// ─── Element Detail View ─────────────────────────────────────────────────────
// Full-page element detail displayed in the main canvas area.
// Shows editable description, attributes, and relationships.

export function ElementDetailView() {
    const activeView = useModelStore(s => s.activeView);
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);
    const updateElementField = useModelStore(s => s.updateElementField);
    const updateElementAttribute = useModelStore(s => s.updateElementAttribute);
    const cancelEdit = useModelStore(s => s.cancelEdit);
    const applyEdit = useModelStore(s => s.applyEdit);
    const pendingEdits = useModelStore(s => s.pendingEdits);

    const elementId = activeView.type === 'element-detail' ? activeView.elementId : null;
    const element = elementId && model ? model.elements[elementId] : null;

    const [editingDoc, setEditingDoc] = useState(false);
    const [editingAttrKey, setEditingAttrKey] = useState<string | null>(null);

    const relationships = useMemo(() => {
        if (!model || !elementId) return { incoming: [] as MemoRelationship[], outgoing: [] as MemoRelationship[] };
        const all = getRelationshipsForElement(model, elementId);
        return {
            incoming: all.filter(r => r.targetId === elementId),
            outgoing: all.filter(r => r.sourceId === elementId),
        };
    }, [model, elementId]);

    const violations = useMemo(() => {
        if (!validation || !elementId) return [];
        return validation.violations.filter(v => v.elementId === elementId);
    }, [validation, elementId]);

    if (!element || !elementId) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: COLOR.surfaceAlt }}>
                <div className="text-center" style={{ color: COLOR.faint }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📄</div>
                    <p style={{ fontSize: FONT.md }}>Select an element to view details</p>
                </div>
            </div>
        );
    }

    const layerColor = LAYER_COLORS[element.layer] || COLOR.muted;
    const group = KIND_TO_GROUP[element.kind];
    const pendingEdit = pendingEdits.get(elementId);
    const currentDoc = pendingEdit?.doc ?? element.doc ?? '';
    const hasPendingChanges = pendingEdits.has(elementId);

    const handleSave = () => {
        applyEdit(elementId);
        setEditingDoc(false);
        setEditingAttrKey(null);
    };

    const resolveElementName = (id: string): string => {
        if (!model) return id;
        const el = model.elements[id];
        return el ? el.name : id;
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ background: COLOR.surfaceAlt }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 40px' }}>

                {/* ── Header ── */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="px-2 py-1 rounded font-semibold"
                                style={{
                                    background: layerColor + '18',
                                    color: layerColor,
                                    fontSize: FONT.sm,
                                }}
                            >
                                {element.kind}
                            </span>
                            <span
                                className="px-2 py-1 rounded"
                                style={{
                                    background: (group?.color || COLOR.muted) + '12',
                                    color: group?.color || COLOR.muted,
                                    fontSize: FONT.xs,
                                }}
                            >
                                {element.layer}
                            </span>
                            {group && (
                                <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                                    {group.label}
                                </span>
                            )}
                        </div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: COLOR.primary,
                            lineHeight: 1.3,
                        }}>
                            {element.name}
                        </h1>
                        <p className="mt-1" style={{ color: COLOR.faint, fontSize: FONT.xs, fontFamily: 'monospace' }}>
                            {element.id}
                        </p>
                    </div>

                    {/* Action buttons */}
                    {hasPendingChanges && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => cancelEdit(elementId)}
                                className="px-4 py-2 rounded-lg font-medium transition-all"
                                style={{
                                    background: COLOR.surface,
                                    color: COLOR.muted,
                                    fontSize: FONT.sm,
                                    border: `1px solid ${COLOR.border}`,
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = COLOR.accent}
                                onMouseLeave={e => e.currentTarget.style.borderColor = COLOR.border}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg font-medium transition-all"
                                style={{
                                    background: COLOR.accent,
                                    color: COLOR.accentDark,
                                    fontSize: FONT.sm,
                                    boxShadow: SHADOW.sm,
                                }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = SHADOW.md}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = SHADOW.sm}
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Violations ── */}
                {violations.length > 0 && (
                    <div
                        className="rounded-lg mb-6 overflow-hidden"
                        style={{ border: '1px solid #FEE2E2', background: '#FEF2F2' }}
                    >
                        <div className="px-4 py-2 font-medium" style={{ color: '#DC2626', fontSize: FONT.sm, borderBottom: '1px solid #FEE2E2' }}>
                            {violations.length} violation{violations.length !== 1 ? 's' : ''}
                        </div>
                        {violations.map((v, i) => (
                            <div key={i} className="px-4 py-2 flex items-center gap-2" style={{ fontSize: FONT.xs }}>
                                <span style={{ color: '#DC2626' }}>✖</span>
                                <span style={{ color: COLOR.faint }}>[{v.ruleId}]</span>
                                <span style={{ color: '#991B1B' }}>{v.description}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Scenario Flowchart (for Scenario/UseCase/UserActivity kinds) ── */}
                {SCENARIO_KINDS.has(element.kind) && (
                    <Section title="Flow">
                        <ScenarioFlowchart element={element} layerColor={layerColor} />
                    </Section>
                )}

                {/* ── Description (editable) — hidden for scenarios since steps ARE the description ── */}
                {!SCENARIO_KINDS.has(element.kind) && <Section title="Description">
                    {editingDoc ? (
                        <div>
                            <textarea
                                value={currentDoc}
                                onChange={e => updateElementField(elementId, 'doc', e.target.value)}
                                className="w-full rounded-lg p-3 focus:outline-none focus:ring-2"
                                style={{
                                    border: `1px solid ${COLOR.border}`,
                                    background: COLOR.surface,
                                    color: COLOR.primary,
                                    fontSize: FONT.md,
                                    minHeight: '120px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.6,
                                    // @ts-ignore
                                    '--tw-ring-color': COLOR.accent,
                                }}
                                autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 rounded-md font-medium"
                                    style={{ background: COLOR.accent, color: COLOR.accentDark, fontSize: FONT.xs }}
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditingDoc(false)}
                                    className="px-3 py-1.5 rounded-md"
                                    style={{ color: COLOR.muted, fontSize: FONT.xs, border: `1px solid ${COLOR.border}` }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="rounded-lg p-4 cursor-pointer transition-all"
                            style={{
                                background: COLOR.surface,
                                border: `1px solid ${COLOR.border}`,
                                minHeight: '60px',
                                color: currentDoc ? COLOR.primary : COLOR.faint,
                                fontSize: FONT.md,
                                lineHeight: 1.6,
                            }}
                            onClick={() => setEditingDoc(true)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = COLOR.accent}
                            onMouseLeave={e => e.currentTarget.style.borderColor = COLOR.border}
                            title="Click to edit"
                        >
                            {currentDoc || 'Click to add a description...'}
                        </div>
                    )}
                </Section>}

                {/* ── Attributes ── */}
                <Section title="Attributes">
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surface }}>
                        <table className="w-full" style={{ fontSize: FONT.sm }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surfaceAlt }}>
                                    <th className="text-left px-4 py-2 font-medium" style={{ color: COLOR.secondary, width: '35%' }}>Key</th>
                                    <th className="text-left px-4 py-2 font-medium" style={{ color: COLOR.secondary }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(element.attributes).length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3 text-center" style={{ color: COLOR.faint }}>
                                            No attributes
                                        </td>
                                    </tr>
                                )}
                                {Object.entries(element.attributes).map(([key, value]) => {
                                    const displayValue = pendingEdit?.attributes?.[key] ?? value;
                                    const isEditing = editingAttrKey === key;
                                    return (
                                        <tr key={key} style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                                            <td className="px-4 py-2" style={{ color: COLOR.secondary, fontFamily: 'monospace', fontSize: FONT.xs }}>
                                                {key}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={displayValue}
                                                        onChange={e => updateElementAttribute(elementId, key, e.target.value)}
                                                        onBlur={() => setEditingAttrKey(null)}
                                                        onKeyDown={e => { if (e.key === 'Enter') setEditingAttrKey(null); }}
                                                        className="w-full px-2 py-1 rounded focus:outline-none"
                                                        style={{
                                                            border: `1px solid ${COLOR.accent}`,
                                                            color: COLOR.primary,
                                                            fontSize: FONT.sm,
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        className="cursor-pointer block px-2 py-1 rounded"
                                                        style={{ color: COLOR.primary }}
                                                        onClick={() => setEditingAttrKey(key)}
                                                        onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        title="Click to edit"
                                                    >
                                                        {displayValue || <span style={{ color: COLOR.faint }}>—</span>}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ── Relationships ── */}
                {(relationships.outgoing.length > 0 || relationships.incoming.length > 0) && (
                    <Section title="Relationships">
                        {relationships.outgoing.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-medium mb-2" style={{ color: COLOR.secondary, fontSize: FONT.sm }}>
                                    Outgoing ({relationships.outgoing.length})
                                </h4>
                                <div className="space-y-1">
                                    {relationships.outgoing.map((rel, i) => (
                                        <RelationshipRow
                                            key={i}
                                            rel={rel}
                                            direction="out"
                                            resolveName={resolveElementName}
                                            onNavigate={selectElement}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {relationships.incoming.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2" style={{ color: COLOR.secondary, fontSize: FONT.sm }}>
                                    Incoming ({relationships.incoming.length})
                                </h4>
                                <div className="space-y-1">
                                    {relationships.incoming.map((rel, i) => (
                                        <RelationshipRow
                                            key={i}
                                            rel={rel}
                                            direction="in"
                                            resolveName={resolveElementName}
                                            onNavigate={selectElement}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>
                )}

                {/* ── Source Info ── */}
                {element.file && (
                    <Section title="Source">
                        <div
                            className="rounded-lg px-4 py-3"
                            style={{
                                background: COLOR.surface,
                                border: `1px solid ${COLOR.border}`,
                                fontSize: FONT.xs,
                                fontFamily: 'monospace',
                                color: COLOR.secondary,
                            }}
                        >
                            {element.file}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h3
                className="font-semibold mb-3"
                style={{ color: COLOR.primary, fontSize: FONT.lg, letterSpacing: '-0.01em' }}
            >
                {title}
            </h3>
            {children}
        </div>
    );
}

function RelationshipRow({ rel, direction, resolveName, onNavigate }: {
    rel: MemoRelationship;
    direction: 'in' | 'out';
    resolveName: (id: string) => string;
    onNavigate: (id: string) => void;
}) {
    const targetId = direction === 'out' ? rel.targetId : rel.sourceId;
    const targetName = resolveName(targetId);
    const relColor = LAYER_COLORS[rel.type] || COLOR.accent;

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
            style={{
                background: COLOR.surface,
                border: `1px solid ${COLOR.border}`,
                fontSize: FONT.sm,
            }}
            onClick={() => onNavigate(targetId)}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = COLOR.accent;
                e.currentTarget.style.boxShadow = SHADOW.sm;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLOR.border;
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                {direction === 'out' ? '→' : '←'}
            </span>
            <span
                className="px-1.5 py-0.5 rounded font-medium"
                style={{ background: relColor + '15', color: relColor, fontSize: FONT.badge }}
            >
                {rel.type}
            </span>
            <span className="flex-1 truncate font-medium" style={{ color: COLOR.accentDark }}>
                {targetName}
            </span>
            <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                ›
            </span>
        </div>
    );
}
