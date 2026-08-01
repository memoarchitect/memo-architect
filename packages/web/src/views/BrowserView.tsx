// ─── BrowserView ─────────────────────────────────────────────────────────────
//
// Renderer for the Browser view template (KK-8): the hierarchical
// membership tree as a first-class view surface. Expand/collapse rows,
// kind icons colored by layer, a filter that auto-expands to its matches,
// and element rows linking to the element detail view.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback } from 'react';
import type { DiagramDTO, MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, VIEW_KIND_META } from '../constants';
import { FONT } from '../styles/tokens';
import { ExplorerTreeRow } from '../components/ExplorerTreeRow';
import {
    buildBrowserTree, filterBrowserTree, kindInitials, type BrowserNode,
} from './templates/browser-view';

interface BrowserViewProps {
    diagram: DiagramDTO;
    model: MemoModelDTO;
    viewpointFilter?: (el: MemoElement) => boolean;
}

function TreeRow({ node, depth, expanded, visible, forceExpanded, onToggle }: {
    node: BrowserNode;
    depth: number;
    expanded: Set<string>;
    visible?: Set<string>;
    forceExpanded?: Set<string>;
    onToggle: (id: string) => void;
}) {
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);

    if (visible && !visible.has(node.id)) return null;

    const isOpen = expanded.has(node.id) || !!forceExpanded?.has(node.id);
    const hasChildren = node.children.length > 0;
    const isGroup = !node.element;
    const color = LAYER_COLORS[node.layer ?? ''] || '#95A5A6';
    const isSelected = node.element && node.id === selectedElementId;

    return (
        <>
            <ExplorerTreeRow
                id={node.id}
                label={node.label}
                depth={depth}
                hasChildren={hasChildren}
                expanded={isOpen}
                selected={!!isSelected}
                badge={isGroup ? (node.id.startsWith('pkg:') ? 'PKG' : 'GRP') : kindInitials(node.kind)}
                badgeColor={color}
                count={hasChildren ? node.count : undefined}
                title={node.title ?? node.kind}
                onClick={() => {
                    if (hasChildren) onToggle(node.id);
                    if (node.element) selectElement(node.id);
                }}
                onDelete={node.element ? () => deleteModelElement(node.id) : undefined}
            />
            {isOpen && node.children.map(child => (
                <TreeRow
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    expanded={expanded}
                    visible={visible}
                    forceExpanded={forceExpanded}
                    onToggle={onToggle}
                />
            ))}
        </>
    );
}

export function BrowserView({ diagram, model, viewpointFilter }: BrowserViewProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState('');

    const elements = useMemo(() => {
        const all = Object.values(model.elements);
        return viewpointFilter ? all.filter(viewpointFilter) : all;
    }, [model, viewpointFilter]);

    const roots = useMemo(
        () => buildBrowserTree(elements, model.relationships),
        [elements, model.relationships],
    );

    const filter = useMemo(() => filterBrowserTree(roots, query), [roots, query]);

    const onToggle = useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const collectIds = useCallback((nodes: BrowserNode[], into: Set<string>) => {
        for (const n of nodes) {
            if (n.children.length > 0) {
                into.add(n.id);
                collectIds(n.children, into);
            }
        }
        return into;
    }, []);

    const kindMeta = VIEW_KIND_META.browser;
    const total = elements.length;

    return (
        <div className="flex-1 overflow-auto" style={{ background: '#F7F7F5' }}>
            <div style={{ padding: '16px 20px', maxWidth: 860 }}>
                {/* ── Header ── */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: kindMeta.color + '20', color: kindMeta.color, fontSize: FONT.badge }}
                        title={kindMeta.fullName}>
                        {kindMeta.label}
                    </span>
                    <span style={{ fontSize: FONT.md, fontWeight: 700, color: '#1a1a1a' }}>{diagram.name}</span>
                    <span style={{ fontSize: FONT.xs, color: '#9CA3AF' }}>{total} elements</span>
                    <button
                        onClick={() => setExpanded(collectIds(roots, new Set()))}
                        className="px-2 py-0.5 text-xs font-medium rounded ml-2"
                        style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #E5E5E0', cursor: 'pointer' }}>
                        Expand All
                    </button>
                    <button
                        onClick={() => setExpanded(new Set())}
                        className="px-2 py-0.5 text-xs font-medium rounded"
                        style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #E5E5E0', cursor: 'pointer' }}>
                        Collapse All
                    </button>
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Filter by name or kind…"
                        className="px-2 py-1 rounded focus:outline-none ml-auto"
                        style={{ fontSize: FONT.xs, border: '1px solid #E5E5E0', background: '#FFFFFF', color: '#1a1a1a', width: 220 }}
                    />
                </div>

                {/* ── Tree ── */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', borderRadius: 10, padding: '10px 8px' }}>
                    {roots.length === 0 && (
                        <div style={{ color: '#9CA3AF', fontSize: FONT.sm, padding: 16 }}>
                            This view selects no elements.
                        </div>
                    )}
                    {roots.map(root => (
                        <TreeRow
                            key={root.id}
                            node={root}
                            depth={0}
                            expanded={expanded}
                            visible={filter?.visible}
                            forceExpanded={filter?.expanded}
                            onToggle={onToggle}
                        />
                    ))}
                    {filter && roots.every(r => !filter.visible.has(r.id)) && (
                        <div style={{ color: '#9CA3AF', fontSize: FONT.sm, padding: 16 }}>
                            No matches for “{query}”.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
