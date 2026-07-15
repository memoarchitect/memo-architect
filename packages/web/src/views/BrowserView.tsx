// ─── BrowserView ─────────────────────────────────────────────────────────────
//
// Renderer for the Browser view template (KK-8): the hierarchical
// membership tree as a first-class view surface. Expand/collapse rows,
// kind icons colored by layer, a filter that auto-expands to its matches,
// and element rows linking to the element detail view.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback } from 'react';
import type { DiagramDTO, MemoElement, MemoModelDTO } from '@memo/core';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS, VIEW_KIND_META } from '../constants';
import { FONT } from '../styles/tokens';
import {
    buildBrowserTree, filterBrowserTree, kindInitials, type BrowserNode,
} from './templates/browser-view';

interface BrowserViewProps {
    diagram: DiagramDTO;
    model: MemoModelDTO;
    viewpointFilter?: (el: MemoElement) => boolean;
}

const ROW_HEIGHT = 26;

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

    if (visible && !visible.has(node.id)) return null;

    const isOpen = expanded.has(node.id) || !!forceExpanded?.has(node.id);
    const hasChildren = node.children.length > 0;
    const isGroup = !node.element;
    const color = LAYER_COLORS[node.layer ?? ''] || '#95A5A6';
    const isSelected = node.element && node.id === selectedElementId;

    return (
        <>
            <div
                className="flex items-center gap-1.5"
                style={{
                    height: ROW_HEIGHT,
                    paddingLeft: 8 + depth * 18,
                    cursor: 'pointer',
                    background: isSelected ? '#2DD4A818' : undefined,
                    borderRadius: 6,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#2DD4A818' : 'transparent'; }}
                onClick={() => {
                    if (hasChildren) onToggle(node.id);
                    if (node.element) selectElement(node.id);
                }}
                title={node.title ?? node.kind}
            >
                <span
                    style={{
                        width: 12, textAlign: 'center', flexShrink: 0,
                        fontSize: '9px', color: '#9CA3AF',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 120ms ease',
                        visibility: hasChildren ? 'visible' : 'hidden',
                    }}
                >
                    ▶
                </span>
                {isGroup ? (
                    <span style={{ fontSize: '10px', flexShrink: 0 }}>
                        {node.id.startsWith('pkg:') ? '📦' : '▣'}
                    </span>
                ) : (
                    <span
                        style={{
                            flexShrink: 0,
                            width: 20, height: 16, borderRadius: 4,
                            background: color + '22', color,
                            fontSize: '8px', fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            letterSpacing: '0.02em',
                        }}
                        title={node.kind}
                    >
                        {kindInitials(node.kind)}
                    </span>
                )}
                <span
                    style={{
                        fontSize: FONT.xs,
                        fontWeight: isGroup ? 700 : 500,
                        color: isGroup ? '#1B3A4B' : '#374151',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                >
                    {node.label}
                </span>
                {hasChildren && (
                    <span style={{ fontSize: '9px', color: '#9CA3AF' }}>{node.count}</span>
                )}
            </div>
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
