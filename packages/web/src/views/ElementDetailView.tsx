// ─── Element Detail View ─────────────────────────────────────────────────────
//
// The full-page element profile. The properties side panel is the same profile
// at panel density — both are assembled from components/element-profile, so a
// change to how a value is edited, or to how relationships are authored, lands
// on both surfaces at once.
//
// Three things this page used to get wrong:
//   • Editable and derived values rendered identically as plain text, so the
//     only way to find out what could be changed was to click and watch.
//   • Relationships were read-only here and the section disappeared entirely
//     when an element had none — precisely when you want to add one.
//   • Everything stacked in one narrow column of same-weight sections, so the
//     name, the violations, and the source path all competed equally.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import {
    EditabilityLegend, EditableValue, ProfileField, ProfileSection, ReadOnlyValue,
} from '../components/element-profile/ProfileValue';
import { ElementRelationships } from '../components/element-profile/ElementRelationships';
import { AnnotationPanel } from '../components/UnifiedPropertiesPanel';
import { fieldEditability } from '../components/element-profile/editability';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';

const DENSITY = 'page' as const;

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

function ScenarioFlowchart({ element, layerColor, onSave }: {
    element: MemoElement;
    layerColor: string;
    onSave: (doc: string) => void;
}) {
    const steps = useMemo(() => parseSteps(element.doc || ''), [element.doc]);
    const [editing, setEditing] = useState(false);

    if (editing || steps.length === 0) {
        return (
            <div>
                <p style={{ fontSize: FONT.xs, color: COLOR.faint, marginBottom: 6, marginTop: 0 }}>
                    One step per line, numbered: <code>1. User does something</code>
                </p>
                <EditableValue
                    value={element.doc || ''}
                    onSave={next => { onSave(next); setEditing(false); }}
                    density={DENSITY}
                    multiline
                    placeholder="Click to add scenario steps…"
                />
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setEditing(true)}
                style={{
                    position: 'absolute', top: 0, right: 0, fontSize: FONT.xs, color: COLOR.muted,
                    padding: '2px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '6px',
                    background: COLOR.surface, cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLOR.border; }}
            >
                ✎ Edit steps
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                <div style={{
                    padding: '6px 20px', borderRadius: '999px', fontSize: FONT.xs, fontWeight: 700,
                    background: layerColor, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                    Start
                </div>

                {steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <Connector color={layerColor} />
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

                <Connector color={layerColor} />
                <div style={{
                    padding: '6px 20px', borderRadius: '999px', fontSize: FONT.xs, fontWeight: 700,
                    background: layerColor + '20', color: layerColor, letterSpacing: '0.06em',
                    textTransform: 'uppercase', border: `1px solid ${layerColor}40`,
                }}>
                    End
                </div>
            </div>
        </div>
    );
}

function Connector({ color }: { color: string }) {
    return (
        <div style={{ width: '2px', height: '20px', background: color + '50', position: 'relative' }}>
            <div style={{
                position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0, borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent', borderTop: `6px solid ${color}80`,
            }} />
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ElementDetailView({ elementId: requestedElementId }: { elementId?: string } = {}) {
    const activeView = useModelStore(s => s.activeView);
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const updateElementField = useModelStore(s => s.updateElementField);
    const updateElementAttribute = useModelStore(s => s.updateElementAttribute);
    const applyEdit = useModelStore(s => s.applyEdit);

    // Scenario and other focused workbenches can host this same canonical
    // profile without changing the application's primary navigation context.
    const elementId = requestedElementId ?? (activeView.type === 'element-detail' ? activeView.elementId : null);
    const element = elementId && model ? model.elements[elementId] : null;

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
    const kindDefinition = model?.registries?.kinds.find(kind => kind.name === element.kind);
    const groupLabel = kindDefinition?.namespace?.[1] ?? kindDefinition?.namespace?.[0];

    // Editing commits straight through, exactly as the side panel does — the
    // two surfaces must not disagree about when a change is saved.
    const saveField = (field: 'doc', next: string) => {
        updateElementField(elementId, field, next);
        applyEdit(elementId);
    };
    const saveAttribute = (key: string, next: string) => {
        updateElementAttribute(elementId, key, next);
        applyEdit(elementId);
    };

    // Name and id already live in the profile header. Repeating them as giant
    // locked attribute fields wastes space and makes the section look broken.
    const attributes = Object.entries(element.attributes)
        .filter(([key]) => key !== 'id' && key !== 'name');
    const isScenario = SCENARIO_KINDS.has(element.kind);

    return (
        <div className="flex-1 overflow-y-auto" style={{ background: '#EEF4F7' }}>
            <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '20px 28px 48px' }}>

                {/* ── Header ── */}
                <header style={{
                    background: COLOR.surface,
                    border: '1px solid rgba(60,60,67,0.12)',
                    borderLeft: `4px solid ${layerColor}`,
                    borderRadius: '16px',
                    padding: '14px 18px',
                    marginBottom: 16,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
                }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                        <span
                            className="px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: layerColor + '18', color: layerColor, fontSize: FONT.xs }}
                        >
                            {element.kind}
                        </span>
                        <span
                            className="px-2 py-0.5 rounded-md"
                            style={{ background: COLOR.surfaceAlt, color: COLOR.muted, fontSize: FONT.xs }}
                        >
                            {element.layer}
                        </span>
                        {groupLabel && (
                            <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                                {groupLabel.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                        )}
                        {element.shortId && (
                            <span style={{
                                marginLeft: 'auto', color: COLOR.faint, fontSize: FONT.xs,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            }}>
                                {element.shortId}
                            </span>
                        )}
                    </div>

                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: COLOR.primary, lineHeight: 1.2, margin: 0 }}>
                        {element.name}
                    </h1>

                    <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px solid ${COLOR.borderLight}` }}>
                        <EditabilityLegend density={DENSITY} />
                    </div>
                </header>

                {/* ── Violations ── */}
                {violations.length > 0 && (
                    <div
                        className="rounded-xl overflow-hidden"
                        style={{ border: '1px solid #FEE2E2', background: '#FEF2F2', marginBottom: 20 }}
                    >
                        <div
                            className="px-4 py-2 font-semibold"
                            style={{ color: '#DC2626', fontSize: FONT.sm, borderBottom: '1px solid #FEE2E2' }}
                        >
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

                {/* ── Description / Flow ── */}
                <ProfileSection
                    title={isScenario ? 'Flow' : 'Description'}
                    density={DENSITY}
                    collapsible={false}
                >
                    {isScenario ? (
                        <ScenarioFlowchart
                            element={element}
                            layerColor={layerColor}
                            onSave={next => saveField('doc', next)}
                        />
                    ) : (
                        <EditableValue
                            value={element.attributes.description || ''}
                            onSave={next => saveAttribute('description', next)}
                            density={DENSITY}
                            multiline
                            placeholder="Click to add a description…"
                        />
                    )}
                </ProfileSection>

                {/* ── Attributes ── */}
                <ProfileSection
                    title="Attributes"
                    count={attributes.length}
                    density={DENSITY}
                    collapsible={false}
                >
                    {attributes.length === 0 && (
                        <p style={{ fontSize: FONT.sm, color: COLOR.faint, margin: 0 }}>
                            This element defines no attributes.
                        </p>
                    )}

                    {attributes.length > 0 && (
                        <div style={{ borderTop: `1px solid ${COLOR.border}`, maxWidth: 900 }}>
                            {attributes.map(([key, value]) => (
                                <div
                                    key={key}
                                    style={{
                                        display: 'grid', gridTemplateColumns: 'minmax(150px, 24%) minmax(0, 1fr)',
                                        gap: 16, alignItems: 'center', padding: '7px 0',
                                        borderBottom: `1px solid ${COLOR.borderLight}`,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ color: COLOR.secondary, fontSize: FONT.sm, fontWeight: 600 }}>{key}</div>
                                        <div style={{ color: COLOR.faint, fontSize: '10px' }}>Editable</div>
                                    </div>
                                    <EditableValue
                                        value={String(value ?? '')}
                                        onSave={next => saveAttribute(key, next)}
                                        density={DENSITY}
                                        placeholder="Add value…"
                                        compact
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </ProfileSection>

                {/* ── Relationships (authorable, with the inline expanded board) ── */}
                <ElementRelationships
                    element={element}
                    outgoing={relationships.outgoing}
                    incoming={relationships.incoming}
                    density={DENSITY}
                />

                {/* Comments, rationales, and notes are model content, so the
                    full element profile must offer the same authoring surface
                    as the diagram-side Properties panel. */}
                <div style={{ background: COLOR.surface, borderRadius: 12, marginBottom: 16 }}>
                    <AnnotationPanel subject={element} />
                </div>

                {/* ── Source ── */}
                <ProfileSection title="Source" density={DENSITY} collapsible={false}>
                    <div style={{ maxWidth: 720 }}>
                        <ProfileField label="SysML source file" editability={fieldEditability('file')} density={DENSITY}>
                            <ReadOnlyValue
                                value={element.file ?? '—'}
                                editability={fieldEditability('file')}
                                density={DENSITY}
                                mono
                            />
                        </ProfileField>
                    </div>
                </ProfileSection>
            </div>
        </div>
    );
}
