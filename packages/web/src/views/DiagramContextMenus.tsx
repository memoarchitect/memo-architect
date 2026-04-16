// ─── Diagram Context Menus ────────────────────────────────────────────────────
//
// Right-click context menus for nodes and edges on the diagram canvas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { FONT } from '../styles/tokens';

// ─── Shared menu primitive ────────────────────────────────────────────────────

interface MenuItemProps {
    label: string;
    icon?: string;
    danger?: boolean;
    onClick: () => void;
}

function MenuItem({ label, icon, danger, onClick }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FONT.xs }}
            onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FEF2F2' : '#F7F7F5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
            {icon && <span style={{ fontSize: '12px', width: 16, textAlign: 'center' }}>{icon}</span>}
            <span style={{ color: danger ? '#DC2626' : '#1a1a1a' }}>{label}</span>
        </button>
    );
}

function MenuDivider() {
    return <div style={{ height: 1, background: '#E5E5E0', margin: '2px 0' }} />;
}

function Menu({ x, y, onClose, children }: {
    x: number; y: number; onClose: () => void; children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', esc);
        };
    }, [onClose]);

    const menuW = 210;
    const left = Math.min(x, window.innerWidth - menuW - 8);
    const top = Math.min(y, window.innerHeight - 200);

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-xl overflow-hidden py-1"
            style={{
                left, top, minWidth: menuW,
                background: '#FFFFFF', border: '1px solid #E5E5E0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Node Context Menu ────────────────────────────────────────────────────────

interface NodeContextMenuProps {
    x: number;
    y: number;
    nodeId: string;
    nodeKind: string;
    onClose: () => void;
    onEditName: () => void;
    onChangeColor: (color: string) => void;
    onRemoveFromDiagram: () => void;
    onDeleteFromModel: () => void;
    onLinkRisk?: () => void;
    onLinkRequirement?: () => void;
    // #12 additions
    onShowProperties?: () => void;
    onFocusElement?: () => void;
    onShowInCatalog?: () => void;
    onShowRelMatrix?: () => void;
    // #38 addition
    onOpenSource?: () => void;
    onViewKindInOntology?: () => void;
}

const PRESET_COLORS = [
    { label: 'Layer default', value: '' },
    { label: 'Mint', value: '#E8F5E9' },
    { label: 'Sky', value: '#E3F2FD' },
    { label: 'Amber', value: '#FFF8E1' },
    { label: 'Rose', value: '#FFF0F0' },
    { label: 'Lavender', value: '#F3E5F5' },
    { label: 'Peach', value: '#FBE9E7' },
];

export function NodeContextMenu({
    x, y, nodeId, nodeKind, onClose,
    onEditName, onChangeColor, onRemoveFromDiagram, onDeleteFromModel,
    onLinkRisk, onLinkRequirement,
    onShowProperties, onFocusElement, onShowInCatalog, onShowRelMatrix, onOpenSource,
    onViewKindInOntology,
}: NodeContextMenuProps) {
    const [showColors, setShowColors] = useState(false);

    return (
        <Menu x={x} y={y} onClose={onClose}>
            <div className="px-3 py-1.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>{nodeKind}</div>
                <div style={{ fontSize: '9px', color: '#D1D5DB', fontFamily: 'monospace' }}>{nodeId}</div>
            </div>

            {onShowProperties && (
                <MenuItem label="Show Properties" icon="ℹ" onClick={() => { onClose(); onShowProperties(); }} />
            )}
            {onShowInCatalog && (
                <MenuItem label="Show in Catalog" icon="☰" onClick={() => { onClose(); onShowInCatalog(); }} />
            )}
            {onFocusElement && (
                <MenuItem label="Focus on Element" icon="◎" onClick={() => { onClose(); onFocusElement(); }} />
            )}
            {onShowRelMatrix && (
                <MenuItem label="Show Relationship Matrix" icon="☷" onClick={() => { onClose(); onShowRelMatrix(); }} />
            )}
            {onViewKindInOntology && (
                <MenuItem label="View Kind in Ontology" icon="⬡" onClick={() => { onClose(); onViewKindInOntology(); }} />
            )}
            {onOpenSource && (
                <MenuItem label="Open Source File" icon="⟨/⟩" onClick={() => { onClose(); onOpenSource(); }} />
            )}
            {(onShowProperties || onShowInCatalog || onFocusElement || onShowRelMatrix || onViewKindInOntology || onOpenSource) && (
                <MenuDivider />
            )}
            <MenuItem label="Edit name" icon="✏️" onClick={() => { onClose(); onEditName(); }} />

            {/* Color submenu */}
            <div className="relative">
                <button
                    className="w-full flex items-center gap-2 px-3 py-1.5"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FONT.xs }}
                    onMouseEnter={e => { setShowColors(true); e.currentTarget.style.background = '#F7F7F5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                    <span style={{ fontSize: '12px', width: 16, textAlign: 'center' }}>🎨</span>
                    <span style={{ flex: 1, textAlign: 'left', color: '#1a1a1a' }}>Change color</span>
                    <span style={{ color: '#9CA3AF', fontSize: '10px' }}>▶</span>
                </button>
                {showColors && (
                    <div
                        className="absolute left-full top-0 rounded-xl overflow-hidden py-1"
                        style={{
                            background: '#FFFFFF', border: '1px solid #E5E5E0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160,
                        }}
                        onMouseEnter={() => setShowColors(true)}
                        onMouseLeave={() => setShowColors(false)}
                    >
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => { onClose(); onChangeColor(c.value); }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                                <div style={{
                                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                    background: c.value || '#E5E5E0', border: '1px solid #D1D5DB',
                                }} />
                                <span style={{ fontSize: FONT.xs, color: '#374151' }}>{c.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <MenuDivider />

            {onLinkRisk && (
                <MenuItem label="Link Risk" icon="⚠️" onClick={() => { onClose(); onLinkRisk(); }} />
            )}
            {onLinkRequirement && (
                <MenuItem label="Link Requirement" icon="📋" onClick={() => { onClose(); onLinkRequirement(); }} />
            )}
            {(onLinkRisk || onLinkRequirement) && <MenuDivider />}

            <MenuItem label="Remove from diagram" icon="↩️" onClick={() => { onClose(); onRemoveFromDiagram(); }} />
            <MenuItem label="Delete from model" icon="🗑️" danger onClick={() => {
                if (window.confirm(`Delete ${nodeId} from the model? This cannot be undone.`)) {
                    onClose();
                    onDeleteFromModel();
                }
            }} />
        </Menu>
    );
}

// ─── Edge Context Menu ────────────────────────────────────────────────────────

export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted';

interface EdgeContextMenuProps {
    x: number;
    y: number;
    edgeId: string;
    relType: string;
    onClose: () => void;
    onChangeStyle: (style: EdgeLineStyle) => void;
    onChangeColor: (color: string) => void;
    onToggleLabel: () => void;
    onDelete: () => void;
}

const EDGE_COLORS = [
    { label: 'Auto', value: '' },
    { label: 'Red', value: '#EF4444' },
    { label: 'Blue', value: '#3B82F6' },
    { label: 'Green', value: '#10B981' },
    { label: 'Orange', value: '#F59E0B' },
    { label: 'Gray', value: '#6B7280' },
];

export function EdgeContextMenu({
    x, y, edgeId, relType, onClose,
    onChangeStyle, onChangeColor, onToggleLabel, onDelete,
}: EdgeContextMenuProps) {
    return (
        <Menu x={x} y={y} onClose={onClose}>
            <div className="px-3 py-1.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>{relType}</div>
                <div style={{ fontSize: '9px', color: '#D1D5DB', fontFamily: 'monospace' }}>{edgeId}</div>
            </div>

            {/* Line style */}
            <div className="px-3 py-1.5 flex items-center gap-2">
                <span style={{ fontSize: '10px', color: '#9CA3AF', minWidth: 40 }}>Style</span>
                {(['solid', 'dashed', 'dotted'] as EdgeLineStyle[]).map(s => (
                    <button
                        key={s}
                        onClick={() => { onClose(); onChangeStyle(s); }}
                        style={{
                            fontSize: '10px', padding: '2px 8px',
                            border: '1px solid #E5E5E0', borderRadius: 4, cursor: 'pointer',
                            background: '#F7F7F5', color: '#374151',
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Color presets */}
            <div className="px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
                <span style={{ fontSize: '10px', color: '#9CA3AF', minWidth: 40, flexShrink: 0 }}>Color</span>
                {EDGE_COLORS.map(c => (
                    <button
                        key={c.value}
                        onClick={() => { onClose(); onChangeColor(c.value); }}
                        title={c.label}
                        style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: c.value || '#E5E5E0', border: '1px solid #D1D5DB',
                            cursor: 'pointer',
                        }}
                    />
                ))}
            </div>

            <MenuDivider />
            <MenuItem label="Toggle label" icon="🏷️" onClick={() => { onClose(); onToggleLabel(); }} />
            <MenuItem label="Delete edge" icon="🗑️" danger onClick={() => { onClose(); onDelete(); }} />
        </Menu>
    );
}
