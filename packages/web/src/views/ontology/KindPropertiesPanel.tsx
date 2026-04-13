// ─── KindPropertiesPanel ──────────────────────────────────────────────────────
//
// Slide-in side panel showing properties for a selected ontology kind:
//   - Name, construct badge, layer color dot
//   - Description (from SysML doc comment)
//   - Derives-from (clickable to navigate to parent kind)
//   - Derived-by list (clickable to navigate to child kinds)
//   - Relationships (grouped by type)
//   - Instance count and viewpoints
// ─────────────────────────────────────────────────────────────────────────────

import type { OntologyKindInfo, OntologyLayerInfo } from '../../types/ontology';
import { LAYER_COLORS } from '../../constants';

interface KindPropertiesPanelProps {
    kind: OntologyKindInfo;
    layers: OntologyLayerInfo[];
    onKindClick: (kindName: string | null) => void;
    onClose: () => void;
}

export function KindPropertiesPanel({ kind, layers, onKindClick, onClose }: KindPropertiesPanelProps) {
    const layerColor = (LAYER_COLORS as Record<string, string>)[kind.layer] ?? '#6B7280';

    // Find all kinds across layers for clickable navigation
    const allKinds = layers.flatMap(l => l.kinds);
    const parentKind = kind.derivesFrom ? allKinds.find(k => k.name === kind.derivesFrom) : null;

    return (
        <div
            className="flex flex-col border-l overflow-y-auto"
            style={{ width: 320, minWidth: 320, background: '#FFFFFF', borderColor: '#E5E5E0' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#E5E5E0' }}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: layerColor }} />
                    <h3 className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                        {kind.label}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-sm px-1.5 rounded hover:bg-gray-100"
                    style={{ color: '#9CA3AF' }}
                >
                    x
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Construct + Layer badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="px-2 py-0.5 text-xs rounded font-mono"
                        style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}
                    >
                        {kind.construct}
                    </span>
                    <span
                        className="px-2 py-0.5 text-xs rounded font-medium"
                        style={{ background: `${layerColor}15`, color: layerColor, border: `1px solid ${layerColor}30` }}
                    >
                        {kind.layer}
                    </span>
                </div>

                {/* Description */}
                {kind.description && (
                    <Section title="Description">
                        <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                            {kind.description}
                        </p>
                    </Section>
                )}

                {/* Derives From */}
                {kind.derivesFrom && (
                    <Section title="Derives From">
                        <KindLink
                            name={kind.derivesFrom}
                            layer={parentKind?.layer}
                            onClick={() => onKindClick(kind.derivesFrom!)}
                        />
                    </Section>
                )}

                {/* Derived By */}
                {kind.derivedBy && kind.derivedBy.length > 0 && (
                    <Section title={`Derived By (${kind.derivedBy.length})`}>
                        <div className="flex flex-wrap gap-1.5">
                            {kind.derivedBy.map(name => {
                                const child = allKinds.find(k => k.name === name);
                                return (
                                    <KindLink
                                        key={name}
                                        name={name}
                                        layer={child?.layer}
                                        onClick={() => onKindClick(name)}
                                    />
                                );
                            })}
                        </div>
                    </Section>
                )}

                {/* Relationships */}
                {kind.relationships && kind.relationships.length > 0 && (
                    <Section title={`Relationships (${kind.relationships.length})`}>
                        <div className="space-y-1">
                            {kind.relationships.map((rel, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                                    <span style={{ color: rel.direction === 'outgoing' ? '#10B981' : '#8B5CF6' }}>
                                        {rel.direction === 'outgoing' ? '\u2192' : '\u2190'}
                                    </span>
                                    <span className="font-medium" style={{ color: '#374151' }}>{rel.type}</span>
                                    <button
                                        className="hover:underline"
                                        style={{ color: '#2563EB' }}
                                        onClick={() => onKindClick(rel.targetKind)}
                                    >
                                        {rel.targetKind}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Stats */}
                <Section title="Usage">
                    <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Instances" value={kind.instanceCount} />
                        <StatCard label="Viewpoints" value={kind.viewpoints.length} />
                    </div>
                    {kind.viewpoints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {kind.viewpoints.map(vp => (
                                <span
                                    key={vp}
                                    className="px-1.5 py-0.5 text-xs rounded"
                                    style={{ background: '#F3F4F6', color: '#6B7280' }}
                                >
                                    {vp}
                                </span>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title}
            </h4>
            {children}
        </div>
    );
}

function KindLink({ name, layer, onClick }: { name: string; layer?: string; onClick: () => void }) {
    const color = layer ? (LAYER_COLORS as Record<string, string>)[layer] ?? '#6B7280' : '#6B7280';
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-gray-50"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}
        >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {name.replace(/([A-Z])/g, ' $1').trim()}
        </button>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg p-2" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
            <div className="text-sm font-semibold" style={{ color: '#1B3A4B' }}>{value}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>{label}</div>
        </div>
    );
}
