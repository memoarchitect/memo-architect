// ─── Layer-grouped linked elements ──────────────────────────────────────────
//
// The expanded relationship view answers one question: what is this element
// linked to? Neighbours are grouped by architecture layer and deduplicated;
// relationship type and direction are supporting badges on each neighbour.

import { useMemo, useState } from 'react';
import {
    findRelationshipDefinition,
    type MemoElement, type MemoModelDTO, type MemoRelationship,
    type OntologyRegistriesDTO, type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../../constants';
import { COLOR } from '../../styles/tokens';
import type { Density } from './density';

interface LinkFact {
    relationship: MemoRelationship;
    direction: RelationshipDirection;
    label: string;
}

interface LinkedElement {
    id: string;
    element?: MemoElement;
    links: LinkFact[];
}

interface LayerGroup {
    layer: string;
    elements: LinkedElement[];
}

function linkedElementsByLayer(
    outgoing: MemoRelationship[], incoming: MemoRelationship[],
    model: MemoModelDTO, registries: OntologyRegistriesDTO,
): LayerGroup[] {
    const neighbours = new Map<string, LinkedElement>();
    const add = (relationship: MemoRelationship, direction: RelationshipDirection) => {
        const id = direction === 'outgoing' ? relationship.targetId : relationship.sourceId;
        const current = neighbours.get(id) ?? { id, element: model.elements[id], links: [] };
        current.links.push({
            relationship,
            direction,
            label: findRelationshipDefinition(relationship.type, registries)?.label ?? relationship.type,
        });
        neighbours.set(id, current);
    };
    outgoing.forEach(relationship => add(relationship, 'outgoing'));
    incoming.forEach(relationship => add(relationship, 'incoming'));

    const groups = new Map<string, LinkedElement[]>();
    for (const neighbour of neighbours.values()) {
        const layer = neighbour.element?.layer || 'other';
        groups.set(layer, [...(groups.get(layer) ?? []), neighbour]);
    }
    const order = (layer: string) => {
        const index = LAYER_ORDER.indexOf(layer as typeof LAYER_ORDER[number]);
        return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return [...groups.entries()]
        .map(([layer, elements]) => ({
            layer,
            elements: elements.sort((a, b) =>
                (a.element?.name ?? a.id).localeCompare(b.element?.name ?? b.id)),
        }))
        .sort((a, b) => order(a.layer) - order(b.layer) || a.layer.localeCompare(b.layer));
}

export function RelationshipBoard({
    element, model, registries, outgoing, incoming, density, onNavigate,
}: {
    element: MemoElement;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    outgoing: MemoRelationship[];
    incoming: MemoRelationship[];
    density: Density;
    onNavigate: (elementId: string) => void;
}) {
    const [filter, setFilter] = useState('');
    const groups = useMemo(
        () => linkedElementsByLayer(outgoing, incoming, model, registries),
        [outgoing, incoming, model, registries],
    );
    const needle = filter.trim().toLowerCase();
    const visible = useMemo(() => groups.map(group => ({
        ...group,
        elements: group.elements.filter(linked => !needle || [
            linked.element?.name, linked.element?.kind, linked.element?.shortId,
            linked.id, group.layer, ...linked.links.map(link => link.label),
        ].filter(Boolean).join(' ').toLowerCase().includes(needle)),
    })).filter(group => group.elements.length > 0), [groups, needle]);
    const linkedCount = groups.reduce((count, group) => count + group.elements.length, 0);

    return (
        <div style={{
            border: density === 'page' ? 'none' : `1px solid ${COLOR.border}`,
            borderRadius: 12,
            background: density === 'page' ? 'transparent' : COLOR.surfaceAlt,
            padding: density === 'page' ? 0 : 10,
        }}>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 14 }}>
                <div>
                    <div style={{ color: COLOR.primary, fontSize: 13, fontWeight: 700 }}>Linked elements</div>
                    <div style={{ color: COLOR.muted, fontSize: 11 }}>
                        {linkedCount} element{linkedCount === 1 ? '' : 's'} across {groups.length} layer{groups.length === 1 ? '' : 's'}
                    </div>
                </div>
                {linkedCount > 6 && (
                    <input value={filter} onChange={event => setFilter(event.target.value)}
                        placeholder="Filter linked elements…" aria-label="Filter linked elements"
                        className="transition-shadow focus:shadow-md"
                        style={{
                            marginLeft: 'auto', width: 240, padding: '8px 12px', borderRadius: 8,
                            border: `1px solid ${COLOR.border}`, background: '#F9FAFB',
                            color: COLOR.primary, fontSize: 13, outline: 'none',
                        }} />
                )}
            </div>

            {linkedCount === 0 && (
                <div style={{ color: COLOR.faint, fontSize: 12 }}>No linked elements.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {visible.map(group => {
                    const color = LAYER_COLORS[group.layer] || COLOR.muted;
                    return (
                        <section key={group.layer} style={{
                            padding: '16px 20px',
                            background: color + '08',
                            border: `1px solid ${color}15`,
                            borderRadius: 12,
                        }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                <strong style={{ color: COLOR.primary, fontSize: 14, letterSpacing: '0.02em' }}>
                                    {LAYER_LABELS[group.layer] ?? group.layer}
                                </strong>
                                <span style={{ color: COLOR.faint, fontSize: 12, background: color + '15', padding: '1px 6px', borderRadius: 10 }}>{group.elements.length}</span>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: density === 'page' ? 'repeat(auto-fill, 264px)' : '1fr',
                                justifyContent: 'start',
                                gap: 7,
                            }}>
                                {group.elements.map(linked => (
                                    <LinkedElementCard key={linked.id} linked={linked} color={color} onNavigate={onNavigate} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

function LinkedElementCard({ linked, color, onNavigate }: {
    linked: LinkedElement;
    color: string;
    onNavigate: (elementId: string) => void;
}) {
    const [hover, setHover] = useState(false);
    return (
        <button onClick={() => onNavigate(linked.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            className="text-left transition-all duration-200" title={`Open ${linked.element?.name ?? linked.id}`}
            style={{
                padding: '12px 14px', borderRadius: 10, background: '#FFFFFF',
                border: `1px solid ${hover ? color + '80' : '#E5E7EB'}`,
                cursor: 'pointer', minWidth: 0, width: '100%', maxWidth: 280,
                boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.02)',
                transform: hover ? 'translateY(-1px)' : 'none',
            }}>
            <div style={{ minWidth: 0 }}>
                {linked.links.map(link => (
                    <div key={link.relationship.id} style={{
                        color: link.direction === 'outgoing' ? '#2563EB' : '#059669',
                        fontSize: 10, fontWeight: 600, marginBottom: 2,
                    }}>
                        {link.label} {link.direction === 'outgoing' ? 'to' : 'from'}
                    </div>
                ))}
                <strong className="truncate" style={{ display: 'block', color: COLOR.primary, fontSize: 13 }}>
                    {linked.element?.name ?? linked.id}
                </strong>
                <div className="font-mono truncate" style={{ color: '#9CA3AF', fontSize: '10px', marginTop: 2 }} title={linked.id}>
                    {linked.element?.shortId ?? linked.id}
                </div>
                <div style={{ color: COLOR.muted, fontSize: 10, marginTop: 2 }}>
                    {linked.element?.kind ?? 'Unknown element type'}
                </div>
            </div>
        </button>
    );
}
