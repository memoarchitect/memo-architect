// ─── RelationshipsSection ─────────────────────────────────────────────────────
//
// Domain-grouped filter panel for SysML v2 relationship types.
// Shows all connection def types from the ontology grouped by domain,
// with SysML notation indicators (line style + marker badges).
//
// Clicking a type toggles it into the active set, which drives the
// RelationshipOverlay to highlight those edges on the LayerGrid.
// Clicking a domain header selects/deselects the whole group.
// "Clear" resets to show-all mode.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { OntologyPackageInfo } from '../../types/ontology';
import {
    DOMAIN_GROUPS,
    getEdgeStyle,
    type SysmlEdgeStyle,
    type DomainGroup,
} from './sysml-edge-styles';

interface RelationshipsSectionProps {
    ontology: OntologyPackageInfo;
    activeTypes: Set<string>;
    onActiveTypesChange: (types: Set<string>) => void;
}

// ─── Notation badge ───────────────────────────────────────────────────────────

function NotationBadge({ style }: { style: SysmlEdgeStyle }) {
    const w = 36;
    const h = 14;
    const y = h / 2;

    const stroke = style.color;
    const strokeDash = style.lineStyle === 'dashed' ? '4,3' : undefined;

    // Source marker
    const srcMark = style.sourceMarker === 'diamond-open'
        ? <polygon points={`0,${y} 5,${y - 4} 10,${y} 5,${y + 4}`} fill="white" stroke={stroke} strokeWidth={1.2} />
        : style.sourceMarker === 'diamond-filled'
        ? <polygon points={`0,${y} 5,${y - 4} 10,${y} 5,${y + 4}`} fill={stroke} stroke={stroke} strokeWidth={1} />
        : null;

    const lineStart = style.sourceMarker !== 'none' ? 10 : 2;
    const lineEnd   = style.targetMarker !== 'none' ? w - 9 : w - 2;

    // Target marker
    const tgtMark = style.targetMarker === 'arrow'
        ? <polyline points={`${lineEnd},${y - 4} ${w - 2},${y} ${lineEnd},${y + 4}`} fill="none" stroke={stroke} strokeWidth={1.2} />
        : style.targetMarker === 'filled-arrow'
        ? <polygon points={`${lineEnd},${y - 4} ${w - 2},${y} ${lineEnd},${y + 4}`} fill={stroke} stroke="none" />
        : style.targetMarker === 'triangle-open'
        ? <polygon points={`${lineEnd},${y - 5} ${w - 2},${y} ${lineEnd},${y + 5}`} fill="white" stroke={stroke} strokeWidth={1.2} />
        : style.targetMarker === 'circle'
        ? <circle cx={w - 5} cy={y} r={3.5} fill="white" stroke={stroke} strokeWidth={1.2} />
        : null;

    return (
        <svg
            width={w}
            height={h}
            style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
            aria-hidden="true"
        >
            {srcMark}
            <line
                x1={lineStart} y1={y}
                x2={lineEnd}   y2={y}
                stroke={stroke}
                strokeWidth={1.5}
                strokeDasharray={strokeDash}
            />
            {tgtMark}
        </svg>
    );
}

// ─── Type chip ────────────────────────────────────────────────────────────────

function TypeChip({
    name,
    active,
    onClick,
}: {
    name: string;
    active: boolean;
    onClick: () => void;
}) {
    const style = getEdgeStyle(name);
    const color = style.color;

    return (
        <button
            onClick={onClick}
            title={style.stereotype ? `«${style.stereotype}»` : name}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 7px 3px 5px',
                borderRadius: '6px',
                border: `1px solid ${active ? color : `${color}30`}`,
                background: active ? `${color}18` : 'transparent',
                cursor: 'pointer',
                fontSize: '10px',
                color: active ? color : '#6B7280',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${color}08`; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            <NotationBadge style={style} />
            <span>{name}</span>
            {style.stereotype && (
                <span style={{ fontSize: '9px', opacity: 0.7 }}>«{style.stereotype}»</span>
            )}
        </button>
    );
}

// ─── Domain group row ─────────────────────────────────────────────────────────

function DomainGroupRow({
    group,
    presentTypes,
    activeTypes,
    onToggleType,
    onToggleGroup,
}: {
    group: DomainGroup;
    presentTypes: string[];
    activeTypes: Set<string>;
    onToggleType: (t: string) => void;
    onToggleGroup: (ids: string[]) => void;
}) {
    const [collapsed, setCollapsed] = useState(false);
    if (presentTypes.length === 0) return null;

    const allActive = presentTypes.every(t => activeTypes.has(t));
    const anyActive = presentTypes.some(t => activeTypes.has(t));

    return (
        <div style={{ marginBottom: '8px' }}>
            {/* Domain header */}
            <div
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: group.color.bg,
                    marginBottom: collapsed ? 0 : '5px',
                }}
                onClick={() => setCollapsed(c => !c)}
            >
                <svg
                    width="8" height="8" viewBox="0 0 16 16" fill="none"
                    style={{ transition: 'transform 150ms', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }}
                >
                    <path d="M4 6L8 10L12 6" stroke={group.color.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                    style={{ fontSize: '10px', fontWeight: 700, color: group.color.text, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}
                >
                    {group.label}
                </span>
                <span style={{ fontSize: '9px', color: group.color.text, opacity: 0.7 }}>
                    {presentTypes.length} types
                </span>
                {/* Select-all toggle (stop propagation so it doesn't collapse) */}
                <button
                    onClick={e => { e.stopPropagation(); onToggleGroup(presentTypes); }}
                    style={{
                        fontSize: '9px',
                        color: group.color.text,
                        opacity: allActive ? 1 : anyActive ? 0.7 : 0.5,
                        fontWeight: allActive ? 700 : 400,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '0 2px',
                    }}
                    title={allActive ? 'Deselect all' : 'Select all in group'}
                >
                    {allActive ? '✓ all' : 'all'}
                </button>
            </div>

            {/* Type chips */}
            {!collapsed && (
                <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: '8px' }}>
                    {presentTypes.map(t => (
                        <TypeChip
                            key={t}
                            name={t}
                            active={activeTypes.has(t)}
                            onClick={() => onToggleType(t)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RelationshipsSection({ ontology, activeTypes, onActiveTypesChange }: RelationshipsSectionProps) {
    // Build set of type names actually present in this ontology
    const presentTypeNames = useMemo(() => {
        const names = new Set<string>();
        for (const r of ontology.relationshipTypes ?? []) names.add(r.name);
        return names;
    }, [ontology.relationshipTypes]);

    if (presentTypeNames.size === 0) return null;

    const totalCount = presentTypeNames.size;
    const activeCount = activeTypes.size;

    function toggleType(name: string) {
        const next = new Set(activeTypes);
        if (next.has(name)) next.delete(name); else next.add(name);
        onActiveTypesChange(next);
    }

    function toggleGroup(names: string[]) {
        const allOn = names.every(n => activeTypes.has(n));
        const next = new Set(activeTypes);
        if (allOn) {
            for (const n of names) next.delete(n);
        } else {
            for (const n of names) next.add(n);
        }
        onActiveTypesChange(next);
    }

    function clearAll() {
        onActiveTypesChange(new Set());
    }

    return (
        <div className="mt-4">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Relationships
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {totalCount} types
                </span>
                {activeCount > 0 && (
                    <>
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#2563EB',
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '8px',
                                padding: '1px 7px',
                            }}
                        >
                            {activeCount} active
                        </span>
                        <button
                            onClick={clearAll}
                            style={{ fontSize: '10px', color: '#6B7280', border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 2px' }}
                        >
                            Clear
                        </button>
                    </>
                )}
                {activeCount === 0 && (
                    <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        click a type or group to filter edges
                    </span>
                )}
            </div>

            {/* Domain groups */}
            {DOMAIN_GROUPS.map(group => {
                const presentInGroup = group.types.filter(t => presentTypeNames.has(t));
                return (
                    <DomainGroupRow
                        key={group.id}
                        group={group}
                        presentTypes={presentInGroup}
                        activeTypes={activeTypes}
                        onToggleType={toggleType}
                        onToggleGroup={toggleGroup}
                    />
                );
            })}

            {/* Any types not covered by a domain group */}
            {(() => {
                const coveredByGroups = new Set(DOMAIN_GROUPS.flatMap(g => g.types));
                const uncovered = [...presentTypeNames].filter(t => !coveredByGroups.has(t));
                if (uncovered.length === 0) return null;
                return (
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                            Other
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {uncovered.map(t => (
                                <TypeChip key={t} name={t} active={activeTypes.has(t)} onClick={() => toggleType(t)} />
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
