// ─── Catalog Home Page ────────────────────────────────────────────────────────
//
// Renders at /catalog — shows a summary of all element families.
// Each family card links to /catalog/:family.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import { familyUrl } from '../router';
import { kindToPrefix, prefixToFamily } from '../short-id';
import { MemoBrandMark } from '../components/MemoBrandMark';

type FamilyInfo = { count: number; kinds: Set<string>; layer: string };

function layerLabel(layer: string): string {
    if (LAYER_LABELS[layer]) return LAYER_LABELS[layer];
    if (!layer) return 'Other';
    return layer.split(/[_-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function CatalogHomePage() {
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();

    const familiesByLayer = useMemo(() => {
        if (!model) return [];
        const map: Record<string, FamilyInfo> = {};
        for (const el of Object.values(model.elements)) {
            const prefix = kindToPrefix(el.kind);
            const family = prefixToFamily(prefix);
            if (!map[family]) {
                map[family] = { count: 0, kinds: new Set(), layer: el.layer };
            }
            map[family].count++;
            map[family].kinds.add(el.kind);
        }

        const byLayer = new Map<string, [string, FamilyInfo][]>();
        for (const entry of Object.entries(map)) {
            const layer = entry[1].layer;
            if (!byLayer.has(layer)) byLayer.set(layer, []);
            byLayer.get(layer)!.push(entry);
        }
        for (const families of byLayer.values()) {
            families.sort((a, b) => b[1].count - a[1].count);
        }

        const layerOrder = new Map<string, number>(LAYER_ORDER.map((layer, index) => [layer, index]));
        return [...byLayer.entries()].sort(([a], [b]) => {
            const orderA = layerOrder.get(a) ?? LAYER_ORDER.length;
            const orderB = layerOrder.get(b) ?? LAYER_ORDER.length;
            return orderA !== orderB ? orderA - orderB : a.localeCompare(b);
        });
    }, [model]);

    const families = useMemo(() => familiesByLayer.flatMap(([, entries]) => entries), [familiesByLayer]);

    if (!model) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
                <p style={{ color: COLOR.muted, fontSize: FONT.sm }}>Loading…</p>
            </div>
        );
    }

    const total = Object.keys(model.elements).length;

    return (
        <div style={{ flex: 1, overflow: 'auto', background: '#F7F7F5', padding: '32px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div><h1 style={{ fontSize: '20px', fontWeight: 700, color: COLOR.primary, margin: '0 0 4px' }}>Catalog</h1><p style={{ color: COLOR.muted, fontSize: FONT.sm, margin: 0 }}>{total} elements across {families.length} families</p></div>
                <MemoBrandMark size={132} />
            </div>

            {familiesByLayer.map(([layer, entries]) => {
                const layerColor = LAYER_COLORS[layer] ?? '#9CA3AF';
                return (
                    <div key={layer || '__none'} style={{ marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: layerColor, flexShrink: 0 }} />
                            <h2 style={{ fontSize: '13px', fontWeight: 700, color: COLOR.secondary, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                {layerLabel(layer)}
                            </h2>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '12px',
                        }}>
                            {entries.map(([family, info]) => (
                                <FamilyCard
                                    key={family}
                                    family={family}
                                    count={info.count}
                                    kinds={info.kinds}
                                    color={layerColor}
                                    onClick={() => navigate(familyUrl(family))}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function FamilyCard({ family, count, kinds, color, onClick }: {
    family: string;
    count: number;
    kinds: Set<string>;
    color: string;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                background: COLOR.surface,
                border: `1px solid ${COLOR.border}`,
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                borderTop: `3px solid ${color}`,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderTopColor = color;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ fontWeight: 700, fontSize: '15px', color: COLOR.primary, marginBottom: '4px' }}>
                {family}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1, marginBottom: '6px' }}>
                {count}
            </div>
            <div style={{ fontSize: '11px', color: COLOR.muted, lineHeight: '1.5' }}>
                {Array.from(kinds).slice(0, 3).join(', ')}
                {kinds.size > 3 && ` +${kinds.size - 3} more`}
            </div>
        </div>
    );
}
