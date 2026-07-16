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
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META, KIND_TO_GROUP, VALID_ONTOLOGY_KINDS_SORTED, BUILDER_SYNTHESIZED_KINDS, resolveActionFlowDiagramType } from '../constants';
import { FONT, COLOR, ICON } from '../styles/tokens';
import { WorkingSetsPanel as WorkingSetsContent } from './WorkingSetsPanel';
import { OntologyBrowserTab } from './OntologyBrowserTab';
import { DashboardSidebar } from './DashboardSidebar';
import type { MemoElement, DiagramDTO } from '@memo/tools/browser';
import type { OntologyPackageInfo } from '../types/ontology';
import { getBuiltInTemplate } from '../dhf/built-in-templates';
import { DHF_GROUPS, groupColorForLabel } from '../dhf/dhf-groups';
import { NewDocumentWizard, type NewDocSpec } from '../dhf/NewDocumentWizard';

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
        { id: 'ontologies', label: 'Onto' },
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
    selectElement: (id: string) => void;
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
                                    selectElement={selectElement}
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

// ─── Ontology-layer group helpers ────────────────────────────────────────────

interface LayerGroup {
    id: string;
    label: string;
    color: string;
    kinds: string[];
}

const LAYER_RANK = Object.fromEntries(LAYER_ORDER.map((id, i) => [id, i]));

/** Build ordered layer groups from the currently selected ontology packages. */
function buildLayerGroupsFromOntologies(
    availableOntologies: OntologyPackageInfo[],
    selectedOntologies: Set<string>,
    fallbackLayerIds: Iterable<string> = [],
): LayerGroup[] {
    const layerMap = new Map<string, LayerGroup>();
    for (const pkg of availableOntologies) {
        if (!selectedOntologies.has(pkg.name)) continue;
        for (const layer of pkg.layers) {
            if (!layerMap.has(layer.id)) {
                layerMap.set(layer.id, {
                    id: layer.id,
                    label: layer.label,
                    color: layer.color ?? (LAYER_COLORS as Record<string, string>)[layer.id] ?? '#6B7280',
                    kinds: layer.kinds.map(k => k.name),
                });
            } else {
                // Merge kinds from duplicate layer ids across packages
                const existing = layerMap.get(layer.id)!;
                for (const k of layer.kinds) {
                    if (!existing.kinds.includes(k.name)) existing.kinds.push(k.name);
                }
            }
        }
    }
    // Layers carried only by builder-synthesized elements (no ontology package
    // declares them) still get a group so their elements categorize cleanly.
    for (const id of fallbackLayerIds) {
        if (!layerMap.has(id)) {
            layerMap.set(id, {
                id,
                label: LAYER_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
                color: (LAYER_COLORS as Record<string, string>)[id] ?? '#6B7280',
                kinds: [],
            });
        }
    }
    // Sort by LAYER_ORDER, then alphabetically for unknown layers
    return [...layerMap.values()].sort((a, b) => {
        const ra = LAYER_RANK[a.id] ?? 999;
        const rb = LAYER_RANK[b.id] ?? 999;
        return ra !== rb ? ra - rb : a.label.localeCompare(b.label);
    });
}

/** Build kind-name → layer-id map from selected ontology packages. */
function buildKindToLayerIdMap(
    availableOntologies: OntologyPackageInfo[],
    selectedOntologies: Set<string>,
): Record<string, string> {
    const map: Record<string, string> = {};
    for (const pkg of availableOntologies) {
        if (!selectedOntologies.has(pkg.name)) continue;
        for (const layer of pkg.layers) {
            for (const kind of layer.kinds) {
                map[kind.name] = layer.id;
            }
        }
    }
    return map;
}

/**
 * Build kind-name → namespace sub-group map from selected ontology packages
 * (e.g. Hazard → "risk" from architecture/risk/). Kinds declared directly
 * under a layer directory carry no sub-group.
 */
function buildKindToSubGroupMap(
    availableOntologies: OntologyPackageInfo[],
    selectedOntologies: Set<string>,
): Record<string, string | undefined> {
    const map: Record<string, string | undefined> = {};
    for (const pkg of availableOntologies) {
        if (!selectedOntologies.has(pkg.name)) continue;
        for (const layer of pkg.layers) {
            for (const kind of layer.kinds) {
                map[kind.name] = kind.group;
            }
        }
    }
    return map;
}

/** "hardware_structure" → "Hardware Structure" */
function subGroupLabel(id: string): string {
    return id
        .split(/[_-]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/** One namespace sub-group inside a layer group (e.g. Risk inside Architecture). */
export interface ExplorerSubGroup {
    /** Sub-group id ('' for kinds sitting directly under the layer). */
    id: string;
    label: string;
    color: string;
    kinds: Map<string, TreeNode[]>;
}

/**
 * Group model elements by ontology layer, then by namespace sub-group, for
 * the Model Explorer tree (e.g. Architecture → Risk → Hazard → elements).
 * Elements whose kind no selected ontology declares fall back to their own
 * layer field; whatever remains lands in "Undefined — Not in Ontology".
 * Exported for tests.
 */
export function computeExplorerGroupTree(
    elements: MemoElement[],
    searchTerm: string,
    availableOntologies: OntologyPackageInfo[],
    selectedOntologies: Set<string>,
): { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] {
    const lower = searchTerm.toLowerCase();

    // Derive groups and kind→layer map from the currently selected ontology packages.
    // Drop view-bearing layers — views live in Diagrams, not Model Explorer (Phase D3).
    const NON_ELEMENT_LAYERS = new Set(['views', 'viewpoints', 'methodology', 'manifest']);
    const kindToLayerId = buildKindToLayerIdMap(availableOntologies, selectedOntologies);
    const kindToSubGroup = buildKindToSubGroupMap(availableOntologies, selectedOntologies);
    // Builder-synthesized kinds for native SysML constructs (action def /
    // action / item def) exist in no ontology package — group them under
    // their builder-assigned layer instead of "Undefined — Not in Ontology".
    const synthesizedLayerIds = new Set<string>();
    for (const el of elements) {
        if (BUILDER_SYNTHESIZED_KINDS.has(el.kind) && !kindToLayerId[el.kind]) {
            synthesizedLayerIds.add(el.layer);
        }
    }
    const layerGroups = buildLayerGroupsFromOntologies(availableOntologies, selectedOntologies, synthesizedLayerIds)
        .filter(lg => !NON_ELEMENT_LAYERS.has(lg.id));
    const knownLayerIds = new Set(layerGroups.map(lg => lg.id));

    /** Bucket kind → elements into sub-groups, building each kind's tree. */
    const toSubGroups = (kindMap: Map<string, MemoElement[]>, groupColor: string): ExplorerSubGroup[] => {
        const buckets = new Map<string, Map<string, TreeNode[]>>();
        for (const [kind, els] of kindMap.entries()) {
            // Ontology namespace sub-group; synthesized/fallback kinds group
            // under the elements' own layer when it adds information
            const sub = kindToSubGroup[kind] ?? '';
            if (!buckets.has(sub)) buckets.set(sub, new Map());
            buckets.get(sub)!.set(kind, buildTree(els));
        }
        return [...buckets.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([id, kinds]) => ({
                id,
                label: id ? subGroupLabel(id) : '',
                color: id ? ((LAYER_COLORS as Record<string, string>)[id] ?? groupColor) : groupColor,
                kinds,
            }));
    };

    const groups: { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] = [];

    for (const lg of layerGroups) {
        const kindMap = new Map<string, MemoElement[]>();
        for (const el of elements) {
            // Prefer ontology-defined layer; fall back to element's own layer field
            const layerId = kindToLayerId[el.kind] ?? el.layer;
            if (layerId !== lg.id) continue;
            if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
            if (!kindMap.has(el.kind)) kindMap.set(el.kind, []);
            kindMap.get(el.kind)!.push(el);
        }
        if (kindMap.size > 0) {
            groups.push({ group: lg, subGroups: toSubGroups(kindMap, lg.color) });
        }
    }

    // Elements whose layer isn't in any selected ontology → "Not in Ontology"
    const uncategorizedMap = new Map<string, MemoElement[]>();
    for (const el of elements) {
        const layerId = kindToLayerId[el.kind] ?? el.layer;
        if (knownLayerIds.has(layerId)) continue;
        if (NON_ELEMENT_LAYERS.has(layerId)) continue;
        if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
        if (!uncategorizedMap.has(el.kind)) uncategorizedMap.set(el.kind, []);
        uncategorizedMap.get(el.kind)!.push(el);
    }
    if (uncategorizedMap.size > 0) {
        const undefColor = '#F59E0B';
        groups.push({
            group: { id: 'undefined', label: 'Undefined — Not in Ontology', color: undefColor, kinds: [] },
            subGroups: toSubGroups(uncategorizedMap, undefColor),
        });
    }

    return groups;
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectedOntologies = useModelStore(s => s.selectedOntologies);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setSelectedOntologyKind = useModelStore(s => s.setSelectedOntologyKind);

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

    // Build group tree from selected ontology layers (dynamic — not hardcoded SEMANTIC_GROUPS)
    const groupTree = useMemo(
        () => model ? computeExplorerGroupTree(Object.values(model.elements), searchTerm, availableOntologies, selectedOntologies) : [],
        [model, searchTerm, availableOntologies, selectedOntologies],
    );

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
        for (const { subGroups } of groupTree) {
            for (const sub of subGroups) {
                for (const nodes of sub.kinds.values()) countElements(nodes);
            }
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
                {groupTree.map(({ group, subGroups }) => {
                    const groupKey = `g:${group.id}`;
                    const isExpanded = expanded.has(groupKey);
                    const isUndefinedGroup = group.id === 'undefined';

                    // Recursive element counter for group badges
                    const countElements = (nodes: TreeNode[]): number =>
                        nodes.reduce((s, n) => s + (n.type === 'element' ? 1 : countElements(n.children)), 0);

                    const countSubGroup = (sub: ExplorerSubGroup): number =>
                        Array.from(sub.kinds.values()).reduce((sum, nodes) => sum + countElements(nodes), 0);

                    const totalCount = subGroups.reduce((sum, sub) => sum + countSubGroup(sub), 0);

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

                            {/* ── Kind folders (shared by root kinds and sub-groups) ── */}
                            {(() => {
                            const renderKind = (kind: string, nodes: TreeNode[], subId: string) => {
                                const kindKey = `k:${group.id}:${subId ? subId + ':' : ''}${kind}`;
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
                                            {/* View kind in ontology */}
                                            {!isUndefinedGroup && (
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        for (const pkg of availableOntologies) {
                                                            for (const layer of pkg.layers) {
                                                                if (layer.kinds.some(k => k.name === kind)) {
                                                                    setSelectedOntologyKind(kind);
                                                                    setExplorerTab('ontologies');
                                                                    setActiveMode('ontology');
                                                                    setActiveView({ type: 'ontology-detail', packageName: pkg.name, layerId: layer.id });
                                                                    return;
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    title="View kind in Ontology"
                                                    className="px-1 rounded"
                                                    style={{ color: COLOR.faint, fontSize: '10px', opacity: 0.6 }}
                                                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                                                >⬡</button>
                                            )}
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
                            };

                            if (!isExpanded) return null;
                            return subGroups.map(sub => {
                                // Kinds sitting directly under the layer render flat
                                if (!sub.id) {
                                    return (
                                        <div key="__root">
                                            {Array.from(sub.kinds.entries()).map(([kind, nodes]) => renderKind(kind, nodes, ''))}
                                        </div>
                                    );
                                }
                                const subKey = `sg:${group.id}:${sub.id}`;
                                const isSubExpanded = expanded.has(subKey);
                                const subCount = countSubGroup(sub);
                                return (
                                    <div key={sub.id} style={{ marginLeft: '16px' }}>
                                        {/* ── Namespace sub-group header (e.g. Risk within Architecture) ── */}
                                        <div
                                            className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
                                            style={{ borderRadius: '4px', margin: '0 4px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            onClick={() => toggleExpand(subKey)}
                                        >
                                            <ChevronIcon expanded={isSubExpanded} size={13} color={sub.color} />
                                            <FolderIcon open={isSubExpanded} color={sub.color} />
                                            <span
                                                className="font-semibold flex-1 truncate"
                                                style={{ color: COLOR.primary, fontSize: FONT.explorer.kind }}
                                            >
                                                {sub.label}
                                            </span>
                                            <span
                                                className="px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: sub.color + '25',
                                                    color: sub.color,
                                                    fontSize: FONT.explorer.count,
                                                    fontWeight: 600,
                                                    minWidth: '20px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {subCount}
                                            </span>
                                        </div>
                                        {isSubExpanded && Array.from(sub.kinds.entries()).map(([kind, nodes]) => renderKind(kind, nodes, sub.id))}
                                    </div>
                                );
                            });
                            })()}
                        </div>
                    );
                })}
                {ctxMenu && <ElementContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
            </div>
        </div>
    );
}

// ─── View Explorer ───────────────────────────────────────────────────────────

function DiagramTypeBadge({ diagram }: { diagram: DiagramDTO }) {
    const resolvedType = ['afd', 'ofd', 'ffd'].includes(diagram.diagramType.toLowerCase())
        ? resolveActionFlowDiagramType(diagram)
        : diagram.diagramType;
    const meta = DIAGRAM_TYPE_META[resolvedType];
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
    const methodology = useModelStore(s => s.methodology);
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

    // ─── Phase D2: methodology viewpoints (top-level tree source) ───────────
    const methodologyViewpoints = useMemo(() => {
        if (!methodology) return [];
        const out: { id: string; name: string; title: string; description: string; folder: string }[] = [];
        for (const folder of methodology.folders) {
            const vps = folder.parts['Viewpoint'] ?? [];
            for (const vp of vps) {
                const idAttr = vp.attributes['id'];
                const nameAttr = vp.attributes['name'];
                const titleAttr = vp.attributes['title'];
                const descAttr = vp.attributes['shortDescription'] ?? vp.attributes['longDescription'];
                out.push({
                    id: typeof idAttr === 'string' ? idAttr : vp.partName,
                    name: typeof nameAttr === 'string' ? nameAttr : vp.partName,
                    title: typeof titleAttr === 'string' ? titleAttr : (typeof nameAttr === 'string' ? nameAttr : vp.partName),
                    description: typeof descAttr === 'string' ? descAttr : '',
                    folder: folder.name,
                });
            }
        }
        return out;
    }, [methodology]);

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
    const isSample = (d: DiagramDTO) => d.id.startsWith('diag-sample-');
    const sampleModelDiags = filterDiagrams(modelDiagrams.filter(d => d.auto && isSample(d)));
    const autoModelDiags = filterDiagrams(modelDiagrams.filter(d => d.auto && !isSample(d)));
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
            {/* Phase D2: Methodology Viewpoints — primary tree when methodology pinned */}
            {methodologyViewpoints.length > 0 && (
                <div style={{ marginBottom: '6px', borderBottom: `1px solid ${COLOR.border}`, paddingBottom: '6px' }}>
                    <div className="px-3 py-1" style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.08em', color: COLOR.muted,
                    }}>
                        Methodology Viewpoints
                    </div>
                    {methodologyViewpoints.map(mvp => {
                        const isExpanded = expandedVps.has(`mvp::${mvp.id}`);
                        return (
                            <div key={`mvp::${mvp.id}`} className="mb-0.5">
                                <div
                                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                                    style={{ borderRadius: '4px', margin: '0 4px' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => toggleExpand(`mvp::${mvp.id}`)}
                                    title={mvp.description}
                                >
                                    <ChevronIcon expanded={isExpanded} size={14} color={COLOR.accent} />
                                    <FolderIcon open={isExpanded} color={COLOR.accent} />
                                    <span className="font-semibold flex-1 truncate" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>
                                        {mvp.title}
                                    </span>
                                    <span style={{ color: COLOR.faint, fontSize: FONT.badge, fontFamily: 'monospace' }}>{mvp.id}</span>
                                </div>
                                {isExpanded && (
                                    <div style={{ marginLeft: '24px', padding: '4px 0', fontSize: FONT.xs, color: COLOR.muted, lineHeight: 1.5 }}>
                                        {mvp.description || <em>No description.</em>}
                                        <div style={{ marginTop: '4px', fontSize: '10px', color: COLOR.faint }}>
                                            from <code style={{ fontFamily: 'monospace' }}>{mvp.folder}</code> · views &amp; diagrams pending (Phase D2 stub)
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

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
                        {/* One sample per view-kind template — collapsed by default */}
                        {sampleModelDiags.length > 0 && (
                            <CollapsibleSection label="Samples" count={sampleModelDiags.length} defaultOpen={false}>
                                <div style={{ marginLeft: '12px' }}>
                                    {renderDiagramList(sampleModelDiags, '__model')}
                                </div>
                            </CollapsibleSection>
                        )}
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
            <DiagramTypeBadge diagram={diag} />
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

// Category registry lives in ../dhf/dhf-groups.ts (shared with NewDocumentWizard).

// ─── DHF Explorer Content ─────────────────────────────────────────────────────

function DhfExplorerContent() {
    const setActiveView = useModelStore(s => s.setActiveView);
    const activeView = useModelStore(s => s.activeView);
    const dhfDocuments = useModelStore(s => s.dhfDocuments);
    const addDhfDocument = useModelStore(s => s.addDhfDocument);
    const removeDhfDocument = useModelStore(s => s.removeDhfDocument);
    const dhfSettings = useModelStore(s => s.dhfSettings);
    const methodology = useModelStore(s => s.methodology);

    // ─── Phase D4: methodology-pinned DHF documents ─────────────────────────
    const methodologyDhfBindings = useMemo(() => {
        if (!methodology) return [];
        const out: {
            id: string; partName: string; documentTitle: string; groupLabel: string;
            templateId: string; viewKind: string; regulatoryReference: string;
            required: boolean; folder: string;
        }[] = [];
        for (const folder of methodology.folders) {
            const bindings = folder.parts['DhfDocumentBinding'] ?? [];
            for (const b of bindings) {
                const a = b.attributes;
                const idAttr = a['id'];
                const titleAttr = a['documentTitle'];
                const groupAttr = a['groupLabel'];
                const templateAttr = a['templateId'];
                const viewKindAttr = a['viewKind'];
                const regAttr = a['regulatoryReference'];
                const reqAttr = a['required'];
                out.push({
                    id: typeof idAttr === 'string' ? idAttr : b.partName,
                    partName: b.partName,
                    documentTitle: typeof titleAttr === 'string' ? titleAttr : b.partName,
                    groupLabel: typeof groupAttr === 'string' ? groupAttr : '',
                    templateId: typeof templateAttr === 'string' ? templateAttr : '',
                    viewKind: typeof viewKindAttr === 'string' ? viewKindAttr : '',
                    regulatoryReference: typeof regAttr === 'string' ? regAttr : '',
                    required: typeof reqAttr === 'boolean' ? reqAttr : false,
                    folder: folder.name,
                });
            }
        }
        return out;
    }, [methodology]);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(DHF_GROUPS.map(g => g.id))
    );
    const [wizard, setWizard] = useState<{ initialGroupId?: string } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; groupId: string } | null>(null);

    const activeDocId = activeView.type === 'dhf-document' ? activeView.docId : null;

    // Custom "Other" categories: any doc group that isn't a built-in group label
    const customGroupLabels = useMemo(() => {
        const builtIn = new Set(DHF_GROUPS.map(g => g.label));
        return [...new Set(dhfDocuments.map(d => d.group))].filter(l => l && !builtIn.has(l)).sort();
    }, [dhfDocuments]);

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

    function createDocuments(specs: NewDocSpec[]) {
        const prefix = dhfSettings.documentNumberingPrefix || 'DOC';
        const created: DhfDoc[] = [];
        for (const spec of specs) {
            // Compute next sequential ID for this prefix
            const idPrefix = `${prefix}-${spec.prefix}-`;
            const existing = [...dhfDocuments, ...created].filter(d => d.id.startsWith(idPrefix));
            const docId = `${idPrefix}${String(existing.length + 1).padStart(3, '0')}`;

            // Wizard-resolved content (blank/repo) or prefilled meMO template
            const stripFm = (md: string) => md.replace(/^---[\s\S]*?---\n?/, '');
            const body = spec.content !== null
                ? stripFm(spec.content)
                : (() => {
                    const tpl = getBuiltInTemplate(spec.templateId);
                    return tpl ? stripFm(tpl) : `# ${spec.title}\n\n_[TODO: Add content]_\n`;
                })();
            const content = `---\nid: ${docId}\ntitle: ${spec.title}\ntemplate: ${spec.templateId}\n---\n\n${body}`;

            const doc: DhfDoc = {
                id: docId,
                title: spec.title,
                group: spec.groupLabel,
                templateId: spec.templateId,
                content,
                createdAt: Date.now(),
                authors: '',
                approvers: '',
            };
            addDhfDocument(doc);
            created.push(doc);
            // Open the first created doc
            if (created.length === 1) {
                setActiveView({ type: 'dhf-document', docId: doc.id });
            }
        }
        setWizard(null);
    }

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;
        function handler() { setContextMenu(null); }
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenu]);

    function createFromBinding(b: typeof methodologyDhfBindings[number]) {
        const existingDoc = dhfDocuments.find(d => d.templateId === b.templateId);
        if (existingDoc) {
            setActiveView({ type: 'dhf-document', docId: existingDoc.id });
            return;
        }
        const group = DHF_GROUPS.find(g => g.templates.some(t => t.id === b.templateId));
        const tmpl = group?.templates.find(t => t.id === b.templateId);
        if (group && tmpl) {
            createDocuments([{ title: tmpl.title, prefix: tmpl.prefix, templateId: tmpl.id, groupLabel: group.label, content: null }]);
        }
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto py-1">
                {/* New Document — guided wizard (category → template → confirm) */}
                <div style={{ padding: '4px 10px 8px' }}>
                    <button
                        onClick={() => setWizard({})}
                        style={{
                            width: '100%', padding: '7px 10px', borderRadius: '6px',
                            border: 'none', background: COLOR.accentDark,
                            fontSize: FONT.explorer.item, fontWeight: 600, color: '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#254B60'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = COLOR.accentDark; }}
                    >
                        <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Document
                    </button>
                </div>

                {/* Phase D4: Methodology DHF documents — driven by methodology.dhf_documents */}
                {methodologyDhfBindings.length > 0 && (
                    <div style={{ marginBottom: '6px', borderBottom: `1px solid ${COLOR.border}`, paddingBottom: '6px' }}>
                        <div className="px-3 py-1" style={{
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.08em', color: COLOR.muted,
                        }}>
                            Methodology DHF
                        </div>
                        {methodologyDhfBindings.map(b => {
                            const existingDoc = dhfDocuments.find(d => d.templateId === b.templateId);
                            const isActive = existingDoc != null && activeDocId === existingDoc.id;
                            const tmplKnown = DHF_GROUPS.some(g => g.templates.some(t => t.id === b.templateId));
                            return (
                                <div
                                    key={`mdhf::${b.id}`}
                                    onClick={() => createFromBinding(b)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '5px 12px',
                                        cursor: tmplKnown ? 'pointer' : 'default',
                                        background: isActive ? '#EEF2FF' : 'transparent',
                                        borderLeft: isActive ? '2px solid #6366F1' : '2px solid transparent',
                                    }}
                                    title={`${b.regulatoryReference || ''} · template: ${b.templateId}${tmplKnown ? '' : ' (unknown — no built-in template)'}`}
                                    onMouseEnter={e => { if (!isActive && tmplKnown) e.currentTarget.style.background = COLOR.surfaceAlt; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#EEF2FF' : 'transparent'; }}
                                >
                                    <span style={{
                                        fontSize: '9px', fontFamily: 'monospace',
                                        color: b.required ? '#DC2626' : COLOR.faint,
                                        fontWeight: 700,
                                    }}>{b.id}</span>
                                    <span style={{ flex: 1, fontSize: FONT.explorer.element, color: COLOR.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {b.documentTitle}
                                    </span>
                                    {existingDoc ? (
                                        <span style={{ fontSize: '9px', color: '#059669', fontWeight: 700 }}>✓</span>
                                    ) : (
                                        <span style={{ fontSize: '9px', color: COLOR.faint }}>+</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Only categories that contain documents — creation goes through the wizard */}
                {DHF_GROUPS.filter(g => dhfDocuments.some(d => d.group === g.label)).map(group => {
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
                            )}
                        </div>
                    );
                })}

                {/* Custom "Other" categories */}
                {customGroupLabels.map(label => {
                    const key = `custom:${label}`;
                    const expanded = expandedGroups.has(key);
                    const color = groupColorForLabel(label);
                    const groupDocs = dhfDocuments.filter(d => d.group === label);
                    return (
                        <div key={key}>
                            <button
                                onClick={() => toggleGroup(key)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                                style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary, borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{
                                    display: 'inline-block', width: '7px', height: '7px',
                                    borderRadius: '50%', background: color, flexShrink: 0,
                                }} />
                                <span className="flex-1 uppercase tracking-wide" style={{ fontSize: '10px' }}>{label}</span>
                                <span style={{ fontSize: '10px', color, fontWeight: 700 }}>{groupDocs.length}</span>
                                <ChevronIcon expanded={expanded} size={11} />
                            </button>
                            {expanded && groupDocs.map(doc => {
                                const isActive = activeDocId === doc.id;
                                return (
                                    <div
                                        key={doc.id}
                                        style={{
                                            display: 'flex', alignItems: 'center',
                                            paddingLeft: '28px', paddingRight: '4px',
                                            background: isActive ? `${color}18` : 'transparent',
                                            borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLOR.surfaceAlt; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${color}18` : 'transparent'; }}
                                    >
                                        <button
                                            onClick={() => setActiveView({ type: 'dhf-document', docId: doc.id })}
                                            style={{
                                                flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                                                background: 'none', border: 'none', padding: '5px 0',
                                                fontSize: FONT.explorer.element, color: isActive ? color : COLOR.primary,
                                                fontWeight: isActive ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                                            }}
                                        >
                                            <ItemIcon color={color} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.id}
                                            </span>
                                        </button>
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
                            })}
                        </div>
                    );
                })}

                {/* Hint */}
                {dhfDocuments.length === 0 && (
                    <div style={{ padding: '16px 14px', fontSize: '11px', color: '#9CA3AF', lineHeight: '1.6' }}>
                        No documents yet. Use <strong>+ New Document</strong> to create one from a meMO template, a blank page, or a markdown file in this repository.
                    </div>
                )}

                {/* AI Tools section */}
                <div style={{ margin: '8px 10px 6px', padding: '8px', background: '#F0FDF9', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✦</span> AI Tools
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <AiToolButton
                            label="Model Q&A"
                            description="Ask questions about your model"
                            active={activeView.type === 'ask'}
                            onClick={() => setActiveView({ type: 'ask' })}
                        />
                        <AiToolButton
                            label="SysML Generator"
                            description="Natural language → SysML v2"
                            active={activeView.type === 'sysml-generator'}
                            onClick={() => setActiveView({ type: 'sysml-generator' })}
                        />
                    </div>
                </div>
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
                        onClick={() => { setWizard({ initialGroupId: contextMenu.groupId }); setContextMenu(null); }}
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

            {/* New Document wizard */}
            {wizard && (
                <NewDocumentWizard
                    initialGroupId={wizard.initialGroupId}
                    existingDocs={dhfDocuments}
                    numberingPrefix={dhfSettings.documentNumberingPrefix || 'DOC'}
                    onCreate={createDocuments}
                    onClose={() => setWizard(null)}
                />
            )}
        </>
    );
}

// ─── AI Tool Button ───────────────────────────────────────────────────────────

function AiToolButton({ label, description, active, onClick }: {
    label: string; description: string; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', width: '100%', padding: '5px 8px',
                borderRadius: '5px', border: 'none', textAlign: 'left', cursor: 'pointer',
                background: active ? '#D1FAE5' : 'rgba(255,255,255,0.7)',
                transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
        >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#065F46' }}>{label}</span>
            <span style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>{description}</span>
        </button>
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
    const activeView = useModelStore(s => s.activeView);

    // Keep explorerTab store in sync for components that read it (CommandPalette, WorkspaceManager, etc.)
    useEffect(() => {
        if (activeView.type === 'ontology' || activeView.type === 'ontology-detail') {
            setExplorerTab('ontologies');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView.type]);

    if (sidebarCollapsed) return null;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: COLOR.surface, borderRight: `1px solid ${COLOR.border}` }}>

            {/* Content driven entirely by top-nav mode — no redundant tab strip */}
            {activeMode === 'dashboard' ? (
                <DashboardSidebar />
            ) : activeMode === 'dhf' ? (
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
            ) : activeMode === 'ontology' ? (
                <OntologyBrowserTab />
            ) : activeMode === 'scenario' ? (
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
                /* catalog / dashboard / default */
                <>
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
