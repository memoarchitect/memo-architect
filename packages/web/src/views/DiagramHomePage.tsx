// ─── Diagram Home Page ────────────────────────────────────────────────────────
//
// Renders at /diagrams — the index of every model view, grouped by
// viewpoint. Clicking Viewpoints used to leave the main pane on the generic app
// splash, with the diagram list only reachable in the side explorer; this gives
// the mode a real landing page, and each card is a permalink.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DiagramDTO, ViewKind } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { DIAGRAM_TYPE_META, VIEW_KIND_META } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import { diagramUrl } from '../router';
import { UNCATEGORIZED_ID, buildViewpointTree, sortViewpointsByOntologyLayer, stripSharedLabelPrefix } from '../components/ExplorerPanel';
import { MemoBrandMark } from '../components/MemoBrandMark';

export function DiagramHomePage() {
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();

    /** Model views grouped by the viewpoint they conform to, Uncategorized last. */
    const groups = useMemo(() => {
        const diagrams = model?.diagrams ?? [];
        const byViewpoint = new Map<string, { id: string; label: string; items: DiagramDTO[] }>();
        const viewpointMetadata = new Map((model?.viewpoints ?? []).map(vp => [vp.id, vp]));
        for (const diagram of diagrams) {
            const viewpointIds = (diagram as DiagramDTO & { viewpointIds?: string[] }).viewpointIds;
            for (const rawKey of viewpointIds?.length ? viewpointIds : [diagram.viewpointId]) {
                const viewpoint = model?.viewpoints?.find(candidate => candidate.id === rawKey);
                // Anything no real viewpoint claims is Uncategorized — the
                // synthetic '__model' / '__unassigned' buckets, and a key that
                // resolves to nothing. Matches the Explorer tree; showing a raw
                // storage id as if it were a viewpoint label helps nobody.
                const key = viewpoint ? rawKey : UNCATEGORIZED_ID;
                const group = byViewpoint.get(key);
                if (group) group.items.push(diagram);
                else byViewpoint.set(key, {
                    id: key,
                    label: viewpoint?.label ?? 'Uncategorized',
                    items: [diagram],
                });
            }
        }
        // Order, label and NEST exactly as the Explorer tree does, so the two
        // agree. A viewpoint frames viewpoints in a system-of-systems model,
        // and a page that lists the constituents beside the whole says the
        // model is flat when it is not.
        const declared = sortViewpointsByOntologyLayer([...viewpointMetadata.values()]);
        const { rootViewpoints, viewpointChildren } = buildViewpointTree(declared);
        const flattened: { viewpoint: (typeof declared)[number]; depth: number }[] = [];
        const walk = (viewpoint: (typeof declared)[number], depth: number, seen: Set<string>) => {
            if (seen.has(viewpoint.id)) return;
            seen.add(viewpoint.id);
            flattened.push({ viewpoint, depth });
            for (const child of viewpointChildren.get(viewpoint.id) ?? []) walk(child, depth + 1, seen);
        };
        const seen = new Set<string>();
        for (const root of rootViewpoints) walk(root, 0, seen);

        const labels = stripSharedLabelPrefix(flattened.map(entry => entry.viewpoint.label));
        // A viewpoint that binds no view of its own is kept when it frames one
        // that does: it is the heading its constituents sit under.
        const framesViews = (id: string): boolean =>
            (byViewpoint.get(id)?.items.length ?? 0) > 0
            || (viewpointChildren.get(id) ?? []).some(child => framesViews(child.id));
        const ordered = flattened
            .map((entry, index) => ({
                ...(byViewpoint.get(entry.viewpoint.id) ?? { id: entry.viewpoint.id, label: entry.viewpoint.label, items: [] }),
                ...entry.viewpoint,
                label: labels[index],
                depth: entry.depth,
                childCount: (viewpointChildren.get(entry.viewpoint.id) ?? []).length,
                items: [...(byViewpoint.get(entry.viewpoint.id)?.items ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .filter(group => framesViews(group.id));
        const leftover = byViewpoint.get(UNCATEGORIZED_ID);
        return leftover
            ? [...ordered, {
                ...leftover, depth: 0, childCount: 0,
                items: [...leftover.items].sort((a, b) => a.name.localeCompare(b.name)),
            }]
            : ordered;
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div><h1 style={{ fontSize: '20px', fontWeight: 700, color: COLOR.primary, margin: '0 0 4px' }}>Viewpoints</h1><p style={{ color: COLOR.muted, fontSize: FONT.sm, margin: 0 }}>{total} model {total === 1 ? 'view' : 'views'} across {groups.length}{' '}{groups.length === 1 ? 'viewpoint' : 'viewpoints'}</p></div>
                <MemoBrandMark size={132} />
            </div>

            {total === 0 && (
                <p style={{ color: COLOR.muted, fontSize: FONT.sm }}>
                    This model defines no model views yet.
                </p>
            )}

            {groups.map(group => (
                <section
                    key={group.id}
                    style={{
                        marginBottom: '28px',
                        // A framed viewpoint is indented under the one that
                        // frames it, with a rule down the left so the nesting
                        // survives a section long enough to scroll.
                        marginLeft: group.depth ? `${group.depth * 20}px` : 0,
                        paddingLeft: group.depth ? '14px' : 0,
                        borderLeft: group.depth ? `2px solid ${COLOR.border}` : 'none',
                    }}
                >
                    <h2 style={{
                        fontSize: '11px', fontWeight: 700, color: COLOR.muted,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        margin: '0 0 10px 0',
                    }}>
                        {group.label}
                        {/* The Uncategorized key is ours, not the model's — show
                            why the views are here instead of an internal id. */}
                        <code style={{ marginLeft: 8, color: COLOR.faint, textTransform: 'none' }}>
                            {group.id === UNCATEGORIZED_ID ? 'no viewpoint' : group.id}
                        </code>
                        <span style={{ marginLeft: 8, fontWeight: 400 }}>{group.items.length}</span>
                        {group.childCount > 0 && (
                            <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', color: COLOR.faint }}>
                                frames {group.childCount} {group.childCount === 1 ? 'viewpoint' : 'viewpoints'}
                            </span>
                        )}
                    </h2>
                    {group.items.length === 0 ? (
                        // A framing viewpoint draws nothing itself; say so
                        // rather than leaving a heading over blank space.
                        <p style={{ color: COLOR.faint, fontSize: FONT.sm, margin: '0 0 4px' }}>
                            No views of its own — the viewpoints it frames are below.
                        </p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '12px',
                        }}>
                            {group.items.map(diagram => (
                                <DiagramCard
                                    key={diagram.id}
                                    diagram={diagram}
                                    onClick={() => navigate(diagramUrl(diagram.diagramType, diagram.shortId ?? diagram.id))}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}

function DiagramCard({ diagram, onClick }: { diagram: DiagramDTO; onClick: () => void }) {
    const viewMeta = diagram.viewKind ? VIEW_KIND_META[diagram.viewKind as ViewKind] : undefined;
    const diagramMeta = DIAGRAM_TYPE_META[diagram.diagramType];
    const meta = viewMeta ?? diagramMeta;
    const badgeCode = viewMeta?.label ?? diagramMeta?.code;
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
                        {badgeCode}
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
                {diagram.shortId ?? diagram.id}
            </div>
            <div style={{ fontSize: '11px', color: COLOR.muted, lineHeight: 1.5 }}>
                {meta?.fullName ?? diagram.diagramType}
                {elementCount > 0 && ` · ${elementCount} element${elementCount === 1 ? '' : 's'}`}
            </div>
        </div>
    );
}
