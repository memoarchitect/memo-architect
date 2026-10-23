// ─── The panel that opens on a cell of the matrix ─────────────────────────────
//
// Shows the trace links behind the focused cell, and (with editing on) removes one or adds another of a type the
// ontology allows between the two kinds. It shows what it is given and calls back for every change: the state
// and the writes belong to `useTraceLinkEditing`.

import type { LegalRelationshipOption, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import type { CellFocus } from '../lib/use-trace-link-editing';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

export function TraceLinkInspector({
    model, focus, editing, busy, editable, relationships, legalOptions, rankedOptions, traceTypes,
    linkQuery, onLinkQuery, onAdd, onRemove, onClose,
}: {
    model: MemoModelDTO;
    focus: CellFocus;
    editing: boolean;
    busy: boolean;
    editable: boolean;
    relationships: readonly MemoRelationship[];
    legalOptions: readonly LegalRelationshipOption[];
    rankedOptions: readonly LegalRelationshipOption[];
    traceTypes: ReadonlySet<string>;
    linkQuery: string;
    onLinkQuery: (query: string) => void;
    onAdd: (option: LegalRelationshipOption) => void;
    onRemove: (relationshipId: string) => void;
    onClose: () => void;
}) {
    const focusedRelationships = relationships;
    return (
            <div style={{
                position: 'fixed', bottom: '76px', right: '20px', zIndex: 100,
                width: '330px', maxHeight: '52vh', overflowY: 'auto',
                padding: '12px 14px', borderRadius: '9px', background: COLOR.surface,
                border: `1px solid ${COLOR.border}`, boxShadow: '0 6px 22px rgba(0,0,0,0.14)',
                fontSize: FONT.xs,
            }}>
                <div className="flex items-start justify-between gap-2">
                    <div style={{ fontWeight: 600, color: COLOR.primary }}>
                        {focus.row.node.name} {'↔'} {focus.column.node.name}
                    </div>
                    <button onClick={onClose} style={{ color: COLOR.faint, background: 'none', border: 'none', cursor: 'pointer' }}>{'✕'}</button>
                </div>

                {focusedRelationships.length > 0 ? (
                    <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {focusedRelationships.map(rel => (
                            <div key={rel.id} className="flex items-center justify-between gap-2" style={{ padding: '4px 6px', borderRadius: '5px', background: COLOR.surfaceAlt }}>
                                <span style={{ color: relationshipColor(rel.type), fontWeight: 500 }}>{rel.type}</span>
                                <span style={{ flex: 1, color: COLOR.faint, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {model.elements[rel.sourceId]?.name ?? rel.sourceId} {'→'} {model.elements[rel.targetId]?.name ?? rel.targetId}
                                </span>
                                {editing && (
                                    <button
                                        disabled={busy || rel.named === false}
                                        onClick={() => onRemove(rel.id)}
                                        title={rel.named === false
                                            ? 'This connection has no declared name, so it cannot be addressed for deletion. Name it in the source first.'
                                            : 'Remove this trace link'}
                                        style={{
                                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                            border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C',
                                            cursor: busy || rel.named === false ? 'not-allowed' : 'pointer',
                                            opacity: rel.named === false ? 0.5 : 1,
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ marginTop: '8px', color: COLOR.muted }}>No trace between these two.</div>
                )}

                {focus.cell?.aggregated && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: COLOR.faint }}>
                        This mark sums a collapsed subsystem. Expand both sides to edit individual links.
                    </div>
                )}

                {editing && (
                    <div style={{ marginTop: '11px', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: '9px' }}>
                        <div style={{ fontSize: '11px', color: COLOR.muted, marginBottom: '6px' }}>Add a trace link</div>
                        {!editable ? (
                            <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                Both sides must be individual elements. Expand the subsystems first.
                            </div>
                        ) : legalOptions.length === 0 ? (
                            <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                The ontology allows no relationship between {focus.row.node.kind} and {focus.column.node.kind}.
                            </div>
                        ) : (
                            <>
                                {legalOptions.length > 8 && (
                                    <input
                                        value={linkQuery}
                                        onChange={event => onLinkQuery(event.target.value)}
                                        placeholder={`Filter ${legalOptions.length} legal types…`}
                                        aria-label="Filter link types"
                                        style={{
                                            width: '100%', marginBottom: '7px', padding: '4px 7px',
                                            border: `1px solid ${COLOR.border}`, borderRadius: '5px',
                                            fontSize: '11px', outline: 'none', color: COLOR.primary,
                                        }}
                                    />
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {rankedOptions.map(option => {
                                        const preferred = traceTypes.has(option.definition.name);
                                        return (
                                            <button
                                                key={`${option.definition.name}-${option.direction}`}
                                                disabled={busy}
                                                onClick={() => onAdd(option)}
                                                title={`${model.elements[option.sourceId]?.name ?? option.sourceId} → ${model.elements[option.targetId]?.name ?? option.targetId}`}
                                                style={{
                                                    fontSize: '11px', padding: '3px 8px', borderRadius: '5px',
                                                    border: `1px solid ${preferred ? COLOR.accent : COLOR.border}`,
                                                    background: preferred ? '#E8F8F3' : COLOR.surface,
                                                    color: COLOR.primary, cursor: busy ? 'wait' : 'pointer',
                                                    fontWeight: preferred ? 600 : 400,
                                                }}
                                            >
                                                {option.definition.name}
                                                <span style={{ color: COLOR.faint, marginLeft: '4px' }}>
                                                    {option.direction === 'outgoing' ? '→' : '←'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {rankedOptions.length === 0 && (
                                        <span style={{ fontSize: '11px', color: COLOR.faint }}>
                                            No legal type matches {'“'}{linkQuery}{'”'}.
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
    
    );
}
