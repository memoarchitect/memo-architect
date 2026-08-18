import { Fragment, lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    useModelStore,
    getElementsByLayer,
    getDiagramsForViewpoint,
    getRelationshipsForElement,
    type ExplorerTab,
    type DhfDoc,
    type PackageMutationResult,
} from '../store/model-store';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META, VIEW_KIND_META, resolveActionFlowDiagramType } from '../constants';
import { FONT, COLOR, ICON } from '../styles/tokens';
import { WorkingSetsPanel as WorkingSetsContent } from './WorkingSetsPanel';
import { OntologyBrowserTab } from './OntologyBrowserTab';
import { DashboardSidebar } from './DashboardSidebar';
import { ExplorerElementIdentity } from './ExplorerElementIdentity';
import { ExplorerCountBadge } from './ExplorerCountBadge';
import { activityNodeType, type MemoElement, type DiagramDTO, type KindDefinitionDTO, type MemoModelDTO, type ViewpointDTO, type ViewKind } from '@memoarchitect/tools/browser';
import type { OntologyPackageInfo } from '../types/ontology';
import { getBuiltInTemplate } from '../dhf/built-in-templates';
import { DHF_GROUPS, groupColorForLabel } from '../dhf/dhf-groups';
import { NewDocumentWizard, type NewDocSpec } from '../dhf/NewDocumentWizard';
import { isFeatureEnabled } from '../config/feature-flags';
import { diagramUrl } from '../router';

const ScenarioExplorer = lazy(() => import('../views/ScenarioEditor').then(module => ({ default: module.ScenarioEditor })));

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

/** Standard collapse-all glyph for explorer trees; avoids the ambiguous ⇱ text symbol. */
function CollapseAllIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3h4v4M13 3H9v4M3 13h4V9M13 13H9V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 7 4 4M9 7l3-3M7 9l-3 3M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    /** Qualified name of the package the menu was opened on. */
    packageName?: string;
    kind?: string;
    type: 'element' | 'folder' | 'kind' | 'group';
}

/**
 * Say what a containment change did, and what it did not.
 *
 * These writes edit one declaration; they do not update the qualified names
 * that refer to it, because that needs cross-file name resolution MEMO does not
 * have yet. Swallowing that warning would present a model with dangling
 * references as a clean rename.
 */
async function reportPackageResult(pending: Promise<PackageMutationResult>): Promise<void> {
    try {
        const result = await pending;
        if (!result.success) {
            window.alert(result.error ?? 'The containment change was refused.');
            return;
        }
        for (const warning of result.warnings ?? []) window.alert(warning.message);
    } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
    }
}

function ChangeTypeModal({ elementId, currentKind, onClose }: { elementId: string; currentKind: string; onClose: () => void }) {
    const updateElementKind = useModelStore(s => s.updateElementKind);
    const model = useModelStore(s => s.model);
    const [selected, setSelected] = useState(currentKind);
    const ref = useRef<HTMLDivElement>(null);
    const ontologyKinds = useMemo(
        () => (model?.registries?.kinds ?? [])
            .filter(kind => !kind.isAbstract)
            .map(kind => kind.name)
            .sort((a, b) => a.localeCompare(b)),
        [model],
    );

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
                {ontologyKinds.map(k => (
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
    const moveElementToPackage = useModelStore(s => s.moveElementToPackage);
    const createPackage = useModelStore(s => s.createPackage);
    const renamePackage = useModelStore(s => s.renamePackage);
    const deletePackage = useModelStore(s => s.deletePackage);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);
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
        // Canonical types are supplied by MEMO at runtime. The old static
        // display palette is deliberately not an ontology validator: it would
        // mislabel valid derived types such as User and HardwareAssembly.
        const isUndefinedKind = !(model.registries?.kinds ?? []).some(kind => kind.name === el.kind);
        actions = [
            { label: 'View details', action: () => selectElement(el.id) },
            {
                label: 'Move to package…',
                action: () => {
                    const target = window.prompt(
                        'Move to which package? (qualified name, e.g. Plant::Hydraulics)', el.package || '');
                    if (target !== null) void reportPackageResult(moveElementToPackage(el.id, target.trim()));
                }
            },
            { label: 'Copy ID', action: () => navigator.clipboard?.writeText(el.id) },
            {
                label: 'Delete element…',
                danger: true,
                action: () => {
                    if (!window.confirm(`Delete “${el.name}”?\n\nAll incoming and outgoing relationships will also be deleted. This cannot be undone.`)) return;
                    void deleteModelElement(el.id).then(result => {
                        if (!result.success) window.alert(result.error ?? 'The element could not be deleted.');
                    });
                },
            },
            ...(isUndefinedKind ? [{
                label: '⚠ Change Type…',
                action: () => setShowChangeType({ elementId: el.id, currentKind: el.kind }),
            }] : []),
        ];
    } else if (menu.type === 'folder' && menu.packageName && menu.kind) {
        const packageName = menu.packageName;
        title = `Package: ${packageName.split('::').pop()}`;
        actions = [
            {
                label: 'Add Element here',
                action: () => {
                    const name = window.prompt('Enter element name:');
                    if (name) addElement(menu.kind!, name, packageName);
                }
            },
            {
                label: 'New Package…',
                action: () => {
                    const name = window.prompt('Enter package name:');
                    if (name) void reportPackageResult(createPackage(name.trim(), packageName));
                }
            },
            {
                label: 'Rename Package…',
                action: () => {
                    const name = window.prompt('Enter new package name:', packageName.split('::').pop() ?? '');
                    if (name) void reportPackageResult(renamePackage(packageName, name.trim()));
                }
            },
            {
                label: 'Delete Package (keep contents)',
                danger: true,
                action: () => {
                    if (window.confirm(
                        `Remove the package "${packageName}"?\n\n`
                        + 'Everything it declares moves into the enclosing package. Qualified names that '
                        + 'refer to it will need updating by hand.')) {
                        void reportPackageResult(deletePackage(packageName));
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
                label: 'New Package…',
                action: () => {
                    const name = window.prompt('Enter package name:');
                    if (name) void reportPackageResult(createPackage(name.trim()));
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
    /** `f:<qualified name>` for a package, the element id for an element. */
    id: string;
    name: string;
    type: 'folder' | 'element';
    children: TreeNode[];
    element?: MemoElement;
}

/**
 * The containment tree, built from package membership.
 *
 * A container here is a SysML package — the model's own containment axis — so
 * the tree shows what the source says rather than a grouping the client
 * invented. `packages` is passed separately from the elements because a package
 * that declares nothing is still a package, and deriving the branches from
 * membership alone would hide every empty one.
 */
export function buildTree(elements: MemoElement[], packages: { qualifiedName: string }[] = []): TreeNode[] {
    const root: TreeNode[] = [];

    /** Walk to a package's node, creating the branch it sits on. */
    const branchFor = (qualifiedName: string): TreeNode[] => {
        let level = root;
        let path = '';
        for (const segment of qualifiedName.split('::').filter(Boolean)) {
            path = path ? `${path}::${segment}` : segment;
            const key = `f:${path}`;
            let node = level.find(child => child.id === key);
            if (!node) {
                node = { id: key, name: segment, type: 'folder', children: [] };
                level.push(node);
            }
            level = node.children;
        }
        return level;
    };

    // Declared packages first, so an empty one is a visible container rather
    // than a branch that only exists while something happens to sit in it.
    for (const pkg of packages) branchFor(pkg.qualifiedName);

    for (const el of [...elements].sort((a, b) => a.name.localeCompare(b.name))) {
        branchFor(el.package ?? '').push({
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

/**
 * Explorer content is semantic containment first, package containment second.
 *
 * Within one exact element type, a child declared inside another element belongs
 * below that owner even if both declarations happen to carry package names.
 * Roots without an owner are grouped by their SysML package path. This keeps a
 * functional decomposition readable as `SystemFunction → parent → child`, yet
 * still gives unowned functions a stable package home.
 */
export function buildOwnerThenPackageTree(elements: MemoElement[]): TreeNode[] {
    const nodes = new Map<string, TreeNode>();
    for (const element of elements) {
        nodes.set(element.id, {
            id: element.id,
            name: element.name,
            type: 'element',
            element,
            children: [],
        });
    }

    const roots: TreeNode[] = [];
    for (const node of nodes.values()) {
        const owner = node.element?.owner ? nodes.get(node.element.owner) : undefined;
        if (owner) owner.children.push(node);
        else roots.push(node);
    }

    const tree: TreeNode[] = [];
    const branchFor = (qualifiedName: string): TreeNode[] => {
        let level = tree;
        let path = '';
        for (const segment of qualifiedName.split('::').filter(Boolean)) {
            path = path ? `${path}::${segment}` : segment;
            const id = `f:${path}`;
            let folder = level.find(node => node.id === id);
            if (!folder) {
                folder = { id, name: segment, type: 'folder', children: [] };
                level.push(folder);
            }
            level = folder.children;
        }
        return level;
    };

    for (const root of roots) {
        branchFor(root.element?.package ?? '').push(root);
    }

    const sort = (nodesToSort: TreeNode[]) => {
        nodesToSort.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodesToSort.forEach(node => sort(node.children));
    };
    sort(tree);
    return tree;
}

/** Semantic ownership navigation for nested part and port usages. */
export function buildOwnershipTree(elements: MemoElement[]): TreeNode[] {
    if (!elements.some(element => Boolean(element.owner))) return [];
    const nodes = new Map<string, TreeNode>();
    for (const element of elements) {
        if (element.construct !== 'part' && element.construct !== 'port') continue;
        nodes.set(element.id, { id: element.id, name: element.name, type: 'element', element, children: [] });
    }
    const roots: TreeNode[] = [];
    for (const node of nodes.values()) {
        const owner = node.element?.owner;
        const parent = owner ? nodes.get(owner) : undefined;
        if (parent) parent.children.push(node);
        else roots.push(node);
    }
    const sort = (items: TreeNode[]) => {
        items.sort((a, b) => a.name.localeCompare(b.name));
        items.forEach(item => sort(item.children));
    };
    sort(roots);
    return roots;
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
                        <Fragment key={el.id}>
                        <div
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
                            <ExplorerElementIdentity element={el} selected={isSelected} />
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
                        {node.children.length > 0 && (
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
                        </Fragment>
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

function isDiagramOnlyElement(kind: string, sourceLayer: string, sourcePackage?: string): boolean {
    return kind.endsWith('View')
        || sourceLayer === 'viewpoints'
        || sourceLayer === 'views'
        || sourcePackage === 'viewpoints'
        || sourcePackage === 'views';
}

function isExplorerHiddenElement(kind: string, sourceLayer: string, sourcePackage?: string): boolean {
    return isDiagramOnlyElement(kind, sourceLayer, sourcePackage)
        // A generic item is not an activity-diagram node and is not a MEMO
        // architecture element until a project gives it an ontology kind.
        || kind === 'ItemDefinition';
}

/**
 * Native SysML activity notation is recognized by the generated SysML
 * metamodel, not by a MEMO ontology declaration. Keep it visible as diagram
 * content without calling it an undefined model kind.
 */
function isNativeSysmlDiagramElement(
    element: MemoElement,
    registryKinds: KindDefinitionDTO[],
    registryKindNames: ReadonlySet<string>,
): boolean {
    return !registryKindNames.has(element.kind)
        && activityNodeType(element, { kinds: registryKinds, relationships: [] }) !== undefined;
}

/** Build ordered layer groups from the currently selected ontology packages. */
function buildLayerGroupsFromRegistry(
    registryKinds: KindDefinitionDTO[],
    availableOntologies: OntologyPackageInfo[],
): LayerGroup[] {
    const layerMap = new Map<string, LayerGroup>();
    const metadata = new Map<string, { label: string; color: string }>();
    for (const pkg of availableOntologies) {
        for (const layer of pkg.layers) {
            if (!metadata.has(layer.id)) metadata.set(layer.id, layer);
        }
    }

    for (const kind of registryKinds) {
        const id = kind.namespace?.[0] ?? kind.layer;
        if (!id || id === 'unknown') continue;
        let group = layerMap.get(id);
        if (!group) {
            const display = metadata.get(id);
            group = {
                id,
                label: display?.label ?? subGroupLabel(id),
                color: display?.color ?? (LAYER_COLORS as Record<string, string>)[id] ?? '#6B7280',
                kinds: [],
            };
            layerMap.set(id, group);
        }
        if (!group.kinds.includes(kind.name)) group.kinds.push(kind.name);
    }
    return [...layerMap.values()];
}

/** Build kind-name → source-area map from the ontology registry. */
function buildKindToLayerIdMap(
    registryKinds: KindDefinitionDTO[],
): Record<string, string> {
    const map: Record<string, string> = {};
    for (const kind of registryKinds) {
        map[kind.name] = kind.namespace?.[0] ?? kind.layer;
    }
    return map;
}

/**
 * Build kind-name → namespace sub-group map from selected ontology packages
 * (e.g. Hazard → "risk" from architecture/risk/). Kinds declared directly
 * under a layer directory carry no sub-group.
 */
function buildKindToSubGroupMap(
    registryKinds: KindDefinitionDTO[],
): Record<string, string | undefined> {
    const map: Record<string, string | undefined> = {};
    for (const kind of registryKinds) {
        map[kind.name] = kind.namespace?.[1];
    }
    return map;
}

function subGroupLabel(id: string): string {
    return id
        .split(/[_-]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function kindFolderLabel(kind: string, count: number): string {
    const labels: Record<string, string> = {
        StateMachine: 'State Machine',
        ModeState: 'Mode State',
        BehaviorProperty: 'Behavioral Constraint',
        AssumeProperty: 'Assumption',
        GuaranteeProperty: 'Guarantee',
    };
    if (labels[kind]) return count === 1 ? labels[kind] : labels[kind] + 's';
    const singular = kind.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    if (count === 1 || /(?:ss|Data|Status)$/i.test(singular)) return singular;
    return singular.endsWith('s') ? singular : singular + 's';
}

/** One namespace sub-group inside a layer group (e.g. Risk inside Architecture). */
export interface ExplorerSubGroup {
    /** Sub-group id ('' for kinds sitting directly under the layer). */
    id: string;
    label: string;
    color: string;
    kinds: Map<string, TreeNode[]>;
}

const ARTIFACT_CATEGORIES = ['documents', 'assets', 'templates', 'analyses', 'adrs', 'reviews'] as const;

/** Stable user-facing artifact branch, independent of ontology source folders. */
export function artifactCategory(kind: string, superType?: string): typeof ARTIFACT_CATEGORIES[number] {
    const type = `${kind} ${superType ?? ''}`.toLowerCase();
    if (/(review|approval)/.test(type)) return 'reviews';
    if (/(adr|decision)/.test(type)) return 'adrs';
    if (/(template|pattern)/.test(type)) return 'templates';
    if (/(analysis|notebook|worksheet|matrix)/.test(type)) return 'analyses';
    if (/(asset|capture|image|media|file)/.test(type)) return 'assets';
    return 'documents';
}

/**
 * Group model elements by ontology layer, then by namespace sub-group, for
 * the Model Explorer tree (e.g. Architecture → Risk → Hazard → elements).
 * Recognized native SysML activity notation is grouped separately as diagram
 * content. Elements whose kind is neither native notation nor declared by a
 * selected ontology land in "Undefined — Not in Ontology".
 * Exported for tests.
 */
export function computeExplorerGroupTree(
    elements: MemoElement[],
    searchTerm: string,
    registryKinds: KindDefinitionDTO[],
    availableOntologies: OntologyPackageInfo[],
    _declaredPackages: { qualifiedName: string }[] = [],
    kindFilter?: ReadonlySet<string>,
): { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] {
    const lower = searchTerm.toLowerCase();

    const NON_ELEMENT_LAYERS = new Set(['views', 'viewpoints', 'manifest']);
    const kindToLayerId = buildKindToLayerIdMap(registryKinds);
    const kindToSubGroup = buildKindToSubGroupMap(registryKinds);
    const layerGroups = buildLayerGroupsFromRegistry(registryKinds, availableOntologies)
        .filter(lg => !NON_ELEMENT_LAYERS.has(lg.id));
    const knownLayerIds = new Set(layerGroups.map(lg => lg.id));

    const validElements = new Map<string, MemoElement>();
    for (const el of elements) {
        if (kindFilter && !kindFilter.has(el.kind)) continue;
        const sourceLayer = kindToLayerId[el.kind] ?? el.layer;
        const sourcePackage = kindToSubGroup[el.kind];
        if (isExplorerHiddenElement(el.kind, sourceLayer, sourcePackage)) continue;
        if (lower && !el.name.toLowerCase().includes(lower) && !el.kind.toLowerCase().includes(lower)) continue;
        validElements.set(el.id, el);
    }

    const nodes = new Map<string, TreeNode>();
    for (const el of validElements.values()) {
        nodes.set(el.id, {
            id: el.id,
            name: el.name,
            type: 'element',
            element: el,
            children: [],
        });
    }

    const roots: TreeNode[] = [];
    for (const node of nodes.values()) {
        const ownerId = node.element?.owner;
        const owner = ownerId ? nodes.get(ownerId) : undefined;
        if (owner) {
            owner.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortNodes = (nodesToSort: TreeNode[]) => {
        nodesToSort.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodesToSort.forEach(node => sortNodes(node.children));
    };
    for (const node of nodes.values()) {
        sortNodes(node.children);
    }

    const toSubGroups = (rootsList: TreeNode[], groupColor: string, layerId?: string): ExplorerSubGroup[] => {
        const pooled = new Map<string, Map<string, TreeNode[]>>();
        for (const root of rootsList) {
            const kind = root.element!.kind;
            const sub = layerId === 'artifacts'
                ? artifactCategory(kind, registryKinds.find(definition => definition.name === kind)?.superType)
                : (kindToSubGroup[kind] ?? '');
            
            const isBaseOntologyKind = availableOntologies.some(pkg => 
                pkg.layers.some(l => l.kinds.some(k => k.name === kind))
            );
            
            let resolveKind = kind;
            while (true) {
                const def = registryKinds.find(definition => definition.name === resolveKind);
                if (!def) break;
                
                const ns = def.namespace?.[0] ?? def.layer;
                const isFoundational = ns && availableOntologies.some(pkg => 
                    pkg.layers.some(l => l.id === ns)
                );
                
                // If this kind belongs to a foundational ontology layer, stop here
                if (isFoundational) break;
                
                // Also explicitly check if it was declared directly in availableOntologies
                const isExplicitlyBase = availableOntologies.some(pkg => 
                    pkg.layers.some(l => l.kinds.some(k => k.name === resolveKind))
                );
                if (isExplicitlyBase) break;
                
                if (def.superType) {
                    resolveKind = def.superType;
                } else {
                    break;
                }
            }
            
            const typeFolder = resolveKind;
            if (!pooled.has(sub)) pooled.set(sub, new Map());
            const folders = pooled.get(sub)!;
            folders.set(typeFolder, [...(folders.get(typeFolder) ?? []), root]);
        }
        
        const buckets = new Map<string, Map<string, TreeNode[]>>();
        for (const [sub, folders] of pooled.entries()) {
            const subBuckets = new Map<string, TreeNode[]>();
            for (const [folder, folderRoots] of folders.entries()) {
                const tree: TreeNode[] = [];
                for (const root of folderRoots) {
                    tree.push(root);
                }
                sortNodes(tree);
                subBuckets.set(folder, tree);
            }
            buckets.set(sub, subBuckets);
        }

        return [...buckets.entries()]
            .sort(([a], [b]) => layerId === 'artifacts'
                ? ARTIFACT_CATEGORIES.indexOf(a as any) - ARTIFACT_CATEGORIES.indexOf(b as any)
                : a.localeCompare(b))
            .map(([id, kinds]) => ({
                id,
                label: id ? subGroupLabel(id) : '',
                color: id ? ((LAYER_COLORS as Record<string, string>)[id] ?? groupColor) : groupColor,
                kinds,
            }));
    };

    const groups: { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] = [];

    for (const lg of layerGroups) {
        const layerRoots: TreeNode[] = [];
        for (const root of roots) {
            const el = root.element!;
            const layerId = kindToLayerId[el.kind];
            if (!layerId || layerId !== lg.id) continue;
            layerRoots.push(root);
        }
        if (layerRoots.length > 0) {
            groups.push({ group: lg, subGroups: toSubGroups(layerRoots, lg.color, lg.id) });
        }
    }

    const standardDiagramRoots: TreeNode[] = [];
    const uncategorizedRoots: TreeNode[] = [];

    const registryKindNames = new Set(registryKinds.map(kind => kind.name));

    for (const root of roots) {
        const el = root.element!;
        const layerId = kindToLayerId[el.kind];
        
        if (layerId && knownLayerIds.has(layerId)) continue;
        if (layerId && NON_ELEMENT_LAYERS.has(layerId)) continue;
        
        if (isNativeSysmlDiagramElement(el, registryKinds, registryKindNames)) {
            standardDiagramRoots.push(root);
        } else {
            uncategorizedRoots.push(root);
        }
    }

    if (standardDiagramRoots.length > 0) {
        const standardColor = '#64748B';
        groups.push({
            group: {
                id: 'standard-sysml-diagram-elements',
                label: 'Other — SysML Diagram Elements',
                color: standardColor,
                kinds: [],
            },
            subGroups: toSubGroups(standardDiagramRoots, standardColor).map(sg => ({ ...sg, id: 'diagram-elements', label: 'Diagram Elements' })),
        });
    }

    if (uncategorizedRoots.length > 0) {
        const undefColor = '#F59E0B';
        groups.push({
            group: { id: 'undefined', label: 'Undefined — Not in Ontology', color: undefColor, kinds: [] },
            subGroups: toSubGroups(uncategorizedRoots, undefColor).map(sg => ({ ...sg, id: 'undefined-elements', label: 'Elements' })),
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
    const moveElementToPackage = useModelStore(s => s.moveElementToPackage);
    const movePackage = useModelStore(s => s.movePackage);
    const validation = useModelStore(s => s.validation);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setSelectedOntologyKind = useModelStore(s => s.setSelectedOntologyKind);
    const registryKinds = model?.registries?.kinds ?? [];

    const selectElementAndNavigate = useCallback((id: string) => {
        selectElement(id);
        setActiveView({ type: 'element-detail', elementId: id });
    }, [selectElement, setActiveView]);

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const initializedTypeBranches = useRef(false);
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
    const [dragging, setDragging] = useState<{ id: string; kind: string } | null>(null);
    const [kindFilter, setKindFilter] = useState<Set<string>>(new Set());

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
            packageName: type === 'folder' ? id.replace('f:', '') : undefined,
            kind: kind || (type === 'kind' ? id.replace('k:', '').split(':').pop() : undefined),
        });
    }, []);

    // Build the tree from the ontology registry and its source namespaces.
    const groupTree = useMemo(
        () => model ? computeExplorerGroupTree(
            Object.values(model.elements),
            searchTerm,
            model.registries?.kinds ?? [],
            availableOntologies,
            model.packages ?? [],
            kindFilter.size ? kindFilter : undefined,
        ) : [],
        [model, searchTerm, availableOntologies, kindFilter],
    );

    // Keep the broad layer/group branches user-controlled, but open every
    // exact type branch once. This makes the next level — the owning SysML
    // package hierarchy — visible as soon as a user opens Functional (or any
    // other group), instead of requiring a second click on every type.
    useEffect(() => {
        if (initializedTypeBranches.current || groupTree.length === 0) return;
        const typeBranches = new Set<string>();
        for (const { group, subGroups } of groupTree) {
            for (const sub of subGroups) {
                for (const kind of sub.kinds.keys()) {
                    typeBranches.add(`k:${group.id}:${sub.id ? `${sub.id}:` : ''}${kind}`);
                }
            }
        }
        initializedTypeBranches.current = true;
        setExpanded(typeBranches);
    }, [groupTree]);

    useEffect(() => {
        const expandSearchResults = () => {
            if (!searchTerm.trim()) return;
            const next = new Set<string>();
            for (const { group, subGroups } of groupTree) {
                next.add(`g:${group.id}`);
                for (const sub of subGroups) {
                    if (sub.id) next.add(`sg:${group.id}:${sub.id}`);
                    for (const kind of sub.kinds.keys()) next.add(`k:${group.id}:${sub.id ? `${sub.id}:` : ''}${kind}`);
                }
            }
            setExpanded(next);
        };
        const collapseTree = () => setExpanded(new Set());
        window.addEventListener('memo:expand-explorer-search', expandSearchResults);
        window.addEventListener('memo:collapse-explorer-tree', collapseTree);
        return () => {
            window.removeEventListener('memo:expand-explorer-search', expandSearchResults);
            window.removeEventListener('memo:collapse-explorer-tree', collapseTree);
        };
    }, [groupTree, searchTerm]);

    // ─── DnD Handlers ───

    const handleDragStart = useCallback((e: React.DragEvent, node: TreeNode, kind: string) => {
        setDragging({ id: node.id, kind });
        e.dataTransfer.setData('application/memo-node', JSON.stringify({
            id: node.id,
            type: node.type,
            kind: kind,
            name: node.name,
            elementId: node.element?.id,
            packageName: node.type === 'folder' ? node.id.replace('f:', '') : undefined
        }));
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, targetKind: string) => {
        if (dragging?.kind === targetKind) {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'move';
        }
    }, [dragging]);

    const handleDrop = useCallback((e: React.DragEvent, targetPackage: string, targetKind: string) => {
        e.preventDefault();
        setDragging(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/memo-node'));
            if (data.kind !== targetKind) return;

            // A drop is a containment change, so it is the same server write the
            // context menu makes — the tree updates when the model does.
            if (data.type === 'element') {
                void reportPackageResult(moveElementToPackage(data.elementId, targetPackage));
            } else if (data.type === 'folder') {
                if (targetPackage === data.packageName || targetPackage.startsWith(`${data.packageName}::`)) return;
                void reportPackageResult(movePackage(data.packageName, targetPackage));
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    }, [moveElementToPackage, movePackage]);

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
            <details className="px-3 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${COLOR.border}`, fontSize: FONT.xs }}>
                <summary style={{ cursor: 'pointer', color: COLOR.secondary }}>Filter element types{kindFilter.size ? ` (${kindFilter.size})` : ''}</summary>
                <div className="mt-1 max-h-32 overflow-y-auto">
                    <button onClick={() => setKindFilter(new Set())} style={{ color: COLOR.accent, fontSize: FONT.xs }}>Show all</button>
                    {registryKinds.filter(kind => !kind.isAbstract).sort((a, b) => a.name.localeCompare(b.name)).map(kind => (
                        <label key={kind.name} className="flex items-center gap-1 py-0.5">
                            <input type="checkbox" checked={!kindFilter.size || kindFilter.has(kind.name)} onChange={() => setKindFilter(current => {
                                const next = current.size ? new Set(current) : new Set(registryKinds.filter(def => !def.isAbstract).map(def => def.name));
                                if (next.has(kind.name)) next.delete(kind.name); else next.add(kind.name);
                                return next;
                            })} />
                            {kind.label || kind.name}
                        </label>
                    ))}
                </div>
            </details>
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
                                const hasOntologyKind = registryKinds.some(definition => definition.name === kind);

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
                                            className="group flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
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
                                                {kindFolderLabel(kind, kindElementIds.length)}
                                                {isUndefinedGroup && <span style={{ color: '#F59E0B', marginLeft: '4px' }}>·</span>}
                                            </span>
                                            {/* Context actions expand to the left on hover; the count stays aligned right. */}
                                            <div className="flex max-w-0 items-center gap-1 overflow-hidden opacity-0 invisible pointer-events-none transition-all duration-150 group-hover:max-w-[4.5rem] group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto">
                                                <button
                                                    onClick={e => { e.stopPropagation(); selectAllElements(kindElementIds); }}
                                                    title="Select all elements of this type"
                                                    aria-label="Select all elements of this type"
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-slate-100"
                                                    style={{ color: COLOR.faint, fontSize: '17px' }}
                                                >☑</button>
                                                {hasOntologyKind && isFeatureEnabled('ontology') && (
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
                                                        title="View type in Ontology"
                                                        aria-label="View type in Ontology"
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-slate-100"
                                                        style={{ color: COLOR.faint, fontSize: '17px' }}
                                                    >⬡</button>
                                                )}
                                            </div>
                                            <ExplorerCountBadge
                                                count={kindElementIds.length}
                                                color={layerColor}
                                                title={`${kindElementIds.length} ${kindElementIds.length === 1 ? 'element' : 'elements'}`}
                                            />
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
    const viewMeta = diagram.viewKind ? VIEW_KIND_META[diagram.viewKind as ViewKind] : undefined;
    if (viewMeta) {
        return (
            <span className="px-1.5 py-0.5 rounded font-semibold"
                style={{ background: viewMeta.color + '20', color: viewMeta.color, fontSize: FONT.badge }}
                title={viewMeta.fullName}
            >
                {viewMeta.label}
            </span>
        );
    }
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
            <div className="font-semibold mb-3" style={{ color: COLOR.primary, fontSize: '13px' }}>New Model View</div>
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

/**
 * Buckets the view deriver invents for views it cannot file under a real
 * viewpoint: `__unassigned` for a missing viewpointDefinition binding,
 * `__model` for renderer samples. Neither is authored in the model, so neither
 * is shown as a viewpoint — both land in Uncategorized.
 */
const SYNTHETIC_VIEWPOINT_IDS = new Set(['__unassigned', '__model']);

/** Expansion key for the Uncategorized section; shared with the /diagrams page. */
export const UNCATEGORIZED_ID = '__uncategorized';

/**
 * Order viewpoints by their authored MEMO V-model placement. Architecture is
 * read top-to-bottom, followed by the left-to-right assurance disciplines.
 * Viewpoints outside those lanes remain alphabetic rather than receiving a
 * UI-invented place in the ontology.
 */
export function sortViewpointsByOntologyLayer(viewpoints: ViewpointDTO[]): ViewpointDTO[] {
    const laneRank = (viewpoint: ViewpointDTO) =>
        viewpoint.explorerLane === 'architecture' ? 0
            : viewpoint.explorerLane === 'assurance' ? 1
                : 2;
    return viewpoints.slice().sort((a, b) => {
        const laneDifference = laneRank(a) - laneRank(b);
        if (laneDifference !== 0) return laneDifference;
        if (laneRank(a) < 2) {
            const orderDifference = (a.explorerOrder ?? Number.MAX_SAFE_INTEGER)
                - (b.explorerOrder ?? Number.MAX_SAFE_INTEGER);
            if (orderDifference !== 0) return orderDifference;
        }
        return a.label.localeCompare(b.label);
    });
}

/**
 * Drop the leading word every viewpoint label shares.
 *
 * Inside one product's model the system name is on every label ("Pump
 * Cybersecurity Viewpoint", "Pump Functional Viewpoint", …) where it
 * distinguishes nothing and costs the width that the actual subject needs. A
 * prefix only counts as noise when *all* of them carry it, so a model with a
 * genuine "Pump …" viewpoint alongside others is left alone.
 */
export function stripSharedLabelPrefix(labels: string[]): string[] {
    if (labels.length < 2) return labels;
    const first = labels[0].split(' ');
    if (first.length < 2) return labels;
    const prefix = first[0];
    const shared = labels.every(l => {
        const words = l.split(' ');
        return words.length > 1 && words[0] === prefix;
    });
    return shared ? labels.map(l => l.slice(prefix.length + 1)) : labels;
}

/**
 * Split the model's views into the viewpoints that claim them and everything
 * left over.
 *
 * Uncategorized is computed by subtraction, not by looking for the synthetic
 * ids: a view whose viewpointId resolves to no viewpoint at all is just as
 * unfiled as one with no binding, and must not disappear from the tree.
 */
export function partitionViewsByViewpoint(model: MemoModelDTO | null): {
    viewpoints: ViewpointDTO[];
    uncategorized: DiagramDTO[];
} {
    const viewpoints = sortViewpointsByOntologyLayer(
        (model?.viewpoints ?? []).filter(vp => !SYNTHETIC_VIEWPOINT_IDS.has(vp.id)),
    );

    const claimed = new Set<string>();
    for (const vp of viewpoints) {
        for (const diagram of getDiagramsForViewpoint(model, vp.id)) claimed.add(diagram.id);
    }
    return {
        viewpoints,
        uncategorized: (model?.diagrams ?? []).filter(diagram => !claimed.has(diagram.id)),
    };
}

interface ViewPackageNode {
    id: string;
    name: string;
    children: ViewPackageNode[];
    diagrams: DiagramDTO[];
}
type PackagedDiagram = DiagramDTO & { package?: string };

/** Build Viewpoints navigation from SysML package ownership, never file paths. */
export function buildViewPackageTree(diagrams: PackagedDiagram[]): ViewPackageNode[] {
    const root: ViewPackageNode[] = [];
    for (const diagram of diagrams) {
        let level = root;
        let path = '';
        let owner: ViewPackageNode | undefined;
        for (const segment of (diagram.package ?? '').split('::').filter(Boolean)) {
            path = path ? `${path}::${segment}` : segment;
            let node = level.find(candidate => candidate.id === path);
            if (!node) {
                node = { id: path, name: segment, children: [], diagrams: [] };
                level.push(node);
            }
            owner = node;
            level = node.children;
        }
        if (level === root) {
            // A view without a package remains reachable but is never assigned
            // a path based on the source file.
            let node = root.find(candidate => candidate.id === '__unpackaged');
            if (!node) {
                node = { id: '__unpackaged', name: 'No owning package', children: [], diagrams: [] };
                root.push(node);
            }
            node.diagrams.push(diagram);
        } else owner!.diagrams.push(diagram);
    }
    const sort = (nodes: ViewPackageNode[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
        nodes.forEach(node => { node.diagrams.sort((a, b) => a.name.localeCompare(b.name)); sort(node.children); });
    };
    sort(root);
    return root;
}

function ViewExplorerContent({ searchTerm }: { searchTerm: string }) {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const deleteDiagram = useModelStore(s => s.deleteDiagram);
    const createPackage = useModelStore(s => s.createPackage);
    const navigate = useNavigate();

    // Viewpoint folders start collapsed, including Uncategorized: a project can
    // contain many views and the Explorer should first present the hierarchy.
    const [expandedVps, setExpandedVps] = useState<Set<string>>(new Set());
    const [newDiagramVp, setNewDiagramVp] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedVps(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Views are organised by the viewpoint they conform to. `__unassigned` and
    // `__model` are synthetic buckets the deriver produces for views with no
    // viewpoint binding and for renderer samples — neither is a real viewpoint,
    // so both are folded into a single Uncategorized section rendered last.
    const { viewpoints, uncategorized: uncategorizedDiagrams } = useMemo(
        () => partitionViewsByViewpoint(model),
        [model],
    );
    // Display labels only — vp.label stays the authored title everywhere else.
    const viewpointLabels = useMemo(
        () => stripSharedLabelPrefix(viewpoints.map(vp => vp.label)),
        [viewpoints],
    );

    const filterDiagrams = (diagrams: DiagramDTO[]): DiagramDTO[] => {
        if (!searchTerm) return diagrams;
        const lower = searchTerm.toLowerCase();
        return diagrams.filter(d =>
            d.name.toLowerCase().includes(lower) ||
            d.diagramType.toLowerCase().includes(lower)
        );
    };

    const selectedDiagramId = activeView.type === 'diagram' ? activeView.diagramId : null;

    // Keep the explorer consistent with the Viewpoints landing page: every
    // unbound view still needs a visible route to open it.
    const uncategorizedViews = filterDiagrams(uncategorizedDiagrams);

    /** Fallback clubbing for uncategorized views, which have no authored group. */
    const uncategorizedByLayer = useMemo(() => {
        const groups = new Map<string, DiagramDTO[]>();
        for (const diagram of uncategorizedViews) {
            const layers = (diagram.elementIds ?? [])
                .map(id => model?.elements[id]?.layer)
                .filter((layer): layer is string => Boolean(layer));
            const layer = [...layers].sort((a, b) => {
                const aIndex = LAYER_ORDER.indexOf(a as typeof LAYER_ORDER[number]);
                const bIndex = LAYER_ORDER.indexOf(b as typeof LAYER_ORDER[number]);
                return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
            })[0] ?? 'other';
            groups.set(layer, [...(groups.get(layer) ?? []), diagram]);
        }
        return [...groups.entries()].sort(([a], [b]) => {
            const aIndex = LAYER_ORDER.indexOf(a as typeof LAYER_ORDER[number]);
            const bIndex = LAYER_ORDER.indexOf(b as typeof LAYER_ORDER[number]);
            return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
        });
    }, [uncategorizedViews, model?.elements]);

    const renderDiagramList = (diagrams: DiagramDTO[], vpId: string) => (
        diagrams.map(diag => (
            <DiagramRow
                key={diag.id}
                diag={diag}
                isSelected={selectedDiagramId === diag.id}
                onSelect={() => {
                    setActiveView({ type: 'diagram', diagramId: diag.id });
                    selectViewpoint(vpId === '__model' ? null : vpId);
                    navigate(diagramUrl(diag.diagramType, diag.shortId ?? diag.id));
                }}
                onDelete={!diag.auto ? () => deleteDiagram(diag.id) : undefined}
            />
        ))
    );

    const renderGroupedDiagramList = (diagrams: DiagramDTO[], vpId: string) => {
        const packageTree = buildViewPackageTree(diagrams);
        const renderPackage = (node: ViewPackageNode, depth = 0): React.ReactNode => (
            <div key={node.id} style={{ marginLeft: depth ? '12px' : 0 }}>
                <div className="px-2 py-1 font-semibold" style={{ color: COLOR.muted, fontSize: FONT.xs }}>
                    {node.name}
                </div>
                <div style={{ marginLeft: '8px' }}>{renderDiagramList(node.diagrams, vpId)}</div>
                {node.children.map(child => renderPackage(child, depth + 1))}
            </div>
        );
        if (diagrams.some(diagram => (diagram as PackagedDiagram).package)) return packageTree.map(node => renderPackage(node));
        const groupOf = (diagram: DiagramDTO) => (diagram as DiagramDTO & { group?: string }).group;
        if (!diagrams.some(diagram => groupOf(diagram))) return renderDiagramList(diagrams, vpId);
        const groups = new Map<string, DiagramDTO[]>();
        for (const diagram of diagrams) {
            const group = groupOf(diagram) || 'Other';
            groups.set(group, [...(groups.get(group) ?? []), diagram]);
        }
        return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => (
            <div key={group} style={{ margin: '5px 4px 2px' }}>
                <div className="px-2 py-1 font-semibold" style={{ color: COLOR.muted, fontSize: FONT.xs }}>
                    {group}
                </div>
                <div style={{ marginLeft: '8px' }}>{renderDiagramList(items, vpId)}</div>
            </div>
        ));
    };

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {/* Named viewpoints — the primary organisation */}
            {viewpoints.map((vp, vpIndex) => {
                const isExpanded = expandedVps.has(vp.id);
                const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || COLOR.muted) : COLOR.muted;
                const allDiagrams = getDiagramsForViewpoint(model, vp.id);
                const displayedDiags = filterDiagrams(allDiagrams);

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
                            <span className="font-semibold flex-1 truncate" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>{viewpointLabels[vpIndex]}</span>
                            <ExplorerCountBadge count={allDiagrams.length} color={vpColor} title={`${allDiagrams.length} views`} />
                        </div>
                        {isExpanded && (
                            <div style={{ marginLeft: '16px' }}>
                                {renderGroupedDiagramList(displayedDiags, vp.id)}
                                <button
                                    className="flex items-center gap-1 px-2 py-1 w-full text-left"
                                    style={{ borderRadius: '4px', margin: '2px 4px', color: COLOR.accent, fontSize: FONT.xs, background: 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.background = COLOR.accent + '12'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => setNewDiagramVp(vp.id)}
                                >
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New View
                                </button>
                                <button
                                    className="flex items-center gap-1 px-2 py-1 w-full text-left"
                                    style={{ borderRadius: '4px', margin: '2px 4px', color: COLOR.accent, fontSize: FONT.xs, background: 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.background = COLOR.accent + '12'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => {
                                        const name = window.prompt('New SysML package name');
                                        if (name?.trim()) void reportPackageResult(createPackage(name.trim()));
                                    }}
                                >
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Package
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Everything no viewpoint claims appears last, so every card on
                the landing page is reachable from this tree as well. */}
            {uncategorizedViews.length > 0 && <div className="mb-0.5">
                <div
                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                    style={{ borderRadius: '4px', margin: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { selectViewpoint(null); toggleExpand(UNCATEGORIZED_ID); }}
                >
                    <ChevronIcon expanded={expandedVps.has(UNCATEGORIZED_ID)} size={14} color={COLOR.muted} />
                    <FolderIcon open={expandedVps.has(UNCATEGORIZED_ID)} color={COLOR.muted} />
                    <span className="font-semibold flex-1" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>Uncategorized</span>
                    <span
                        title="These views conform to no authored viewpoint. Bind an authored view with viewpointDefinition to file it."
                        style={{ color: COLOR.faint, fontSize: FONT.badge }}
                    >
                        no viewpoint
                    </span>
                    <ExplorerCountBadge count={uncategorizedViews.length} color={COLOR.muted} title={`${uncategorizedViews.length} views`} />
                </div>
                {expandedVps.has(UNCATEGORIZED_ID) && (
                    <div style={{ marginLeft: '16px' }}>
                        {uncategorizedViews.some(d => (d as DiagramDTO & { group?: string }).group)
                            ? renderGroupedDiagramList(uncategorizedViews, UNCATEGORIZED_ID)
                            : uncategorizedByLayer.map(([layer, diagrams]) => (
                                <div key={layer} style={{ margin: '5px 4px 2px' }}>
                                    <div className="px-2 py-1 font-semibold" style={{
                                        color: LAYER_COLORS[layer] ?? COLOR.muted, fontSize: FONT.xs,
                                        borderLeft: `3px solid ${LAYER_COLORS[layer] ?? COLOR.border}`,
                                    }}>
                                        {LAYER_LABELS[layer] ?? `${layer.charAt(0).toUpperCase()}${layer.slice(1)}`}
                                    </div>
                                    <div style={{ marginLeft: '8px' }}>{renderDiagramList(diagrams, UNCATEGORIZED_ID)}</div>
                                </div>
                            ))}
                        <button
                            className="flex items-center gap-1 px-2 py-1 w-full text-left"
                            style={{ borderRadius: '4px', margin: '2px 4px', color: COLOR.accent, fontSize: FONT.xs, background: 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.background = COLOR.accent + '12'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => setNewDiagramVp('__model')}
                        >
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New View
                        </button>
                    </div>
                )}
            </div>}

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
            title={diag.description}
        >
            <DiagramTypeBadge diagram={diag} />
            {diag.auto && !diag.sourceFile && (
                <span className="px-1 py-0.5 rounded"
                    style={{ background: '#F0F0ED', color: COLOR.faint, fontSize: FONT.badge, fontWeight: 600 }}>
                    AUTO
                </span>
            )}
            <span className="flex-1" style={{ minWidth: 0 }}>
                <span className="truncate block" style={{ color: isSelected ? COLOR.accentDark : COLOR.primary }}>
                    <span style={{ color: COLOR.muted }}>[{diag.shortId ?? diag.id}] </span>{diag.name}
                </span>
            </span>
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
                        No documents yet. Use <strong>+ New Document</strong> to create one from a meMO template, a reusable project template, a new template, or a blank page.
                    </div>
                )}

                {/* The AI tools used to sit here as an embedded card. They now
                    live on the gated `✦ AI` nav mode — see views/AiWorkspace.tsx. */}
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

// ─── Main ExplorerPanel ──────────────────────────────────────────────────────

const EXPLORER_WIDTH_STORAGE_KEY = 'memo-explorer-width';
const EXPLORER_DEFAULT_WIDTH = 300;
const EXPLORER_MIN_WIDTH = 240;
const EXPLORER_MAX_WIDTH = 720;
/** Canvas space the Explorer must never eat into. */
const EXPLORER_CANVAS_RESERVE = 320;

/** Widest the Explorer may *render* right now, given the viewport. */
function explorerMaxWidth(): number {
    // innerWidth is 0 for a minimized/detached window; fall back to the absolute
    // maximum so a transient zero never collapses the panel to its minimum.
    if (typeof window === 'undefined' || !window.innerWidth) return EXPLORER_MAX_WIDTH;
    return Math.max(EXPLORER_MIN_WIDTH, Math.min(EXPLORER_MAX_WIDTH, window.innerWidth - EXPLORER_CANVAS_RESERVE));
}

/** Clamp a *preferred* width — viewport-independent, so a narrow window never destroys the preference. */
function clampExplorerWidth(width: number): number {
    if (!Number.isFinite(width)) return EXPLORER_DEFAULT_WIDTH;
    return Math.min(EXPLORER_MAX_WIDTH, Math.max(EXPLORER_MIN_WIDTH, width));
}

function savedExplorerWidth(): number {
    if (typeof window === 'undefined') return EXPLORER_DEFAULT_WIDTH;
    try {
        const saved = Number.parseInt(localStorage.getItem(EXPLORER_WIDTH_STORAGE_KEY) ?? '', 10);
        return Number.isFinite(saved) ? clampExplorerWidth(saved) : EXPLORER_DEFAULT_WIDTH;
    } catch {
        return EXPLORER_DEFAULT_WIDTH;
    }
}

export function ExplorerPanel() {
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const explorerTab = useModelStore(s => s.explorerTab);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const model = useModelStore(s => s.model);
    const activeMode = useModelStore(s => s.activeMode);
    const activeView = useModelStore(s => s.activeView);
    const viewpointDiagram = activeView.type === 'diagram'
        && model?.diagrams?.find(diagram => diagram.id === activeView.diagramId)?.viewpointId
        && model.diagrams.find(diagram => diagram.id === activeView.diagramId)?.viewpointId !== '__model';
    const explorerLabel = viewpointDiagram || activeMode === 'diagram' ? 'Viewpoints' : 'Model Explorer';
    // `preferredWidth` is what the user asked for and what we persist; `sidebarWidth`
    // is what fits on screen today. Keeping them apart means shrinking the window
    // (or a transient zero-width one) narrows the panel without losing the preference.
    const [preferredWidth, setPreferredWidth] = useState(savedExplorerWidth);
    const [maxWidth, setMaxWidth] = useState(explorerMaxWidth);
    const sidebarWidth = Math.min(preferredWidth, maxWidth);
    const resizeCleanupRef = useRef<(() => void) | null>(null);

    // User-driven changes clamp to what actually fits, so the handle never runs
    // ahead of the visible edge. Only window resizes leave the preference alone.
    const setClampedSidebarWidth = useCallback((width: number) => {
        setPreferredWidth(Math.max(EXPLORER_MIN_WIDTH, Math.min(explorerMaxWidth(), width)));
    }, []);

    const stopResize = useCallback(() => {
        resizeCleanupRef.current?.();
        resizeCleanupRef.current = null;
    }, []);

    const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        stopResize();

        const startX = event.clientX;
        const startWidth = sidebarWidth;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMove = (moveEvent: PointerEvent) => {
            setClampedSidebarWidth(startWidth + moveEvent.clientX - startX);
        };
        const cleanup = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', cleanup);
            window.removeEventListener('pointercancel', cleanup);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            resizeCleanupRef.current = null;
        };
        resizeCleanupRef.current = cleanup;
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', cleanup);
        window.addEventListener('pointercancel', cleanup);
    }, [setClampedSidebarWidth, sidebarWidth, stopResize]);

    useEffect(() => {
        try {
            localStorage.setItem(EXPLORER_WIDTH_STORAGE_KEY, String(Math.round(preferredWidth)));
        } catch {
            // Storage may be disabled; resizing still works for this session.
        }
    }, [preferredWidth]);

    useEffect(() => {
        const handleWindowResize = () => setMaxWidth(explorerMaxWidth());
        window.addEventListener('resize', handleWindowResize);
        return () => {
            window.removeEventListener('resize', handleWindowResize);
            stopResize();
        };
    }, [stopResize]);

    // Keep explorerTab store in sync for components that read it (CommandPalette, WorkspaceManager, etc.)
    useEffect(() => {
        if (activeView.type === 'ontology' || activeView.type === 'ontology-detail') {
            setExplorerTab('ontologies');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView.type]);

    if (sidebarCollapsed) {
        return (
            <button
                type="button"
                className="flex flex-col items-center py-2 gap-1 flex-shrink-0"
                onClick={toggleSidebar}
                title={`Expand ${explorerLabel}`}
                aria-label={`Expand ${explorerLabel}`}
                style={{ width: 36, background: '#FAFAF8', border: 'none', borderRight: `1px solid ${COLOR.border}`, cursor: 'pointer' }}
            >
                <span style={{ color: COLOR.muted, fontSize: 18, lineHeight: 1 }}>›</span>
                <span style={{ color: COLOR.muted, fontSize: 10, writingMode: 'vertical-rl' }}>
                    {explorerLabel}
                </span>
            </button>
        );
    }

    return (
        <div
            className="flex flex-col overflow-hidden flex-shrink-0"
            style={{
                position: 'relative', width: `${sidebarWidth}px`,
                background: COLOR.surface, borderRight: `1px solid ${COLOR.border}`,
            }}
        >

            <div className="flex items-center justify-between px-3 py-2" style={{ background: COLOR.surfaceAlt, borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151' }}>{explorerLabel}</span>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    title={`Collapse ${explorerLabel}`}
                    aria-label={`Collapse ${explorerLabel}`}
                    style={{
                        width: 28, height: 28, border: `1px solid ${COLOR.border}`, borderRadius: 5, background: '#FFFFFF', color: COLOR.muted,
                        cursor: 'pointer', fontSize: 18, lineHeight: 1,
                    }}
                >
                    ‹
                </button>
            </div>

            {/* Diagrams that conform to a viewpoint keep their viewpoint tree
                visible; standalone model diagrams retain the model tree. */}
            {activeView.type === 'diagram' && !viewpointDiagram ? (
                <>
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <div className="flex gap-1">
                            <input type="text" placeholder="Search elements..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') window.dispatchEvent(new Event('memo:expand-explorer-search')); }}
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg focus:outline-none"
                                style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                            <button onClick={() => window.dispatchEvent(new Event('memo:collapse-explorer-tree'))} title="Collapse all Explorer groups" aria-label="Collapse all Explorer groups" className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 28, background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.secondary, cursor: 'pointer' }}><CollapseAllIcon /></button>
                        </div>
                    </div>
                    <ModelExplorerContent searchTerm={searchTerm} />
                </>
            ) : activeMode === 'dashboard' ? (
                <DashboardSidebar />
            ) : activeMode === 'dhf' ? (
                <DhfExplorerContent />
            ) : (activeMode === 'diagram' || viewpointDiagram) ? (
                <>
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <input type="text" placeholder="Search viewpoints and views..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                    </div>
                    <ViewExplorerContent searchTerm={searchTerm} />
                </>
            ) : activeMode === 'ontology' ? (
                <OntologyBrowserTab />
            ) : activeMode === 'scenario' ? (
                <Suspense fallback={<div className="p-3" style={{ color: COLOR.faint, fontSize: FONT.explorer.item }}>Loading use cases…</div>}>
                    <ScenarioExplorer explorerOnly />
                </Suspense>
            ) : (
                /* catalog / dashboard / default */
                <>
                    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                        <div className="flex gap-1">
                        <input type="text" placeholder="Search elements..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') window.dispatchEvent(new Event('memo:expand-explorer-search')); }}
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg focus:outline-none"
                            style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }} />
                        <button onClick={() => window.dispatchEvent(new Event('memo:collapse-explorer-tree'))} title="Collapse all Explorer groups" aria-label="Collapse all Explorer groups" className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 28, background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.secondary, cursor: 'pointer' }}><CollapseAllIcon /></button>
                        </div>
                    </div>
                    <ModelExplorerContent searchTerm={searchTerm} />
                </>
            )}

            <div
                className="memo-explorer-resizer"
                role="separator"
                aria-label="Resize Model Explorer"
                aria-orientation="vertical"
                aria-valuemin={EXPLORER_MIN_WIDTH}
                aria-valuemax={maxWidth}
                aria-valuenow={Math.round(sidebarWidth)}
                tabIndex={0}
                title="Drag to resize · Double-click to reset"
                onPointerDown={startResize}
                onDoubleClick={() => setClampedSidebarWidth(EXPLORER_DEFAULT_WIDTH)}
                onKeyDown={event => {
                    if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        setClampedSidebarWidth(sidebarWidth - 20);
                    } else if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        setClampedSidebarWidth(sidebarWidth + 20);
                    } else if (event.key === 'Home') {
                        event.preventDefault();
                        setClampedSidebarWidth(EXPLORER_MIN_WIDTH);
                    } else if (event.key === 'End') {
                        event.preventDefault();
                        setClampedSidebarWidth(maxWidth);
                    }
                }}
            />
        </div>
    );
}
