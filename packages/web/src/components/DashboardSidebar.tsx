import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

// ─── DashboardSidebar (Phase D1) ─────────────────────────────────────────────
//
// Sidebar shown when activeView.type === 'dashboard'. Replaces the full element
// tree with a "Recently visited" feed driven by store.recentlyVisited.
//
// Falls back to a sample of the model when nothing has been visited yet.
// Session-local — not persisted across reload.
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardSidebar() {
    const model = useModelStore(s => s.model);
    const recentlyVisited = useModelStore(s => s.recentlyVisited);
    const selectElement = useModelStore(s => s.selectElement);

    const recentElements = useMemo(() => {
        if (!model) return [];
        return recentlyVisited
            .map(id => model.elements[id])
            .filter(Boolean);
    }, [recentlyVisited, model]);

    const sampleElements = useMemo(() => {
        if (!model || recentElements.length > 0) return [];
        const byKind = new Map<string, typeof model.elements[string]>();
        for (const el of Object.values(model.elements)) {
            if (!byKind.has(el.kind)) byKind.set(el.kind, el);
            if (byKind.size >= 12) break;
        }
        return Array.from(byKind.values());
    }, [model, recentElements.length]);

    const items = recentElements.length > 0 ? recentElements : sampleElements;
    const heading = recentElements.length > 0 ? 'Recently visited' : 'Sample elements';
    const subhead = recentElements.length > 0
        ? `${recentElements.length} item${recentElements.length === 1 ? '' : 's'} this session`
        : 'Click any to start exploring';

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-3 py-3" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                <div style={{
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: COLOR.muted, marginBottom: '2px',
                }}>
                    {heading}
                </div>
                <div style={{ fontSize: '11px', color: COLOR.muted, opacity: 0.8 }}>
                    {subhead}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '4px 0' }}>
                {items.length === 0 ? (
                    <div style={{
                        padding: '24px 16px', textAlign: 'center',
                        fontSize: '12px', color: COLOR.muted, lineHeight: '1.6',
                    }}>
                        No elements in this model yet.
                    </div>
                ) : items.map(el => {
                    const layerColor = LAYER_COLORS[el.layer] || COLOR.muted;
                    return (
                        <button
                            key={el.id}
                            onClick={() => selectElement(el.id)}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                width: '100%', padding: '8px 12px',
                                background: 'transparent', border: 'none',
                                borderLeft: `3px solid ${layerColor}`,
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: FONT.explorer.item, fontWeight: 500, color: COLOR.primary,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {el.name}
                                </div>
                                <div style={{
                                    fontSize: '10px', color: COLOR.muted, marginTop: '2px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    <span style={{ color: layerColor, fontWeight: 600 }}>{el.kind}</span>
                                    {el.shortId && (
                                        <span style={{ marginLeft: '6px', fontFamily: 'monospace', opacity: 0.7 }}>
                                            {el.shortId}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
