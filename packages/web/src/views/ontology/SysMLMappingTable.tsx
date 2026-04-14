// ─── SysMLMappingTable ────────────────────────────────────────────────────────
//
// Reference table showing which SysML v2 constructs map to which MEMO kinds.
// Groups all kinds by their `construct` field (part def, connection def, etc.)
// and presents them as a compact reference table — mirroring the "SysML Mapping"
// page in the draw.io ontology reference.
// ─────────────────────────────────────────────────────────────────────────────

import type { OntologyLayerInfo } from '../../types/ontology';

// Human-readable labels for SysML v2 construct keywords
const CONSTRUCT_LABELS: Record<string, { label: string; description: string; shorthand: string }> = {
    'part def':       { label: 'Part Definition', shorthand: 'pd', description: 'Defines a structural classifier (composite part)' },
    'connection def': { label: 'Connection Definition', shorthand: 'cd', description: 'Defines a connector type between parts' },
    'attribute def':  { label: 'Attribute Definition', shorthand: 'ad', description: 'Defines a typed value property' },
    'item def':       { label: 'Item Definition', shorthand: 'id', description: 'Defines a flow item type' },
    'action def':     { label: 'Action Definition', shorthand: 'acd', description: 'Defines a behavioral action' },
    'state def':      { label: 'State Definition', shorthand: 'sd', description: 'Defines a state machine type' },
    'requirement def':{ label: 'Requirement Definition', shorthand: 'rd', description: 'Defines a requirement type' },
    'use case def':   { label: 'Use Case Definition', shorthand: 'ucd', description: 'Defines a use case type' },
    'occurrence def': { label: 'Occurrence Definition', shorthand: 'od', description: 'Defines an occurrence (event or snapshot)' },
    'interface def':  { label: 'Interface Definition', shorthand: 'ifd', description: 'Defines a port interface type' },
    'port def':       { label: 'Port Definition', shorthand: 'ptd', description: 'Defines a port type for system interfaces' },
    'metadata def':   { label: 'Metadata Definition', shorthand: 'md', description: 'Defines a metadata annotation type' },
};

// Draw.io domain colors (same palette as LayerGrid) — mapped by layer id
const LAYER_DOMAIN_COLORS: Record<string, string> = {
    'purpose':           '#cce5ff',
    'business':          '#cce5ff',
    'operational':       '#cce5ff',
    'requirements':      '#dae8fc',
    'functional':        '#d5e8d4',
    'behavior':          '#d5e8d4',
    'logical':           '#d5e8d4',
    'physical':          '#ffe6cc',
    'software':          '#d5e8d4',
    'interfaces':        '#d5e8d4',
    'ui':                '#d5e8d4',
    'risk':              '#f8cecc',
    'safety':            '#f8cecc',
    'cybersecurity':     '#f8cecc',
    'verification':      '#e1d5e7',
    'analysis':          '#e1d5e7',
    'design-control':    '#fff2cc',
    'qms':               '#fff2cc',
    'software-lifecycle':'#fff2cc',
    'operations':        '#fff2cc',
    'clinical':          '#fff2cc',
    'privacy':           '#fff2cc',
};

interface KindRow {
    kindName: string;
    layer: string;
    layerLabel: string;
    layerColor: string;
    derivesFrom?: string;
    description?: string;
}

interface ConstructGroup {
    construct: string;
    label: string;
    shorthand: string;
    description: string;
    kinds: KindRow[];
}

interface SysMLMappingTableProps {
    layers: OntologyLayerInfo[];
}

export function SysMLMappingTable({ layers }: SysMLMappingTableProps) {
    // Group all kinds across all layers by their construct
    const groups: ConstructGroup[] = [];
    const constructMap = new Map<string, KindRow[]>();

    for (const layer of layers) {
        for (const kind of layer.kinds) {
            const c = kind.construct || 'part def';
            if (!constructMap.has(c)) constructMap.set(c, []);
            constructMap.get(c)!.push({
                kindName: kind.name,
                layer: layer.id,
                layerLabel: layer.label,
                layerColor: LAYER_DOMAIN_COLORS[layer.id] ?? '#f3f4f6',
                derivesFrom: kind.derivesFrom,
                description: kind.description,
            });
        }
    }

    // Sort constructs: known ones first (in CONSTRUCT_LABELS order), then unknown
    const knownOrder = Object.keys(CONSTRUCT_LABELS);
    const sortedConstructs = [...constructMap.keys()].sort((a, b) => {
        const ai = knownOrder.indexOf(a);
        const bi = knownOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    for (const c of sortedConstructs) {
        const kinds = constructMap.get(c)!.sort((a, b) => a.kindName.localeCompare(b.kindName));
        const meta = CONSTRUCT_LABELS[c];
        groups.push({
            construct: c,
            label: meta?.label ?? c,
            shorthand: meta?.shorthand ?? c,
            description: meta?.description ?? '',
            kinds,
        });
    }

    if (groups.length === 0) {
        return (
            <div className="py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                No kinds found in the selected viewpoint.
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'inherit' }}>
            <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1" style={{ color: '#1a1a1a' }}>
                    SysML v2 Construct Mapping
                </h3>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Each SysML v2 construct keyword and the MEMO kinds that use it.
                    Shorthand codes appear on kind cards throughout the viewer.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {groups.map(group => (
                    <ConstructSection key={group.construct} group={group} />
                ))}
            </div>
        </div>
    );
}

function ConstructSection({ group }: { group: ConstructGroup }) {
    return (
        <div style={{ border: '1px solid #E5E5E0', borderRadius: '10px', overflow: 'hidden' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: '#F7F7F5',
                    borderBottom: '1px solid #E5E5E0',
                }}
            >
                <code
                    style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        background: '#1B3A4B',
                        color: '#2DD4A8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                    }}
                >
                    {group.construct}
                </code>
                <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                    {group.label}
                </span>
                <span
                    style={{
                        fontSize: '10px',
                        color: '#6B7280',
                        fontFamily: 'monospace',
                        background: '#EBEBEB',
                        padding: '1px 5px',
                        borderRadius: '3px',
                    }}
                >
                    {group.shorthand}
                </span>
                {group.description && (
                    <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>
                        — {group.description}
                    </span>
                )}
                <span
                    className="ml-auto text-xs"
                    style={{ color: '#9CA3AF' }}
                >
                    {group.kinds.length} kind{group.kinds.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Kind rows */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 12px' }}>
                {group.kinds.map(k => (
                    <KindChip key={k.kindName} kind={k} />
                ))}
            </div>
        </div>
    );
}

function KindChip({ kind }: { kind: KindRow }) {
    return (
        <div
            title={kind.description ?? kind.kindName}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                background: kind.layerColor,
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#1a1a1a',
                border: '1px solid rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ fontWeight: 600 }}>{kind.kindName}</span>
            <span
                style={{
                    fontSize: '9px',
                    color: '#6B7280',
                    background: 'rgba(255,255,255,0.55)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                }}
            >
                {kind.layerLabel}
            </span>
            {kind.derivesFrom && (
                <span
                    style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        fontStyle: 'italic',
                    }}
                    title={`Specializes ${kind.derivesFrom}`}
                >
                    :&gt; {kind.derivesFrom}
                </span>
            )}
        </div>
    );
}
