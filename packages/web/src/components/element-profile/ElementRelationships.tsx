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
    type MemoElement, type MemoModelDTO, type MemoRelationship,
    type OntologyRegistriesDTO, type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram, getRegistries } from '../../store/model-store';
import type { PendingRelationship } from '../../store/model-store';
import { LAYER_COLORS, LAYER_LABELS } from '../../constants';
import { COLOR, FONT } from '../../styles/tokens';
import { RelationshipQuickAdd } from '../RelationshipQuickAdd';
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
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const registries = useMemo(() => getRegistries(model), [model]);

    // Reset transient state whenever the inspected element changes.
    useEffect(() => {
        setStatus(null); setConfirmDelete(null); setExpanded(false);
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

        setStatus({
            kind: 'success',
            message: `Relationship created in ${outcome.sourceFile ?? 'the model'}.`,
            profileMessage: profileBlocked?.message,
            offerAddToView: outsideView && !profileBlocked && !!selectedDiagramId
                ? { elementId: oppositeId, diagramId: selectedDiagramId }
                : undefined,
        });
    }, [createRelationship, element.id, selectedDiagramId, model]);

    const handleDelete = useCallback(async (relationshipId: string) => {
        setConfirmDelete(null);
        const outcome = await deleteRelationship(relationshipId);
        setStatus(outcome.success
            ? { kind: 'success', message: `Relationship removed from ${outcome.sourceFile ?? 'the model'}.` }
            : { kind: 'error', message: outcome.error ?? 'The relationship could not be deleted.' });
    }, [deleteRelationship]);

    const groups = useMemo(() => {
        const map = new Map<string, { rel: MemoRelationship; direction: RelationshipDirection }[]>();
        const add = (rel: MemoRelationship, direction: RelationshipDirection) => {
            const oppositeId = direction === 'outgoing' ? rel.targetId : rel.sourceId;
            const opposite = model?.elements[oppositeId];
            const groupName = opposite?.kind || 'Unknown Type';
            const current = map.get(groupName) ?? [];
            current.push({ rel, direction });
            map.set(groupName, current);
        };
        if (model) {
            outgoing.forEach(r => add(r, 'outgoing'));
            incoming.forEach(r => add(r, 'incoming'));
        }
        return map;
    }, [outgoing, incoming, model, registries]);

    const allKinds = Array.from(groups.keys()).sort();
    
    // Only show these specific kinds inline. All other relationships are still
    // accessible via the 'View Details' modal.
    const allowedInlineKinds = new Set(['Requirement', 'Risk', 'Function', 'SystemFunction']);
    const visibleGroups = new Map([...groups.entries()].filter(([kind]) => allowedInlineKinds.has(kind)));

    if (!model) return null;

    return (
        <>
            <ProfileSection
                title="Relationships"
                count={total}
                density={density}
                collapsible={density === 'panel'}
                actions={
                    total > 0 ? (
                        <button
                            onClick={() => setExpanded(true)}
                            style={{
                                padding: '2px 9px', borderRadius: '6px',
                                background: COLOR.surfaceAlt,
                                color: '#374151',
                                border: `1px solid ${COLOR.border}`,
                                cursor: 'pointer', fontSize: FONT.xs, fontWeight: 500,
                            }}
                            title="Show every relationship in a rich grid view"
                        >
                            ⤢ View Details
                        </button>
                    ) : undefined
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
                                    element={element}
                                    model={model}
                                    registries={registries}
                                    outgoing={outgoing}
                                    incoming={incoming}
                                    density={density}
                                    onNavigate={(id) => { selectElement(id); setExpanded(false); }}
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
                    {[...visibleGroups.entries()].map(([groupName, items]) => (
                        <div key={groupName}>
                            <div style={{ fontSize: '10px', color: COLOR.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>
                                {groupName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {items.map(({ rel, direction }) => (
                                    <RelationshipRow
                                        key={rel.id} relationship={rel} direction={direction} model={model}
                                        registries={registries} density={density} confirming={confirmDelete === rel.id}
                                        onNavigate={() => selectElement(direction === 'outgoing' ? rel.targetId : rel.sourceId)} 
                                        onRequestDelete={() => setConfirmDelete(rel.id)}
                                        onCancelDelete={() => setConfirmDelete(null)} onConfirmDelete={() => handleDelete(rel.id)}
                                        deletable={connected}
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

/** One existing relationship: endpoint, type, direction, roles and source file. */
function RelationshipRow({
    relationship, direction, model, registries, deletable, density,
    confirming, onNavigate, onRequestDelete, onCancelDelete, onConfirmDelete,
}: {
    relationship: MemoRelationship;
    direction: RelationshipDirection;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    deletable: boolean;
    density: Density;
    confirming: boolean;
    onNavigate: () => void;
    onRequestDelete: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
}) {
    const oppositeId = direction === 'outgoing' ? relationship.targetId : relationship.sourceId;
    const opposite = model.elements[oppositeId];
    const color = opposite ? (LAYER_COLORS[opposite.layer] || '#666') : '#666';
    const definition = findRelationshipDefinition(relationship.type, registries);
    const [expanded, setExpanded] = useState(false);
    const t = densityTokens(density);

    // Only a named connection usage can be addressed for deletion; anonymous
    // ones have no stable identity in the source.
    const removable = deletable && relationship.named === true;

    return (
        <div style={{
            borderLeft: `3px solid ${color}`,
            borderRadius: 6,
            background: COLOR.surface,
            borderTop: `1px solid ${COLOR.borderLight}`,
            borderRight: `1px solid ${COLOR.borderLight}`,
            borderBottom: `1px solid ${COLOR.borderLight}`,
            overflow: 'hidden',
            width: '100%',
        }}>
            <div
                className="flex items-center gap-2"
                style={{ padding: density === 'page' ? '8px 10px' : '6px 8px', fontSize: t.text }}
            >
                <button onClick={onNavigate} className="text-left" style={{
                    display: 'block', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }} title={`Go to ${opposite?.name ?? oppositeId}`}>
                    <strong className="truncate font-mono" style={{ display: 'block', color: COLOR.primary, fontSize: '11px', fontWeight: 600 }}>
                        {opposite?.shortId ?? oppositeId}
                    </strong>
                </button>
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.faint, padding: 2 }}
                    aria-label={expanded ? 'Hide relationship details' : 'Show relationship details'}
                >
                    {expanded ? '▾' : '▸'}
                </button>
                {removable && !confirming && (
                    <button
                        onClick={() => { setExpanded(true); onRequestDelete(); }}
                        aria-label={`Remove ${definition?.label ?? relationship.type} relationship to ${opposite?.name ?? oppositeId}`}
                        title="Remove relationship"
                        style={{ width: 20, height: 20, padding: 0, border: 0, borderRadius: 10, background: '#FFFFFFAA', color: '#9CA3AF', cursor: 'pointer', lineHeight: 1 }}
                    >×</button>
                )}
            </div>

            {expanded && (
                <div className="px-3 pb-2 space-y-1" style={{ fontSize: '10px', color: '#6B7280', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: 7 }}>
                    <DetailLine label="Kind" value={opposite?.kind ?? '—'} valueColor={color} />
                    <DetailLine
                        label="Roles"
                        value={`${relationship.sourceEnd || definition?.sourceEnd.name || 'source'} → ${
                            relationship.targetEnd || definition?.targetEnd.name || 'target'}`}
                    />
                    <DetailLine label="ID" value={relationship.id} mono />
                    <DetailLine label="Source" value={relationship.file || '—'} mono />
                    {!relationship.named && (
                        <div style={{ color: '#D97706' }}>
                            Anonymous connection — name it in SysML to allow deletion from here.
                        </div>
                    )}
                    {removable && !confirming && (
                        <button
                            onClick={onRequestDelete}
                            className="px-1.5 py-0.5 rounded"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer', fontSize: '10px' }}
                        >
                            Remove relationship
                        </button>
                    )}
                    {confirming && (
                        <div className="p-1.5 rounded" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                            <div style={{ color: '#DC2626' }}>
                                Remove {definition?.label ?? relationship.type} to {opposite?.name ?? oppositeId}?
                                Both elements are kept.
                            </div>
                            <div className="flex gap-1 mt-1">
                                <button
                                    onClick={onConfirmDelete}
                                    className="px-1.5 py-0.5 rounded"
                                    style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                                >
                                    Remove
                                </button>
                                <button
                                    onClick={onCancelDelete}
                                    className="px-1.5 py-0.5 rounded"
                                    style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #E5E5E0', cursor: 'pointer', fontSize: '10px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
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
