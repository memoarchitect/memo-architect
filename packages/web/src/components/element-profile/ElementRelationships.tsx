// ─── Element relationships ───────────────────────────────────────────────────
//
// The relationships block shared by the profile page and the properties panel.
//
// It moved out of UnifiedPropertiesPanel so both surfaces get the same thing:
// the ontology-legal quick-add, the existing links with their delete flow, the
// pending rows, and the outcome banner. Before this, only the side panel could
// author a relationship — the full-page profile listed them read-only and hid
// the section entirely when an element had none, which is exactly when you most
// want to add one.
//
// "Expand" opens the RelationshipBoard inline rather than in a modal: the
// element stays on screen, and following a link is a normal navigation.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    findRelationshipDefinition,
    legalRelationshipTypes,
    type MemoElement, type MemoModelDTO, type MemoRelationship,
    type OntologyRegistriesDTO, type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram, getRegistries } from '../../store/model-store';
import type { PendingRelationship } from '../../store/model-store';
import { LAYER_COLORS, LAYER_LABELS } from '../../constants';
import { COLOR, FONT } from '../../styles/tokens';
import { RelationshipQuickAdd } from '../RelationshipQuickAdd';
import { TypeFilterSelect } from '../TypeFilterSelect';
import { ProfileSection } from './ProfileValue';
import { RelationshipBoard } from './RelationshipBoard';
import { densityTokens, type Density } from './density';

/** Outcome banner shown under the relationship list after a mutation. */
interface RelationshipStatus {
    kind: 'success' | 'error';
    message: string;
    /** Set when the model accepted the link but the view profile hides it. */
    profileMessage?: string;
    /** Set when the opposite endpoint is not in the current view. */
    offerAddToView?: { elementId: string; diagramId: string };
}

export function ElementRelationships({ element, outgoing, incoming, density }: {
    element: MemoElement;
    outgoing: MemoRelationship[];
    incoming: MemoRelationship[];
    density: Density;
}) {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const pendingRelationships = useModelStore(s => s.pendingRelationships);
    const createRelationship = useModelStore(s => s.createRelationship);
    const deleteRelationship = useModelStore(s => s.deleteRelationship);
    const dismissPendingRelationship = useModelStore(s => s.dismissPendingRelationship);
    const addElementToDiagram = useModelStore(s => s.addElementToDiagram);

    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<RelationshipStatus | null>(null);
    const [visibleKinds, setVisibleKinds] = useState<string[]>(['Requirement', 'Risk', 'Function', 'SystemFunction']);

    const registries = useMemo(() => getRegistries(model), [model]);

    // Reset transient state whenever the inspected element changes.
    useEffect(() => {
        setStatus(null); setExpanded(false);
        setVisibleKinds(['Requirement', 'Risk', 'Function', 'SystemFunction']);
    }, [element.id]);

    const mine = pendingRelationships.filter(p =>
        p.sourceId === element.id || p.targetId === element.id);

    const total = outgoing.length + incoming.length;

    const handleConfirm = useCallback(async (request: {
        type: string; sourceId: string; targetId: string; direction: RelationshipDirection;
    }) => {
        setStatus(null);
        const outcome = await createRelationship({
            ...request,
            selectedElementId: element.id,
            diagramId: selectedDiagramId ?? undefined,
        });

        if (!outcome.success) {
            setStatus({ kind: 'error', message: outcome.error ?? 'The relationship could not be created.' });
            return;
        }

        // The opposite endpoint may sit outside the current view. Offer to add
        // it, but never change an authored view's selection unprompted.
        const oppositeId = request.sourceId === element.id ? request.targetId : request.sourceId;
        const diagram = getDiagram(model, selectedDiagramId);
        const profileBlocked = outcome.diagnostics?.find(d => d.code === 'REL-005');
        const outsideView = !!diagram
            && !!diagram.elementIds
            && diagram.elementIds.length > 0
            && !diagram.elementIds.includes(oppositeId);

        if (outsideView && !profileBlocked && !!selectedDiagramId) {
            setStatus({
                kind: 'success',
                message: `Relationship created in ${outcome.sourceFile ?? 'the model'}.`,
                offerAddToView: { elementId: oppositeId, diagramId: selectedDiagramId },
            });
        } else if (profileBlocked) {
            setStatus({
                kind: 'success',
                message: `Relationship created in ${outcome.sourceFile ?? 'the model'}.`,
                profileMessage: profileBlocked.message,
            });
        } else {
            setStatus(null);
        }
    }, [createRelationship, element.id, selectedDiagramId, model]);

    const handleDelete = useCallback(async (relationshipId: string) => {
        const outcome = await deleteRelationship(relationshipId);
        if (!outcome.success) {
            setStatus({ kind: 'error', message: outcome.error ?? 'The relationship could not be deleted.' });
        }
    }, [deleteRelationship]);

    const groups = useMemo(() => {
        const map = new Map<string, Map<string, { rel: MemoRelationship; direction: RelationshipDirection }[]>>();
        const add = (rel: MemoRelationship, direction: RelationshipDirection) => {
            const oppositeId = direction === 'outgoing' ? rel.targetId : rel.sourceId;
            const opposite = model?.elements[oppositeId];
            const groupName = opposite?.kind || 'Unknown Type';
            const currentGroup = map.get(groupName) ?? new Map<string, { rel: MemoRelationship; direction: RelationshipDirection }[]>();
            const currentElementLinks = currentGroup.get(oppositeId) ?? [];
            currentElementLinks.push({ rel, direction });
            currentGroup.set(oppositeId, currentElementLinks);
            map.set(groupName, currentGroup);
        };
        if (model) {
            outgoing.forEach(r => add(r, 'outgoing'));
            incoming.forEach(r => add(r, 'incoming'));
        }
        return map;
    }, [outgoing, incoming, model]);

    const allKinds = Array.from(groups.keys()).sort();
    
    const visibleGroups = new Map([...groups.entries()].filter(([kind]) => visibleKinds.includes(kind)));

    if (!model) return null;

    return (
        <>
            <ProfileSection
                title="Relationships"
                count={total}
                density={density}
                collapsible={density === 'panel'}
                actions={
                    <div className="flex items-center gap-1">
                        {total > 0 && (
                            <button
                                onClick={() => setExpanded(true)}
                                style={{
                                    width: 24, height: 24, borderRadius: '4px',
                                    background: 'transparent',
                                    color: '#6B7280',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title="View Details (Rich Grid)"
                                aria-label="View Details"
                                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                            </button>
                        )}
                        {total > 0 && (
                            <TypeFilterSelect
                                label=""
                                options={allKinds.map(kind => ({ value: kind, label: kind }))}
                                selected={visibleKinds}
                                onChange={setVisibleKinds}
                                allLabel="None"
                                iconOnly={true}
                                align="right"
                            />
                        )}
                    </div>
                }
            >
                <div style={{ marginBottom: density === 'page' ? 14 : 8, maxWidth: density === 'page' ? 720 : undefined }}>
                    <RelationshipQuickAdd
                        element={element}
                        model={model}
                        registries={registries}
                        enabled={connected}
                        onCreate={handleConfirm}
                    />
                </div>

                {expanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '2rem' }} onClick={() => setExpanded(false)}>
                        <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden w-full max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 bg-gray-50/50">
                                <h2 className="text-lg font-bold text-gray-900">Element Relationships</h2>
                                <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-gray-700 font-bold px-2 py-1 bg-transparent border-none cursor-pointer">✕</button>
                            </div>
                            <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                                <RelationshipBoard
                                    element={element} model={model} registries={registries}
                                    outgoing={outgoing} incoming={incoming} density={density}
                                    onNavigate={id => { setExpanded(false); selectElement(id); }}
                                    onCreate={createRelationship}
                                    onDelete={handleDelete}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {total === 0 && mine.length === 0 && (
                    <div style={{ fontSize: densityTokens(density).meta, color: COLOR.faint, padding: '2px 0 6px' }}>
                        No relationships yet — add the first one below.
                    </div>
                )}

                {total > 0 && visibleGroups.size > 0 && (
                    <div className="flex items-center justify-between" style={{ marginBottom: 12, marginTop: 12, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Existing Links</span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[...visibleGroups.entries()].map(([groupName, itemsMap]) => (
                        <div key={groupName}>
                            <div style={{ fontSize: '10px', color: COLOR.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>
                                {groupName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {[...itemsMap.entries()].map(([oppositeId, links]) => (
                                    <LinkedElementRow
                                        key={oppositeId}
                                        sourceElement={element}
                                        oppositeId={oppositeId}
                                        links={links}
                                        model={model}
                                        registries={registries}
                                        density={density}
                                        deletable={connected}
                                        onNavigate={() => selectElement(oppositeId)}
                                        onCreate={createRelationship}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {mine.map(pending => (
                    <PendingRelationshipRow
                        key={pending.pendingId}
                        pending={pending}
                        model={model}
                        onDismiss={() => dismissPendingRelationship(pending.pendingId)}
                    />
                ))}

                {status && (
                    <StatusBanner
                        status={status}
                        onAddToView={() => {
                            if (!status.offerAddToView) return;
                            addElementToDiagram(status.offerAddToView.diagramId, status.offerAddToView.elementId);
                            setStatus({ kind: 'success', message: 'Element added to this view.' });
                        }}
                        onDismiss={() => setStatus(null)}
                        model={model}
                    />
                )}
            </ProfileSection>

        </>
    );
}

function StatusBanner({ status, onAddToView, onDismiss, model }: {
    status: RelationshipStatus;
    onAddToView: () => void;
    onDismiss: () => void;
    model: MemoModelDTO;
}) {
    const success = status.kind === 'success';
    const elementName = status.offerAddToView
        ? model.elements[status.offerAddToView.elementId]?.name ?? status.offerAddToView.elementId
        : null;
    return (
        <div
            className="text-xs p-2 rounded-lg mt-2"
            style={{
                background: success ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${success ? '#BBF7D0' : '#FECACA'}`,
                color: success ? '#166534' : '#DC2626',
            }}
        >
            <div className="flex items-start gap-1.5">
                <span className="flex-1">{status.message}</span>
                <button
                    onClick={onDismiss}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', lineHeight: 1 }}
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
            {status.profileMessage && (
                <div className="mt-1" style={{ color: '#92400E' }}>
                    Relationship created in the model, but this view profile does not display this
                    relationship type.
                </div>
            )}
            {status.offerAddToView && (
                <button
                    onClick={onAddToView}
                    className="mt-1.5 px-2 py-0.5 rounded"
                    style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', color: '#166534', cursor: 'pointer', fontSize: FONT.xs }}
                >
                    Relationship created. Add {elementName} to this view?
                </button>
            )}
        </div>
    );
}

/** One existing linked element, which may have multiple relationships. */
function LinkedElementRow({
    sourceElement, oppositeId, links, model, registries, deletable, density,
    onNavigate, onCreate, onDelete,
}: {
    sourceElement: MemoElement;
    oppositeId: string;
    links: { rel: MemoRelationship; direction: RelationshipDirection }[];
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    deletable: boolean;
    density: Density;
    onNavigate: () => void;
    onCreate?: (req: any) => void;
    onDelete: (id: string) => void;
}) {
    const opposite = model.elements[oppositeId];
    const color = opposite ? (LAYER_COLORS[opposite.layer] || '#666') : '#666';
    const [expanded, setExpanded] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [confirming, setConfirming] = useState<'header' | string | null>(null);
    const t = densityTokens(density);

    // Filter to named connections for mass deletion
    const removableLinks = links.filter(l => deletable && l.rel.named === true);

    const options = useMemo(() => {
        if (!sourceElement || !opposite) return [];
        return legalRelationshipTypes(sourceElement, opposite, registries).map(opt => ({
            value: `${opt.definition.name}::${opt.direction}`,
            label: `${opt.definition.label} ${opt.direction === 'outgoing' ? 'to' : 'from'}`,
        }));
    }, [sourceElement, opposite, registries]);

    const selected = links.map(link => `${link.rel.type}::${link.direction}`);
    
    const handleChange = useCallback((next: string[]) => {
        if (next.length === 0) return; // Must have at least one relationship
        if (!onCreate || !onDelete) return;

        const nextSet = new Set(next);
        const currentSet = new Set(selected);
        
        // Remove unchecked
        for (const link of links) {
            if (!nextSet.has(`${link.rel.type}::${link.direction}`)) {
                onDelete(link.rel.id);
            }
        }
        
        // Add checked
        const legalOpts = legalRelationshipTypes(sourceElement, opposite!, registries);
        for (const val of next) {
            if (!currentSet.has(val)) {
                const opt = legalOpts.find(o => `${o.definition.name}::${o.direction}` === val);
                if (opt) {
                    onCreate({
                        type: opt.definition.name,
                        sourceId: opt.sourceId,
                        targetId: opt.targetId,
                        direction: opt.direction,
                    });
                }
            }
        }
    }, [selected, links, sourceElement, opposite, registries, onCreate, onDelete]);

    return (
        <div 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderLeft: `3px solid ${color}`,
                borderRadius: 6,
                background: COLOR.surface,
                borderTop: `1px solid ${COLOR.borderLight}`,
                borderRight: `1px solid ${COLOR.borderLight}`,
                borderBottom: `1px solid ${COLOR.borderLight}`,
                width: '100%',
            }}
        >
            <div
                className="flex items-center gap-2"
                style={{ padding: density === 'page' ? '8px 10px' : '6px 8px', fontSize: t.text }}
            >
                <button onClick={onNavigate} className="text-left flex items-center gap-1.5" style={{
                    display: 'flex', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }} title={`Go to ${opposite?.name ?? oppositeId}`}>
                    <strong className="truncate font-mono" style={{ color: COLOR.primary, fontSize: '11px', fontWeight: 600 }}>
                        {opposite?.shortId ?? oppositeId}
                    </strong>
                    {links.length > 1 && (
                        <span style={{ fontSize: '10px', color: '#9CA3AF', background: '#F3F4F6', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>
                            {links.length}
                        </span>
                    )}
                </button>
                
                {options.length > 1 && onCreate && (
                    <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                        <TypeFilterSelect 
                            label=""
                            options={options}
                            selected={selected}
                            onChange={handleChange}
                            allLabel="Relationships"
                            iconOnly={true}
                            align="right"
                        />
                    </div>
                )}

                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.faint, padding: 2 }}
                    aria-label={expanded ? 'Hide relationship details' : 'Show relationship details'}
                >
                    {expanded ? '▾' : '▸'}
                </button>
                
                {removableLinks.length > 0 && (hovered || expanded || confirming === 'header') && (
                    <div className="relative flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirming('header');
                            }}
                            aria-label={`Remove relationships to ${opposite?.name ?? oppositeId}`}
                            title="Remove relationships"
                            style={{ width: 20, height: 20, padding: 0, border: 0, borderRadius: 10, background: '#FFFFFFAA', color: '#9CA3AF', cursor: 'pointer', lineHeight: 1 }}
                        >×</button>

                        {confirming === 'header' && (
                            <div 
                                className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 p-2.5 w-48"
                                onClick={e => e.stopPropagation()}
                                style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                            >
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                    Remove {removableLinks.length > 1 ? `all ${removableLinks.length} relationships` : 'relationship'}?
                                </div>
                                <div className="flex gap-1.5 justify-end">
                                    <button 
                                        onClick={() => setConfirming(null)}
                                        className="px-2 py-1 rounded"
                                        style={{ fontSize: '10px', background: '#F3F4F6', color: '#4B5563', border: 'none', cursor: 'pointer' }}
                                    >Cancel</button>
                                    <button 
                                        onClick={() => {
                                            setConfirming(null);
                                            removableLinks.forEach(l => onDelete(l.rel.id));
                                        }}
                                        className="px-2 py-1 rounded"
                                        style={{ fontSize: '10px', background: '#EF4444', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                                    >Remove</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {expanded && (
                <div className="px-3 pb-2 space-y-2" style={{ borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: 7 }}>
                    {links.map(({ rel: relationship, direction }, i) => {
                        const definition = findRelationshipDefinition(relationship.type, registries);
                        const removable = deletable && relationship.named === true;
                        return (
                            <div key={relationship.id} style={{ fontSize: '10px', color: '#6B7280', marginTop: i > 0 ? 8 : 0, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? `1px dashed ${COLOR.borderLight}` : 'none' }}>
                                <DetailLine label="Kind" value={definition?.label ?? relationship.type} valueColor={color} />
                                <DetailLine
                                    label="Roles"
                                    value={`${relationship.sourceEnd || definition?.sourceEnd.name || 'source'} → ${
                                        relationship.targetEnd || definition?.targetEnd.name || 'target'}`}
                                />
                                <DetailLine label="ID" value={relationship.id} mono />
                                <DetailLine label="Source" value={relationship.file || '—'} mono />
                                {!relationship.named && (
                                    <div style={{ color: '#D97706', marginTop: 4 }}>
                                        Anonymous connection — name it in SysML to allow deletion from here.
                                    </div>
                                )}
                                {removable && (
                                    <div className="relative inline-block mt-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirming(relationship.id);
                                            }}
                                            className="px-1.5 py-0.5 rounded"
                                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer', fontSize: '10px' }}
                                        >
                                            Remove this relationship
                                        </button>
                                        
                                        {confirming === relationship.id && (
                                            <div 
                                                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 p-2.5 w-48"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                                    Remove relationship?
                                                </div>
                                                <div className="flex gap-1.5 justify-end">
                                                    <button onClick={() => setConfirming(null)} className="px-2 py-1 rounded" style={{ fontSize: '10px', background: '#F3F4F6', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                    <button onClick={() => { setConfirming(null); onDelete(relationship.id); }} className="px-2 py-1 rounded" style={{ fontSize: '10px', background: '#EF4444', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>Remove</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DetailLine({ label, value, mono, valueColor }: {
    label: string; value: string; mono?: boolean; valueColor?: string;
}) {
    return (
        <div className="flex gap-1.5">
            <span style={{ minWidth: 48, color: '#9CA3AF' }}>{label}</span>
            <span
                className={`truncate ${mono ? 'font-mono' : ''}`}
                style={{ color: valueColor ?? '#374151' }}
                title={value}
            >
                {value}
            </span>
        </div>
    );
}

/** A relationship the server has not answered on yet — never a model fact. */
function PendingRelationshipRow({ pending, model, onDismiss }: {
    pending: PendingRelationship;
    model: MemoModelDTO;
    onDismiss: () => void;
}) {
    const oppositeId = pending.direction === 'outgoing' ? pending.targetId : pending.sourceId;
    const opposite = model.elements[oppositeId];
    const failed = pending.status === 'failed';
    return (
        <div
            className="flex items-center gap-1.5 ml-2 rounded"
            style={{
                padding: '4px 8px',
                fontSize: FONT.xs,
                background: failed ? '#FEF2F2' : '#F9FAFB',
                color: failed ? '#DC2626' : '#6B7280',
                fontStyle: failed ? 'normal' : 'italic',
            }}
        >
            <span>{pending.direction === 'outgoing' ? '→' : '←'}</span>
            <span className="px-1 py-0.5 rounded flex-shrink-0" style={{ background: '#E5E7EB', color: '#6B7280', fontSize: FONT.xs }}>
                {pending.label}
            </span>
            <span className="truncate flex-1">{opposite?.name ?? oppositeId}</span>
            {failed ? (
                <>
                    <span className="truncate" style={{ fontSize: '10px', maxWidth: 90 }} title={pending.error}>
                        {pending.error}
                    </span>
                    <button
                        onClick={onDismiss}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        aria-label="Dismiss failed relationship"
                    >
                        ×
                    </button>
                </>
            ) : (
                <span style={{ fontSize: '10px' }}>saving…</span>
            )}
        </div>
    );
}
