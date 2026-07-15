// ─── Catalog Home Page ────────────────────────────────────────────────────────
//
// Renders at /catalog — shows a summary of all element families.
// Each family card links to /catalog/:family.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import { familyUrl } from '../router';
import { kindToPrefix, prefixToFamily } from '../short-id';

export function CatalogHomePage() {
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();

    const families = useMemo(() => {
        if (!model) return [];
        const map: Record<string, { count: number; kinds: Set<string>; layer: string }> = {};
        for (const el of Object.values(model.elements)) {
            const prefix = kindToPrefix(el.kind);
            const family = prefixToFamily(prefix);
            if (!map[family]) {
                map[family] = { count: 0, kinds: new Set(), layer: el.layer };
            }
            map[family].count++;
            map[family].kinds.add(el.kind);
        }
        return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    }, [model]);

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
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: COLOR.primary, marginBottom: '4px', marginTop: 0 }}>
                Catalog
            </h1>
            <p style={{ color: COLOR.muted, fontSize: FONT.sm, marginTop: 0, marginBottom: '24px' }}>
                {total} elements across {families.length} families
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
            }}>
                {families.map(([family, info]) => {
                    const layerColor = LAYER_COLORS[info.layer] ?? '#9CA3AF';
                    return (
                        <FamilyCard
                            key={family}
                            family={family}
                            count={info.count}
                            kinds={info.kinds}
                            color={layerColor}
                            onClick={() => navigate(familyUrl(family))}
                        />
                    );
                })}
            </div>
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
