// ─── OntologyContextMenu ──────────────────────────────────────────────────────
//
// Reusable right-click context menu for the OntologyBrowserTab.
// Positioned at cursor, renders different options based on item type.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

export type ContextMenuTarget =
    | { type: 'package'; pkgName: string; isSelected: boolean }
    | { type: 'layer'; pkgName: string; layerId: string; layerLabel: string }
    | { type: 'kind'; kindName: string; pkgName: string; layerId: string };

interface OntologyContextMenuProps {
    x: number;
    y: number;
    target: ContextMenuTarget;
    onViewVisual: (pkgName: string) => void;
    onViewTable: (pkgName: string, layerId?: string) => void;
    onToggleSelection: (pkgName: string) => void;
    onViewProperties: (kindName: string, pkgName: string) => void;
    onClose: () => void;
}

interface MenuItemProps {
    label: string;
    onClick: () => void;
    icon?: string;
}

function MenuItem({ label, onClick, icon }: MenuItemProps) {
    return (
        <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs"
            style={{ color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={e => { e.stopPropagation(); onClick(); }}
        >
            {icon && <span style={{ fontSize: '12px', width: '14px', flexShrink: 0 }}>{icon}</span>}
            {label}
        </button>
    );
}

function Divider() {
    return <div style={{ height: '1px', background: '#E5E5E0', margin: '3px 0' }} />;
}

export function OntologyContextMenu({
    x, y, target, onViewVisual, onViewTable, onToggleSelection, onViewProperties, onClose,
}: OntologyContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Adjust position to stay in viewport
    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        const { innerWidth, innerHeight } = window;
        const rect = el.getBoundingClientRect();
        if (rect.right > innerWidth) el.style.left = `${x - rect.width}px`;
        if (rect.bottom > innerHeight) el.style.top = `${y - rect.height}px`;
    }, [x, y]);

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        background: '#FFFFFF',
        border: '1px solid #E5E5E0',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        zIndex: 9999,
        minWidth: '180px',
        padding: '4px 0',
    };

    if (target.type === 'package') {
        return (
            <div ref={ref} style={menuStyle} onMouseDown={e => e.stopPropagation()}>
                <MenuItem
                    icon="⬜"
                    label="View Visual Layout"
                    onClick={() => { onViewVisual(target.pkgName); onClose(); }}
                />
                <MenuItem
                    icon="☰"
                    label="View as Table"
                    onClick={() => { onViewTable(target.pkgName); onClose(); }}
                />
                <Divider />
                <MenuItem
                    icon={target.isSelected ? '☑' : '☐'}
                    label={target.isSelected ? 'Deselect for Project' : 'Select for Project'}
                    onClick={() => onToggleSelection(target.pkgName)}
                />
            </div>
        );
    }

    if (target.type === 'layer') {
        return (
            <div ref={ref} style={menuStyle} onMouseDown={e => e.stopPropagation()}>
                <MenuItem
                    icon="⬜"
                    label="View Visual Layout"
                    onClick={() => { onViewVisual(target.pkgName); onClose(); }}
                />
                <MenuItem
                    icon="☰"
                    label="View as Table"
                    onClick={() => onViewTable(target.pkgName, target.layerId)}
                />
            </div>
        );
    }

    // kind
    return (
        <div ref={ref} style={menuStyle} onMouseDown={e => e.stopPropagation()}>
            <MenuItem
                icon="🔍"
                label="View Properties"
                onClick={() => onViewProperties(target.kindName, target.pkgName)}
            />
            <MenuItem
                icon="☰"
                label="View as Table"
                onClick={() => onViewTable(target.pkgName, target.layerId)}
            />
            <MenuItem
                icon="⬜"
                label="Show in Visual Layout"
                onClick={() => { onViewVisual(target.pkgName); onClose(); }}
            />
        </div>
    );
}
