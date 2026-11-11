// ─── Element relationships ───────────────────────────────────────────────────
//
// The relationships block shared by the profile page and the properties panel.
//
// Links are listed by the kind of the element at the other end (software
// requirements, risks, tests…), each as just its id, a link to that element.
// The one "+" opens the dialog, where links are added and removed.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    findRelationshipDefinition,
    type MemoElement, type MemoModelDTO, type MemoRelationship,
    type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { useModelStore, getDiagram, getRegistries } from '../../store/model-store';
import type { PendingRelationship } from '../../store/model-store';
import { COLOR, FONT } from '../../styles/tokens';
import { AddRelationshipDialog, type ExistingLink } from '../AddRelationshipDialog';
import { ProfileSection } from './ProfileValue';
import { elementIdTitle } from '../../lib/trace-labels';
import { humanizeKind } from '../../lib/humanize-kind';
import { densityTokens, type Density } from './density';
import { isRemovable } from '../../lib/relationship-removable';

/** Ids a category shows before the rest fold behind "+N more". */
const FOLD_AT = 12;

/** Outcome banner shown under the relationship list after a mutation. */
interface RelationshipStatus {
    kind: 'success' | 'error';
    message: string;
    /** Set when the model accepted the link but the view profile hides it. */
    profileMessage?: string;
    /** Set when the opposite endpoint is not in the current view. */
    offerAddToView?: { elementId: string; diagramId: string };
}

interface Link {
    rel: MemoRelationship;
    direction: RelationshipDirection;
    otherId: string;
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

    const [adding, setAdding] = useState(false);
    const [status, setStatus] = useState<RelationshipStatus | null>(null);

    const registries = useMemo(() => getRegistries(model), [model]);

    // Reset transient state whenever the inspected element changes.
    useEffect(() => {
        setStatus(null); setAdding(false);
    }, [element.id]);

    const mine = pendingRelationships.filter(p =>
        p.sourceId === element.id || p.targetId === element.id);

    const links = useMemo<Link[]>(() => [
        ...outgoing.map(rel => ({ rel, direction: 'outgoing' as const, otherId: rel.targetId })),
        ...incoming.map(rel => ({ rel, direction: 'incoming' as const, otherId: rel.sourceId })),
    ], [outgoing, incoming]);

    /** The links by the kind of the element at the other end, the biggest category first. */
    const categories = useMemo(() => {
        const byKind = new Map<string, Link[]>();
        for (const link of links) {
            const kind = model?.elements[link.otherId]?.kind ?? 'Unknown';
            byKind.set(kind, [...(byKind.get(kind) ?? []), link]);
        }
        return [...byKind.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }, [links, model]);

    const existing = useMemo<ExistingLink[]>(() => links.map(l => ({
        type: l.rel.type, direction: l.direction, otherId: l.otherId,
        relationshipId: connected && isRemovable(l.rel) ? l.rel.id : undefined,
    })), [links, connected]);

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
            return { success: false, error: outcome.error ?? 'The relationship could not be created.' };
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
        return { success: true };
    }, [createRelationship, element.id, selectedDiagramId, model]);

    const handleDelete = useCallback(async (relationshipId: string) => {
        const outcome = await deleteRelationship(relationshipId);
        return outcome.success
            ? { success: true }
            : { success: false, error: outcome.error ?? 'The relationship could not be deleted.' };
    }, [deleteRelationship]);

    if (!model) return null;

    const t = densityTokens(density);

    return (
        <ProfileSection
            title="Relationships"
            count={links.length}
            density={density}
            collapsible={density === 'panel'}
            actions={(
                <button
                    onClick={() => setAdding(true)}
                    disabled={!connected}
                    style={iconButton(connected)}
                    title={connected ? 'Add a relationship' : 'Connect to the dev server to author relationships'}
                    aria-label="Add relationship"
                >
                    +
                </button>
            )}
        >
            {adding && (
                <AddRelationshipDialog
                    element={element} model={model} registries={registries}
                    diagramId={selectedDiagramId ?? undefined}
                    existing={existing}
                    onCancel={() => setAdding(false)}
                    onConfirm={handleConfirm}
                    onRemove={handleDelete}
                />
            )}

            {links.length === 0 && mine.length === 0 && (
                <div style={{ fontSize: t.meta, color: COLOR.faint, padding: '2px 0 6px' }}>
                    No relationships yet. Use + to add one.
                </div>
            )}

            {categories.map(([kind, items]) => (
                <Category
                    key={kind}
                    kind={kind}
                    items={items}
                    model={model}
                    registries={registries}
                    onNavigate={selectElement}
                />
            ))}

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
    );
}

function iconButton(enabled: boolean): React.CSSProperties {
    return {
        width: 24, height: 24, padding: 0, borderRadius: 6, lineHeight: 1, fontSize: 16,
        border: `1px solid ${COLOR.border}`, background: COLOR.surface, color: COLOR.primary,
        cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5,
    };
}

/** One category of links: the other end's kind, then each linked element as its id. */
function Category({ kind, items, model, registries, onNavigate }: {
    kind: string;
    items: Link[];
    model: MemoModelDTO;
    registries: ReturnType<typeof getRegistries>;
    onNavigate: (id: string) => void;
}) {
    const [all, setAll] = useState(false);
    const shown = all ? items : items.slice(0, FOLD_AT);
    return (
        <div data-testid={`links-${kind}`} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>{humanizeKind(kind)}</span>
                <span style={{ fontSize: FONT.xs, color: COLOR.faint }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {shown.map(link => {
                    const other = model.elements[link.otherId];
                    const { id, title } = elementIdTitle(other, link.otherId);
                    const label = findRelationshipDefinition(link.rel.type, registries)?.label ?? link.rel.type;
                    return (
                        <a
                            key={link.rel.id}
                            href="#"
                            onClick={event => { event.preventDefault(); onNavigate(link.otherId); }}
                            title={`${title} · ${link.direction === 'outgoing' ? `${label} →` : `← ${label}`}`}
                            className={id ? 'font-mono' : undefined}
                            style={{
                                fontSize: id ? 12 : FONT.sm, color: '#0F6FDE', textDecoration: 'none', maxWidth: '100%',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                        >
                            {link.direction === 'incoming' ? '← ' : ''}{id ?? title}
                        </a>
                    );
                })}
                {items.length > FOLD_AT && (
                    <button
                        onClick={() => setAll(v => !v)}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: FONT.xs, color: COLOR.muted }}
                    >
                        {all ? 'Show fewer' : `+${items.length - FOLD_AT} more`}
                    </button>
                )}
            </div>
        </div>
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
