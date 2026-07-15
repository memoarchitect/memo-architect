// ─── LayerGrid ────────────────────────────────────────────────────────────────
//
// Swimlane-based visual grid matching the draw.io ontology reference layout.
// Each swimlane is collapsible (click header row to toggle). Collapsed state
// persists in local component state across re-renders.
//
// Card ordering: root kinds (no derivesFrom) render before specializations,
// then alphabetically within each tier.
//
// Architecture swimlane has sub-layer headers: Functional, Logical, Physical,
// Software, Interfaces.
//
// Card design:
//   - 130×55px compact card with 3px left border in layer color
//   - construct badge (top-left) + instance count (top-right)
//   - Kind name (bold, centered)
//   - Hover: slight layer-color tint; Selected: full border + tint
//   - data-kind="KindName" for edge positioning
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { OntologyKindInfo, OntologyLayerInfo } from '../../types/ontology';
import { LAYER_ORDER } from '../../constants';

// ─── Draw.io domain color palette ────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, { bg: string; header: string; text: string; border: string }> = {
    'purpose-operational': { bg: '#f0f7ff', header: '#cce5ff', text: '#1e40af', border: '#93c5fd' },
    'requirements':        { bg: '#f0f6ff', header: '#dae8fc', text: '#1d4ed8', border: '#93c5fd' },
    'architecture':        { bg: '#f0faf0', header: '#d5e8d4', text: '#166534', border: '#86efac' },
    'risk':                { bg: '#fff5f5', header: '#f8cecc', text: '#991b1b', border: '#fca5a5' },
    'vv-evidence':         { bg: '#faf5ff', header: '#e1d5e7', text: '#6b21a8', border: '#c4b5fd' },
    'dhf-outputs':         { bg: '#fffbeb', header: '#fff2cc', text: '#92400e', border: '#fcd34d' },
    'other':               { bg: '#f9fafb', header: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

// ─── Swimlane group definitions ───────────────────────────────────────────────

interface LayerGroup {
    id: string;
    label: string;
    abbr: string;
    layerIds: string[];
    subGroups?: { label: string; layerIds: string[] }[];
}

const LAYER_GROUPS: LayerGroup[] = [
    {
        id: 'purpose-operational',
        label: 'Purpose & Operational',
        abbr: 'PUR',
        layerIds: ['purpose', 'business', 'operational'],
    },
    {
        id: 'requirements',
        label: 'Requirements',
        abbr: 'REQ',
        layerIds: ['requirements'],
    },
    {
        id: 'architecture',
        label: 'Architecture',
        abbr: 'ARCH',
        layerIds: ['functional', 'behavior', 'logical', 'physical', 'software', 'interfaces', 'ui'],
        subGroups: [
            { label: 'Functional', layerIds: ['functional', 'behavior'] },
            { label: 'Logical',    layerIds: ['logical'] },
            { label: 'Physical',   layerIds: ['physical'] },
            { label: 'Software',   layerIds: ['software'] },
            { label: 'Interfaces', layerIds: ['interfaces', 'ui'] },
        ],
    },
    {
        id: 'risk',
        label: 'Risk',
        abbr: 'RISK',
        layerIds: ['risk', 'safety', 'cybersecurity'],
    },
    {
        id: 'vv-evidence',
        label: 'V&V & Evidence',
        abbr: 'V&V',
        layerIds: ['verification', 'analysis'],
    },
    {
        id: 'dhf-outputs',
        label: 'DHF Outputs',
        abbr: 'DHF',
        layerIds: ['design-control', 'qms', 'software-lifecycle', 'operations', 'clinical', 'privacy'],
    },
];

const LAYER_RANK = Object.fromEntries(LAYER_ORDER.map((id, i) => [id, i]));

function sortByLifecycle(layers: OntologyLayerInfo[]): OntologyLayerInfo[] {
    return [...layers].sort((a, b) => (LAYER_RANK[a.id] ?? 99) - (LAYER_RANK[b.id] ?? 99));
}

/** Sort kinds: root kinds (no derivesFrom) first, then specializations, then alpha within each tier. */
function sortKindsParentFirst(kinds: OntologyKindInfo[]): OntologyKindInfo[] {
    return [...kinds].sort((a, b) => {
        const aIsRoot = !a.derivesFrom ? 0 : 1;
        const bIsRoot = !b.derivesFrom ? 0 : 1;
        if (aIsRoot !== bIsRoot) return aIsRoot - bIsRoot;
        return a.name.localeCompare(b.name);
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LayerGridProps {
    layers: OntologyLayerInfo[];
    selectedKind: string | null;
    onKindClick: (kind: string | null) => void;
    /** Layer id to scroll to (from browser click or external navigation) */
    activeLayerId?: string | null;
    /** Kind name to flash (highlight animation) when navigating via properties links */
    flashKindName?: string | null;
    /** Increments each navigation so the same kind can be re-flashed */
    flashTick?: number;
}

// ─── Element card ─────────────────────────────────────────────────────────────

interface KindCardProps {
    kind: OntologyKindInfo;
    layerColor: string;
    domainBg: string;
    selected: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    isFlashing?: boolean;
    flashTick?: number;
}

function KindCard({ kind, layerColor, domainBg, selected, onClick, onContextMenu, isFlashing, flashTick }: KindCardProps) {
    const [hovered, setHovered] = useState(false);
    const [glowing, setGlowing] = useState(false);

    useEffect(() => {
        if (!isFlashing) return;
        setGlowing(true);
        const t = setTimeout(() => setGlowing(false), 700);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFlashing, flashTick]);

    const bg = selected
        ? `${layerColor}18`
        : hovered
        ? `${layerColor}0C`
        : '#ffffff';

    const borderColor = selected ? layerColor : 'transparent';
    const leftBorderColor = layerColor;

    return (
        <button
            data-kind={kind.name}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="text-left transition-all"
            style={{
                width: '130px',
                minHeight: '55px',
                background: bg,
                border: `1px solid ${borderColor}`,
                borderLeft: `3px solid ${leftBorderColor}`,
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer',
                transform: glowing ? 'scale(1.04)' : 'scale(1)',
                boxShadow: glowing
                    ? `0 0 0 2px ${layerColor}, 0 0 12px ${layerColor}60`
                    : selected ? `0 0 0 1px ${layerColor}40` : hovered ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                flexShrink: 0,
            }}
        >
            {/* Top row: construct badge + count */}
            <div className="flex items-center justify-between mb-1">
                <span
                    style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        color: layerColor,
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                    }}
                >
                    {kind.construct.replace('part def', 'pd').replace('connection def', 'cd').replace('attribute def', 'ad')}
                </span>
                {kind.instanceCount > 0 && (
                    <span
                        style={{
                            fontSize: '9px',
                            color: '#6B7280',
                            background: `${layerColor}15`,
                            borderRadius: '8px',
                            padding: '0 4px',
                            lineHeight: '14px',
                        }}
                    >
                        {kind.instanceCount}
                    </span>
                )}
            </div>

            {/* Kind name */}
            <div
                style={{
                    fontSize: '11px',
                    fontWeight: kind.derivesFrom ? 400 : 600,
                    color: selected ? layerColor : '#1F2937',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                }}
            >
                {kind.name}
            </div>

            {/* Supertype hint for child kinds */}
            {kind.derivesFrom && (
                <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '2px', lineHeight: 1 }}>
                    ↳ {kind.derivesFrom}
                </div>
            )}
        </button>
    );
}

// ─── LayerGrid ────────────────────────────────────────────────────────────────

export function LayerGrid({ layers, selectedKind, onKindClick, activeLayerId, flashKindName, flashTick }: LayerGridProps) {
    const swimlaneRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [flashLayerId, setFlashLayerId] = useState<string | null>(null);
    // Collapsed swimlane state persists per render; start all collapsed (header-only view)
    const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(
        () => new Set(LAYER_GROUPS.map(g => g.id).concat(['other']))
    );

    // Scroll-to-layer when activeLayerId changes
    useEffect(() => {
        if (!activeLayerId) return;
        const el = swimlaneRefs.current[activeLayerId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setFlashLayerId(activeLayerId);
            const t = setTimeout(() => setFlashLayerId(null), 1200);
            return () => clearTimeout(t);
        }
    }, [activeLayerId]);

    if (layers.length === 0) {
        return (
            <div className="flex items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
                <div className="text-center">
                    <div className="text-2xl mb-2">⬡</div>
                    <div className="text-xs">No layers found in this ontology</div>
                </div>
            </div>
        );
    }

    const groupedLayerIds = new Set(LAYER_GROUPS.flatMap(g => g.layerIds));
    const otherLayers = sortByLifecycle(layers.filter(l => !groupedLayerIds.has(l.id)));

    function handleContextMenu(e: React.MouseEvent, _kindName: string) {
        e.preventDefault();
    }

    function toggleSwimlane(groupId: string) {
        setCollapsedSwimlanes(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
            return next;
        });
    }

    const renderCards = (kindList: OntologyKindInfo[], layerColor: string, domainBg: string) => {
        const sorted = sortKindsParentFirst(kindList);
        return sorted.map(kind => (
            <KindCard
                key={kind.name}
                kind={kind}
                layerColor={layerColor}
                domainBg={domainBg}
                selected={selectedKind === kind.name}
                onClick={() => onKindClick(selectedKind === kind.name ? null : kind.name)}
                onContextMenu={e => handleContextMenu(e, kind.name)}
                isFlashing={flashKindName === kind.name}
                flashTick={flashTick}
            />
        ));
    };

    const renderSwimlane = (
        group: LayerGroup | { id: string; label: string; abbr: string; layerIds: string[]; subGroups?: never },
        groupLayers: OntologyLayerInfo[],
    ) => {
        const palette = DOMAIN_COLORS[group.id] ?? DOMAIN_COLORS.other;
        const totalKinds = groupLayers.reduce((s, l) => s + l.kindCount, 0);
        const isEmpty = totalKinds === 0;
        const isCollapsed = collapsedSwimlanes.has(group.id);

        // Determine which layers belong to this group in sorted order
        const sortedGroupLayers = sortByLifecycle(groupLayers);

        return (
            <div
                key={group.id}
                ref={el => { swimlaneRefs.current[group.id] = el; }}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                    border: `1px solid ${palette.border}`,
                    background: palette.bg,
                    outline: flashLayerId === group.id ? `2px solid ${palette.border}` : 'none',
                    outlineOffset: '2px',
                }}
            >
                {/* Swimlane header — click to collapse/expand */}
                <div
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer select-none"
                    style={{ background: palette.header, borderBottom: isCollapsed ? 'none' : `1px solid ${palette.border}` }}
                    onClick={() => toggleSwimlane(group.id)}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {/* Collapse chevron */}
                    <svg
                        width="10" height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{
                            transition: 'transform 150ms ease',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            flexShrink: 0,
                        }}
                    >
                        <path d="M4 6L8 10L12 6" stroke={palette.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* Abbreviated vertical-style label */}
                    <span
                        style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: palette.text,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            minWidth: '32px',
                            textAlign: 'center',
                        }}
                    >
                        {group.abbr}
                    </span>
                    <span style={{ width: '1px', height: '14px', background: `${palette.border}`, opacity: 0.5 }} />
                    <span
                        className="text-xs font-semibold flex-1"
                        style={{ color: palette.text }}
                    >
                        {group.label}
                    </span>
                    <span
                        className="text-xs"
                        style={{ color: palette.text, opacity: 0.7 }}
                    >
                        {isEmpty ? 'no kinds' : `${totalKinds} kinds`}
                    </span>
                </div>

                {/* Body — hidden when collapsed */}
                {!isCollapsed && (
                    isEmpty ? (
                        <div
                            className="px-4 py-1.5 text-xs italic"
                            style={{ color: palette.text, opacity: 0.4 }}
                        >
                            (no elements)
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {/* Architecture swimlane: sub-group by layer type */}
                            {(group as LayerGroup).subGroups
                                ? (group as LayerGroup).subGroups!.map(sub => {
                                    const subLayers = sortedGroupLayers.filter(l => sub.layerIds.includes(l.id));
                                    if (subLayers.length === 0) return null;
                                    const allKinds = subLayers.flatMap(l => l.kinds);
                                    if (allKinds.length === 0) return null;
                                    const layerColor = subLayers[0].color ?? palette.text;
                                    return (
                                        <div key={sub.label}>
                                            {/* Sub-group header */}
                                            <div
                                                className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
                                                style={{ color: palette.text, opacity: 0.75 }}
                                                ref={el => {
                                                    subLayers.forEach(l => { swimlaneRefs.current[l.id] = el as HTMLDivElement | null; });
                                                }}
                                            >
                                                <span
                                                    className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                                                    style={{ background: layerColor }}
                                                />
                                                {sub.label}
                                            </div>
                                            {/* Cards */}
                                            <div className="flex flex-wrap gap-2">
                                                {renderCards(allKinds, layerColor, palette.bg)}
                                            </div>
                                        </div>
                                    );
                                })
                                : (() => {
                                    const allKinds = sortedGroupLayers.flatMap(l => l.kinds);
                                    const layerColor = sortedGroupLayers[0]?.color ?? palette.text;
                                    return (
                                        <div className="flex flex-wrap gap-2">
                                            {renderCards(allKinds, layerColor, palette.bg)}
                                        </div>
                                    );
                                })()
                            }
                        </div>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3 mb-6">
            {LAYER_GROUPS.map(group => {
                const groupLayers = layers.filter(l => group.layerIds.includes(l.id));
                if (groupLayers.length === 0) return null;
                return renderSwimlane(group, groupLayers);
            })}

            {/* Other / custom layers */}
            {otherLayers.length > 0 && renderSwimlane(
                { id: 'other', label: 'Other', abbr: 'EXT', layerIds: otherLayers.map(l => l.id) },
                otherLayers,
            )}
        </div>
    );
}
