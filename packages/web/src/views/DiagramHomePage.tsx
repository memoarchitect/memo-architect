// ─── Diagram Home Page ────────────────────────────────────────────────────────
//
// Renders at /diagrams — the index of every model view, grouped by
// viewpoint. Clicking Viewpoints used to leave the main pane on the generic app
// splash, with the diagram list only reachable in the side explorer; this gives
// the mode a real landing page, and each card is a permalink.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DiagramDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { DIAGRAM_TYPE_META } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import { diagramUrl } from '../router';

export function DiagramHomePage() {
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();

    /** Model views grouped by their viewpoint, biggest group first. */
    const groups = useMemo(() => {
        const diagrams = model?.diagrams ?? [];
        const byViewpoint = new Map<string, { id: string; label: string; items: DiagramDTO[] }>();
        for (const diagram of diagrams) {
            // '__model' is the synthetic bucket for views that are not assigned
            // to a named viewpoint. Named buckets display their user-facing
            // label, not the storage id.
            const viewpointIds = (diagram as DiagramDTO & { viewpointIds?: string[] }).viewpointIds;
            for (const key of viewpointIds?.length ? viewpointIds : [diagram.viewpointId]) {
                const viewpoint = model?.viewpoints?.find(candidate => candidate.id === key);
                const group = byViewpoint.get(key);
                if (group) group.items.push(diagram);
                else byViewpoint.set(key, {
                    id: key,
                    label: viewpoint?.label ?? (key === '__model' || key === '__unassigned' ? 'Unassigned Views' : key),
                    items: [diagram],
                });
            }
        }
        return [...byViewpoint.values()]
            .map(group => ({ ...group, items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)) }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [model]);

    if (!model) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
                <p style={{ color: COLOR.muted, fontSize: FONT.sm }}>Loading…</p>
            </div>
        );
    }

    const total = model.diagrams?.length ?? 0;

    return (
        <div style={{ flex: 1, overflow: 'auto', background: '#F7F7F5', padding: '32px 40px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: COLOR.primary, marginBottom: '4px', marginTop: 0 }}>
                Viewpoints
            </h1>
            <p style={{ color: COLOR.muted, fontSize: FONT.sm, marginTop: 0, marginBottom: '24px' }}>
                {total} model {total === 1 ? 'view' : 'views'} across {groups.length}{' '}
                {groups.length === 1 ? 'viewpoint' : 'viewpoints'}
            </p>

            {total === 0 && (
                <p style={{ color: COLOR.muted, fontSize: FONT.sm }}>
                    This model defines no model views yet.
                </p>
            )}

            {groups.map(group => (
                <section key={group.id} style={{ marginBottom: '28px' }}>
                    <h2 style={{
                        fontSize: '11px', fontWeight: 700, color: COLOR.muted,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        margin: '0 0 10px 0',
                    }}>
                        {group.label}
                        <code style={{ marginLeft: 8, color: COLOR.faint, textTransform: 'none' }}>{group.id}</code>
                        <span style={{ marginLeft: 8, fontWeight: 400 }}>{group.items.length}</span>
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '12px',
                    }}>
                        {group.items.map(diagram => (
                            <DiagramCard
                                key={diagram.id}
                                diagram={diagram}
                                onClick={() => navigate(diagramUrl(diagram.diagramType, diagram.id))}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function DiagramCard({ diagram, onClick }: { diagram: DiagramDTO; onClick: () => void }) {
    const meta = DIAGRAM_TYPE_META[diagram.diagramType];
    const color = meta?.color ?? '#6B7280';
    const elementCount = diagram.elementIds?.length ?? 0;

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
            style={{
                background: COLOR.surface,
                border: `1px solid ${COLOR.border}`,
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                borderTop: `3px solid ${color}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {meta && (
                    <span style={{
                        background: color + '18', color,
                        borderRadius: 4, padding: '1px 5px',
                        fontSize: '10px', fontWeight: 700,
                    }}>
                        {meta.code}
                    </span>
                )}
                {diagram.auto && (
                    <span style={{ fontSize: '10px', color: COLOR.muted }}>auto</span>
                )}
            </div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: COLOR.primary, marginBottom: 4 }}>
                {diagram.name}
            </div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '10px', color: COLOR.faint, marginBottom: 4 }}>
                {diagram.id}
            </div>
            <div style={{ fontSize: '11px', color: COLOR.muted, lineHeight: 1.5 }}>
                {meta?.fullName ?? diagram.diagramType}
                {elementCount > 0 && ` · ${elementCount} element${elementCount === 1 ? '' : 's'}`}
            </div>
        </div>
    );
}
