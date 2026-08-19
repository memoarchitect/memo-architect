import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    useModelStore, getRelationshipsForElement, getDiagram, getRegistries,
    getElementSourceFiles, sourceChangeAffects,
} from '../store/model-store';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import { ElementRelationships } from './element-profile/ElementRelationships';
import { SelectionStyleSection } from './SelectionStyleSection';
import { EditableValue, ReadOnlyValue } from './element-profile/ProfileValue';
import { attributeEditability, isEditable } from './element-profile/editability';
import type { Density } from './element-profile/density';

/** This panel is the compact rendering of the same profile as ElementDetailView. */
const PANEL_DENSITY: Density = 'panel';

// ─── Collapsible Section (mirrors ModelExplorer layer header) ──────────────

function Section({ title, count, defaultOpen = true, actions, children }: {
    title: string;
    count?: number;
    defaultOpen?: boolean;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="mb-3 mx-3 bg-white border border-gray-200/60 rounded-xl shadow-sm overflow-hidden">
            <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => setOpen(o => !o)}
            >
                <span className="font-bold flex-1 text-[10px] uppercase tracking-wider" style={{ color: '#6B7280' }}>{title}</span>
                {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
                {typeof count === 'number' && <span className="px-1.5 py-0.5 rounded-md font-medium text-[10px]" style={{ background: '#F3F4F6', color: '#6B7280' }}>{count}</span>}
                <span style={{ color: '#D1D5DB', fontSize: 14 }}>{open ? '▾' : '▸'}</span>
            </div>
            {open && <div className="px-3 pb-3 pt-1">{children}</div>}
        </div>
    );
}

// ─── Tree row (mirrors ModelExplorer element row) ──────────────────────────

function TreeRow({ label, kind, kindColor, onClick, arrow, typeBadge, typeColor, selected }: {
    label: string;
    kind?: string;
    kindColor?: string;
    onClick?: () => void;
    arrow?: '→' | '←';
    typeBadge?: string;
    typeColor?: string;
    selected?: boolean;
}) {
    return (
        <div
            className="flex items-center gap-1.5 cursor-pointer transition-colors ml-2"
            style={{
                borderRadius: '6px',
                padding: '4px 8px',
                background: selected ? '#2DD4A818' : 'transparent',
                color: selected ? '#1B3A4B' : '#374151',
                fontWeight: selected ? 500 : 400,
                fontSize: FONT.xs,
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
            onClick={onClick}
        >
            {arrow && <span style={{ color: '#9CA3AF' }}>{arrow}</span>}
            {typeBadge && (
                <span className="px-1 py-0.5 rounded" style={{
                    background: (typeColor || '#2563EB') + '18',
                    color: typeColor || '#2563EB',
                    fontSize: FONT.xs,
                }}>{typeBadge}</span>
            )}
            <span className="truncate">{label}</span>
            {kind && (
                <span className="ml-auto flex-shrink-0 px-1 py-0.5 rounded" style={{
                    background: (kindColor || '#666') + '15',
                    color: kindColor || '#666',
                    fontSize: FONT.badge,
                }}>{kind}</span>
            )}
        </div>
    );
}

// ─── Diagram Properties ─────────────────────────────────────────────────────

function DiagramProperties() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const diagramId = activeView.type === 'diagram' ? activeView.diagramId : null;
    const diagram = getDiagram(model, diagramId);

    if (!diagram) return null;

    const meta = DIAGRAM_TYPE_META[diagram.diagramType];
    const sectionStyle = { borderBottom: '1px solid #EDEDEA' };

    return (
        <>
            <div className="p-5 mb-2" style={{ background: '#FFFFFF', borderBottom: '1px solid #F3F4F6', borderLeft: `4px solid ${meta?.color || '#6B7280'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div className="text-sm font-bold truncate" style={{ color: '#111827' }}>{diagram.name}</div>
                <div className="flex items-center gap-2 text-xs mt-2">
                    {meta && (
                        <span className="px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: meta.color + '18', color: meta.color }}>
                            {meta.code}
                        </span>
                    )}
                    <span style={{ color: '#6B7280', fontWeight: 500 }}>{meta?.fullName || diagram.diagramType}</span>
                </div>
                {diagram.auto && <div className="text-xs mt-2 font-medium" style={{ color: '#9CA3AF' }}>Auto-generated</div>}
            </div>

            <div className="flex-1 overflow-y-auto pt-2 pb-4 bg-gray-50/50">
                {diagram.description && (
                    <Section title="Description" defaultOpen>
                        <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>{diagram.description}</div>
                    </Section>
                )}

                <Section title="Details" defaultOpen>
                    <div className="space-y-1.5">
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>ID</span>
                            <span className="truncate font-mono" style={{ color: '#1a1a1a', fontSize: FONT.xs }}>{diagram.shortId ?? diagram.id}</span>
                        </div>
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>Viewpoint</span>
                            <span style={{ color: '#1a1a1a' }}>{diagram.viewpointId}</span>
                        </div>
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>Type</span>
                            <span style={{ color: '#1a1a1a' }}>{diagram.diagramType}</span>
                        </div>
                        {diagram.sourceFile && (
                            <div className="flex text-xs">
                                <span className="min-w-[80px]" style={{ color: '#6B7280' }}>Source file</span>
                                <span className="truncate font-mono" title={diagram.sourceFile} style={{ color: '#1a1a1a', fontSize: FONT.xs }}>
                                    {diagram.sourceFile}
                                </span>
                            </div>
                        )}
                    </div>
                </Section>

                {diagram.properties && Object.keys(diagram.properties).length > 0 && (
                    <Section title="Properties" count={Object.keys(diagram.properties).length}>
                        <div className="space-y-1.5">
                            {Object.entries(diagram.properties).map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="min-w-[80px]" style={{ color: '#6B7280' }}>{key}</span>
                                    <span className="truncate" style={{ color: '#1a1a1a' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {diagram.elementIds && diagram.elementIds.length > 0 && (
                    <Section title="Scoped Elements" count={diagram.elementIds.length} defaultOpen={false}>
                        <div className="text-xs" style={{ color: '#6B7280' }}>{diagram.elementIds.join(', ')}</div>
                    </Section>
                )}

                {diagram.relationshipTypes && diagram.relationshipTypes.length > 0 && (
                    <Section title="Relationship Types" count={diagram.relationshipTypes.length}>
                        <div className="flex flex-wrap gap-1">
                            {diagram.relationshipTypes.map(rt => (
                                <span key={rt} className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ background: '#EFF6FF', color: '#2563EB', fontSize: FONT.xs }}>
                                    {rt}
                                </span>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}

// ─── Relationships Section ──────────────────────────────────────────────────

/**
 * Model relationships of the selected element: existing links in both
 * directions, authoring of new ones, and removal where the project permits it.
 *
 * Every relationship shown here is a semantic model fact backed by project
 * SysML — pending rows are marked as such and are never mistaken for one.
 */
// ─── Source freshness ───────────────────────────────────────────────────────

/** How long the reload confirmation stays on screen. */
const FRESHNESS_BADGE_MS = 4000;

/**
 * Confirms that this element was rebuilt because its source moved.
 *
 * "Its source" is the closure: the element's own file plus everything that
 * file imports — a change in an imported package can redefine the element's
 * kind or supertype without its own file being touched at all.
 */
function SourceFreshness({ elementId }: { elementId: string }) {
    const model = useModelStore(s => s.model);
    const lastSourceChange = useModelStore(s => s.lastSourceChange);
    const [shownAt, setShownAt] = useState<number | null>(null);

    const dependencies = useMemo(
        () => getElementSourceFiles(model, elementId),
        [model, elementId]);

    useEffect(() => {
        if (!sourceChangeAffects(lastSourceChange, dependencies)) return;
        setShownAt(lastSourceChange!.at);
        const timer = setTimeout(() => setShownAt(null), FRESHNESS_BADGE_MS);
        return () => clearTimeout(timer);
    // Keyed on seq so a repeat change to the same file shows again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSourceChange?.seq]);

    useEffect(() => { setShownAt(null); }, [elementId]);

    if (!shownAt) return null;
    return (
        <span
            title="A source file this element depends on changed; the model was rebuilt"
            className="px-1.5 rounded"
            style={{ fontSize: FONT.badge, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}
        >
            ↻ Updated
        </span>
    );
}

// ─── Element Properties ─────────────────────────────────────────────────────

function ElementProperties() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);
    const updateElementField = useModelStore(s => s.updateElementField);
    const updateElementAttribute = useModelStore(s => s.updateElementAttribute);
    const applyEdit = useModelStore(s => s.applyEdit);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);

    const [attrEditMode, setAttrEditMode] = useState(false);

    useEffect(() => { setAttrEditMode(false); }, [selectedElementId]);

    useEffect(() => {
        if (!selectedElementId) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                applyEdit(selectedElementId);
                setAttrEditMode(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedElementId, applyEdit]);

    const relationships = useMemo(
        () => selectedElementId && model ? getRelationshipsForElement(model, selectedElementId) : [],
        [model, selectedElementId],
    );

    if (!selectedElementId || !model) return null;

    const element = model.elements[selectedElementId];
    if (!element) return null;

    const outgoing = relationships.filter(r => r.sourceId === selectedElementId);
    const incoming = relationships.filter(r => r.targetId === selectedElementId);
    const layerColor = LAYER_COLORS[element.layer] || '#666';

    const violations = validation?.violations.filter(v => v.elementId === selectedElementId) || [];
    
    const appearanceKeys = new Set([
        'boundaryColor', 'boundaryOpacity', 'boundaryWidth', 
        'fill', 'stroke', 'opacity', 'color', 'backgroundColor',
        'bounds.x', 'bounds.y', 'bounds.width', 'bounds.height'
    ]);
    const attrs = [
        ['id', element.id],
        ...( (element as any).uuid ? [['uuid', (element as any).uuid]] : []),
        ['kind', element.kind],
        ['layer', element.layer],
        ...Object.entries(element.attributes).filter(([k]) => k !== 'name' && k !== 'id' && !appearanceKeys.has(k) && k !== 'description' && k !== 'shortDescription')
    ];
    const appearanceAttrs = Object.entries(element.attributes).filter(([k]) => appearanceKeys.has(k));

    const handleAttrSave = (key: string, newValue: string) => {
        updateElementAttribute(selectedElementId, key, newValue);
        applyEdit(selectedElementId);
    };

    const handleNameSave = (newValue: string) => {
        const name = newValue.trim();
        if (!name || name === element.name) return;
        updateElementField(selectedElementId, 'name', name);
        applyEdit(selectedElementId);
    };

    return (
        <>
            <div className="p-5 mb-2 relative group" style={{ background: '#FFFFFF', borderBottom: '1px solid #F3F4F6', borderLeft: `4px solid ${layerColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 pr-4 min-w-0 flex-1">
                        <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-bold leading-tight" style={{ color: '#111827' }}>
                                <EditableValue value={element.name} onSave={handleNameSave} density={PANEL_DENSITY} placeholder="Element name" />
                            </div>
                            <div className="text-sm font-medium mt-3 text-gray-700">
                                <EditableValue
                                    value={element.attributes.shortDescription || ''}
                                    onSave={newValue => handleAttrSave('shortDescription', newValue)}
                                    density={PANEL_DENSITY}
                                    multiline
                                    placeholder="Add a short description..."
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                <EditableValue
                                    value={element.attributes.description || ''}
                                    onSave={newValue => handleAttrSave('description', newValue)}
                                    density={PANEL_DENSITY}
                                    multiline
                                    placeholder="Add a detailed description..."
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => void navigator.clipboard.writeText(element.id)}
                            title={`Copy ID: ${element.id}`}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button
                            onClick={() => void deleteModelElement(element.id)}
                            title="Delete element"
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-2 pb-6 bg-gray-50/50">

                {element.parameters && element.parameters.length > 0 && (
                    <Section title="Parameters" count={element.parameters.length}>
                        <div className="space-y-1.5">
                            {element.parameters.map((param: any) => (
                                <div key={param.name} className="flex items-center gap-2 text-xs">
                                    <span className="px-1.5 py-0.5 rounded font-mono" style={{
                                        fontSize: '10px',
                                        background: param.direction === 'in' ? '#EFF6FF' : param.direction === 'out' ? '#FFF7ED' : '#F0FDF4',
                                        color: param.direction === 'in' ? '#2563EB' : param.direction === 'out' ? '#EA580C' : '#16A34A',
                                    }}>{param.direction}</span>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{param.name}</span>
                                    <span style={{ color: '#6B7280' }}>:</span>
                                    <span style={{ color: '#6B7280' }}>{param.type}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {element.allocatedTo && (
                    <Section title="Allocated To" defaultOpen>
                        <TreeRow
                            label={model.elements[element.allocatedTo]?.name || element.allocatedTo}
                            kind={model.elements[element.allocatedTo]?.kind}
                            kindColor="#E67E22"
                            arrow="→"
                            onClick={() => selectElement(element.allocatedTo!)}
                        />
                    </Section>
                )}

                {appearanceAttrs.length > 0 && (
                    <Section title="Appearance" count={appearanceAttrs.length} defaultOpen={false}>
                        <div className="space-y-1.5">
                            {appearanceAttrs.map(([key, value]) => {
                                const editability = attributeEditability(key);
                                return (
                                    <div key={key} className="flex text-xs items-start gap-1.5">
                                        <span className="min-w-[100px] pt-0.5" style={{ color: '#6B7280' }}>{key}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {key === 'boundaryColor' ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        aria-label="Boundary color" 
                                                        type="color" 
                                                        value={/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#14B8A6'}
                                                        onChange={event => {
                                                            const domNode = document.getElementById(`screen-node-${element.id}`);
                                                            if (domNode) domNode.style.borderColor = event.target.value;
                                                        }}
                                                        onBlur={event => handleAttrSave(key, event.target.value)}
                                                        style={{ width: 28, height: 24, padding: 0, border: '1px solid #D8D8D2', borderRadius: 4, background: '#FFFFFF' }} 
                                                    />
                                                    <span className="font-mono text-[10px] text-gray-500">{String(value)}</span>
                                                </div>
                                            ) : key === 'boundaryWidth' ? (
                                                <div className="flex items-center gap-3 pr-2">
                                                    <input 
                                                        aria-label="Boundary width" 
                                                        type="range" min="1" max="10" step="1" 
                                                        defaultValue={Number(value ?? '2')}
                                                        onChange={event => {
                                                            const domNode = document.getElementById(`screen-node-${element.id}`);
                                                            if (domNode) domNode.style.borderWidth = event.target.value + 'px';
                                                        }}
                                                        onMouseUp={event => handleAttrSave(key, (event.target as HTMLInputElement).value)}
                                                        style={{ width: '100%' }} 
                                                    />
                                                    <span className="font-mono text-[10px] text-gray-500 w-6">{value}px</span>
                                                </div>
                                            ) : isEditable(editability) ? (
                                                <EditableValue
                                                    value={String(value ?? '')}
                                                    onSave={newVal => handleAttrSave(key, newVal)}
                                                    density={PANEL_DENSITY}
                                                    placeholder="Click to set…"
                                                />
                                            ) : (
                                                <ReadOnlyValue
                                                    value={String(value ?? '')}
                                                    editability={editability}
                                                    density={PANEL_DENSITY}
                                                    mono={key !== 'kind' && key !== 'layer'}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {attrs.length > 0 && (
                    <Section title="Attributes" count={attrs.length} defaultOpen={false}>
                        <div className="space-y-1.5">
                            {attrs.map(([key, value]) => {
                                const editability = attributeEditability(key);
                                return (
                                    <div key={key} className="flex text-xs items-start gap-1.5">
                                        <span className="min-w-[100px] pt-0.5" style={{ color: '#6B7280' }}>{key}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {isEditable(editability) ? (
                                                <EditableValue
                                                    value={String(value ?? '')}
                                                    onSave={newVal => handleAttrSave(key, newVal)}
                                                    density={PANEL_DENSITY}
                                                    multiline={key === 'description' || key === 'rationale'}
                                                    placeholder="Click to set…"
                                                />
                                            ) : (
                                                <ReadOnlyValue
                                                    value={String(value ?? '')}
                                                    editability={editability}
                                                    density={PANEL_DENSITY}
                                                    mono={key !== 'kind' && key !== 'layer'}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}



                <AnnotationPanel subject={element} />

                {violations.length > 0 && (
                    <Section title="Guidance" count={violations.length} defaultOpen>
                        <div className="space-y-2">
                            {violations.map((v, i) => (
                                <div
                                    key={`${v.ruleId}-${i}`}
                                    className="text-xs p-2.5 rounded-lg"
                                    style={{
                                        background: v.severity === 'error' ? '#FEF2F2' : v.severity === 'warning' ? '#FFFBEB' : '#EFF6FF',
                                        border: `1px solid ${v.severity === 'error' ? '#FECACA' : v.severity === 'warning' ? '#FDE68A' : '#BFDBFE'}`,
                                    }}
                                >
                                    <div style={{ color: v.severity === 'error' ? '#DC2626' : v.severity === 'warning' ? '#D97706' : '#2563EB' }}>
                                        {v.description}
                                    </div>
                                    <div className="mt-0.5" style={{ color: '#6B7280' }}>[{v.ruleId}]</div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {violations.length === 0 && (
                    <div className="p-4">
                        <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                            <span>&#10003;</span> All rules satisfied
                        </div>
                    </div>
                )}

                {element.file && (
                    <Section
                        title="Source"
                        defaultOpen={false}
                        actions={<SourceFreshness elementId={selectedElementId} />}
                    >
                        <button
                            className="flex items-center gap-1.5 text-xs w-full text-left rounded px-1 py-0.5 transition-colors"
                            style={{ color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer', wordBreak: 'break-all' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            onClick={() => {
                                navigator.clipboard.writeText(element.file!).catch(() => {});
                            }}
                            title="Click to copy path"
                        >
                            <span style={{ flexShrink: 0 }}>⟨/⟩</span>
                            <span className="font-mono truncate">
                                {element.file}
                            </span>
                            <span style={{ flexShrink: 0, color: '#9CA3AF', fontSize: '9px' }}>copy</span>
                        </button>
                    </Section>
                )}

                <ElementRelationships
                    element={element}
                    outgoing={outgoing}
                    incoming={incoming}
                    density={PANEL_DENSITY}
                />
            </div>
        </>
    );
}

type AnnotationType = 'comment' | 'rationale' | 'note';

const ANNOTATION_TYPES: Record<AnnotationType, {
    kind: string; relation: string; label: string; placeholder: string;
}> = {
    comment: { kind: 'ModelComment', relation: 'CommentsOn', label: 'comment', placeholder: 'Comment' },
    rationale: { kind: 'ModelRationale', relation: 'RationaleFor', label: 'rationale', placeholder: 'Engineering rationale' },
    note: { kind: 'ModelNote', relation: 'NotesOn', label: 'note', placeholder: 'Note' },
};

export function AnnotationPanel({ subject }: { subject: MemoElement }) {
    const model = useModelStore(s => s.model);
    const createModelElement = useModelStore(s => s.createModelElement);
    const createRelationship = useModelStore(s => s.createRelationship);
    const persistElementAttributes = useModelStore(s => s.persistElementAttributes);
    const [summary, setSummary] = useState('');
    const [body, setBody] = useState('');
    const [author, setAuthor] = useState('');
    const [annotationType, setAnnotationType] = useState<AnnotationType | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [qualifier, setQualifier] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    if (!model) return null;

    const relationTypes = new Set(Object.values(ANNOTATION_TYPES).map(value => value.relation.toLowerCase()));
    const annotationIds = new Set(model.relationships
        .filter(rel => relationTypes.has(rel.type.toLowerCase()) && rel.targetId === subject.id)
        .map(rel => rel.sourceId));
    const annotations = [...annotationIds].map(id => model.elements[id]).filter((value): value is MemoElement => !!value);
    const replies = new Map<string, MemoElement[]>();
    for (const rel of model.relationships.filter(rel => rel.type.toLowerCase() === 'composes')) {
        if (model.elements[rel.sourceId]?.kind !== 'ModelComment' || model.elements[rel.targetId]?.kind !== 'ModelComment') continue;
        replies.set(rel.sourceId, [...(replies.get(rel.sourceId) ?? []), model.elements[rel.targetId]]);
    }

    const saveAnnotation = async () => {
        if (!body.trim()) return;
        const selectedType: AnnotationType = replyTo ? 'comment' : (annotationType ?? 'comment');
        setMessage('Saving…');
        const config = ANNOTATION_TYPES[selectedType];
        const title = summary.trim() || `Model ${config.label}`;
        const id = createModelElement({
            name: title,
            kind: config.kind,
            construct: 'part',
            layer: subject.layer,
            file: subject.file || 'model/generated.sysml',
            doc: '',
            attributes: {
                shortDescription: title,
                body: body.trim(),
                author: author.trim() || 'currentReviewer',
                createdAt: new Date().toISOString(),
                ...(selectedType === 'comment' ? { commentStatus: 'CommentStatusKind::open' } : {}),
                ...(selectedType === 'rationale' && qualifier.trim() ? { basis: qualifier.trim() } : {}),
                ...(selectedType === 'note' && qualifier.trim() ? { noteKind: qualifier.trim() } : {}),
            },
        });
        try {
            const optimistic = useModelStore.getState().model?.elements[id];
            const deadline = Date.now() + 10000;
            while (useModelStore.getState().model?.elements[id] === optimistic && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const canonical = useModelStore.getState().model?.elements[id];
            if (!canonical || canonical === optimistic) throw new Error('The saved annotation did not appear in the rebuilt model.');
            const result = await createRelationship({
                type: replyTo ? 'Composes' : config.relation,
                sourceId: replyTo ?? id,
                targetId: replyTo ? id : subject.id,
                direction: 'outgoing',
                selectedElementId: replyTo ?? id,
            });
            if (!result.success) throw new Error(result.error);
            setSummary('');
            setBody('');
            setQualifier('');
            setReplyTo(null);
            setAnnotationType(null);
            setMessage('Saved.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        }
    };

    const renderAnnotation = (annotation: MemoElement, reply = false) => {
        const type: AnnotationType = annotation.kind === 'ModelRationale' ? 'rationale' : annotation.kind === 'ModelNote' ? 'note' : 'comment';
        const color = type === 'rationale' ? '#7C3AED' : type === 'note' ? '#2563EB' : '#2DD4A8';
        return <div key={annotation.id} style={{ marginLeft: reply ? 14 : 0, borderLeft: `2px solid ${reply ? '#D1D5DB' : color}`, padding: '5px 7px', marginBottom: 6 }}>
            <div className="flex items-center gap-1 text-xs">
                <span style={{ color, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{type}</span>
                <strong style={{ color: '#374151' }}>{annotation.attributes.author || 'Unknown'}</strong>
                <span style={{ color: '#9CA3AF' }}>{annotation.attributes.createdAt || ''}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{annotation.attributes.shortDescription || annotation.name}</div>
            <div style={{ fontSize: 11, color: '#4B5563', whiteSpace: 'pre-wrap' }}>{annotation.attributes.body}</div>
            {type === 'rationale' && annotation.attributes.basis && <div style={{ fontSize: 10, color: '#7C3AED' }}>Basis: {annotation.attributes.basis}</div>}
            {type === 'note' && annotation.attributes.noteKind && <div style={{ fontSize: 10, color: '#2563EB' }}>Kind: {annotation.attributes.noteKind}</div>}
            {type === 'comment' && <div className="flex gap-2" style={{ marginTop: 3 }}>
                {!reply && <button onClick={() => { setReplyTo(annotation.id); setAnnotationType('comment'); }} style={{ border: 0, background: 'transparent', color: '#2563EB', fontSize: 10, cursor: 'pointer' }}>Reply</button>}
                {!annotation.attributes.commentStatus?.endsWith('resolved') && (
                    <button onClick={() => persistElementAttributes(annotation.id, {
                        commentStatus: 'CommentStatusKind::resolved',
                        resolvedBy: author.trim() || 'currentReviewer',
                        resolvedAt: new Date().toISOString(),
                        resolution: 'Resolved in model review.',
                    })} style={{ border: 0, background: 'transparent', color: '#0F766E', fontSize: 10, cursor: 'pointer' }}>Resolve</button>
                )}
            </div>}
            {(replies.get(annotation.id) ?? []).map(child => renderAnnotation(child, true))}
        </div>;
    };

    return (
        <Section title="Annotations" count={annotations.length} defaultOpen>
            <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setAnnotationType('note')} title="Add Note" className={`p-1.5 rounded flex items-center justify-center transition-colors ${annotationType === 'note' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button onClick={() => setAnnotationType('comment')} title="Add Comment" className={`p-1.5 rounded flex items-center justify-center transition-colors ${annotationType === 'comment' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </button>
                <button onClick={() => setAnnotationType('rationale')} title="Add Rationale" className={`p-1.5 rounded flex items-center justify-center transition-colors ${annotationType === 'rationale' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>
                <div className="flex-1" />
                <button onClick={() => setViewModalOpen(true)} title="View Annotations" className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-1.5 text-xs font-semibold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    View ({annotations.length})
                </button>
            </div>

            {(annotationType || replyTo) && (
                <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold" style={{ color: replyTo ? '#0F766E' : (annotationType === 'rationale' ? '#7C3AED' : annotationType === 'note' ? '#2563EB' : '#2DD4A8') }}>
                            {replyTo ? `Replying to ${model.elements[replyTo]?.name}` : `New ${ANNOTATION_TYPES[annotationType!].label}`}
                        </span>
                        <button onClick={() => { setAnnotationType(null); setReplyTo(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <input value={author} onChange={event => setAuthor(event.target.value)} placeholder="Author" style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />
                    <input value={summary} onChange={event => setSummary(event.target.value)} placeholder="Short summary" style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />
                    {!replyTo && annotationType !== 'comment' && <input value={qualifier} onChange={event => setQualifier(event.target.value)} placeholder={annotationType === 'rationale' ? 'Basis / evidence (optional)' : 'Note kind (optional)'} style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />}
                    <textarea value={body} onChange={event => setBody(event.target.value)} placeholder={replyTo ? 'Reply' : ANNOTATION_TYPES[annotationType!].placeholder} rows={3} style={{ width: '100%', fontSize: 11 }} />
                    <div className="flex gap-2 mt-1">
                        <button onClick={saveAnnotation} disabled={!body.trim()} style={{ fontSize: 11, padding: '4px 8px', background: '#374151', color: 'white', borderRadius: 4, flex: 1 }}>Save</button>
                        <button onClick={() => { setAnnotationType(null); setReplyTo(null); }} style={{ fontSize: 11, padding: '4px 8px', background: '#E5E7EB', color: '#374151', borderRadius: 4 }}>Cancel</button>
                    </div>
                    {message && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>{message}</div>}
                </div>
            )}

            {viewModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onClick={() => setViewModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-[400px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b font-bold flex justify-between items-center text-gray-800">
                            Annotations
                            <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {annotations.length > 0 ? annotations.map(annotation => renderAnnotation(annotation)) : <div className="text-gray-500 text-sm text-center py-8">No annotations yet.</div>}
                        </div>
                    </div>
                </div>
            )}
        </Section>
    );
}

function RelationshipProperties() {
    const model = useModelStore(s => s.model);
    const relationshipId = useModelStore(s => s.selectedRelationshipId);
    if (!model || !relationshipId) return null;
    const relationship = model.relationships.find(rel => rel.id === relationshipId);
    if (!relationship) return null;
    const source = model.elements[relationship.sourceId];
    const target = model.elements[relationship.targetId];
    const isFlow = relationship.type === 'flow';
    const item = relationship.flowItem;
    const category = item && /energy|power|voltage|current/i.test(item) ? 'Energy'
        : item && /material|fluid|gas|batch/i.test(item) ? 'Material'
        : isFlow ? 'Data' : 'Control';
    const categoryColor = category === 'Energy' ? '#D97706'
        : category === 'Material' ? '#16A34A'
        : category === 'Data' ? '#3498DB'
        : '#4B5563';
    return (
        <>
            <div className="p-5 mb-2" style={{ background: '#FFFFFF', borderBottom: '1px solid #F3F4F6', borderLeft: `4px solid ${categoryColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div className="text-[15px] font-bold" style={{ color: '#111827' }}>Connection</div>
                <div className="mt-2 text-xs font-medium" style={{ color: '#4B5563' }}>{source?.name ?? relationship.sourceId} → {target?.name ?? relationship.targetId}</div>
                <div className="mt-3 flex gap-2">
                    <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider" style={{ background: categoryColor + '15', color: categoryColor }}>{category} flow</span>
                    <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider" style={{ background: '#F3F4F6', color: '#4B5563' }}>{relationship.type}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto pt-2 pb-4 bg-gray-50/50">
                <Section title="Involved item" defaultOpen>
                    <div className="text-xs" style={{ color: '#374151' }}>{item ?? 'No transported item is modeled for this connection.'}</div>
                </Section>
                <Section title="Endpoints" defaultOpen>
                    <div className="space-y-2 text-xs">
                        <div><span style={{ color: '#6B7280' }}>Source</span><div style={{ color: '#1a1a1a', fontWeight: 500 }}>{source?.name ?? relationship.sourceId}</div></div>
                        <div><span style={{ color: '#6B7280' }}>Target</span><div style={{ color: '#1a1a1a', fontWeight: 500 }}>{target?.name ?? relationship.targetId}</div></div>
                    </div>
                </Section>
                <Section title="Traceability" defaultOpen={false}>
                    <div className="text-xs" style={{ color: '#6B7280' }}>{relationship.file || 'Model relationship'}</div>
                </Section>
            </div>
        </>
    );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function UnifiedPropertiesPanel() {
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const activeView = useModelStore(s => s.activeView);
    const selectedRelationshipId = useModelStore(s => s.selectedRelationshipId);
    const propertiesPanelCollapsed = useModelStore(s => s.propertiesPanelCollapsed);
    const togglePropertiesPanel = useModelStore(s => s.togglePropertiesPanel);

    if (propertiesPanelCollapsed) {
        return (
            <div
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                style={{ width: '40px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}
                onClick={togglePropertiesPanel}
                title="Expand properties"
            >
                <div className="flex items-center justify-center mt-2" style={{
                    color: '#6B7280', fontSize: '18px', width: '32px', height: '32px', borderRadius: '6px',
                }}>‹</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#6B7280', fontSize: '10px', fontWeight: 400,
                }}>
                    Properties
                </div>
            </div>
        );
    }

    const showDiagramProps = activeView.type === 'diagram' && !selectedElementId && !selectedRelationshipId;
    const showElementProps = !!selectedElementId;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0 bg-gray-50/30" style={{ width: '320px', borderLeft: '1px solid #E5E7EB', boxShadow: '-4px 0 16px rgba(0,0,0,0.02)' }}>
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 z-10 shadow-sm">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-800">Properties</span>
                <button
                    onClick={togglePropertiesPanel}
                    className="flex items-center justify-center transition-colors"
                    style={{
                        color: '#9CA3AF', fontSize: '18px', lineHeight: 1,
                        width: '28px', height: '28px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #E5E7EB',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                    title="Collapse properties"
                    aria-label="Collapse properties"
                >
                    ›
                </button>
            </div>

            {selectedRelationshipId ? (
                <RelationshipProperties />
            ) : showElementProps ? (
                <ElementProperties />
            ) : showDiagramProps ? (
                <DiagramProperties />
            ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                    <span className="text-xs text-center" style={{ color: '#6B7280' }}>
                        Select an element or diagram to view properties
                    </span>
                </div>
            )}

            {/* Presentation, below whatever the panel is describing: colour is
                a property of the block on this canvas, not of the model
                element, and it applies to the whole canvas selection. */}
            <SelectionStyleSection />
        </div>
    );
}
