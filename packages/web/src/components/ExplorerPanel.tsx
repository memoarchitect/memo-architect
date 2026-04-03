import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    useModelStore,
    getElementsByLayer,
    getDiagramsForViewpoint,
    getRelationshipsForElement,
    type ExplorerTab,
    FOLDER_ATTR,
} from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META, SEMANTIC_GROUPS, KIND_TO_GROUP } from '../constants';
import { FONT, COLOR, ICON } from '../styles/tokens';
import { WorkingSetsPanel as WorkingSetsContent } from './WorkingSetsPanel';
import type { MemoElement, DiagramDTO } from '@memo/core';

// ─── SVG Chevron Icons ───────────────────────────────────────────────────────

function ChevronIcon({ expanded, size = 14, color = COLOR.muted }: { expanded: boolean; size?: number; color?: string }) {
    return (
        <svg
            width={size} height={size}
            viewBox="0 0 16 16"
            fill="none"
            style={{
                transition: 'transform 150ms ease',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                flexShrink: 0,
            }}
        >
            <path
                d="M6 4L10 8L6 12"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// ─── Tree Icons ──────────────────────────────────────────────────────────────

function FolderIcon({ open, color = COLOR.muted }: { open: boolean; color?: string }) {
    if (open) {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1.5 3.5h4.8l1.2 1.5H14.5v8H1.5z" fill={color} opacity="0.15" stroke={color} strokeWidth="1" strokeLinejoin="round" />
                <path d="M1.5 5h13v8H1.5z" fill={color} opacity="0.08" />
            </svg>
        );
    }
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1.5 3.5h4.8l1.2 1.5H14.5v8H1.5z" fill={color} opacity="0.15" stroke={color} strokeWidth="1" strokeLinejoin="round" />
        </svg>
    );
}

function ItemIcon({ color = COLOR.muted }: { color?: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="1.5" width="12" height="13" rx="1.5" fill={color} opacity="0.1" stroke={color} strokeWidth="1" />
            <line x1="5" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="0.8" opacity="0.5" />
            <line x1="5" y1="8" x2="11" y2="8" stroke={color} strokeWidth="0.8" opacity="0.5" />
            <line x1="5" y1="10.5" x2="9" y2="10.5" stroke={color} strokeWidth="0.8" opacity="0.5" />
        </svg>
    );
}

// ─── Explorer Context Menu ───────────────────────────────────────────────────

interface CtxMenuState {
    x: number;
    y: number;
    elementId?: string;
    folderId?: string;
    kind?: string;
    type: 'element' | 'folder' | 'kind' | 'group';
}

function ElementContextMenu({ menu, onClose }: { menu: CtxMenuState; onClose: () => void }) {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const addElement = useModelStore(s => s.addElement);
    const updateElementFolder = useModelStore(s => s.updateElementFolder);
    const moveFolder = useModelStore(s => s.moveFolder);
    const deleteFolder = useModelStore(s => s.deleteFolder);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    if (!model) return null;

    let title = '';
    let actions: { label: string; action: () => void; danger?: boolean }[] = [];

    if (menu.type === 'element' && menu.elementId) {
        const el = model.elements[menu.elementId];
        if (!el) return null;
        title = el.name;
        actions = [
            { label: 'View details', action: () => selectElement(el.id) },
            {
                label: 'Move to folder...',
                action: () => {
                    const path = window.prompt('Enter new folder path (e.g., Manufacturers/Hardware):', el.attributes[FOLDER_ATTR] || '');
                    if (path !== null) updateElementFolder(el.id, path);
                }
            },
            { label: 'Copy ID', action: () => navigator.clipboard?.writeText(el.id) },
        ];
    } else if (menu.type === 'folder' && menu.folderId && menu.kind) {
        title = `Folder: ${menu.folderId.split('/').pop()}`;
        actions = [
            {
                label: 'Add Element here',
                action: () => {
                    const name = window.prompt('Enter element name:');
                    if (name) addElement(menu.kind!, name, menu.folderId!);
                }
            },
            {
                label: 'Add Sub-group',
                action: () => {
                    const name = window.prompt('Enter group name:');
                    if (name) {
                        const newPath = menu.folderId ? `${menu.folderId}/${name}` : name;
                        // Just a dummy addElement to "create" the folder
                        addElement(menu.kind!, `(new ${name} element)`, newPath);
                    }
                }
            },
            {
                label: 'Move Folder...',
                action: () => {
                    const newPath = window.prompt('Enter new folder path:', menu.folderId);
                    if (newPath && newPath !== menu.folderId) moveFolder(menu.kind!, menu.folderId!, newPath);
                }
            },
            {
                label: 'Delete Folder (Move items up)',
                danger: true,
                action: () => {
                    if (window.confirm(`Move all elements in "${menu.folderId}" to its parent group?`)) {
                        deleteFolder(menu.kind!, menu.folderId!);
                    }
                }
            }
        ];
    } else if (menu.type === 'kind' && menu.kind) {
        title = `Category: ${menu.kind}`;
        actions = [
            {
                label: 'Add Element',
                action: () => {
                    const name = window.prompt('Enter element name:');
                    if (name) addElement(menu.kind!, name, '');
                }
            },
            {
                label: 'New Group',
                action: () => {
                    const name = window.prompt('Enter group name:');
                    if (name) addElement(menu.kind!, `(new ${name} element)`, name);
                }
            }
        ];
    }

    if (!actions.length) return null;

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-lg overflow-hidden py-1"
            style={{
                left: menu.x, top: menu.y,
                background: COLOR.surface, border: `1px solid ${COLOR.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '220px',
            }}
        >
            <div className="px-3 py-1.5 font-bold truncate bg-slate-50" style={{ color: COLOR.primary, fontSize: FONT.xs, borderBottom: `1px solid ${COLOR.border}` }}>
                {title.toUpperCase()}
            </div>
            {actions.map((a, i) => (
                <div
                    key={i}
                    className="px-3 py-2 cursor-pointer transition-colors"
                    style={{ 
                        color: a.danger ? '#DC2626' : COLOR.secondary, 
                        fontSize: FONT.explorer.item 
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { a.action(); onClose(); }}
                >
                    {a.label}
                </div>
            ))}
        </div>
    );
}

// ─── Tab Switcher ────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: ExplorerTab; onChange: (tab: ExplorerTab) => void }) {
    const tabs: { id: ExplorerTab; label: string }[] = [
        { id: 'model', label: 'Model' },
        { id: 'views', label: 'Views' },
        { id: 'worksets', label: 'Sets' },
    ];
    return (
        <div className="flex" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className="flex-1 px-3 py-2.5 font-medium transition-colors"
                    style={{
                        fontSize: FONT.explorer.tab,
                        ...(active === tab.id
                            ? { color: COLOR.accentDark, borderBottom: `2px solid ${COLOR.accent}`, background: '#FAFAF8' }
                            : { color: COLOR.faint, borderBottom: '2px solid transparent' }),
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Model Tree Persistence ─────────────────────────────────────────────────

interface TreeNode {
    id: string; // f:<path> or e:<id>
    name: string;
    type: 'folder' | 'element';
    children: TreeNode[];
    element?: MemoElement;
}

function buildTree(elements: MemoElement[]): TreeNode[] {
    const root: TreeNode[] = [];
    const folders = new Map<string, TreeNode>();

    // Sort elements by name first
    const sorted = [...elements].sort((a, b) => a.name.localeCompare(b.name));

    for (const el of sorted) {
        const path = el.attributes[FOLDER_ATTR] || '';
        const parts = path.split('/').filter(Boolean);

        let currentLevel = root;
        let currentPath = '';

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const folderKey = `f:${currentPath}`;

            let folder = currentLevel.find(n => n.id === folderKey);
            if (!folder) {
                folder = {
                    id: folderKey,
                    name: part,
                    type: 'folder',
                    children: [],
                };
                currentLevel.push(folder);
            }
            currentLevel = folder.children;
        }

        currentLevel.push({
            id: el.id,
            name: el.name,
            type: 'element',
            children: [],
            element: el,
        });
    }

    // Sort children: Folders first, then alphabetical Name
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        for (const node of nodes) {
            if (node.children.length > 0) sortNodes(node.children);
        }
    };
    sortNodes(root);

    return root;
}

function RecursiveTree({
    nodes,
    level,
    expanded,
    toggleExpand,
    selectedElementId,
    selectElement,
    violationCounts,
    baseColor,
    onContextMenu,
    onDragStart,
    onDrop,
}: {
    nodes: TreeNode[];
    level: number;
    expanded: Set<string>;
    toggleExpand: (id: string, e?: React.MouseEvent) => void;
    selectedElementId: string | null;
    selectElement: (id: string | null) => void;
    violationCounts: Map<string, number>;
    baseColor: string;
    onContextMenu: (e: React.MouseEvent, type: CtxMenuState['type'], id: string) => void;
    onDragStart: (e: React.DragEvent, node: TreeNode) => void;
    onDrop: (e: React.DragEvent, folderPath: string) => void;
}) {
    return (
        <>
            {nodes.map(node => {
                if (node.type === 'folder') {
                    const isExpanded = expanded.has(node.id);
                    return (
                        <div
                            key={node.id}
                            style={{ marginLeft: level > 0 ? '16px' : '0' }}
                            draggable
                            onDragStart={e => onDragStart(e, node)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => onDrop(e, node.id.replace('f:', ''))}
                        >
                            <div
                                className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
                                style={{ borderRadius: '4px', margin: '0 4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => toggleExpand(node.id)}
                                onContextMenu={e => onContextMenu(e, 'folder', node.id)}
                            >
                                <ChevronIcon expanded={isExpanded} size={12} color={COLOR.muted} />
                                <FolderIcon open={isExpanded} color={baseColor} />
                                <span
                                    className="font-medium flex-1 truncate"
                                    style={{ color: COLOR.secondary, fontSize: FONT.explorer.kind }}
                                >
                                    {node.name}
                                </span>
                            </div>
                            {isExpanded && (
                                <RecursiveTree
                                    nodes={node.children}
                                    level={level + 1}
                                    expanded={expanded}
                                    toggleExpand={toggleExpand}
                                    selectedElementId={selectedElementId}
                                    selectElement={selectElement}
                                    violationCounts={violationCounts}
                                    baseColor={baseColor}
                                    onContextMenu={onContextMenu}
                                    onDragStart={onDragStart}
                                    onDrop={onDrop}
                                />
                            )}
                        </div>
                    );
                } else {
                    const el = node.element!;
                    const isSelected = selectedElementId === el.id;
                    const vCount = violationCounts.get(el.id) || 0;
                    const layerClr = LAYER_COLORS[el.layer] || baseColor;

                    return (
                        <div
                            key={el.id}
                            className="flex items-center gap-1.5 px-2 py-1 cursor-pointer"
                            style={{
                                borderRadius: '4px',
                                margin: '0 4px',
                                marginLeft: (level > 0 ? 16 : 0) + 20 + 'px',
                                background: isSelected ? COLOR.accent + '18' : 'transparent',
                                fontWeight: isSelected ? 500 : 400,
                            }}
                            draggable
                            onDragStart={e => onDragStart(e, { type: 'element', element: el, id: el.id, name: el.name, children: [] })}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? COLOR.accent + '18' : 'transparent'; }}
                            onClick={() => selectElement(el.id)}
                            onContextMenu={e => onContextMenu(e, 'element', el.id)}
                        >
                            <ItemIcon color={layerClr} />
                            <span
                                className="truncate flex-1"
                                style={{
                                    color: isSelected ? COLOR.accentDark : COLOR.primary,
                                    fontSize: FONT.explorer.item,
                                }}
                            >
                                {el.name}
                            </span>
                            {vCount > 0 && (
                                <span
                                    className="px-1 py-0.5 rounded-full"
                                    style={{
                                        background: '#FEF2F2',
                                        color: '#DC2626',
                                        fontSize: FONT.explorer.count,
                                        fontWeight: 600,
                                        minWidth: '16px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {vCount}
                                </span>
                            )}
                        </div>
                    );
                }
            })}
        </>
    );
}

// ─── Model Explorer ──────────────────────────────────────────────────────────

function ModelExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const updateElementFolder = useModelStore(s => s.updateElementFolder);
    const moveFolder = useModelStore(s => s.moveFolder);
    const validation = useModelStore(s => s.validation);

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
    const [dragging, setDragging] = useState<{ id: string; kind: string } | null>(null);

    const toggleExpand = useCallback((key: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const onContextMenu = useCallback((e: React.MouseEvent, type: CtxMenuState['type'], id: string, kind?: string) => {
        e.preventDefault();
        setCtxMenu({
            x: e.clientX,
            y: e.clientY,
            type,
            elementId: type === 'element' ? id : undefined,
            folderId: type === 'folder' ? id.replace('f:', '') : undefined,
            kind: kind || (type === 'kind' ? id.replace('k:', '').split(':').pop() : undefined),
        });
    }, []);

    // Build semantic group tree
    const groupTree = useMemo(() => {
        if (!model) return [];
        const elements = Object.values(model.elements);
        const lower = searchTerm.toLowerCase();

        const groups: { group: typeof SEMANTIC_GROUPS[number]; kinds: Map<string, TreeNode[]> }[] = [];

        for (const sg of SEMANTIC_GROUPS) {
            const kindMap = new Map<string, MemoElement[]>();
            for (const el of elements) {
                const g = KIND_TO_GROUP[el.kind];
                if (g?.id !== sg.id) continue;
                if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
                if (!kindMap.has(el.kind)) kindMap.set(el.kind, []);
                kindMap.get(el.kind)!.push(el);
            }

            if (kindMap.size > 0) {
                const treeMap = new Map<string, TreeNode[]>();
                for (const [kind, els] of kindMap.entries()) {
                    treeMap.set(kind, buildTree(els));
                }
                groups.push({ group: sg, kinds: treeMap });
            }
        }

        // Uncategorized elements
        const uncategorizedMap = new Map<string, MemoElement[]>();
        for (const el of elements) {
            if (KIND_TO_GROUP[el.kind]) continue;
            if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
            if (!uncategorizedMap.has(el.kind)) uncategorizedMap.set(el.kind, []);
            uncategorizedMap.get(el.kind)!.push(el);
        }

        if (uncategorizedMap.size > 0) {
            const treeMap = new Map<string, TreeNode[]>();
            for (const [kind, els] of uncategorizedMap.entries()) {
                treeMap.set(kind, buildTree(els));
            }
            groups.push({
                group: { id: 'other', label: 'Other', color: '#6B7280', kinds: [] },
                kinds: treeMap,
            });
        }

        return groups;
    }, [model, searchTerm]);

    // ─── DnD Handlers ───

    const handleDragStart = useCallback((e: React.DragEvent, node: TreeNode, kind: string) => {
        setDragging({ id: node.id, kind });
        e.dataTransfer.setData('application/memo-node', JSON.stringify({
            id: node.id,
            type: node.type,
            kind: kind,
            name: node.name,
            elementId: node.element?.id,
            folderPath: node.type === 'folder' ? node.id.replace('f:', '') : undefined
        }));
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, targetKind: string) => {
        if (dragging?.kind === targetKind) {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'move';
        }
    }, [dragging]);

    const handleDrop = useCallback((e: React.DragEvent, targetFolderPath: string, targetKind: string) => {
        e.preventDefault();
        setDragging(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/memo-node'));
            if (data.kind !== targetKind) return;

            if (data.type === 'element') {
                updateElementFolder(data.elementId, targetFolderPath);
            } else if (data.type === 'folder') {
                // Prevent dropping into self or its own descendant
                if (targetFolderPath === data.folderPath || targetFolderPath.startsWith(data.folderPath + '/')) {
                    return;
                }
                const subPath = data.folderPath.includes('/') ? data.folderPath.slice(data.folderPath.lastIndexOf('/') + 1) : data.folderPath;
                const newPath = targetFolderPath ? targetFolderPath + '/' + subPath : subPath;
                moveFolder(data.kind, data.folderPath, newPath);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    }, [updateElementFolder, moveFolder]);

    // Violation counts per element
    const violationCounts = useMemo(() => {
        const counts = new Map<string, number>();
        if (validation) {
            for (const v of validation.violations) {
                counts.set(v.elementId, (counts.get(v.elementId) || 0) + 1);
            }
        }
        return counts;
    }, [validation]);

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {groupTree.map(({ group, kinds }) => {
                const groupKey = `g:${group.id}`;
                const isExpanded = expanded.has(groupKey);
                
                // Recursive element counter for group badges
                const countElements = (nodes: TreeNode[]): number => 
                    nodes.reduce((s, n) => s + (n.type === 'element' ? 1 : countElements(n.children)), 0);
                
                const totalCount = Array.from(kinds.values()).reduce((sum, nodes) => sum + countElements(nodes), 0);

                return (
                    <div key={group.id} className="mb-0.5">
                        {/* ── Group header (folder-like) ── */}
                        <div
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                            style={{ margin: '0 4px', borderRadius: '4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => toggleExpand(groupKey)}
                            onContextMenu={e => onContextMenu(e, 'group', groupKey)}
                        >
                            <ChevronIcon expanded={isExpanded} size={14} color={group.color} />
                            <FolderIcon open={isExpanded} color={group.color} />
                            <span
                                className="font-semibold flex-1 truncate"
                                style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}
                            >
                                {group.label}
                            </span>
                            <span
                                className="px-1.5 py-0.5 rounded-full"
                                style={{
                                    background: group.color + '15',
                                    color: group.color,
                                    fontSize: FONT.explorer.count,
                                    fontWeight: 600,
                                    minWidth: '20px',
                                    textAlign: 'center',
                                }}
                            >
                                {totalCount}
                            </span>
                        </div>

                        {/* ── Kind sub-groups ── */}
                        {isExpanded && Array.from(kinds.entries()).map(([kind, nodes]) => {
                            const kindKey = `k:${group.id}:${kind}`;
                            const isKindExpanded = expanded.has(kindKey);
                            
                            // Find layer color for this kind from the first element found
                            const findLayer = (nodes: TreeNode[]): string | undefined => {
                                for (const n of nodes) {
                                    if (n.type === 'element') return n.element?.layer;
                                    const l = findLayer(n.children);
                                    if (l) return l;
                                }
                            };
                            const kindLayer = findLayer(nodes);
                            const layerColor = kindLayer ? (LAYER_COLORS[kindLayer] || group.color) : group.color;

                            return (
                                <div
                                    key={kind}
                                    style={{ marginLeft: '16px' }}
                                    onDragOver={e => handleDragOver(e, kind)}
                                    onDrop={e => handleDrop(e, '', kind)}
                                >
                                    <div
                                        className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
                                        style={{ borderRadius: '4px', margin: '0 4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => toggleExpand(kindKey)}
                                        onContextMenu={e => onContextMenu(e, 'kind', kindKey, kind)}
                                    >
                                        <ChevronIcon expanded={isKindExpanded} size={12} color={COLOR.muted} />
                                        <FolderIcon open={isKindExpanded} color={layerColor} />
                                        <span
                                            className="font-medium flex-1 truncate"
                                            style={{ color: COLOR.secondary, fontSize: FONT.explorer.kind }}
                                        >
                                            {kind}
                                        </span>
                                    </div>

                                    {/* ── Recursive Tree Content ── */}
                                    {isKindExpanded && (
                                        <RecursiveTree
                                            nodes={nodes}
                                            level={0}
                                            expanded={expanded}
                                            toggleExpand={toggleExpand}
                                            selectedElementId={selectedElementId}
                                            selectElement={selectElement}
                                            violationCounts={violationCounts}
                                            baseColor={layerColor}
                                            onContextMenu={(e, type, id) => onContextMenu(e, type, id, kind)}
                                            onDragStart={e => handleDragStart(e, nodes[0], kind)}
                                            onDrop={e => handleDrop(e, '', kind)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
            {ctxMenu && <ElementContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
        </div>
    );
}

// ─── View Explorer ───────────────────────────────────────────────────────────

function DiagramTypeBadge({ diagramType }: { diagramType: string }) {
    const meta = DIAGRAM_TYPE_META[diagramType];
    if (!meta) return null;
    return (
        <span className="px-1.5 py-0.5 rounded font-semibold"
            style={{ background: meta.color + '20', color: meta.color, fontSize: FONT.badge }}
            title={meta.fullName}
        >
            {meta.code}
        </span>
    );
}

function ViewExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);

    const [expandedVps, setExpandedVps] = useState<Set<string>>(new Set(['__model']));

    const toggleExpand = (id: string) => {
        setExpandedVps(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const viewpoints = useMemo(() => model?.viewpoints ?? [], [model?.viewpoints]);

    const filterDiagrams = (diagrams: DiagramDTO[]): DiagramDTO[] => {
        if (!searchTerm) return diagrams;
        const lower = searchTerm.toLowerCase();
        return diagrams.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            d.diagramType.toLowerCase().includes(lower)
        );
    };

    const selectedDiagramId = activeView.type === 'diagram' ? activeView.diagramId : null;
    const modelDiagrams = getDiagramsForViewpoint(model, '__model');

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {/* Model Viewpoint */}
            <div className="mb-0.5">
                <div
                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                    style={{ borderRadius: '4px', margin: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { selectViewpoint(null); toggleExpand('__model'); }}
                >
                    <ChevronIcon expanded={expandedVps.has('__model')} size={14} color={COLOR.accent} />
                    <FolderIcon open={expandedVps.has('__model')} color={COLOR.accent} />
                    <span className="font-semibold flex-1" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>Model Viewpoint</span>
                    <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{modelDiagrams.length}</span>
                </div>
                {expandedVps.has('__model') && (
                    <div style={{ marginLeft: '16px' }}>
                        {filterDiagrams(modelDiagrams).map(diag => (
                            <DiagramRow
                                key={diag.id}
                                diag={diag}
                                isSelected={selectedDiagramId === diag.id}
                                onSelect={() => {
                                    setActiveView({ type: 'diagram', diagramId: diag.id });
                                    selectViewpoint(diag.viewpointId === '__model' ? null : diag.viewpointId);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Named viewpoints */}
            {viewpoints.map(vp => {
                const isExpanded = expandedVps.has(vp.id);
                const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || COLOR.muted) : COLOR.muted;
                const diagrams = getDiagramsForViewpoint(model, vp.id);

                return (
                    <div key={vp.id} className="mb-0.5">
                        <div
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                            style={{ borderRadius: '4px', margin: '0 4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => { selectViewpoint(vp.id); toggleExpand(vp.id); }}
                        >
                            <ChevronIcon expanded={isExpanded} size={14} color={vpColor} />
                            <FolderIcon open={isExpanded} color={vpColor} />
                            <span className="font-semibold flex-1 truncate" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>{vp.label}</span>
                            <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{diagrams.length}</span>
                        </div>
                        {isExpanded && (
                            <div style={{ marginLeft: '16px' }}>
                                {filterDiagrams(diagrams).map(diag => (
                                    <DiagramRow
                                        key={diag.id}
                                        diag={diag}
                                        isSelected={selectedDiagramId === diag.id}
                                        onSelect={() => {
                                            setActiveView({ type: 'diagram', diagramId: diag.id });
                                            selectViewpoint(vp.id);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Diagram type legend */}
            <div className="px-3 py-2 mt-2" style={{ borderTop: `1px solid ${COLOR.border}` }}>
                <div className="flex flex-wrap items-center gap-1.5" style={{ color: COLOR.faint, fontSize: FONT.xs }}>
                    {Object.entries(DIAGRAM_TYPE_META).map(([key, meta]) => (
                        <span key={key} className="px-1.5 py-0.5 rounded" style={{ background: meta.color + '15', color: meta.color, fontSize: FONT.badge, fontWeight: 600 }}>
                            {meta.code}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DiagramRow({ diag, isSelected, onSelect }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const meta = DIAGRAM_TYPE_META[diag.diagramType];
    const elCount = diag.elementIds?.length ?? 0;

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 cursor-pointer"
            style={{
                borderRadius: '4px', margin: '0 4px',
                background: isSelected ? COLOR.accent + '18' : 'transparent',
                fontSize: FONT.explorer.item,
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? COLOR.accent + '18' : 'transparent'; }}
            onClick={onSelect}
            title={[meta?.fullName, diag.description].filter(Boolean).join(' \u2014 ')}
        >
            <DiagramTypeBadge diagramType={diag.diagramType} />
            {diag.auto && (
                <span className="px-1 py-0.5 rounded"
                    style={{ background: '#F0F0ED', color: COLOR.faint, fontSize: FONT.badge, fontWeight: 600 }}>
                    AUTO
                </span>
            )}
            <span className="truncate flex-1" style={{ color: isSelected ? COLOR.accentDark : COLOR.primary }}>{diag.name}</span>
            {elCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full"
                    style={{
                        background: '#F0F0ED', color: COLOR.muted,
                        fontSize: FONT.explorer.count, fontWeight: 600,
                        minWidth: '18px', textAlign: 'center',
                    }}>
                    {elCount}
                </span>
            )}
        </div>
    );
}

// ─── DHF Explorer ────────────────────────────────────────────────────────────

const DHF_GROUPS = [
    {
        id: 'risk', label: 'Risk Management', color: '#E74C3C',
        docs: [
            { id: 'rmp', title: 'Risk Management Plan' },
            { id: 'har', title: 'Hazard Analysis Report' },
            { id: 'fmea', title: 'Failure Mode & Effects Analysis' },
        ],
    },
    {
        id: 'design', label: 'Design & Architecture', color: '#4A90D9',
        docs: [
            { id: 'rtm', title: 'Requirements Traceability Matrix' },
            { id: 'sad', title: 'System Architecture Description' },
            { id: 'sds', title: 'Software Design Specification' },
            { id: 'soup', title: 'SOUP List' },
            { id: 'dip', title: 'Design Input Plan' },
            { id: 'dop', title: 'Design Output Plan' },
        ],
    },
    {
        id: 'verification', label: 'Verification & Validation', color: '#2ECC71',
        docs: [
            { id: 'vvp', title: 'V&V Plan' },
            { id: 'vvr', title: 'V&V Report' },
        ],
    },
    {
        id: 'compliance', label: 'Compliance & Standards', color: '#8E44AD',
        docs: [
            { id: 'sdp', title: 'Software Development Plan' },
            { id: 'csr', title: 'Clinical Safety Report' },
            { id: 'uer', title: 'Usability Engineering Report' },
            { id: 'cybersecurity', title: 'Cybersecurity Documentation' },
            { id: 'labeling', title: 'Labeling Specification' },
        ],
    },
    {
        id: 'all', label: 'General', color: '#6B7280',
        docs: [
            { id: 'dhf-index', title: 'Design History File Index' },
            { id: 'change-log', title: 'Design Change Log' },
        ],
    },
] as const;

function DhfExplorerContent() {
    const setActiveView = useModelStore(s => s.setActiveView);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['risk', 'design']));

    function toggleGroup(id: string) {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="flex-1 overflow-y-auto py-2">
            {DHF_GROUPS.map(group => {
                const expanded = expandedGroups.has(group.id);
                return (
                    <div key={group.id}>
                        {/* Group header */}
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left"
                            style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}
                            onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <span style={{
                                display: 'inline-block', width: '8px', height: '8px',
                                borderRadius: '50%', background: group.color, flexShrink: 0,
                            }} />
                            <span className="flex-1 uppercase tracking-wide" style={{ fontSize: '10px' }}>{group.label}</span>
                            <ChevronIcon expanded={expanded} size={12} />
                        </button>

                        {/* Doc items */}
                        {expanded && group.docs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => setActiveView({ type: 'dhf-dashboard' })}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left"
                                style={{ paddingLeft: '32px', fontSize: FONT.explorer.element, color: COLOR.primary }}
                                onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <ItemIcon color={group.color} />
                                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {doc.title}
                                </span>
                            </button>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main ExplorerPanel ──────────────────────────────────────────────────────

export function ExplorerPanel() {
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const explorerTab = useModelStore(s => s.explorerTab);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const model = useModelStore(s => s.model);
    const activeMode = useModelStore(s => s.activeMode);

    const elementCount = model ? Object.keys(model.elements).length : 0;
    const relCount = model ? model.relationships.length : 0;

    if (sidebarCollapsed) {
        return (
            <div
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                style={{ width: '40px', background: `linear-gradient(180deg, ${COLOR.accentDark}, #2D6A7A)`, borderRight: `1px solid ${COLOR.border}` }}
                onClick={toggleSidebar}
                title="Expand explorer"
            >
                <div className="py-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{'▸'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: COLOR.accent, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    Explorer
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: COLOR.surface, borderRight: `1px solid ${COLOR.border}` }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: `linear-gradient(135deg, ${COLOR.accentDark}, #2D6A7A)` }}>
                <div className="flex-1">
                    <h1 className="font-bold tracking-wide" style={{ color: COLOR.accent, fontSize: FONT.explorer.heading }}>
                        {activeMode === 'dhf' ? 'DHF Explorer'
                            : activeMode === 'diagram' ? 'Diagrams'
                            : activeMode === 'scenario' ? 'Scenarios'
                            : activeMode === 'ontology' ? 'Ontology'
                            : 'Explorer'}
                    </h1>
                    <p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.5)', fontSize: FONT.xs }}>
                        {activeMode === 'dhf' ? '18 documents' : `${elementCount} elements \u00b7 ${relCount} rels`}
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                    className="flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', width: '24px', height: '24px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    title="Collapse explorer"
                >
                    {'◂'}
                </button>
            </div>

            {/* Content — mode-aware, no redundant tabs when top nav provides context */}
            {activeMode === 'dhf' ? (
                <DhfExplorerContent />
            ) : activeMode === 'diagram' ? (
                <>
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <input type="text" placeholder="Search diagrams..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                    </div>
                    <ViewExplorerContent searchTerm={searchTerm} />
                </>
            ) : activeMode === 'scenario' || activeMode === 'ontology' ? (
                <>
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <input type="text" placeholder="Search elements..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                    </div>
                    <ModelExplorerContent searchTerm={searchTerm} />
                </>
            ) : (
                <>
                    {/* catalog mode: full Model / Views / Sets tabs */}
                    <TabBar active={explorerTab} onChange={setExplorerTab} />
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <input type="text"
                            placeholder={explorerTab === 'model' ? 'Search elements...' : 'Search diagrams...'}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                    </div>
                    {explorerTab === 'model' && <ModelExplorerContent searchTerm={searchTerm} />}
                    {explorerTab === 'views' && <ViewExplorerContent searchTerm={searchTerm} />}
                    {explorerTab === 'worksets' && (
                        <div className="flex-1 overflow-y-auto px-3 py-2"><WorkingSetsContent /></div>
                    )}
                </>
            )}
        </div>
    );
}
