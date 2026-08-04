import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    useModelStore, getRelationshipsForElement, getDiagram, getRegistries,
    getElementSourceFiles, sourceChangeAffects,
} from '../store/model-store';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import { ElementRelationships } from './element-profile/ElementRelationships';
import { RenameScopeNote } from './RenameScopeNote';
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
        <div style={{ borderBottom: '1px solid #EDEDEA' }}>
            <div
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
                style={{ borderRadius: '6px', margin: '2px 4px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setOpen(o => !o)}
            >
                <span className="font-medium flex-1 text-xs" style={{ color: '#374151' }}>{title}</span>
                {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
                {typeof count === 'number' && <span className="text-xs" style={{ color: '#9CA3AF' }}>{count}</span>}
                <span style={{ color: '#D1D5DB' }}>{open ? '▾' : '▸'}</span>
            </div>
            {open && <div className="px-4 pb-3">{children}</div>}
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

function RegionProperties({ element, onNameSave, onAttributeSave }: {
    element: MemoElement;
    onNameSave: (value: string) => void;
    onAttributeSave: (key: string, value: string) => void;
}) {
    const rawColor = element.attributes.boundaryColor || '#14B8A6';
    const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : '#14B8A6';
    const rawOpacity = Number(element.attributes.boundaryOpacity ?? '0.12');
    const opacity = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(1, rawOpacity)) : 0.12;

    return (
        <Section title="Region" defaultOpen>
            <div className="space-y-2 text-xs">
                <label style={{ display: 'block', color: '#6B7280' }}>
                    <span style={{ display: 'block', marginBottom: 3 }}>Name</span>
                    <EditableValue value={element.name} onSave={onNameSave} density={PANEL_DENSITY} placeholder="Region name" />
                    <RenameScopeNote identifier={element.id} />
                </label>
                <label style={{ display: 'block', color: '#6B7280' }}>
                    <span style={{ display: 'block', marginBottom: 3 }}>Description</span>
                    <EditableValue value={element.attributes.description || ''}
                        onSave={value => onAttributeSave('description', value)} density={PANEL_DENSITY}
                        multiline placeholder="Describe this region…" />
                </label>
                <div>
                    <span style={{ display: 'block', marginBottom: 3, color: '#6B7280' }}>Boundary color</span>
                    <div className="flex items-center gap-2">
                        <input aria-label="Region boundary color" type="color" value={color}
                            onChange={event => onAttributeSave('boundaryColor', event.target.value)}
                            style={{ width: 34, height: 28, padding: 2, border: '1px solid #D8D8D2', borderRadius: 6, background: '#FFFFFF' }} />
                        <EditableValue value={rawColor} onSave={value => onAttributeSave('boundaryColor', value)}
                            density={PANEL_DENSITY} placeholder="#14B8A6" compact />
                    </div>
                </div>
                <label style={{ display: 'block', color: '#6B7280' }}>
                    <span className="flex justify-between" style={{ marginBottom: 3 }}>
                        <span>Fill opacity</span><span>{Math.round(opacity * 100)}%</span>
                    </span>
                    <input aria-label="Region fill opacity" type="range" min="0" max="1" step="0.01" value={opacity}
                        onChange={event => onAttributeSave('boundaryOpacity', event.target.value)} style={{ width: '100%' }} />
                </label>
            </div>
        </Section>
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
            <div className="p-4" style={{ ...sectionStyle, borderLeft: `3px solid ${meta?.color || '#6B7280'}` }}>
                <div className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{diagram.name}</div>
                <div className="flex items-center gap-2 text-xs mt-1.5">
                    {meta && (
                        <span className="px-2 py-0.5 rounded-md font-medium"
                            style={{ background: meta.color + '18', color: meta.color }}>
                            {meta.code}
                        </span>
                    )}
                    <span style={{ color: '#6B7280' }}>{meta?.fullName || diagram.diagramType}</span>
                </div>
                {diagram.auto && <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Auto-generated</div>}
            </div>

            <div className="flex-1 overflow-y-auto">
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
    const regionProfileKeys = new Set(['description', 'boundaryColor', 'boundaryOpacity']);
    const attrs = Object.entries(element.attributes).filter(([k]) =>
        k !== 'name' && k !== 'id' && !(element.kind === 'UIElement' && regionProfileKeys.has(k))
        && !(element.kind !== 'UIElement' && k === 'description'));

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
            {/* Header mirrors ModelExplorer layer header (color chip + name + kind badge) */}
            <div className="p-4" style={{ borderBottom: '1px solid #EDEDEA', borderLeft: `3px solid ${layerColor}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 flex-shrink-0" style={{ background: layerColor, borderRadius: '3px' }} />
                    <span className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{element.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md font-medium" style={{ background: layerColor + '18', color: layerColor }}>
                        {element.kind}
                    </span>
                </div>
                <div className="text-xs mt-1.5 capitalize" style={{ color: '#6B7280' }}>{element.layer} layer</div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {element.kind === 'UIElement' && (
                    <RegionProperties element={element} onNameSave={handleNameSave} onAttributeSave={handleAttrSave} />
                )}

                {/* The SysML identifier is what other declarations reference.
                    Showing it next to the rename caveat is the difference
                    between "renaming is limited" and knowing what would break. */}
                <Section title="Identity">
                    <div className="text-xs" style={{ color: '#374151' }}>
                        <code style={{ fontFamily: 'ui-monospace, monospace' }}>{element.id}</code>
                        <RenameScopeNote />
                    </div>
                </Section>

                {element.kind !== 'UIElement' && <Section title="Description" defaultOpen>
                    <div className="text-xs leading-relaxed">
                        <EditableValue
                            value={element.attributes.description || ''}
                            onSave={newValue => handleAttrSave('description', newValue)}
                            density={PANEL_DENSITY}
                            multiline
                            placeholder="Click to add a description…"
                        />
                    </div>
                </Section>}

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

                {attrs.length > 0 && (
                    <Section title="Attributes" count={attrs.length} defaultOpen>
                        <div className="space-y-1.5">
                            {attrs.map(([key, value]) => {
                                const editability = attributeEditability(key);
                                return (
                                    <div key={key} className="flex text-xs items-start gap-1.5">
                                        <span className="min-w-[80px] pt-0.5" style={{ color: '#6B7280' }}>{key}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {isEditable(editability) ? (
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
                                                    mono
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}

                <ElementRelationships
                    element={element}
                    outgoing={outgoing}
                    incoming={incoming}
                    density={PANEL_DENSITY}
                />

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
    const [annotationType, setAnnotationType] = useState<AnnotationType>('comment');
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
        setMessage('Saving…');
        const selectedType: AnnotationType = replyTo ? 'comment' : annotationType;
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
            {annotations.map(annotation => renderAnnotation(annotation))}
            {replyTo && <div style={{ fontSize: 10, color: '#0F766E', marginBottom: 4 }}>Replying to {model.elements[replyTo]?.name} <button onClick={() => setReplyTo(null)}>cancel</button></div>}
            {!replyTo && <select value={annotationType} onChange={event => setAnnotationType(event.target.value as AnnotationType)} aria-label="Annotation type" style={{ width: '100%', marginBottom: 4, fontSize: 11 }}>
                <option value="comment">Comment</option>
                <option value="rationale">Rationale</option>
                <option value="note">Note</option>
            </select>}
            <input value={author} onChange={event => setAuthor(event.target.value)} placeholder="Author" style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />
            <input value={summary} onChange={event => setSummary(event.target.value)} placeholder="Short summary" style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />
            {!replyTo && annotationType !== 'comment' && <input value={qualifier} onChange={event => setQualifier(event.target.value)} placeholder={annotationType === 'rationale' ? 'Basis / evidence (optional)' : 'Note kind (optional)'} style={{ width: '100%', marginBottom: 4, fontSize: 11 }} />}
            <textarea value={body} onChange={event => setBody(event.target.value)} placeholder={replyTo ? 'Reply' : ANNOTATION_TYPES[annotationType].placeholder} rows={3} style={{ width: '100%', fontSize: 11 }} />
            <button onClick={saveAnnotation} disabled={!body.trim()} style={{ marginTop: 4, fontSize: 11 }}>Add {replyTo ? 'reply' : ANNOTATION_TYPES[annotationType].label}</button>
            {message && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>{message}</div>}
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
            <div className="p-4" style={{ borderBottom: '1px solid #EDEDEA', borderLeft: `3px solid ${categoryColor}` }}>
                <div className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Connection</div>
                <div className="mt-1 text-xs" style={{ color: '#6B7280' }}>{source?.name ?? relationship.sourceId} → {target?.name ?? relationship.targetId}</div>
                <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: categoryColor + '18', color: categoryColor }}>{category} flow</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: '#F3F4F6', color: '#374151' }}>{relationship.type}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
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
                    color: '#6B7280', fontSize: '20px', width: '32px', height: '32px', borderRadius: '6px',
                }}>{'\u25C2'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#6B7280', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                }}>
                    Properties
                </div>
            </div>
        );
    }

    const showDiagramProps = activeView.type === 'diagram' && !selectedElementId && !selectedRelationshipId;
    const showElementProps = !!selectedElementId;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #EDEDEA' }}>
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Properties</span>
                <button
                    onClick={togglePropertiesPanel}
                    className="flex items-center justify-center"
                    style={{
                        color: '#6B7280', fontSize: '20px', lineHeight: 1,
                        width: '32px', height: '32px', borderRadius: '6px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
                    title="Collapse properties"
                    aria-label="Collapse properties"
                >
                    {'\u25B8'}
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
        </div>
    );
}
