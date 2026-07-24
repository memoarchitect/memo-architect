// ─── Add Relationship Dialog ──────────────────────────────────────────────────
//
// Authors a model relationship from the currently selected element. Legality
// comes entirely from the ontology registries via the shared resolver in
// @memoarchitect/tools/browser — the same functions the diagram picker, the
// canvas, and the server all use.
//
// Two entry paths lead to the same confirmation:
//   relationship-first — choose direction and type, then a compatible element
//   target-first       — choose any element, then only the legal links to it
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    compatibleRelationshipTargets,
    describeRelationship,
    groupTargetsByKindAndLayer,
    isUniversalRelationship,
    legalRelationshipsForElement,
    legalRelationshipTypes,
    type MemoElement,
    type RelationshipDefinitionDTO,
    type RelationshipDirection,
    type OntologyRegistriesDTO,
    type MemoModelDTO,
} from '@memoarchitect/tools/browser';
import { LAYER_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

export interface AddRelationshipDialogProps {
    element: MemoElement;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    /** Diagram in scope, so the server can report view-profile fit. */
    diagramId?: string;
    onCancel: () => void;
    onConfirm: (request: {
        type: string;
        sourceId: string;
        targetId: string;
        direction: RelationshipDirection;
    }) => void;
}

type Flow = 'relationship-first' | 'target-first';

const PANEL_BG = '#FFFFFF';
const BORDER = '#E5E5E0';
const ACCENT = '#2DD4A8';

export function AddRelationshipDialog({
    element, model, registries, onCancel, onConfirm,
}: AddRelationshipDialogProps) {
    const [flow, setFlow] = useState<Flow>('relationship-first');
    const [direction, setDirection] = useState<RelationshipDirection | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // Target search filters
    const [query, setQuery] = useState('');
    const [kindFilter, setKindFilter] = useState('');
    const [layerFilter, setLayerFilter] = useState('');
    const [packageFilter, setPackageFilter] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    // ─── Relationship-first: legal types for the selected element ───────────

    const legalForElement = useMemo(
        () => legalRelationshipsForElement(element, registries),
        [element, registries]);

    /**
     * Types offered once a direction is chosen — the element must fit that end.
     * Order comes from the resolver (most specific first), so a universal
     * relation like MemoLink stays at the bottom of the list.
     */
    const typesForDirection = useMemo(() => {
        if (!direction) return [];
        return legalForElement
            .filter(entry => entry.directions.includes(direction))
            .map(entry => entry.definition);
    }, [legalForElement, direction]);

    /** Directions the element can take at all, across every relationship type. */
    const availableDirections = useMemo(() => {
        const directions = new Set<RelationshipDirection>();
        for (const entry of legalForElement) {
            for (const d of entry.directions) directions.add(d);
        }
        return Array.from(directions);
    }, [legalForElement]);

    const definition: RelationshipDefinitionDTO | undefined = useMemo(
        () => typesForDirection.find(d => d.name === selectedType)
            ?? registries.relationships.find(d => d.name === selectedType),
        [typesForDirection, registries, selectedType]);

    // ─── Compatible opposite endpoints (complete model, not just this view) ─

    const candidates = useMemo(() => {
        if (!definition || !direction) return [];
        return compatibleRelationshipTargets(element, definition, direction, model, registries, {
            query,
            kind: kindFilter || undefined,
            layer: layerFilter || undefined,
            package: packageFilter || undefined,
        });
    }, [definition, direction, element, model, registries, query, kindFilter, layerFilter, packageFilter]);

    const groupedCandidates = useMemo(() => groupTargetsByKindAndLayer(candidates), [candidates]);

    // ─── Target-first: pick any element, then only the legal links ──────────

    const searchResults = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return Object.values(model.elements)
            .filter(el => el.id !== element.id)
            .filter(el => !kindFilter || el.kind === kindFilter)
            .filter(el => !layerFilter || el.layer === layerFilter)
            .filter(el => !packageFilter || el.package === packageFilter)
            .filter(el => !needle || [el.name, el.id, el.shortId, el.kind]
                .filter(Boolean).join(' ').toLowerCase().includes(needle))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 200);
    }, [model, element.id, query, kindFilter, layerFilter, packageFilter]);

    const targetElement = selectedTargetId ? model.elements[selectedTargetId] : undefined;

    /** Every legal (type, direction) pair between the two chosen elements. */
    const optionsForTarget = useMemo(() => {
        if (!targetElement) return [];
        return legalRelationshipTypes(element, targetElement, registries);
    }, [element, targetElement, registries]);

    // Exactly one legal choice is preselected — but never auto-confirmed.
    useEffect(() => {
        if (flow !== 'target-first' || !targetElement) return;
        if (optionsForTarget.length === 1) {
            setSelectedType(optionsForTarget[0].definition.name);
            setDirection(optionsForTarget[0].direction);
        } else {
            setSelectedType(null);
            setDirection(null);
        }
    }, [flow, targetElement, optionsForTarget]);

    // ─── Resolved request ──────────────────────────────────────────────────

    /**
     * Normalize to source→target. An incoming relationship puts the opposite
     * element on the source end, which is what the server persists.
     */
    const request = useMemo(() => {
        if (!definition || !direction || !selectedTargetId) return null;
        return direction === 'outgoing'
            ? { type: definition.name, sourceId: element.id, targetId: selectedTargetId, direction }
            : { type: definition.name, sourceId: selectedTargetId, targetId: element.id, direction };
    }, [definition, direction, selectedTargetId, element.id]);

    const preview = useMemo(() => {
        if (!request || !definition) return null;
        return describeRelationship(
            definition,
            model.elements[request.sourceId],
            model.elements[request.targetId],
            { sourceId: request.sourceId, targetId: request.targetId });
    }, [request, definition, model]);

    const resetFlow = useCallback((next: Flow) => {
        setFlow(next);
        setDirection(null);
        setSelectedType(null);
        setSelectedTargetId(null);
        setQuery('');
    }, []);

    // Filter option lists come from the model, so they never offer an empty set.
    const kinds = useMemo(
        () => Array.from(new Set(Object.values(model.elements).map(el => el.kind))).sort(),
        [model]);
    const layers = useMemo(
        () => Array.from(new Set(Object.values(model.elements).map(el => el.layer))).sort(),
        [model]);
    const packages = useMemo(
        () => Array.from(new Set(Object.values(model.elements)
            .map(el => el.package).filter((p): p is string => !!p))).sort(),
        [model]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(15,23,42,0.35)' }}
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-label="Add relationship"
        >
            <div
                className="flex flex-col rounded-xl overflow-hidden"
                style={{
                    width: 560, maxHeight: '80vh', background: PANEL_BG,
                    border: `1px solid ${BORDER}`, boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Add Relationship</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        from <span style={{ fontWeight: 500, color: '#374151' }}>{element.name}</span>
                        {' '}<span style={{ color: '#9CA3AF' }}>({element.kind})</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                        <FlowTab
                            active={flow === 'relationship-first'}
                            label="Choose relationship"
                            onClick={() => resetFlow('relationship-first')}
                        />
                        <FlowTab
                            active={flow === 'target-first'}
                            label="Choose element"
                            onClick={() => resetFlow('target-first')}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {flow === 'relationship-first' ? (
                        <>
                            <FieldLabel>Direction</FieldLabel>
                            {availableDirections.length === 0 ? (
                                <Empty>
                                    The ontology defines no relationship that a {element.kind} can take part in.
                                </Empty>
                            ) : (
                                <div className="flex gap-2 mb-3">
                                    {availableDirections.includes('outgoing') && (
                                        <DirectionButton
                                            active={direction === 'outgoing'}
                                            onClick={() => { setDirection('outgoing'); setSelectedType(null); setSelectedTargetId(null); }}
                                            title="Outgoing"
                                            subtitle={`${element.name} → other`}
                                        />
                                    )}
                                    {availableDirections.includes('incoming') && (
                                        <DirectionButton
                                            active={direction === 'incoming'}
                                            onClick={() => { setDirection('incoming'); setSelectedType(null); setSelectedTargetId(null); }}
                                            title="Incoming"
                                            subtitle={`other → ${element.name}`}
                                        />
                                    )}
                                </div>
                            )}

                            {direction && (
                                <>
                                    <FieldLabel>Relationship type</FieldLabel>
                                    {typesForDirection.length === 0 ? (
                                        <Empty>No relationship type allows a {element.kind} on that end.</Empty>
                                    ) : (
                                        <div className="mb-3" style={{ maxHeight: 160, overflowY: 'auto' }}>
                                            {typesForDirection.map(def => (
                                                <TypeRow
                                                    key={def.name}
                                                    definition={def}
                                                    direction={direction}
                                                    selected={selectedType === def.name}
                                                    onClick={() => { setSelectedType(def.name); setSelectedTargetId(null); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {definition && direction && (
                                <>
                                    <FieldLabel>
                                        {direction === 'outgoing'
                                            ? `${definition.targetEnd.name} element`
                                            : `${definition.sourceEnd.name} element`}
                                    </FieldLabel>
                                    <Filters
                                        query={query} setQuery={setQuery}
                                        kinds={kinds} kindFilter={kindFilter} setKindFilter={setKindFilter}
                                        layers={layers} layerFilter={layerFilter} setLayerFilter={setLayerFilter}
                                        packages={packages} packageFilter={packageFilter} setPackageFilter={setPackageFilter}
                                    />
                                    {candidates.length === 0 ? (
                                        <Empty>No element in the model can occupy that end.</Empty>
                                    ) : (
                                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                            {groupedCandidates.map(group => (
                                                <div key={`${group.layer}-${group.kind}`}>
                                                    <GroupHeader layer={group.layer} kind={group.kind} count={group.elements.length} />
                                                    {group.elements.map(candidate => (
                                                        <ElementRow
                                                            key={candidate.id}
                                                            element={candidate}
                                                            selected={selectedTargetId === candidate.id}
                                                            onClick={() => setSelectedTargetId(candidate.id)}
                                                        />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <FieldLabel>Element to link</FieldLabel>
                            <Filters
                                query={query} setQuery={setQuery}
                                kinds={kinds} kindFilter={kindFilter} setKindFilter={setKindFilter}
                                layers={layers} layerFilter={layerFilter} setLayerFilter={setLayerFilter}
                                packages={packages} packageFilter={packageFilter} setPackageFilter={setPackageFilter}
                            />
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {searchResults.map(candidate => (
                                    <ElementRow
                                        key={candidate.id}
                                        element={candidate}
                                        selected={selectedTargetId === candidate.id}
                                        onClick={() => setSelectedTargetId(candidate.id)}
                                    />
                                ))}
                                {searchResults.length === 0 && <Empty>No element matches that search.</Empty>}
                            </div>

                            {targetElement && (
                                <>
                                    <FieldLabel>Legal relationships</FieldLabel>
                                    {optionsForTarget.length === 0 ? (
                                        <Empty>
                                            The ontology defines no relationship between a {element.kind} and
                                            a {targetElement.kind}.
                                        </Empty>
                                    ) : (
                                        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                                            {optionsForTarget.map(option => (
                                                <TypeRow
                                                    key={`${option.definition.name}-${option.direction}`}
                                                    definition={option.definition}
                                                    direction={option.direction}
                                                    selected={
                                                        selectedType === option.definition.name &&
                                                        direction === option.direction
                                                    }
                                                    onClick={() => {
                                                        setSelectedType(option.definition.name);
                                                        setDirection(option.direction);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Preview + confirm */}
                <div className="px-4 py-3" style={{ borderTop: `1px solid ${BORDER}`, background: '#FAFAF8' }}>
                    {preview ? (
                        <div
                            className="text-xs mb-2 px-2 py-1.5 rounded"
                            style={{ background: '#F0FDF9', color: '#0F766E', border: '1px solid #99F6E4' }}
                        >
                            {preview}
                        </div>
                    ) : (
                        <div className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                            Choose a relationship type and an element to see the preview.
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 rounded text-xs font-medium"
                            style={{ background: '#F0F0ED', color: '#374151', border: 'none', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => request && onConfirm(request)}
                            disabled={!request}
                            className="px-3 py-1.5 rounded text-xs font-medium"
                            style={{
                                background: request ? ACCENT : '#E5E5E0',
                                color: request ? '#FFFFFF' : '#9CA3AF',
                                border: 'none', cursor: request ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Create relationship
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Presentation pieces ────────────────────────────────────────────────────

function FlowTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-2 py-1 rounded"
            style={{
                fontSize: FONT.xs,
                fontWeight: active ? 600 : 400,
                background: active ? '#2DD4A818' : 'transparent',
                color: active ? '#0F766E' : '#6B7280',
                border: 'none', cursor: 'pointer',
            }}
        >
            {label}
        </button>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-1.5" style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {children}
        </div>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <div className="text-xs py-2 mb-2" style={{ color: '#9CA3AF' }}>{children}</div>;
}

function DirectionButton({ active, onClick, title, subtitle }: {
    active: boolean; onClick: () => void; title: string; subtitle: string;
}) {
    return (
        <button
            onClick={onClick}
            className="flex-1 px-2 py-1.5 rounded text-left"
            style={{
                background: active ? '#2DD4A818' : '#F7F7F5',
                border: `1px solid ${active ? ACCENT : BORDER}`,
                cursor: 'pointer',
            }}
        >
            <div style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>{title}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{subtitle}</div>
        </button>
    );
}

function TypeRow({ definition, direction, selected, onClick }: {
    definition: RelationshipDefinitionDTO;
    direction: RelationshipDirection;
    selected: boolean;
    onClick: () => void;
}) {
    // Show the end the opposite element will occupy — that is what the user is
    // about to pick, and it names the constraint the ontology will enforce.
    const oppositeEnd = direction === 'outgoing' ? definition.targetEnd : definition.sourceEnd;
    const universal = isUniversalRelationship(definition);
    return (
        <button
            onClick={onClick}
            className="w-full text-left px-2 py-1.5 rounded"
            style={{
                background: selected ? '#2DD4A818' : 'transparent',
                border: 'none', cursor: 'pointer', display: 'block',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F7F7F5'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
        >
            <div className="flex items-center gap-1.5">
                <span style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>{definition.label}</span>
                <span style={{ fontSize: '9px', color: '#9CA3AF' }}>{direction === 'outgoing' ? '→' : '←'}</span>
                <span style={{ fontSize: '10px', color: '#6B7280' }}>
                    {oppositeEnd.type ?? 'any element'}
                </span>
                {universal && (
                    <span
                        className="px-1 rounded"
                        style={{ fontSize: '9px', background: '#FEF3C7', color: '#92400E' }}
                        title="Joins any two elements. Prefer a relation that carries the meaning."
                    >
                        fallback
                    </span>
                )}
            </div>
            {definition.description && (
                <div style={{ fontSize: '10px', color: '#9CA3AF' }} className="truncate">
                    {definition.description}
                </div>
            )}
        </button>
    );
}

function GroupHeader({ layer, kind, count }: { layer: string; kind: string; count: number }) {
    const color = LAYER_COLORS[layer] || '#666';
    return (
        <div className="flex items-center gap-1.5 px-1 pt-2 pb-1">
            <span className="w-2 h-2 flex-shrink-0" style={{ background: color, borderRadius: '2px' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>{kind}</span>
            <span style={{ fontSize: '10px', color: '#9CA3AF' }}>· {layer}</span>
            <span className="ml-auto" style={{ fontSize: '10px', color: '#D1D5DB' }}>{count}</span>
        </div>
    );
}

function ElementRow({ element, selected, onClick }: {
    element: MemoElement; selected: boolean; onClick: () => void;
}) {
    const color = LAYER_COLORS[element.layer] || '#666';
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-left"
            style={{
                background: selected ? '#2DD4A818' : 'transparent',
                border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F7F7F5'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
        >
            <span className="truncate" style={{ fontSize: FONT.xs, color: '#1a1a1a' }}>{element.name}</span>
            <span
                className="ml-auto flex-shrink-0 px-1 rounded"
                style={{ background: color + '15', color, fontSize: FONT.badge }}
            >
                {element.kind}
            </span>
        </button>
    );
}

function Filters({
    query, setQuery, kinds, kindFilter, setKindFilter,
    layers, layerFilter, setLayerFilter, packages, packageFilter, setPackageFilter,
}: {
    query: string; setQuery: (v: string) => void;
    kinds: string[]; kindFilter: string; setKindFilter: (v: string) => void;
    layers: string[]; layerFilter: string; setLayerFilter: (v: string) => void;
    packages: string[]; packageFilter: string; setPackageFilter: (v: string) => void;
}) {
    const selectStyle = {
        fontSize: '10px', background: '#F7F7F5', border: `1px solid ${BORDER}`,
        color: '#374151', borderRadius: 4, padding: '2px 4px', flex: 1, minWidth: 0,
    } as const;
    return (
        <div className="mb-2">
            <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, ID or kind…"
                aria-label="Search elements"
                className="w-full px-2 py-1 rounded focus:outline-none mb-1.5"
                style={{ fontSize: FONT.xs, background: '#F7F7F5', border: `1px solid ${BORDER}`, color: '#374151' }}
            />
            <div className="flex gap-1">
                <select aria-label="Filter by kind" value={kindFilter} onChange={e => setKindFilter(e.target.value)} style={selectStyle}>
                    <option value="">All kinds</option>
                    {kinds.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select aria-label="Filter by layer" value={layerFilter} onChange={e => setLayerFilter(e.target.value)} style={selectStyle}>
                    <option value="">All layers</option>
                    {layers.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select aria-label="Filter by package" value={packageFilter} onChange={e => setPackageFilter(e.target.value)} style={selectStyle}>
                    <option value="">All packages</option>
                    {packages.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
        </div>
    );
}
