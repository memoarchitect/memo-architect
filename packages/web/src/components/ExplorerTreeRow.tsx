import { useEffect, useRef, useState } from 'react';
import { FONT } from '../styles/tokens';

/** Shared explorer row used by hierarchical workspaces and Browser views. */
export function ExplorerTreeRow({
    id, label, depth, hasChildren, expanded, selected, badge, badgeColor = '#0F766E', count, title, onClick, onDelete,
}: {
    id: string;
    label: string;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    selected: boolean;
    badge?: string;
    badgeColor?: string;
    count?: number;
    title?: string;
    onClick: () => void;
    onDelete?: () => Promise<{ success: boolean; error?: string }>;
}) {
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!menu) return;
        const close = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', escape);
        };
    }, [menu]);

    return (
        <div role="none">
        <button
            type="button"
            role="treeitem"
            aria-selected={selected}
            aria-expanded={hasChildren ? expanded : undefined}
            data-tree-id={id}
            onClick={onClick}
            onContextMenu={onDelete ? event => {
                event.preventDefault();
                event.stopPropagation();
                setMenu({ x: event.clientX, y: event.clientY });
            } : undefined}
            title={title}
            className="flex items-center gap-1.5 w-full text-left"
            style={{
                minHeight: 28, padding: '4px 8px', paddingLeft: 8 + depth * 18,
                border: 0, borderRadius: 6, cursor: 'pointer',
                background: selected ? '#2DD4A818' : 'transparent', color: selected ? '#0F766E' : '#374151',
            }}
            onMouseEnter={event => { if (!selected) event.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={event => { event.currentTarget.style.background = selected ? '#2DD4A818' : 'transparent'; }}
        >
            <span aria-hidden style={{
                width: 12, textAlign: 'center', flexShrink: 0, fontSize: 9, color: '#9CA3AF',
                transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease',
                visibility: hasChildren ? 'visible' : 'hidden',
            }}>▶</span>
            {badge && <span style={{
                minWidth: 27, height: 17, padding: '0 4px', borderRadius: 4, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: `${badgeColor}18`, color: badgeColor, fontSize: 9, fontWeight: 800,
            }}>{badge}</span>}
            <span className="truncate" style={{ flex: 1, fontSize: FONT.xs, fontWeight: hasChildren ? 650 : 500 }}>{label}</span>
            {count !== undefined && <span style={{ color: '#9CA3AF', fontSize: 9 }}>{count}</span>}
        </button>
        {menu && onDelete && <div ref={menuRef} role="menu" className="fixed z-50 rounded-lg overflow-hidden py-1" style={{
            left: menu.x, top: menu.y, minWidth: 180, background: '#FFFFFF', border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
        }}>
            <button type="button" role="menuitem" onClick={async () => {
                setMenu(null);
                if (!window.confirm(`Delete “${label}”?\n\nAll incoming and outgoing relationships will also be deleted. This cannot be undone.`)) return;
                const result = await onDelete();
                if (!result.success) window.alert(result.error ?? 'The element could not be deleted.');
            }} style={{
                width: '100%', border: 0, padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                background: '#FFFFFF', color: '#DC2626', fontSize: 12, fontWeight: 600,
            }}>Delete element…</button>
        </div>}
        </div>
    );
}
