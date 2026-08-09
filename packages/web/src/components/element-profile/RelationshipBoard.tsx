// ─── Layer-grouped linked elements ──────────────────────────────────────────
//
// The expanded relationship view answers one question: what is this element
// linked to? Neighbours are grouped by architecture layer and deduplicated;
// relationship type and direction are supporting badges on each neighbour.

import { useCallback, useMemo, useState } from 'react';
import {
    findRelationshipDefinition,
    legalRelationshipTypes,
    type MemoElement, type MemoModelDTO, type MemoRelationship,
    type OntologyRegistriesDTO, type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { TypeFilterSelect } from '../TypeFilterSelect';
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
    onCreate, onDelete,
}: {
    element: MemoElement;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    outgoing: MemoRelationship[];
    incoming: MemoRelationship[];
    density: Density;
    onNavigate: (elementId: string) => void;
    onCreate?: (req: any) => void;
    onDelete?: (id: string) => void;
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
                                    <LinkedElementCard 
                                        key={linked.id} 
                                        element={element}
                                        linked={linked} 
                                        registries={registries}
                                        color={color} 
                                        onNavigate={onNavigate} 
                                        onCreate={onCreate}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

function LinkedElementCard({ element, linked, registries, color, onNavigate, onCreate, onDelete }: {
    element: MemoElement;
    linked: LinkedElement;
    registries: OntologyRegistriesDTO;
    color: string;
    onNavigate: (elementId: string) => void;
    onCreate?: (req: any) => void;
    onDelete?: (id: string) => void;
}) {
    const [hover, setHover] = useState(false);
    
    const options = useMemo(() => {
        if (!element || !linked.element) return [];
        return legalRelationshipTypes(element, linked.element, registries).map(opt => ({
            value: `${opt.definition.name}::${opt.direction}`,
            label: `${opt.definition.label} ${opt.direction === 'outgoing' ? 'to' : 'from'}`,
        }));
    }, [element, linked.element, registries]);

    const selected = linked.links.map(link => `${link.relationship.type}::${link.direction}`);
    
    const handleChange = useCallback((next: string[]) => {
        if (next.length === 0) return; // Must have at least one relationship
        if (!onCreate || !onDelete) return;

        const nextSet = new Set(next);
        const currentSet = new Set(selected);
        
        // Remove unchecked
        for (const link of linked.links) {
            if (!nextSet.has(`${link.relationship.type}::${link.direction}`)) {
                onDelete(link.relationship.id);
            }
        }
        
        // Add checked
        const legalOpts = legalRelationshipTypes(element, linked.element!, registries);
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
    }, [selected, linked.links, element, linked.element, registries, onCreate, onDelete]);

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
                <div className="flex items-start justify-between mb-1" style={{ gap: 4 }}>
                    <div>
                        {linked.links.map(link => (
                            <div key={link.relationship.id} style={{
                                color: link.direction === 'outgoing' ? '#2563EB' : '#059669',
                                fontSize: 10, fontWeight: 600, marginBottom: 2,
                            }}>
                                {link.label} {link.direction === 'outgoing' ? 'to' : 'from'}
                            </div>
                        ))}
                    </div>
                    {options.length > 1 && onCreate && (
                        <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, marginTop: -4, marginRight: -4 }}>
                            <TypeFilterSelect
                                label=""
                                options={options}
                                selected={selected}
                                onChange={handleChange}
                                iconOnly={true}
                                align="right"
                                title="Change relationship type"
                            />
                        </div>
                    )}
                </div>
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
