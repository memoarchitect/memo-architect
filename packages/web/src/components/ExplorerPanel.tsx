import { Fragment, lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { buildBreakdown, DEFAULT_FAMILIES, type BreakdownNode } from '../lib/breakdown-tree';
import { groupParentPath, siblingGroups, waitForPackage } from '../lib/element-package';
import { definitionOf, indexLocalDefinitions } from '../lib/definition-nesting';
import { kindParents } from '../analysis/kind-hierarchy';
import { GLOBAL_SYSTEM, groupBySystem, resolveSystem } from '../lib/system-grouping';
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
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER, normalizeLayerId, DIAGRAM_TYPE_META, VIEW_KIND_META, resolveActionFlowDiagramType } from '../constants';
import { FONT, COLOR, ICON } from '../styles/tokens';
import { WorkingSetsPanel as WorkingSetsContent } from './WorkingSetsPanel';
import { confirmDocumentDelete, confirmElementDelete, confirmViewDelete } from './confirm-destructive';
import { OntologyBrowserTab } from './OntologyBrowserTab';
import { DashboardSidebar } from './DashboardSidebar';
import { ExplorerElementIdentity } from './ExplorerElementIdentity';
import { ExplorerCountBadge } from './ExplorerCountBadge';
import { type MemoElement, type DiagramDTO, type KindDefinitionDTO, type MemoModelDTO, type ViewpointDTO, type ViewKind } from '@memoarchitect/tools/browser';
import type { OntologyPackageInfo } from '../types/ontology';
import { getBuiltInTemplate } from '../dhf/built-in-templates';
import { DHF_GROUPS, groupColorForLabel } from '../dhf/dhf-groups';
import { NewDocumentWizard, type NewDocSpec } from '../dhf/NewDocumentWizard';
import { isFeatureEnabled } from '../config/feature-flags';
import { diagramUrl, elementUrl } from '../router';
import { buildOwnershipTest } from '../views/templates/composition-tree';

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
            // A grouping package is the leaf-level container: it is declared
            // beside the element, inside the element's owner, and labels a
            // grouping without claiming the element decomposes into it.
            {
                label: 'Group in new package…',
                action: () => {
                    const parent = groupParentPath(model, el);
                    const name = window.prompt(parent
                        ? `Name the group inside ${parent.split('::').pop()}`
                        : 'Name the group');
                    if (!name?.trim()) return;
                    const qualifiedName = `${parent}::${name.trim()}`;
                    void createPackage(name.trim(), parent).then(async created => {
                        if (!created.success) {
                            window.alert(created.error ?? 'The package could not be created.');
                            return;
                        }
                        await waitForPackage(qualifiedName);
                        return reportPackageResult(moveElementToPackage(el.id, qualifiedName));
                    });
                }
            },
            ...(siblingGroups(model, el).length > 0 ? [{
                label: 'Move into group…',
                action: () => {
                    const parent = groupParentPath(model, el);
                    const groups = siblingGroups(model, el);
                    const name = window.prompt(`Move into which group? (${groups.join(', ')})`,
                        el.attributes?.['elementPackage'] ?? groups[0] ?? '');
                    if (!name?.trim()) return;
                    void reportPackageResult(moveElementToPackage(el.id, `${parent}::${name.trim()}`));
                }
            }] : []),
            { label: 'Copy ID', action: () => navigator.clipboard?.writeText(el.id) },
            {
                label: 'Delete element…',
                danger: true,
                action: () => {
                    if (!confirmElementDelete(el.name)) return;
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
    element?: ExplorerElement;
    /** The synthetic "Usages (n)" folder holding one definition's usages. */
    isUsagesFolder?: boolean;
    /** This node was folded under the definition it is a usage of. */
    isUsage?: boolean;
}

/**
 * A model element decorated for display.
 *
 * The explorer shows an element under the id and name a READER knows it by,
 * which is not always what the builder produced: an authored `providedId`
 * outranks the generated `shortId`, and a usage with no name of its own is
 * best labelled with the one on its definition.
 */
export type ExplorerElement = MemoElement & {
    /** Authored providedId where the model carries one, else shortId/id. */
    __displayId?: string;
    /** True for a definition, resolved once so rows need not re-derive it. */
    __isDef?: boolean;
};

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

/** A folded usage is tinted so it reads as an instance, not a peer definition. */
const USAGE_TINT = '#7C3AED';

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
                            style={{ marginLeft: node.isUsagesFolder ? `${16 + level * 16}px` : level > 0 ? '16px' : '0' }}
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
                                <FolderIcon open={isExpanded} color={node.isUsagesFolder ? USAGE_TINT : baseColor} />
                                <span
                                    className="font-medium flex-1 truncate"
                                    style={{
                                        color: node.isUsagesFolder ? USAGE_TINT : COLOR.secondary,
                                        fontSize: FONT.explorer.kind,
                                        fontStyle: node.isUsagesFolder ? 'italic' : 'normal',
                                    }}
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
                                    baseColor={node.isUsagesFolder ? USAGE_TINT : baseColor}
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
                    const layerClr = node.isUsage ? USAGE_TINT : (LAYER_COLORS[el.layer] || baseColor);
                    // An element row now carries children of its own — the parts
                    // it composes, and its Usages folder — so it needs the same
                    // disclosure control a package folder has.
                    const hasChildren = node.children.length > 0;
                    const isOpen = expanded.has(el.id);

                    return (
                        <Fragment key={el.id}>
                        <div
                            className="group flex items-center gap-1.5 px-2 py-1 cursor-pointer"
                            style={{
                                borderRadius: '4px',
                                margin: '0 4px',
                                marginLeft: 16 + level * 16 + (node.isUsage ? 16 : 0) + (hasChildren ? 0 : 16) + 'px',
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
                                    // Selecting a parent also opens it: the row
                                    // is both the element and the way into it.
                                    selectElement(el.id);
                                    if (hasChildren) toggleExpand(el.id);
                                }
                            }}
                            onContextMenu={e => onContextMenu(e, 'element', el.id)}
                        >
                            {hasChildren ? (
                                <span
                                    onClick={e => { e.stopPropagation(); toggleExpand(el.id); }}
                                    className="cursor-pointer flex items-center justify-center"
                                    style={{ width: '14px', height: '14px', flexShrink: 0 }}
                                >
                                    <ChevronIcon expanded={isOpen} size={12} color={COLOR.muted} />
                                </span>
                            ) : null}
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
                            <ExplorerElementIdentity element={el} selected={isSelected} tint={node.isUsage ? USAGE_TINT : undefined} />
                            {hasChildren && (
                                <span
                                    className="px-1.5 py-0.5 rounded-full ml-auto text-xs"
                                    style={{
                                        background: '#F3F4F6', color: '#6B7280', fontSize: '11px',
                                        fontWeight: 500, minWidth: '16px', textAlign: 'center',
                                    }}
                                >
                                    {node.children.length}
                                </span>
                            )}
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
                        {hasChildren && isOpen && (
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
    // A viewpoint is presentation apparatus, not model content: it frames views
    // and is read in the Viewpoints tree. It became an element so that nesting
    // could be modelled, and it must not arrive in the Model Explorer as an
    // undefined kind on the strength of that.
    return kind.endsWith('View') || kind.endsWith('Viewpoint')
        || sourceLayer === 'viewpoints'
        || sourceLayer === 'views'
        || sourcePackage === 'viewpoints'
        || sourcePackage === 'views';
}

function isExplorerHiddenElement(kind: string, sourceLayer: string, sourcePackage?: string): boolean {
    // `ItemDefinition` used to be hidden here, on the grounds that an untyped
    // item is not yet a MEMO element. Under the construct rule it has a home
    // the moment it is authored — Items, then its layer — and hiding it made
    // the one thing worth seeing invisible: 394 of Affera's 440 were untyped
    // usages in an ARCHITECTURE layer, which is exactly the gap the
    // "architecture defines, assurance states" guideline exists to surface.
    return isDiagramOnlyElement(kind, sourceLayer, sourcePackage);
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
    // Always singular. A type folder names the TYPE its rows are instances of
    // ("Hazard"), and the count badge beside it already says how many there
    // are — pluralising made the folder read as the collection instead, and
    // the English rules needed to do it were wrong as often as they were right.
    return labels[kind] ?? kind.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/** One layer inside a domain group (e.g. Safety Risk inside Assurance). */
export interface ExplorerSubGroup {
    /** Layer id ('' for kinds the builder gave no layer). */
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
/**
 * Fold a kind's elements into folders by the grouping package they sit in.
 *
 * SysML lets a package group members inside a usage body — `part scrHome {
 * package grpHeader { … } }` — and the builder records which one an element
 * landed in as `elementPackage`. Without this the Catalog flattens all of them
 * under their kind, so a screen's header, body and footer groups arrive as one
 * undifferentiated list and the grouping the author wrote is invisible.
 *
 * Elements with no grouping package keep their position rather than being
 * pushed below the folders: a kind is usually mostly ungrouped, and sinking
 * those under a couple of folders would reorder the common case to serve the
 * rare one. Folders appear where their first member would have been.
 */
function groupByElementPackage(nodes: TreeNode[]): TreeNode[] {
    const folders = new Map<string, TreeNode>();
    const ordered: TreeNode[] = [];
    for (const node of nodes) {
        const packageName = node.element?.attributes?.['elementPackage'];
        if (!packageName) {
            ordered.push(node);
            continue;
        }
        let folder = folders.get(packageName);
        if (!folder) {
            folder = { id: `pkg:${packageName}`, name: packageName, type: 'folder', children: [] };
            folders.set(packageName, folder);
            ordered.push(folder);
        }
        folder.children.push(node);
    }
    return ordered;
}

/**
 * The explorer's taxonomy, read from the ontology that declares it.
 *
 * `ExplorerClassification` maps a source namespace to its explorer domain and
 * group; `LayerRendering` gives each one a label and a colour. Architect
 * carries none of this itself. It used to — a hand-maintained copy of the same
 * facts — and the copy drifted: it invented a `behavior` layer while EXPL-011
 * in the ontology said behavior belongs to architecture/functional, and it put
 * `core` in a domain of its own while EXPL-029 files it under
 * assurance/evidence.
 *
 * Order comes from declaration order, because that is the only statement of
 * intent the ontology makes about sequence, and it is the order the
 * methodology is read in.
 */
export interface ExplorerTaxonomy {
    /** namespace (normalised) → {domain, group} */
    placement: Map<string, { domain: string; group: string }>;
    /** kind name → {domain, group}, for kinds the ontology declares */
    byKind: Map<string, { domain: string; group: string }>;
    /** group id → the domain that contains it */
    groupDomain: Map<string, string>;
    domainRank: (id: string) => number;
    groupRank: (id: string) => number;
    label: (id: string) => string | undefined;
    color: (id: string) => string | undefined;
}

export function explorerTaxonomy(ontologies: OntologyPackageInfo[]): ExplorerTaxonomy {
    const placement = new Map<string, { domain: string; group: string }>();
    const byKind = new Map<string, { domain: string; group: string }>();
    const groupDomain = new Map<string, string>();
    const domainOrder: string[] = [];
    const groupOrder: string[] = [];
    const labels = new Map<string, string>();
    const colors = new Map<string, string>();

    const note = (domain: string, group: string) => {
        if (domain && !domainOrder.includes(domain)) domainOrder.push(domain);
        if (group && !groupOrder.includes(group)) groupOrder.push(group);
        if (group && domain && !groupDomain.has(group)) groupDomain.set(group, domain);
    };

    for (const pkg of ontologies) {
        for (const entry of pkg.layerPalette ?? []) {
            const id = normalizeLayerId(entry.layerId);
            if (!labels.has(id)) { labels.set(id, entry.layerLabel); colors.set(id, entry.layerColor); }
        }
        for (const entry of pkg.explorerPlacements ?? []) {
            const domain = normalizeLayerId(entry.explorerDomain);
            const group = normalizeLayerId(entry.explorerGroup);
            placement.set(normalizeLayerId(entry.sourceNamespace), { domain, group });
            note(domain, group);
        }
        // `layers` arrives with the classification already applied: its id is
        // the domain and each kind's `group` is the group. That is what places
        // a kind the ontology declares, whatever namespace it was authored in.
        for (const layer of pkg.layers ?? []) {
            const domain = normalizeLayerId(layer.id);
            for (const kind of layer.kinds ?? []) {
                const group = normalizeLayerId(kind.group ?? '');
                byKind.set(kind.name, { domain, group });
                note(domain, group);
            }
        }
    }

    const rank = (order: string[]) => (id: string) => {
        const index = order.indexOf(id);
        return index < 0 ? order.length : index;
    };
    return {
        placement, byKind, groupDomain,
        domainRank: rank(domainOrder),
        groupRank: rank(groupOrder),
        label: id => labels.get(id),
        color: id => colors.get(id),
    };
}

export function computeExplorerGroupTree(
    elements: MemoElement[],
    searchTerm: string,
    registryKinds: KindDefinitionDTO[],
    availableOntologies: OntologyPackageInfo[],
    _declaredPackages: { qualifiedName: string }[] = [],
    kindFilter?: ReadonlySet<string>,
    relationships: { type?: string; sourceId?: string; targetId?: string }[] = [],
    viewpoints: ViewpointDTO[] = [],
): { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] {
    const lower = searchTerm.toLowerCase();

    const kindToLayerId = buildKindToLayerIdMap(registryKinds);
    const kindToSubGroup = buildKindToSubGroupMap(registryKinds);

    // ─── Presentation elements belong to the Viewpoints explorer ────────────
    //
    // A view and everything declared alongside it in the same file describes
    // how the model is PRESENTED, not what the model contains. Leaking those
    // into the model tree put render directives beside the parts they render.
    const viewSourceFiles = new Set(
        elements.filter(el => el.construct === 'view').map(el => el.file).filter(Boolean),
    );
    const viewpointIds = new Set(viewpoints.map(viewpoint => viewpoint.id));
    const isPresentation = (el: MemoElement): boolean =>
        el.construct === 'view'
        || (!!el.file && viewSourceFiles.has(el.file))
        || viewpointIds.has(el.id);

    // ─── Rule 4: a relationship is an edge, so it is never a row ────────────
    //
    // `connection` is a construct, but it is the construct of the EDGES, and
    // this tree lists elements. Affera declares nineteen of them — `Composes`,
    // `DeploysOnto`, `RealizesInterface` — which arrived as a Connections
    // category listing the relationship vocabulary beside the model's parts.
    // Composition is read from the `composes` relationships, not from these,
    // so nothing in the tree depends on them being rows.
    const isRelationship = (el: MemoElement): boolean => el.construct === 'connection';

    // ─── Definitions this project declares, indexed by every name they answer to
    const projectDefs = new Map<string, MemoElement>();
    for (const el of elements) {
        if (!el.isDefinition) continue;
        for (const key of [el.name, el.id, el.shortId]) if (key) projectDefs.set(key, el);
    }

    /**
     * The type a folder names is the one the element DECLARES.
     *
     * This used to climb — through ontology superTypes and through project
     * definitions to what they specialize — until it reached a concrete
     * ontology kind, so that a folder always named something the ontology
     * knows. The cost was that it named something the AUTHOR did not write:
     * `RosPublisher` and `RosSubscriber` ports were filed under `SoftwarePort`,
     * and the type the model actually declares disappeared from the tree.
     *
     * A folder now names the direct type, and only that. If the model says
     * `RosSubscriber`, the folder says Ros Subscriber; if a project def
     * specializes two levels down from the ontology, that is the model's
     * structure and the reader is entitled to see it.
     */
    const resolveOntologyKind = (kind: string): string => kind;

    /** The type name a usage is typed by, however the builder recorded it. */
    const typeNameOf = (el: MemoElement): string =>
        el.attributes?.actionType || el.attributes?.usageType || el.kind || '';

    // ─── An element earns a row by being defined or used, not by existing ───
    //
    // A definition nothing uses is a finding for the Definitions tab, not a
    // member of the model tree; listing every one of them doubled the catalog.
    //
    // The exception is a definition the PROJECT authored rather than one the
    // ontology declares — a function def among them. Those are the catalog the
    // conversion is building, and an unused one is work in progress, not
    // clutter: hiding it hides the thing the author is in the middle of. An
    // ontology kind needs no such grace, because the ontology already lists it.
    //
    // Usages are never hidden. A usage whose type is missing from the model
    // still takes its place, so a dangling type shows up as a row to chase
    // rather than as a silent absence.
    const usedDefinitions = new Set<string>();
    for (const el of elements) {
        const typeName = typeNameOf(el);
        if (!typeName) continue;
        usedDefinitions.add(typeName);
        if (typeName.includes('::')) usedDefinitions.add(typeName.split('::').pop()!);
    }
    const ontologyKindNames = new Set(registryKinds.map(kind => kind.name));
    const earnsARow = (el: MemoElement): boolean =>
        !el.isDefinition
        || !ontologyKindNames.has(el.kind)
        || usedDefinitions.has(el.name)
        || usedDefinitions.has(el.id);

    const validElements = new Map<string, ExplorerElement>();
    for (const el of elements) {
        if (kindFilter && !kindFilter.has(el.kind)) continue;
        const sourceLayer = kindToLayerId[el.kind] ?? el.layer;
        const sourcePackage = kindToSubGroup[el.kind];
        if (isExplorerHiddenElement(el.kind, sourceLayer, sourcePackage)) continue;
        if (isPresentation(el) || isRelationship(el)) continue;
        if (!earnsARow(el)) continue;
        const isDef = !!el.isDefinition;
        const resolvedKind = resolveOntologyKind(el.kind);
        if (lower && !el.name.toLowerCase().includes(lower) && !resolvedKind.toLowerCase().includes(lower)) continue;

        // A usage with no id or name of its own inherits both from the
        // definition it is typed by, so the row reads as the thing rather than
        // as an anonymous instance of it.
        const typeName = typeNameOf(el);
        const typeDef = projectDefs.get(typeName)
            ?? (typeName.includes('::') ? projectDefs.get(typeName.split('::').pop()!) : undefined);
        const displayId = el.attributes?.providedId || typeDef?.attributes?.providedId || el.shortId || el.id;
        const displayName = (el.name && el.name !== el.id)
            ? el.name
            : (el.attributes?.name || typeDef?.attributes?.name || el.name);

        validElements.set(el.id, {
            ...el,
            name: displayName,
            kind: resolvedKind,
            __isDef: isDef,
            __displayId: displayId,
        });
    }

    const nodes = new Map<string, TreeNode>();
    /** Every name a node answers to, so a relationship end resolves whichever it names. */
    const lookup = new Map<string, TreeNode>();
    for (const el of validElements.values()) {
        const node: TreeNode = { id: el.id, name: el.name, type: 'element', element: el, children: [] };
        nodes.set(el.id, node);
        for (const key of [el.id, el.shortId, el.name, el.attributes?.providedId]) {
            if (key) lookup.set(key, node);
        }
    }

    // ─── Composition comes from `composes`, where the model states it ───────
    //
    // `owner` is SysML syntactic nesting, which a model authored as flat
    // packages with explicit composition relationships does not use — leaving
    // every element a root and the tree flat. Read `composes` first and fall
    // back to ownership.
    // Nest only where one kind OWNS the other. `composes` carries both meanings:
    // a function decomposes into functions, and a function is also composed to
    // the ActionUsage that performs it and to the hardware it is allocated to.
    // An operative action is DONE BY a system, not part of one — so nesting
    // every `composes` put a traceability action inside the function tree and a
    // Hazard inside the Risk that concerns it.
    const owns = buildOwnershipTest(registryKinds);
    const parentOf = new Map<string, string>();
    for (const rel of relationships) {
        if (!rel?.sourceId || !rel?.targetId) continue;
        const type = (rel.type ?? '').toLowerCase();
        if (type !== 'composes' && type !== 'compose') continue;
        const source = lookup.get(rel.sourceId);
        const target = lookup.get(rel.targetId);
        if (source?.element && target?.element && !owns(source.element, target.element)) continue;
        parentOf.set(target?.id ?? rel.targetId, source?.id ?? rel.sourceId);
    }

    // ─── Fold each usage into the definition it is a usage of ───────────────
    //
    // A definition and its usages are one thing seen twice. Showing them as
    // unrelated siblings in separate type folders is what made the catalog
    // read as duplicated. The definition keeps the row; its usages move into a
    // "Usages" folder beneath it.
    const definitionNodes = new Map<string, TreeNode>();
    for (const node of nodes.values()) {
        if (!node.element?.__isDef) continue;
        for (const key of [node.element.name, node.element.id]) if (key) definitionNodes.set(key, node);
    }
    const canonical = (node: TreeNode | undefined): TreeNode | undefined => {
        if (!node || node.element?.__isDef) return node;
        const typeName = node.element ? typeNameOf(node.element) : '';
        const definition = definitionNodes.get(typeName)
            ?? (typeName.includes('::') ? definitionNodes.get(typeName.split('::').pop()!) : undefined);
        return definition && definition !== node ? definition : node;
    };

    const foldedInto = new Map<string, TreeNode>();
    const usagesOf = new Map<string, TreeNode[]>();
    for (const node of nodes.values()) {
        const target = canonical(node);
        if (!target || target === node) continue;
        foldedInto.set(node.id, target);
        node.isUsage = true;
        usagesOf.set(target.id, [...(usagesOf.get(target.id) ?? []), node]);
    }
    // Re-point composition onto the rows that survived the fold.
    for (const [childId, parentId] of [...parentOf]) {
        const child = canonical(lookup.get(childId) ?? nodes.get(childId));
        const parent = canonical(lookup.get(parentId) ?? nodes.get(parentId));
        if (!child || !parent) continue;
        parentOf.delete(childId);
        if (child !== parent) parentOf.set(child.id, parent.id);
    }

    /** A model may state a cycle; nesting one would hang the render. */
    const isAncestor = (node: TreeNode, candidate: TreeNode): boolean => {
        let current: TreeNode | undefined = candidate;
        const seen = new Set<string>();
        while (current) {
            if (current.id === node.id) return true;
            if (seen.has(current.id)) return false;
            seen.add(current.id);
            const parentId = parentOf.get(current.id);
            current = parentId ? (lookup.get(parentId) ?? nodes.get(parentId)) : undefined;
        }
        return false;
    };

    const roots: TreeNode[] = [];
    for (const node of nodes.values()) {
        if (foldedInto.has(node.id)) continue;
        const el = node.element!;
        let parent: TreeNode | undefined;

        const composedUnder = parentOf.get(node.id) ?? parentOf.get(el.shortId ?? '')
            ?? parentOf.get(el.id) ?? parentOf.get(el.attributes?.providedId ?? '');
        if (composedUnder) parent = lookup.get(composedUnder) ?? nodes.get(composedUnder);

        if (!parent && el.owner) parent = lookup.get(el.owner) ?? nodes.get(el.owner);

        // `parentAction` gets the same ownership test as `composes`, and for
        // the same reason. A ComponentFunction authored in
        // architecture/functional/ was arriving with its parentAction pointing
        // at an ActionUsage declared in traceability/ — the action that
        // PERFORMS the function, in another layer and another file. Nesting
        // under it filed a third of the functional decomposition under
        // Behavior, where nobody reading the functional analysis would find
        // it. A performer is not a container.
        if (!parent && el.parentAction) {
            const candidate = lookup.get(el.parentAction) ?? nodes.get(el.parentAction);
            if (candidate?.element && candidate !== node && !isAncestor(node, candidate)
                && owns(candidate.element, el)) parent = candidate;
        }

        // Last resort: the qualified name itself states the containment.
        if (!parent) {
            let qualified = el.id;
            while (qualified.includes('::')) {
                qualified = qualified.substring(0, qualified.lastIndexOf('::'));
                const candidate = lookup.get(qualified) ?? nodes.get(qualified);
                if (candidate && candidate !== node && !isAncestor(node, candidate)) { parent = candidate; break; }
            }
        }

        parent = canonical(parent);
        if (!parent || parent === node || isAncestor(node, parent)) roots.push(node);
        else parent.children.push(node);
    }

    const sortNodes = (nodesToSort: TreeNode[]) => {
        nodesToSort.sort((a, b) => {
            // The Usages folder is part of the row above it, so it leads.
            if (!!a.isUsagesFolder !== !!b.isUsagesFolder) return a.isUsagesFolder ? -1 : 1;
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            // Authored ids carry the reading order (SPEC-2 before SPEC-10),
            // which only a numeric collation preserves.
            const idOf = (node: TreeNode) =>
                String(node.element?.__displayId ?? node.element?.attributes?.providedId ?? node.name);
            return idOf(a).localeCompare(idOf(b), undefined, { numeric: true });
        });
        nodesToSort.forEach(node => sortNodes(node.children));
    };
    for (const [nodeId, usages] of usagesOf) {
        const definition = nodes.get(nodeId);
        if (!definition || usages.length === 0) continue;
        definition.children.push({
            id: `u:${nodeId}`,
            name: `Usages (${usages.length})`,
            type: 'folder',
            isUsagesFolder: true,
            children: usages,
        });
    }
    for (const node of nodes.values()) {
        sortNodes(node.children);
    }

    // ─── The layer an element reports, and the domain that layer sits in ────
    //
    // The layer comes from the ELEMENT. `kindToLayerId` is the ontology's TOP
    // namespace — `architecture`, `assurance` — which is the DOMAIN, not the
    // layer; `kindToSubGroup` is the directory under it and is what lines up
    // with the layer an element reports. `unknown` is not a layer, it is the
    // builder declining to name one, so those kinds sit directly under their
    // construct rather than in a folder called Unknown.
    // ─── Where an element belongs, entirely as the ontology declares ───────
    //
    // Three ways in, in order of how directly the ontology states it:
    //
    //   1. The kind. `layers` arrives classified, so a kind the ontology
    //      declares already names its domain and group.
    //   2. The layer read as a GROUP. The builder stamps the directory a kind
    //      was authored under, and for `architecture/logical/` that string is
    //      already the group.
    //   3. The layer read as a SOURCE NAMESPACE. `behavior` is the case that
    //      matters: it is not a group, and EXPL-011 places it in
    //      architecture/functional. The four native SysML kinds the builder
    //      synthesizes arrive this way and no other.
    //
    // An element none of the three place is left undeclared, and shown as
    // such. Inventing a home for it is what produced a `behavior` layer.
    const taxonomy = explorerTaxonomy(availableOntologies);
    const placeOf = (el: MemoElement): { domain: string; group: string } | undefined => {
        const byKind = taxonomy.byKind.get(el.kind);
        if (byKind) return byKind;
        const layer = normalizeLayerId(el.layer ?? '');
        if (!layer || layer === 'unknown') return undefined;
        const asGroup = taxonomy.groupDomain.get(layer);
        if (asGroup) return { domain: asGroup, group: layer };
        return taxonomy.placement.get(layer);
    };
    const layerOf = (el: MemoElement): string => placeOf(el)?.group ?? '';
    const domainOf = (el: MemoElement): string => placeOf(el)?.domain ?? '';

    // ─── Inside a domain: the layer, then the kind ──────────────────────────
    //
    // The construct is NOT a level here. A reader looking for the operational
    // analysis wants everything in it — the actions, the parts that perform
    // them, the use cases — and splitting that by construct first scattered
    // one layer across six branches. The construct still decides what is a row
    // at all (a connection is an edge, a view is furniture); it just does not
    // organise the tree.
    const toSubGroups = (rootsList: TreeNode[], groupColor: string): ExplorerSubGroup[] => {
        const byLayer = new Map<string, Map<string, TreeNode[]>>();
        for (const root of rootsList) {
            const el = root.element!;
            const layer = kindToLayerId[el.kind] === 'artifacts'
                ? artifactCategory(el.kind, registryKinds.find(d => d.name === el.kind)?.superType)
                : layerOf(el);
            if (!byLayer.has(layer)) byLayer.set(layer, new Map());
            const byKind = byLayer.get(layer)!;
            byKind.set(el.kind, [...(byKind.get(el.kind) ?? []), root]);
        }

        // Kinds are not rolled up to a shared ancestor: a folder names the
        // type the element declares, and nothing above it. This is what keeps
        // ForkNode and JoinNode in folders of their own without an exclusion
        // rule naming them.
        const buckets = new Map<string, Map<string, TreeNode[]>>();
        for (const [layer, byKind] of byLayer.entries()) {
            const layerBuckets = new Map<string, TreeNode[]>();
            for (const [kind, kindRoots] of byKind.entries()) {
                const tree = [...kindRoots];
                sortNodes(tree);
                layerBuckets.set(kind, groupByElementPackage(tree));
            }
            buckets.set(layer, layerBuckets);
        }

        const isArtifactCategory = (id: string) => ARTIFACT_CATEGORIES.includes(id as never);
        return [...buckets.entries()]
            .sort(([a], [b]) => (isArtifactCategory(a) && isArtifactCategory(b))
                ? ARTIFACT_CATEGORIES.indexOf(a as never) - ARTIFACT_CATEGORIES.indexOf(b as never)
                : taxonomy.groupRank(a) - taxonomy.groupRank(b) || a.localeCompare(b))
            .map(([id, kinds]) => ({
                id,
                label: id ? (taxonomy.label(id) ?? LAYER_LABELS[id] ?? subGroupLabel(id)) : '',
                color: id
                    ? (taxonomy.color(id) ?? (LAYER_COLORS as Record<string, string>)[id] ?? groupColor)
                    : groupColor,
                kinds,
            }));
    };

    const groups: { group: LayerGroup; subGroups: ExplorerSubGroup[] }[] = [];

    const byDomain = new Map<string, TreeNode[]>();
    const domainless: TreeNode[] = [];
    for (const root of roots) {
        const domain = domainOf(root.element!);
        if (!domain) { domainless.push(root); continue; }
        byDomain.set(domain, [...(byDomain.get(domain) ?? []), root]);
    }

    for (const [domain, domainRoots] of [...byDomain.entries()]
        .sort(([a], [b]) => taxonomy.domainRank(a) - taxonomy.domainRank(b) || a.localeCompare(b))) {
        const color = taxonomy.color(domain) ?? (LAYER_COLORS as Record<string, string>)[domain] ?? '#6B7280';
        groups.push({
            group: {
                id: `domain:${domain}`,
                label: taxonomy.label(domain) ?? subGroupLabel(domain),
                color,
                kinds: [...new Set(domainRoots.map(root => root.element!.kind))],
            },
            subGroups: toSubGroups(domainRoots, color),
        });
    }

    // An element the ontology does not place is a FINDING, and it is reported
    // as one rather than filed somewhere plausible. Its kind is not declared
    // and its layer matches no `ExplorerClassification` — so either the
    // ontology is missing a classification or the builder invented a layer.
    // Both are worth seeing; guessing on its behalf is what hid them before.
    if (domainless.length > 0) {
        const undefColor = '#F59E0B';
        groups.push({
            group: {
                id: 'undefined',
                label: 'Undeclared — No Ontology Classification',
                color: undefColor,
                kinds: [],
            },
            subGroups: toSubGroups(domainless, undefColor),
        });
    }

    return groups;
}


// ─────────────────────────────────────────────────────────────────────────────

/**
 * The definitions this model declares, and what uses them.
 *
 * The catalog answers "what is in the model" and the breakdown answers "how is
 * it composed". Neither answers "what types does this project define" — a
 * definition sits in a type folder among the usages, and reading the set of
 * them means picking them out by name. This is that third question, and only
 * that: the ontology's own kinds are not here, they are in the Ontology tab.
 *
 * A definition with no usage is the finding worth seeing, so it is listed with
 * a zero rather than hidden.
 */
export function buildDefinitionTree(elements: MemoElement[], searchTerm = ''): {
    layer: string;
    definitions: { definition: MemoElement; usages: MemoElement[] }[];
}[] {
    const definitions = indexLocalDefinitions(elements);
    const usagesOf = new Map<string, MemoElement[]>();
    for (const element of elements) {
        const definition = definitionOf(element, definitions);
        if (!definition) continue;
        usagesOf.set(definition.id, [...(usagesOf.get(definition.id) ?? []), element]);
    }

    const lower = searchTerm.trim().toLowerCase();
    const matches = (entry: { definition: MemoElement; usages: MemoElement[] }) =>
        !lower
        || entry.definition.name.toLowerCase().includes(lower)
        || entry.definition.kind.toLowerCase().includes(lower)
        || entry.usages.some(usage => usage.name.toLowerCase().includes(lower));

    const byLayer = new Map<string, { definition: MemoElement; usages: MemoElement[] }[]>();
    for (const definition of new Set(definitions.values())) {
        const entry = {
            definition,
            usages: (usagesOf.get(definition.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
        };
        if (!matches(entry)) continue;
        const layer = definition.layer && definition.layer !== 'unknown' ? definition.layer : 'other';
        byLayer.set(layer, [...(byLayer.get(layer) ?? []), entry]);
    }

    return [...byLayer.entries()]
        .sort(([a], [b]) => {
            const rank = (layer: string) => {
                const index = LAYER_ORDER.indexOf(layer as typeof LAYER_ORDER[number]);
                return index < 0 ? Number.MAX_SAFE_INTEGER : index;
            };
            return rank(a) - rank(b) || a.localeCompare(b);
        })
        .map(([layer, entries]) => ({
            layer,
            definitions: entries.sort((a, b) => a.definition.name.localeCompare(b.definition.name)),
        }));
}

/** The definitions tab: what this project defines, and what uses each one. */
function DefinitionsTree({ searchTerm, selectedElementId, onSelect, onContextMenu }: {
    searchTerm: string;
    selectedElementId: string | null;
    onSelect: (id: string) => void;
    onContextMenu: (event: React.MouseEvent, type: CtxMenuState['type'], id: string) => void;
}) {
    const model = useModelStore(s => s.model);
    /**
     * Which branches are OPEN. An empty set therefore opens the tree fully
     * collapsed, which is the readable default: these trees are wide, and
     * opening everything buried the top-level list the reader navigates by.
     */
    const [expanded, setExpandedBranches] = useState<Set<string>>(new Set());
    const layers = useMemo(
        () => buildDefinitionTree(Object.values(model?.elements ?? {}), searchTerm),
        [model, searchTerm],
    );

    const toggle = (id: string) => setExpandedBranches(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    if (layers.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-4 text-center"
                 style={{ color: COLOR.faint, fontSize: '12px', lineHeight: 1.6 }}>
                {searchTerm
                    ? 'No definition matches that search.'
                    : 'This model declares no definitions of its own. The ontology\u2019s types are in the Ontology tab.'}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {layers.map(({ layer, definitions }) => {
                const layerOpen = expanded.has(`l:${layer}`);
                const color = LAYER_COLORS[layer] ?? COLOR.muted;
                return (
                    <div key={layer} className="mb-0.5">
                        <div
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                            style={{ margin: '0 4px', borderRadius: '4px' }}
                            onClick={() => toggle(`l:${layer}`)}
                        >
                            <ChevronIcon expanded={layerOpen} size={13} color={color} />
                            <FolderIcon open={layerOpen} color={color} />
                            <span className="font-semibold flex-1 truncate"
                                  style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>
                                {LAYER_LABELS[layer] ?? subGroupLabel(layer)}
                            </span>
                            <ExplorerCountBadge count={definitions.length} color={color}
                                title={`${definitions.length} definitions`} />
                        </div>
                        {layerOpen && definitions.map(({ definition, usages }) => {
                            const open = expanded.has(definition.id);
                            return (
                                <div key={definition.id}>
                                    <div
                                        className="flex items-center gap-1.5 py-1 cursor-pointer select-none"
                                        style={{
                                            paddingLeft: '22px', paddingRight: '8px', borderRadius: '4px', margin: '0 4px',
                                            background: definition.id === selectedElementId ? '#EEF2FF' : 'transparent',
                                        }}
                                        onClick={() => { if (usages.length) toggle(definition.id); onSelect(definition.id); }}
                                        onContextMenu={event => onContextMenu(event, 'element', definition.id)}
                                    >
                                        {usages.length
                                            ? <ChevronIcon expanded={open} size={12} />
                                            : <span style={{ width: '12px', display: 'inline-block' }} />}
                                        <ItemIcon color={color} />
                                        <span className="truncate flex-1" style={{ color: COLOR.primary }}>{definition.name}</span>
                                        {/* A definition nothing uses is worth seeing, so the count
                                            is always shown — including the zero. */}
                                        <span style={{ color: usages.length ? COLOR.muted : '#B45309', fontSize: FONT.explorer.count }}>
                                            {usages.length === 0 ? 'unused' : `${usages.length}\u00d7`}
                                        </span>
                                    </div>
                                    {open && usages.map(usage => (
                                        <div
                                            key={usage.id}
                                            className="flex items-center gap-1.5 py-1 cursor-pointer select-none"
                                            style={{
                                                paddingLeft: '48px', paddingRight: '8px', borderRadius: '4px', margin: '0 4px',
                                                background: usage.id === selectedElementId ? '#EEF2FF' : 'transparent',
                                            }}
                                            onClick={() => onSelect(usage.id)}
                                            onContextMenu={event => onContextMenu(event, 'element', usage.id)}
                                        >
                                            <ItemIcon />
                                            <span className="truncate flex-1" style={{ color: COLOR.secondary }}>{usage.name}</span>
                                            <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{usage.construct}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * The composition reading of the model. See `lib/breakdown-tree.ts` for why
 * this exists alongside the catalog.
 */
function BreakdownTree({ searchTerm, selectedElementId, onSelect, onContextMenu }: {
    searchTerm: string;
    selectedElementId: string | null;
    onSelect: (id: string) => void;
    /** The breakdown is where grouping packages read, so it offers to make one. */
    onContextMenu: (event: React.MouseEvent, type: CtxMenuState['type'], id: string) => void;
}) {
    const model = useModelStore(s => s.model);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    /**
     * Which branches are OPEN. An empty set therefore opens the tree fully
     * collapsed, which is the readable default: these trees are wide, and
     * opening everything buried the top-level list the reader navigates by.
     */
    const [expanded, setExpandedBranches] = useState<Set<string>>(new Set());
    const branches = useMemo(() => {
        const elements = Object.values(model?.elements ?? {});
        // Use cases are filed under the system they serve — a system-of-systems
        // project has several, and one flat list does not say which device a use
        // case is about. Everything untraced lands under Global.
        const parents = kindParents(availableOntologies);
        const byId = new Map(elements.map(element => [element.id, element]));
        const relationships = model?.relationships ?? [];
        const families = DEFAULT_FAMILIES.map(family => family.id === 'usecases'
            ? { ...family, systemOf: (element: MemoElement) => resolveSystem(element, byId, relationships, parents) }
            : family);
        return buildBreakdown(elements, families, searchTerm);
    }, [model, availableOntologies, searchTerm]);

    const toggle = (id: string) =>
        setExpandedBranches(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const renderNode = (node: BreakdownNode, depth: number) => {
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(node.id);
        return (
            <div key={node.id}>
                <div
                    className="flex items-center gap-1.5 py-1 cursor-pointer select-none"
                    style={{
                        paddingLeft: `${8 + depth * 14}px`, paddingRight: '8px', borderRadius: '4px',
                        margin: '0 4px',
                        background: node.element && node.element.id === selectedElementId ? '#EEF2FF' : 'transparent',
                    }}
                    onClick={() => {
                        if (hasChildren) toggle(node.id);
                        if (node.element) onSelect(node.element.id);
                    }}
                    onContextMenu={node.element
                        ? event => onContextMenu(event, 'element', node.element!.id)
                        : undefined}
                >
                    {hasChildren
                        ? <ChevronIcon expanded={isOpen} size={12} />
                        : <span style={{ width: '12px', display: 'inline-block' }} />}
                    {node.isGroup ? <FolderIcon open={isOpen} /> : <ItemIcon />}
                    <span className="truncate flex-1" style={{ color: COLOR.primary }}>
                        {node.name}
                        {node.element?.isDefinition && (
                            <span style={{ color: COLOR.muted, fontWeight: 600, marginLeft: '5px', fontSize: '0.85em' }}>def</span>
                        )}
                    </span>
                    {!node.isGroup && (
                        <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{node.kind}</span>
                    )}
                </div>
                {isOpen && node.children.map(child => renderNode(child, depth + 1))}
            </div>
        );
    };

    if (branches.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-4 text-center"
                 style={{ color: COLOR.faint, fontSize: '12px' }}>
                {searchTerm ? 'Nothing matches that search.' : 'No composition to show yet.'}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {branches.map(branch => {
                const isOpen = expanded.has(`b:${branch.id}`);
                return (
                    <div key={branch.id} className="mb-0.5">
                        <div
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                            style={{ margin: '0 4px', borderRadius: '4px' }}
                            onClick={() => toggle(`b:${branch.id}`)}
                        >
                            <ChevronIcon expanded={isOpen} size={13} />
                            <FolderIcon open={isOpen} />
                            <span className="font-semibold flex-1" style={{ color: COLOR.primary, fontSize: FONT.explorer.kind }}>
                                {branch.label}
                            </span>
                            <span style={{ color: COLOR.faint, fontSize: FONT.explorer.count }}>{branch.nodes.length}</span>
                        </div>
                        {isOpen && branch.nodes.map(node => renderNode(node, 1))}
                    </div>
                );
            })}
        </div>
    );
}

function ModelExplorerContent({ searchTerm }: { searchTerm: string }) {
    const navigate = useNavigate();
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
        const el = model?.elements?.[id];
        if (el) navigate(elementUrl(el.shortId ?? el.id));
    }, [selectElement, setActiveView, model, navigate]);

    // The model tab has two readings. The CATALOG groups by layer and kind,
    // which is how you find an element you can name. The BREAKDOWN nests by
    // composition, which is how you read a system — a port belongs on its
    // component, not in a folder of every port in the model.
    const [modelView, setModelView] = useState<'catalog' | 'breakdown' | 'definitions'>('catalog');
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
            model.relationships ?? [],
            model.viewpoints ?? [],
        ) : [],
        [model, searchTerm, availableOntologies, kindFilter],
    );

    // The explorer opens fully collapsed.
    //
    // Every type branch used to be opened once, on the theory that it saved a
    // click. With usages folded under their definitions and composition now
    // nesting the tree, opening every type branch renders most of the model at
    // once — the layer groups themselves scroll off the top, so the reader
    // cannot see what layers exist. Seed an empty set and let them open what
    // they came for; the ref still guards against re-seeding over their choice.
    useEffect(() => {
        if (initializedTypeBranches.current || groupTree.length === 0) return;
        initializedTypeBranches.current = true;
        setExpanded(new Set());
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
            <div className="flex px-2 pt-1.5 pb-1 gap-1 flex-shrink-0">
                {(['catalog', 'breakdown', 'definitions'] as const).map(v => (
                    <button
                        key={v}
                        onClick={() => setModelView(v)}
                        className="px-2 py-0.5 rounded capitalize"
                        style={{
                            fontSize: '11px', fontWeight: 500,
                            ...(modelView === v
                                ? { background: COLOR.accent, color: '#fff' }
                                : { background: 'transparent', color: COLOR.faint }),
                        }}
                    >{v}</button>
                ))}
            </div>
            {modelView === 'definitions' ? (
                <DefinitionsTree
                    searchTerm={searchTerm}
                    selectedElementId={selectedElementId}
                    onSelect={selectElementAndNavigate}
                    onContextMenu={onContextMenu}
                />
            ) : modelView === 'breakdown' ? (
                <BreakdownTree
                    searchTerm={searchTerm}
                    selectedElementId={selectedElementId}
                    onSelect={selectElementAndNavigate}
                    onContextMenu={onContextMenu}
                />
            ) : (
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
                                // Kinds the builder gave no layer render flat,
                                // straight under the domain.
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
            </div>
            )}
            {/* Outside the view switch: the breakdown offers the same menu, and
                a menu that renders only in the catalog is a menu the other tab
                opens into nothing. */}
            {ctxMenu && <ElementContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
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

/**
 * Arrange viewpoints into the tree they declare.
 *
 * Viewpoints nest, for system-of-systems modelling: the viewpoint that frames
 * the whole system of systems declares one viewpoint per constituent system. A
 * viewpoint whose parent is not in this model is a root — the tree must never
 * drop a viewpoint because the parent it names is absent — and a viewpoint that
 * names itself, or takes part in a cycle, is a root for the same reason.
 */
export function buildViewpointTree(viewpoints: ViewpointDTO[]): {
    rootViewpoints: ViewpointDTO[];
    viewpointChildren: Map<string, ViewpointDTO[]>;
} {
    const byId = new Map(viewpoints.map(vp => [vp.id, vp]));
    const parentOf = (vp: ViewpointDTO): string | undefined => {
        const seen = new Set<string>([vp.id]);
        for (let cursor = vp.parentId; cursor; cursor = byId.get(cursor)?.parentId) {
            if (seen.has(cursor)) return undefined;
            seen.add(cursor);
        }
        return vp.parentId && byId.has(vp.parentId) ? vp.parentId : undefined;
    };

    const viewpointChildren = new Map<string, ViewpointDTO[]>();
    const rootViewpoints: ViewpointDTO[] = [];
    for (const vp of viewpoints) {
        const parent = parentOf(vp);
        if (parent) viewpointChildren.set(parent, [...(viewpointChildren.get(parent) ?? []), vp]);
        else rootViewpoints.push(vp);
    }
    return { rootViewpoints, viewpointChildren };
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
    const moveElementToPackage = useModelStore(s => s.moveElementToPackage);
    const navigate = useNavigate();

    /**
     * Move one view's declaration into a package.
     *
     * The views tree already groups by owning package — it just had no way to
     * change one, so a package created here grouped nothing. This addresses the
     * view's own element rather than its authored id, which is why the DTO now
     * carries `elementId`.
     */
    const moveViewToPackage = (diagram: DiagramDTO) => {
        if (!diagram.elementId) return;
        const target = window.prompt(
            `Move “${diagram.name}” into which package? (qualified name, e.g. Views::Safety)`,
            diagram.package ?? '');
        if (target === null) return;
        void reportPackageResult(moveElementToPackage(diagram.elementId, target.trim()));
    };

    /**
     * The package a new grouping package should be created under: the one this
     * viewpoint's views already live in. Creating it at the project root — what
     * this button used to do — produced a package no view could be filed into
     * without retyping a qualified name.
     */
    const packageForViewpoint = (viewpointId: string): string | undefined => {
        const packages = getDiagramsForViewpoint(model, viewpointId)
            .map(diagram => diagram.package)
            .filter((name): name is string => Boolean(name));
        if (packages.length === 0) return undefined;
        const counts = new Map<string, number>();
        for (const name of packages) counts.set(name, (counts.get(name) ?? 0) + 1);
        // The commonest owner, and on a tie the shorter path: the more general
        // package is the safer place to hang a new grouping one.
        return [...counts.entries()].sort((a, b) =>
            b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))[0][0];
    };

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
    const viewpointLabels = useMemo(() => {
        const stripped = stripSharedLabelPrefix(viewpoints.map(vp => vp.label));
        return new Map(viewpoints.map((vp, index) => [vp.id, stripped[index]]));
    }, [viewpoints]);

    const { rootViewpoints, viewpointChildren } = useMemo(
        () => buildViewpointTree(viewpoints),
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
                onDelete={!diag.auto ? () => { if (confirmViewDelete(diag.name)) deleteDiagram(diag.id); } : undefined}
                onMoveToPackage={diag.elementId ? () => moveViewToPackage(diag) : undefined}
            />
        ))
    );

    const renderGroupedDiagramList = (diagrams: DiagramDTO[], vpId: string) => {
        const packageTree = buildViewPackageTree(diagrams);
        // A package is a folder, not a caption. It was rendered as a bare label
        // with its views always expanded, so a viewpoint holding several
        // packages became one long unbreakable list — the tree could show the
        // grouping but not use it. Same chevron, folder icon and count badge as
        // the model tree, so one thing looks like one thing across the explorer.
        const countIn = (node: ViewPackageNode): number =>
            node.diagrams.length + node.children.reduce((total, child) => total + countIn(child), 0);
        const renderPackage = (node: ViewPackageNode, depth = 0): React.ReactNode => {
            const key = `vp-pkg:${vpId}:${node.id}`;
            const isExpanded = expandedVps.has(key);
            return (
                <div key={node.id} style={{ marginLeft: depth ? '12px' : 0 }}>
                    <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center gap-1.5 px-2 py-1 font-semibold"
                        style={{
                            background: 'none', border: 0, cursor: 'pointer',
                            color: COLOR.muted, fontSize: FONT.explorer.group, textAlign: 'left',
                        }}
                    >
                        <ChevronIcon expanded={isExpanded} size={12} color={COLOR.muted} />
                        <FolderIcon open={isExpanded} color={COLOR.muted} />
                        <span className="flex-1 truncate">{node.name}</span>
                        <ExplorerCountBadge count={countIn(node)} color={COLOR.muted} />
                    </button>
                    {isExpanded && (
                        <>
                            <div style={{ marginLeft: '8px' }}>{renderDiagramList(node.diagrams, vpId)}</div>
                            {node.children.map(child => renderPackage(child, depth + 1))}
                        </>
                    )}
                </div>
            );
        };
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

    /**
     * One viewpoint branch, and beneath it the viewpoints it frames.
     *
     * A nesting viewpoint may bind no view of its own — the system-of-systems
     * viewpoint frames the constituents and leaves the drawing to them — so an
     * empty branch with children is still expandable, and the count badge
     * carries the family's total rather than a bare zero.
     */
    const renderViewpoint = (vp: ViewpointDTO, depth: number): React.ReactNode => {
                const children = viewpointChildren.get(vp.id) ?? [];
                const isExpanded = expandedVps.has(vp.id);
                const vpColor = vp.visibleLayers?.[0] ? (LAYER_COLORS[vp.visibleLayers[0]] || COLOR.muted) : COLOR.muted;
                const allDiagrams = getDiagramsForViewpoint(model, vp.id);
                const displayedDiags = filterDiagrams(allDiagrams);
                const familyCount = (function total(node: ViewpointDTO): number {
                    return getDiagramsForViewpoint(model, node.id).length
                        + (viewpointChildren.get(node.id) ?? []).reduce((sum, child) => sum + total(child), 0);
                })(vp);

                return (
                    <div key={vp.id} className="mb-0.5" style={{ marginLeft: depth ? '14px' : 0 }}>
                        <div
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                            style={{ borderRadius: '4px', margin: '0 4px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => { selectViewpoint(vp.id); toggleExpand(vp.id); }}
                        >
                            <ChevronIcon expanded={isExpanded} size={14} color={vpColor} />
                            <FolderIcon open={isExpanded} color={vpColor} />
                            <span className="font-semibold flex-1 truncate" style={{ color: COLOR.primary, fontSize: FONT.explorer.group }}>{viewpointLabels.get(vp.id) ?? vp.label}</span>
                            <ExplorerCountBadge
                                count={familyCount}
                                color={vpColor}
                                title={children.length
                                    ? `${allDiagrams.length} views here, ${familyCount} including the viewpoints it frames`
                                    : `${allDiagrams.length} views`}
                            />
                        </div>
                        {isExpanded && (
                            <div style={{ marginLeft: '16px' }}>
                                {children.map(child => renderViewpoint(child, depth + 1))}
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
                                        const parent = packageForViewpoint(vp.id);
                                        const name = window.prompt(parent
                                            ? `New package under ${parent}`
                                            : 'New SysML package name');
                                        if (name?.trim()) void reportPackageResult(createPackage(name.trim(), parent));
                                    }}
                                >
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> New Package
                                </button>
                            </div>
                        )}
                    </div>
                );
    };

    return (
        <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
            {/* Named viewpoints — the primary organisation */}
            {rootViewpoints.map(vp => renderViewpoint(vp, 0))}

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

function DiagramRow({ diag, isSelected, onSelect, onDelete, onMoveToPackage }: {
    diag: DiagramDTO;
    isSelected: boolean;
    onSelect: () => void;
    onDelete?: () => void;
    /** Absent for a view with no addressable declaration (renderer samples). */
    onMoveToPackage?: () => void;
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
            {onMoveToPackage && hovered && (
                <button
                    onClick={e => { e.stopPropagation(); onMoveToPackage(); }}
                    title="Move this view into a package"
                    aria-label={`Move ${diag.name} into a package`}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: COLOR.muted, fontSize: '12px', padding: '0 2px', lineHeight: 1,
                    }}
                >
                    ⌸
                </button>
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

    // A DHF is the design history file OF a device. The document names its
    // system when it is created; one that names none is project-wide and lands
    // under Global, which is also the whole listing for a single-system project.
    const model = useModelStore(s => s.model);
    const documentsBySystem = useMemo(() => {
        const elements = model?.elements ?? {};
        return groupBySystem(dhfDocuments, doc => {
            const system = doc.systemId ? elements[doc.systemId] : undefined;
            return system
                ? { systemId: system.id, label: system.name || system.id }
                // A system id that no longer resolves is not silently dropped:
                // the id itself is the label, so a deleted system is visible.
                : doc.systemId
                    ? { systemId: doc.systemId, label: doc.systemId }
                    : { label: GLOBAL_SYSTEM };
        });
    }, [dhfDocuments, model]);

    /** The categories one system's documents fall into: built-in first, then custom. */
    const categoriesFor = (docs: DhfDoc[]) => [
        ...DHF_GROUPS
            .filter(group => docs.some(doc => doc.group === group.label))
            .map(group => ({
                key: group.id, groupId: group.id, label: group.label, color: group.color,
                docs: docs.filter(doc => doc.group === group.label),
            })),
        ...customGroupLabels
            .filter(label => docs.some(doc => doc.group === label))
            .map(label => ({
                key: `custom:${label}`, groupId: undefined as string | undefined,
                label, color: groupColorForLabel(label),
                docs: docs.filter(doc => doc.group === label),
            })),
    ];

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

                {/* A design history file is per-device, so documents are filed
                    under the system they cover and the project-wide ones under
                    Global. One system (or none named) means one group, and the
                    panel reads exactly as it did before. */}
                {documentsBySystem.map(system => (
                    <div key={system.systemId ?? system.label}>
                        {documentsBySystem.length > 1 && (
                            <div style={{
                                padding: '9px 10px 2px', fontSize: '10px', fontWeight: 700,
                                letterSpacing: '.07em', textTransform: 'uppercase', color: COLOR.muted,
                            }}>
                                {system.label}
                            </div>
                        )}
                        {categoriesFor(system.items).map(category => {
                            const key = `${system.systemId ?? 'global'}:${category.key}`;
                            const expanded = expandedGroups.has(category.key);
                            return (
                                <div key={key}>
                                    <button
                                        onClick={() => toggleGroup(category.key)}
                                        onContextMenu={category.groupId ? e => openContextMenu(e, category.groupId!) : undefined}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left"
                                        style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary, borderRadius: '4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = COLOR.surfaceAlt}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        title={category.groupId ? 'Right-click to add documents' : undefined}
                                    >
                                        <span style={{
                                            display: 'inline-block', width: '7px', height: '7px',
                                            borderRadius: '50%', background: category.color, flexShrink: 0,
                                        }} />
                                        <span className="flex-1 uppercase tracking-wide" style={{ fontSize: '10px' }}>{category.label}</span>
                                        <span style={{ fontSize: '10px', color: category.color, fontWeight: 700 }}>{category.docs.length}</span>
                                        <ChevronIcon expanded={expanded} size={11} />
                                    </button>
                                    {expanded && category.docs.map(doc => {
                                        const isActive = activeDocId === doc.id;
                                        return (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center',
                                                    paddingLeft: '28px', paddingRight: '4px',
                                                    background: isActive ? `${category.color}18` : 'transparent',
                                                    borderLeft: isActive ? `2px solid ${category.color}` : '2px solid transparent',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLOR.surfaceAlt; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${category.color}18` : 'transparent'; }}
                                            >
                                                <button
                                                    onClick={() => setActiveView({ type: 'dhf-document', docId: doc.id })}
                                                    style={{
                                                        flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                                                        background: 'none', border: 'none', padding: '5px 0',
                                                        fontSize: FONT.explorer.element, color: isActive ? category.color : COLOR.primary,
                                                        fontWeight: isActive ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                                                    }}
                                                >
                                                    <ItemIcon color={category.color} />
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {doc.id}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (confirmDocumentDelete(doc.title ?? doc.id)) removeDhfDocument(doc.id); }}
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
                    </div>
                ))}

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
