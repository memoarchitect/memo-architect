import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    useModelStore,
    getElementsByLayer,
    getDiagramsForViewpoint,
    getRelationshipsForElement,
    type ExplorerTab,
    type DhfDoc,
    FOLDER_ATTR,
} from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META, SEMANTIC_GROUPS, KIND_TO_GROUP, VALID_ONTOLOGY_KINDS_SORTED } from '../constants';
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

function ChangeTypeModal({ elementId, currentKind, onClose }: { elementId: string; currentKind: string; onClose: () => void }) {
    const updateElementKind = useModelStore(s => s.updateElementKind);
    const [selected, setSelected] = useState(currentKind);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-lg overflow-hidden py-3 px-4"
            style={{
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: '#FFFFFF', border: '1px solid #E5E7EB',
                boxShadow: '0 8px 32px rgba(0,0,0,0.16)', minWidth: '320px',
            }}
        >
            <div className="font-semibold mb-3" style={{ color: '#1B3A4B', fontSize: '13px' }}>
                Change Element Type
            </div>
            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>
                Current: <span style={{ color: '#DC2626', fontWeight: 600 }}>{currentKind}</span> (not in ontology)
            </div>
            <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full px-3 py-2 rounded-lg mb-3 focus:outline-none"
                style={{ background: '#F9F9F8', border: '1px solid #E5E7EB', color: '#1B3A4B', fontSize: '13px' }}
            >
                {VALID_ONTOLOGY_KINDS_SORTED.map(k => (
                    <option key={k} value={k}>{k}</option>
                ))}
            </select>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded"
                    style={{ fontSize: '12px', color: '#6B7280', background: '#F0F0ED' }}
                >Cancel</button>
                <button
                    onClick={() => { updateElementKind(elementId, selected); onClose(); }}
                    className="px-3 py-1.5 rounded font-medium"
                    style={{ fontSize: '12px', color: '#FFFFFF', background: '#2DD4A8' }}
                >Apply</button>
            </div>
        </div>
    );
}

function ElementContextMenu({ menu, onClose }: { menu: CtxMenuState; onClose: () => void }) {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const addElement = useModelStore(s => s.addElement);
    const updateElementFolder = useModelStore(s => s.updateElementFolder);
    const moveFolder = useModelStore(s => s.moveFolder);
    const deleteFolder = useModelStore(s => s.deleteFolder);
    const [showChangeType, setShowChangeType] = useState<{ elementId: string; currentKind: string } | null>(null);
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
        const isUndefinedKind = !KIND_TO_GROUP[el.kind];
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
            ...(isUndefinedKind ? [{
                label: '⚠ Change Type…',
                action: () => setShowChangeType({ elementId: el.id, currentKind: el.kind }),
            }] : []),
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
        <>
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
                        onClick={() => { a.action(); if (!showChangeType) onClose(); }}
                    >
                        {a.label}
                    </div>
                ))}
            </div>
            {showChangeType && (
                <ChangeTypeModal
                    elementId={showChangeType.elementId}
                    currentKind={showChangeType.currentKind}
                    onClose={() => { setShowChangeType(null); onClose(); }}
                />
            )}
        </>
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
    selectedElementIds,
    toggleElementSelection,
    violationCounts,
    baseColor,
    onContextMenu,
    onDragStart,
    onDrop,
    isUndefined,
}: {
    nodes: TreeNode[];
    level: number;
    expanded: Set<string>;
    toggleExpand: (id: string, e?: React.MouseEvent) => void;
    selectedElementId: string | null;
    selectElement: (id: string | null) => void;
    selectedElementIds: Set<string>;
    toggleElementSelection: (id: string) => void;
    violationCounts: Map<string, number>;
    baseColor: string;
    onContextMenu: (e: React.MouseEvent, type: CtxMenuState['type'], id: string) => void;
    onDragStart: (e: React.DragEvent, node: TreeNode) => void;
    onDrop: (e: React.DragEvent, folderPath: string) => void;
    isUndefined?: boolean;
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
                                    selectElement={selectElementAndNavigate}
                                    selectedElementIds={selectedElementIds}
                                    toggleElementSelection={toggleElementSelection}
                                    violationCounts={violationCounts}
                                    baseColor={baseColor}
                                    onContextMenu={onContextMenu}
                                    onDragStart={onDragStart}
                                    onDrop={onDrop}
                                    isUndefined={isUndefined}
                                />
                            )}
                        </div>
                    );
                } else {
                    const el = node.element!;
                    const isSelected = selectedElementId === el.id;
                    const isChecked = selectedElementIds.has(el.id);
                    const vCount = violationCounts.get(el.id) || 0;
                    const layerClr = LAYER_COLORS[el.layer] || baseColor;

                    return (
                        <div
                            key={el.id}
                            className="group flex items-center gap-1.5 px-2 py-1 cursor-pointer"
                            style={{
                                borderRadius: '4px',
                                margin: '0 4px',
                                marginLeft: (level > 0 ? 16 : 0) + 20 + 'px',
                                background: isChecked ? '#FFF3CD' : isSelected ? COLOR.accent + '18' : 'transparent',
                                fontWeight: isSelected || isChecked ? 500 : 400,
                            }}
                            draggable
                            onDragStart={e => onDragStart(e, { type: 'element', element: el, id: el.id, name: el.name, children: [] })}
                            onMouseEnter={e => { if (!isSelected && !isChecked) e.currentTarget.style.background = '#F0F0ED'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isChecked ? '#FFF3CD' : isSelected ? COLOR.accent + '18' : 'transparent'; }}
                            onClick={e => {
                                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                                    e.preventDefault();
                                    toggleElementSelection(el.id);
                                } else {
                                    selectElement(el.id);
                                }
                            }}
                            onContextMenu={e => onContextMenu(e, 'element', el.id)}
                        >
                            {/* Checkbox — visible when checked or on hover via CSS group */}
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => { e.stopPropagation(); toggleElementSelection(el.id); }}
                                onClick={e => e.stopPropagation()}
                                className="flex-shrink-0"
                                style={{
                                    width: '12px', height: '12px', cursor: 'pointer',
                                    opacity: isChecked ? 1 : 0,
                                    transition: 'opacity 120ms',
                                    accentColor: '#2DD4A8',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLInputElement).style.opacity = '1'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLInputElement).style.opacity = isChecked ? '1' : '0'; }}
                            />
                            <ItemIcon color={isUndefined ? '#F59E0B' : layerClr} />
                            <span
                                className="truncate flex-1"
                                style={{
                                    color: isSelected ? COLOR.accentDark : COLOR.primary,
                                    fontSize: FONT.explorer.item,
                                }}
                            >
                                {el.shortId && (
                                    <span style={{ color: COLOR.muted, fontWeight: 500, marginRight: '4px' }}>
                                        [{el.shortId}]
                                    </span>
                                )}
                                {el.name}
                            </span>
                            {isUndefined && (
                                <span title={`Kind "${el.kind}" is not defined in the ontology`}
                                    style={{ color: '#F59E0B', fontSize: '12px', flexShrink: 0 }}>⚠</span>
                            )}
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
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectedElementIds = useModelStore(s => s.selectedElementIds);
    const toggleElementSelection = useModelStore(s => s.toggleElementSelection);
    const selectAllElements = useModelStore(s => s.selectAllElements);
    const clearElementSelection = useModelStore(s => s.clearElementSelection);
    const updateElementFolder = useModelStore(s => s.updateElementFolder);
    const moveFolder = useModelStore(s => s.moveFolder);
    const validation = useModelStore(s => s.validation);

    const selectElementAndNavigate = useCallback((id: string) => {
        selectElement(id);
        setActiveView({ type: 'element-detail', elementId: id });
    }, [selectElement, setActiveView]);

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
                group: { id: 'undefined', label: 'Undefined — Not in Ontology', color: '#F59E0B', kinds: [] },
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

    // Collect all visible element IDs for "Select All Matching"
    const allVisibleElementIds = useMemo(() => {
        const ids: string[] = [];
        const countElements = (nodes: TreeNode[]) => {
            for (const n of nodes) {
                if (n.type === 'element' && n.element) ids.push(n.element.id);
                else countElements(n.children);
            }
        };
        for (const { kinds } of groupTree) {
            for (const nodes of kinds.values()) countElements(nodes);
        }
        return ids;
    }, [groupTree]);

    const selectionCount = selectedElementIds.size;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* ── Multi-select toolbar ── */}
            {selectionCount > 0 && (
                <div
                    className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
                    style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', fontSize: '12px' }}
                >
                    <span style={{ color: '#92400E', fontWeight: 600 }}>{selectionCount} selected</span>
                    <span style={{ color: '#B45309' }}>— Cmd/Ctrl+click to multi-select</span>
                    <button
                        onClick={clearElementSelection}
                        className="ml-auto px-2 py-0.5 rounded"
                        style={{ color: '#92400E', background: '#FDE68A', fontSize: '12px', fontWeight: 500 }}
                    >Clear</button>
                </div>
            )}
            {/* ── "Select all matching" when search is active ── */}
            {searchTerm && allVisibleElementIds.length > 0 && (
                <div
                    className="flex items-center gap-2 px-3 py-1"
                    style={{ background: '#F0F9FF', borderBottom: '1px solid #BAE6FD', fontSize: '12px' }}
                >
                    <span style={{ color: '#0369A1' }}>{allVisibleElementIds.length} matching</span>
                    <button
                        onClick={() => selectAllElements(allVisibleElementIds)}
                        className="ml-auto px-2 py-0.5 rounded"
                        style={{ color: '#0369A1', background: '#BAE6FD', fontSize: '12px', fontWeight: 500 }}
                    >Select All</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
                {groupTree.map(({ group, kinds }) => {
                    const groupKey = `g:${group.id}`;
                    const isExpanded = expanded.has(groupKey);
                    const isUndefinedGroup = group.id === 'undefined';

                    // Recursive element counter for group badges
                    const countElements = (nodes: TreeNode[]): number =>
                        nodes.reduce((s, n) => s + (n.type === 'element' ? 1 : countElements(n.children)), 0);

                    const totalCount = Array.from(kinds.values()).reduce((sum, nodes) => sum + countElements(nodes), 0);

                    return (
                        <div key={group.id} className="mb-0.5">
                            {/* ── Group header (folder-like) ── */}
                            <div
                                className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                                style={{
                                    margin: '0 4px', borderRadius: '4px',
                                    ...(isUndefinedGroup ? { background: '#FFF3CD' } : {}),
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = isUndefinedGroup ? '#FDE68A' : '#F0F0ED'}
                                onMouseLeave={e => e.currentTarget.style.background = isUndefinedGroup ? '#FFF3CD' : 'transparent'}
                                onClick={() => toggleExpand(groupKey)}
                                onContextMenu={e => onContextMenu(e, 'group', groupKey)}
                            >
                                <ChevronIcon expanded={isExpanded} size={14} color={group.color} />
                                {isUndefinedGroup
                                    ? <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>⚠</span>
                                    : <FolderIcon open={isExpanded} color={group.color} />
                                }
                                <span
                                    className="font-semibold flex-1 truncate"
                                    style={{ color: isUndefinedGroup ? '#92400E' : COLOR.primary, fontSize: FONT.explorer.group }}
                                >
                                    {group.label}
                                </span>
                                <span
                                    className="px-1.5 py-0.5 rounded-full"
                                    style={{
                                        background: group.color + '25',
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
                                const findLayer = (ns: TreeNode[]): string | undefined => {
                                    for (const n of ns) {
                                        if (n.type === 'element') return n.element?.layer;
                                        const l = findLayer(n.children);
                                        if (l) return l;
                                    }
                                };
                                const kindLayer = findLayer(nodes);
                                const layerColor = isUndefinedGroup ? '#F59E0B' : (kindLayer ? (LAYER_COLORS[kindLayer] || group.color) : group.color);

                                // Flat list of all element IDs in this kind (for select-all)
                                const collectIds = (ns: TreeNode[]): string[] =>
                                    ns.flatMap(n => n.type === 'element' && n.element ? [n.element.id] : collectIds(n.children));
                                const kindElementIds = collectIds(nodes);

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
                                                style={{ color: isUndefinedGroup ? '#B45309' : COLOR.secondary, fontSize: FONT.explorer.kind }}
                                            >
                                                {kind}
                                                {isUndefinedGroup && <span style={{ color: '#F59E0B', marginLeft: '4px' }}>·</span>}
                                            </span>
                                            {/* Select all in kind */}
                                            <button
                                                onClick={e => { e.stopPropagation(); selectAllElements(kindElementIds); }}
                                                title="Select all in this category"
                                                className="px-1 rounded"
                                                style={{ color: COLOR.faint, fontSize: '10px', opacity: 0.6 }}
                                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                                            >☑</button>
                                        </div>

                                        {/* ── Recursive Tree Content ── */}
                                        {isKindExpanded && (
                                            <RecursiveTree
                                                nodes={nodes}
                                                level={0}
                                                expanded={expanded}
                                                toggleExpand={toggleExpand}
                                                selectedElementId={selectedElementId}
                                                selectElement={selectElementAndNavigate}
                                                selectedElementIds={selectedElementIds}
                                                toggleElementSelection={toggleElementSelection}
                                                violationCounts={violationCounts}
                                                baseColor={layerColor}
                                                onContextMenu={(e, type, id) => onContextMenu(e, type, id, kind)}
                                                onDragStart={(e, node) => handleDragStart(e, node, kind)}
                                                onDrop={(e, folderPath) => handleDrop(e, folderPath, kind)}
                                                isUndefined={isUndefinedGroup}
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

// ─── New Diagram Modal ───────────────────────────────────────────────────────

function NewDiagramModal({ viewpointId, onClose }: { viewpointId: string; onClose: () => void }) {
    const createDiagram = useModelStore(s => s.createDiagram);
    const [name, setName] = useState('Untitled');
    const [diagramType, setDiagramType] = useState('bdd');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const handleCreate = () => {
        if (!name.trim()) return;
        createDiagram({ name: name.trim(), diagramType, viewpointId });
        onClose();
    };

    return (
        <div
            ref={ref}
            className="fixed z-50 rounded-lg overflow-hidden py-3 px-4"
            style={{
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: '#FFFFFF', border: '1px solid #E5E7EB',
                boxShadow: '0 8px 32px rgba(0,0,0,0.16)', minWidth: '300px',
            }}
        >
            <div className="font-semibold mb-3" style={{ color: COLOR.primary, fontSize: '13px' }}>New Diagram</div>
            <label className="block mb-1" style={{ fontSize: FONT.xs, color: COLOR.secondary }}>Name</label>
            <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
                className="w-full px-3 py-2 rounded-lg mb-3 focus:outline-none"
                style={{ background: '#F9F9F8', border: '1px solid #E5E7EB', color: COLOR.primary, fontSize: '13px' }}
            />
            <label className="block mb-1" style={{ fontSize: FONT.xs, color: COLOR.secondary }}>Type</label>
            <select
                value={diagramType}
                onChange={e => setDiagramType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg mb-4 focus:outline-none"
                style={{ background: '#F9F9F8', border: '1px solid #E5E7EB', color: COLOR.primary, fontSize: '13px' }}
            >
                {Object.entries(DIAGRAM_TYPE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.fullName} ({meta.code})</option>
                ))}
            </select>
            <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-3 py-1.5 rounded" style={{ fontSize: '12px', color: COLOR.secondary, background: '#F0F0ED' }}>Cancel</button>
                <button onClick={handleCreate} className="px-3 py-1.5 rounded font-medium" style={{ fontSize: '12px', color: '#FFFFFF', background: COLOR.accent }}>Create</button>
            </div>
        </div>
    );
}

// ─── Collapsible sub-section inside a viewpoint ──────────────────────────────

function CollapsibleSection({ label, count, defaultOpen, children }: {
    label: string; count: number; defaultOpen: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <div
                className="flex items-center gap-1 px-2 py-1 cursor-pointer select-none"
                style={{ borderRadius: '4px', margin: '0 4px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => setOpen(v => !v)}
            >
                <ChevronIcon expanded={open} size={12} color={COLOR.faint} />
                <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>{label}</span>
                <span className="ml-1 px-1 rounded" style={{ background: '#F0F0ED', color: COLOR.faint, fontSize: FONT.badge, fontWeight: 600 }}>{count}</span>
            </div>
            {open && children}
        </div>
    );
}

function ViewExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const deleteDiagram = useModelStore(s => s.deleteDiagram);

    const [expandedVps, setExpandedVps] = useState<Set<string>>(new Set(['__model']));
    const [newDiagramVp, setNewDiagramVp] = useState<string | null>(null);

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
    const autoModelDiags = filterDiagrams(modelDiagrams.filter(d => d.auto));
    const userModelDiags = filterDiagrams(modelDiagrams.filter(d => !d.auto));

    const renderDiagramList = (diagrams: DiagramDTO[], vpId: string) => (
        diagrams.map(diag => (
            <DiagramRow
                key={diag.id}
                diag={diag}
                isSelected={selectedDiagramId === diag.id}
                onSelect={() => {
                    setActiveView({ type: 'diagram', diagramId: diag.id });
                    selectViewpoint(vpId === '__model' ? null : vpId);
                }}
                onDelete={!diag.auto ? () => deleteDiagram(diag.id) : undefined}
            />
        ))
    );

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
                        {/* Auto-generated diagrams — collapsed by default */}
                        {autoModelDiags.length > 0 && (
                            <CollapsibleSection label="Generated" count={autoModelDiags.length} defaultOpen={false}>
                                <div style={{ marginLeft: '12px' }}>
                                    {renderDiagramList(autoModelDiags, '__model')}
                                </div>
                            </CollapsibleSection>
                        )}
                        {/* User diagrams */}
                        {renderDiagramList(userModelDiags, '__model')}
                        {/* + New Diagram */}
                        <button
                            className="flex items-center gap-1 px-2 py-1 w-full text-left"
                            style={{ borderRadius: '4px', margin: '2px 4px', color: COLOR.accent, fontSize: FONT.xs, background: 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.background = COLOR.accent + '12'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => setNewDiagramVp('__model')}
                        >
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Diagram
                        </button>
                    </div>
                )}
            </div>

            {/* Named viewpoints */}
            {viewpoints.map(vp => {
                const isExpanded = expandedVps.has(vp.id);
                const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || COLOR.muted) : COLOR.muted;
                const allDiagrams = getDiagramsForViewpoint(model, vp.id);
                const autoDiags = filterDiagrams(allDiagrams.filter(d => d.auto));
                const userDiags = filterDiagrams(allDiagrams.filter(d => !d.auto));

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
                            <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{allDiagrams.length}</span>
                        </div>
                        {isExpanded && (
                            <div style={{ marginLeft: '16px' }}>
                                {autoDiags.length > 0 && (
                                    <CollapsibleSection label="Generated" count={autoDiags.length} defaultOpen={false}>
                                        <div style={{ marginLeft: '12px' }}>
                                            {renderDiagramList(autoDiags, vp.id)}
                                        </div>
                                    </CollapsibleSection>
                                )}
                                {renderDiagramList(userDiags, vp.id)}
                                <button
                                    className="flex items-center gap-1 px-2 py-1 w-full text-left"
                                    style={{ borderRadius: '4px', margin: '2px 4px', color: COLOR.accent, fontSize: FONT.xs, background: 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.background = COLOR.accent + '12'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => setNewDiagramVp(vp.id)}
                                >
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Diagram
                                </button>
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

            {/* New Diagram modal */}
            {newDiagramVp !== null && (
                <NewDiagramModal viewpointId={newDiagramVp} onClose={() => setNewDiagramVp(null)} />
            )}
        </div>
    );
}

function DiagramRow({ diag, isSelected, onSelect, onDelete }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
    onDelete?: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    const meta = DIAGRAM_TYPE_META[diag.diagramType];
    const elCount = diag.elementIds?.length ?? 0;

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 cursor-pointer group"
            style={{
                borderRadius: '4px', margin: '0 4px',
                background: isSelected ? COLOR.accent + '18' : hovered ? '#F0F0ED' : 'transparent',
                fontSize: FONT.explorer.item,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
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
            {onDelete && hovered && (
                <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    title="Delete diagram"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#DC2626', fontSize: '12px', padding: '0 2px', lineHeight: 1,
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}

// ─── DHF Explorer ────────────────────────────────────────────────────────────

// ─── DHF template registry ───────────────────────────────────────────────────

interface DhfTemplate { id: string; title: string; prefix: string; }

const DHF_GROUPS: { id: string; label: string; color: string; templates: DhfTemplate[] }[] = [
    {
        id: 'risk', label: 'Risk Management', color: '#dc2626',
        templates: [
            { id: 'iso-14971/rmp', title: 'Risk Management Plan', prefix: 'RMP' },
            { id: 'iso-14971/har', title: 'Hazard Analysis Report', prefix: 'HAR' },
            { id: 'iso-14971/fmea', title: 'FMEA', prefix: 'FMEA' },
            { id: 'iso-14971/fta', title: 'Fault Tree Analysis', prefix: 'FTA' },
            { id: 'iso-14971/risk-benefit', title: 'Risk-Benefit Analysis', prefix: 'RBA' },
            { id: 'iso-14971/rmr', title: 'Risk Management Report', prefix: 'RMR' },
        ],
    },
    {
        id: 'software', label: 'Software', color: '#2563eb',
        templates: [
            { id: 'iec-62304/sdp', title: 'Software Development Plan', prefix: 'SDP' },
            { id: 'iec-62304/srs', title: 'Software Requirements Spec', prefix: 'SRS' },
            { id: 'iec-62304/sad', title: 'Software Architecture Description', prefix: 'SAD' },
            { id: 'iec-62304/detailed-design', title: 'Software Detailed Design', prefix: 'DDS' },
            { id: 'iec-62304/integration-test', title: 'Integration Test Plan', prefix: 'ITP' },
            { id: 'iec-62304/system-test', title: 'System Test Plan', prefix: 'STP' },
            { id: 'iec-62304/soup', title: 'SOUP List', prefix: 'SOUP' },
            { id: 'iec-62304/sbom', title: 'Software Bill of Materials', prefix: 'SBOM' },
            { id: 'iec-62304/sw-traceability', title: 'SW Traceability Matrix', prefix: 'STM' },
            { id: 'iec-62304/change-control', title: 'Change Control Log', prefix: 'CCL' },
        ],
    },
    {
        id: 'usability', label: 'Usability', color: '#7c3aed',
        templates: [
            { id: 'iec-62366/ue-plan', title: 'Usability Engineering Plan', prefix: 'UEP' },
            { id: 'iec-62366/use-spec', title: 'Intended Use Specification', prefix: 'USE' },
            { id: 'iec-62366/ui-spec', title: 'User Interface Specification', prefix: 'UIS' },
            { id: 'iec-62366/task-analysis', title: 'Task Analysis', prefix: 'TA' },
            { id: 'iec-62366/urra', title: 'Use-Related Risk Analysis', prefix: 'URRA' },
            { id: 'iec-62366/formative-eval', title: 'Formative Evaluation', prefix: 'FE' },
            { id: 'iec-62366/summative-eval', title: 'Summative Evaluation', prefix: 'SE' },
        ],
    },
    {
        id: 'design', label: 'Design Controls', color: '#0891b2',
        templates: [
            { id: '21cfr820/user-needs', title: 'User Needs', prefix: 'UN' },
            { id: '21cfr820/design-input', title: 'Design Input Plan', prefix: 'DIP' },
            { id: '21cfr820/design-output', title: 'Design Output Plan', prefix: 'DOP' },
            { id: '21cfr820/design-review', title: 'Design Review Record', prefix: 'DRR' },
            { id: '21cfr820/vv-plan', title: 'V&V Plan', prefix: 'VVP' },
            { id: '21cfr820/vv-report', title: 'V&V Report', prefix: 'VVR' },
            { id: '21cfr820/design-verification', title: 'Design Verification', prefix: 'DV' },
            { id: '21cfr820/design-validation', title: 'Design Validation', prefix: 'DVA' },
            { id: '21cfr820/transfer-plan', title: 'Design Transfer Plan', prefix: 'DTP' },
            { id: '21cfr820/change-record', title: 'Design Change Record', prefix: 'DCR' },
            { id: '21cfr820/dhf-index', title: 'DHF Index', prefix: 'DHF' },
        ],
    },
    {
        id: 'cybersecurity', label: 'Cybersecurity', color: '#d97706',
        templates: [
            { id: 'fda-cybersecurity/threat-model', title: 'Threat Model', prefix: 'TM' },
            { id: 'fda-cybersecurity/security-arch', title: 'Security Architecture', prefix: 'SA' },
            { id: 'fda-cybersecurity/vuln-assessment', title: 'Vulnerability Assessment', prefix: 'VA' },
            { id: 'fda-cybersecurity/postmarket-surveillance', title: 'Post-Market Surveillance', prefix: 'PMS' },
            { id: 'fda-cybersecurity/incident-response', title: 'Incident Response Plan', prefix: 'IRP' },
        ],
    },
];

// ─── Template Picker Modal ────────────────────────────────────────────────────

function TemplatePicker({ group, existingDocs, onConfirm, onClose }: {
    group: typeof DHF_GROUPS[0];
    existingDocs: DhfDoc[];
    onConfirm: (selected: DhfTemplate[]) => void;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const existingTemplateIds = new Set(existingDocs.map(d => d.templateId));

    function toggle(templateId: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(templateId)) next.delete(templateId);
            else next.add(templateId);
            return next;
        });
    }

    function handleConfirm() {
        const picks = group.templates.filter(t => selected.has(t.id));
        onConfirm(picks);
    }

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: '12px', padding: '20px',
                width: '400px', maxHeight: '480px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: group.color, display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B', flex: 1 }}>
                        {group.label}
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px', lineHeight: 1 }}
                    >×</button>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                    Select documents to create:
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                    {group.templates.map(t => {
                        const alreadyExists = existingTemplateIds.has(t.id);
                        const isChecked = selected.has(t.id);
                        return (
                            <label
                                key={t.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 10px', borderRadius: '6px', cursor: alreadyExists ? 'not-allowed' : 'pointer',
                                    background: isChecked ? `${group.color}12` : 'transparent',
                                    opacity: alreadyExists ? 0.45 : 1,
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!alreadyExists) e.currentTarget.style.background = `${group.color}10`; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isChecked ? `${group.color}12` : 'transparent'; }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={alreadyExists}
                                    onChange={() => !alreadyExists && toggle(t.id)}
                                    style={{ accentColor: group.color }}
                                />
                                <span style={{ flex: 1, fontSize: '13px', color: '#1B3A4B' }}>{t.title}</span>
                                {alreadyExists && (
                                    <span style={{ fontSize: '10px', color: '#9CA3AF' }}>exists</span>
                                )}
                            </label>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selected.size === 0}
                        style={{
                            padding: '7px 16px', borderRadius: '6px', border: 'none',
                            background: selected.size > 0 ? group.color : '#E5E7EB',
                            color: selected.size > 0 ? '#fff' : '#9CA3AF',
                            fontSize: '13px', fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'default',
                        }}
                    >
                        Create {selected.size > 0 ? `(${selected.size})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── DHF Explorer Content ─────────────────────────────────────────────────────

function DhfExplorerContent() {
    const setActiveView = useModelStore(s => s.setActiveView);
    const activeView = useModelStore(s => s.activeView);
    const dhfDocuments = useModelStore(s => s.dhfDocuments);
    const addDhfDocument = useModelStore(s => s.addDhfDocument);
    const removeDhfDocument = useModelStore(s => s.removeDhfDocument);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(DHF_GROUPS.map(g => g.id))
    );
    const [pickerGroup, setPickerGroup] = useState<typeof DHF_GROUPS[0] | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; groupId: string } | null>(null);

    const activeDocId = activeView.type === 'dhf-document' ? activeView.docId : null;

    function toggleGroup(id: string) {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function openContextMenu(e: React.MouseEvent, groupId: string) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, groupId });
    }

    function openPicker(groupId: string) {
        const g = DHF_GROUPS.find(g => g.id === groupId);
        if (g) setPickerGroup(g);
        setContextMenu(null);
    }

    function createDocuments(templates: DhfTemplate[]) {
        for (const t of templates) {
            // Compute next sequential ID for this prefix
            const existing = dhfDocuments.filter(d => d.id.startsWith(t.prefix + '-'));
            const next = existing.length + 1;
            const docId = `${t.prefix}-${String(next).padStart(3, '0')}`;
            const group = DHF_GROUPS.find(g => g.templates.some(tmpl => tmpl.id === t.id))!;
            const doc: DhfDoc = {
                id: docId,
                title: t.title,
                group: group.label,
                templateId: t.id,
                content: `---\nid: ${docId}\ntitle: ${t.title}\ntemplate: ${t.id}\n---\n\n# ${t.title}\n\n`,
                createdAt: Date.now(),
            };
            addDhfDocument(doc);
            // Open the first created doc
            if (templates.indexOf(t) === 0) {
                setActiveView({ type: 'dhf-document', docId: doc.id });
            }
        }
        setPickerGroup(null);
    }

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;
        function handler() { setContextMenu(null); }
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenu]);

    return (
        <>
            <div className="flex-1 overflow-y-auto py-1">
                {DHF_GROUPS.map(group => {
                    const expanded = expandedGroups.has(group.id);
                    const groupDocs = dhfDocuments.filter(d => d.group === group.label);
                    return (
                        <div key={group.id}>
                            {/* Group header */}
                            <button
                                onClick={() => toggleGroup(group.id)}
                                onContextMenu={e => openContextMenu(e, group.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                                style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary, borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                title="Right-click to add documents"
                            >
                                <span style={{
                                    display: 'inline-block', width: '7px', height: '7px',
                                    borderRadius: '50%', background: group.color, flexShrink: 0,
                                }} />
                                <span className="flex-1 uppercase tracking-wide" style={{ fontSize: '10px' }}>{group.label}</span>
                                {groupDocs.length > 0 && (
                                    <span style={{ fontSize: '10px', color: group.color, fontWeight: 700 }}>
                                        {groupDocs.length}
                                    </span>
                                )}
                                <ChevronIcon expanded={expanded} size={11} />
                            </button>

                            {/* Doc items */}
                            {expanded && (
                                groupDocs.length === 0 ? (
                                    <div
                                        style={{
                                            paddingLeft: '28px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px',
                                            fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic',
                                        }}
                                    >
                                        Right-click to add
                                    </div>
                                ) : (
                                    groupDocs.map(doc => {
                                        const isActive = activeDocId === doc.id;
                                        return (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center',
                                                    paddingLeft: '28px', paddingRight: '4px',
                                                    background: isActive ? `${group.color}18` : 'transparent',
                                                    borderLeft: isActive ? `2px solid ${group.color}` : '2px solid transparent',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLOR.surfaceAlt; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${group.color}18` : 'transparent'; }}
                                            >
                                                <button
                                                    onClick={() => setActiveView({ type: 'dhf-document', docId: doc.id })}
                                                    style={{
                                                        flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                                                        background: 'none', border: 'none', padding: '5px 0',
                                                        fontSize: FONT.explorer.element, color: isActive ? group.color : COLOR.primary,
                                                        fontWeight: isActive ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                                                    }}
                                                >
                                                    <ItemIcon color={group.color} />
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {doc.id}
                                                    </span>
                                                </button>
                                                {/* Delete button */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); removeDhfDocument(doc.id); }}
                                                    title="Remove document"
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#9CA3AF', padding: '2px 4px', borderRadius: '3px', fontSize: '12px',
                                                        opacity: 0, transition: 'opacity 0.1s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = '#9CA3AF'; }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })
                                )
                            )}
                        </div>
                    );
                })}

                {/* Hint */}
                {dhfDocuments.length === 0 && (
                    <div style={{ padding: '16px 14px', fontSize: '11px', color: '#9CA3AF', lineHeight: '1.6' }}>
                        Right-click any group to create documents from templates.
                    </div>
                )}
            </div>

            {/* Context menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed', zIndex: 9998,
                        left: contextMenu.x, top: contextMenu.y,
                        background: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        padding: '4px 0', minWidth: '160px',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => openPicker(contextMenu.groupId)}
                        style={{
                            display: 'block', width: '100%', padding: '8px 14px',
                            background: 'none', border: 'none', textAlign: 'left',
                            fontSize: '13px', color: '#1B3A4B', cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        Add document…
                    </button>
                </div>
            )}

            {/* Template picker modal */}
            {pickerGroup && (
                <TemplatePicker
                    group={pickerGroup}
                    existingDocs={dhfDocuments}
                    onConfirm={createDocuments}
                    onClose={() => setPickerGroup(null)}
                />
            )}
        </>
    );
}

// ─── Main ExplorerPanel ──────────────────────────────────────────────────────

export function ExplorerPanel() {
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const explorerTab = useModelStore(s => s.explorerTab);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const model = useModelStore(s => s.model);
    const activeMode = useModelStore(s => s.activeMode);

    if (sidebarCollapsed) return null;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: COLOR.surface, borderRight: `1px solid ${COLOR.border}` }}>

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
                    {/* catalog / default mode: model element tree */}
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <input type="text" placeholder="Search elements..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                    </div>
                    <ModelExplorerContent searchTerm={searchTerm} />
                </>
            )}
        </div>
    );
}
