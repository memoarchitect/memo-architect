import { useState, useMemo, useCallback } from 'react';
import {
    useModelStore, getRelationshipsForElement,
    getAllTags, getElementTags, getElementGroup, getGroupsForKind,
} from '../store/model-store';
import { sendAddRelationship } from '../store/ws-client';
import { LAYER_COLORS, SEMANTIC_GROUPS, KIND_TO_GROUP } from '../constants';
import { ContextMenu } from '../components/ContextMenu';
import type { MemoElement, ElementStatus } from '@memo/core';
import { computeImpact, type ImpactDirection } from '@memo/core/lib/analysis/impact.js';

// ─── Tree Architecture ──────────────────────────────────────────────────────
//
// V-Cycle Group (Stakeholders, Requirements, Risk, ...)    ← semantic group
//   └─ Kind (Actor, Requirement, Hazard, ...)        ← element kind
//       └─ User Group (Clinical, Manufacturing, ...)       ← attribute "group"
//           └─ Element (Surgeon, Nurse, ...)               ← leaf node
//       └─ Ungrouped                                       ← elements without group
//
// Everything collapsed by default. User expands what they care about.
// ─────────────────────────────────────────────────────────────────────────────

export function CatalogExplorer() {
    const model = useModelStore(s => s.model);
    const searchTerm = useModelStore(s => s.searchTerm);
    const setSearchTerm = useModelStore(s => s.setSearchTerm);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const validation = useModelStore(s => s.validation);
    const completeness = useModelStore(s => s.completeness);
    const tagFilters = useModelStore(s => s.tagFilters);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const toggleTagFilter = useModelStore(s => s.toggleTagFilter);
    const clearTagFilters = useModelStore(s => s.clearTagFilters);

    // Tree expand/collapse
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    // Context menu
    const [ctxMenu, setCtxMenu] = useState<{
        x: number; y: number;
        elementId?: string; kind?: string; groupName?: string;
    } | null>(null);
    // Tag filter panel
    const [showTagBar, setShowTagBar] = useState(false);
    // Discussion sidebar
    const [showDiscussion, setShowDiscussion] = useState(false);
    // Relationship graph popup
    const [showRelGraph, setShowRelGraph] = useState(false);
    // Impact analysis modal
    const [showImpact, setShowImpact] = useState(false);
    const [impactDirection, setImpactDirection] = useState<ImpactDirection>('both');

    // ─── Dirty tracking: single save for all pending changes ────────────
    const [dirtyFields, setDirtyFields] = useState<Map<string, Record<string, string>>>(new Map());

    const markDirty = (elementId: string, field: string, value: string) => {
        setDirtyFields(prev => {
            const next = new Map(prev);
            const existing = next.get(elementId) || {};
            next.set(elementId, { ...existing, [field]: value });
            return next;
        });
    };

    const isDirty = (elementId: string, field?: string) => {
        const entry = dirtyFields.get(elementId);
        if (!entry) return false;
        return field ? field in entry : Object.keys(entry).length > 0;
    };

    const getDirtyValue = (elementId: string, field: string): string | undefined => {
        return dirtyFields.get(elementId)?.[field];
    };

    const saveAll = () => {
        const store = useModelStore.getState();
        for (const [elementId, fields] of dirtyFields) {
            for (const [key, value] of Object.entries(fields)) {
                if (key === 'doc') {
                    store.updateElementField(elementId, 'doc', value);
                } else {
                    store.updateElementAttribute(elementId, key, value);
                }
            }
            // applyEdit consumes the pending edits and syncs the full element to
            // the server (sendElementUpdate) itself — no extra send needed here.
            store.applyEdit(elementId);
        }
        setDirtyFields(new Map());
    };

    const discardAll = () => setDirtyFields(new Map());
    const totalDirty = dirtyFields.size;

    // ─── Inline editing state ───────────────────────────────────────────
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showAddRel, setShowAddRel] = useState(false);
    const [newRelType, setNewRelType] = useState('');
    const [newRelTarget, setNewRelTarget] = useState('');
    const [newComment, setNewComment] = useState('');

    // ─── Filter elements ────────────────────────────────────────────────
    const elements = useMemo(() => {
        if (!model) return [];
        let els = Object.values(model.elements);
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            els = els.filter(e =>
                e.name.toLowerCase().includes(lower) ||
                e.kind.toLowerCase().includes(lower) ||
                e.id.toLowerCase().includes(lower) ||
                (e.doc || '').toLowerCase().includes(lower) ||
                (e.attributes['group'] || '').toLowerCase().includes(lower) ||
                (e.attributes['tags'] || '').toLowerCase().includes(lower)
            );
        }
        if (tagFilters.length > 0) {
            els = els.filter(e => {
                const tags = getElementTags(e);
                return tagFilters.every(f => tags.includes(f));
            });
        }
        return els;
    }, [model, searchTerm, tagFilters]);

    const allTags = useMemo(() => getAllTags(model), [model]);

    // ─── Build tree ─────────────────────────────────────────────────────
    type FolderNode = {
        id: string; label: string; color: string; depth: number; count: number;
        nodeType: 'vcycle' | 'kind' | 'group' | 'ungrouped';
        children: TreeNode[];
    };
    type LeafNode = {
        id: string; label: string; kind: string; layer: string; depth: number;
        nodeType: 'element';
    };
    type TreeNode = FolderNode | LeafNode;

    const tree = useMemo((): TreeNode[] => {
        const nodes: TreeNode[] = [];

        for (const sg of SEMANTIC_GROUPS) {
            const groupEls = elements.filter(e => sg.kinds.includes(e.kind));
            if (groupEls.length === 0) continue;

            const byKind = new Map<string, MemoElement[]>();
            for (const el of groupEls) {
                if (!byKind.has(el.kind)) byKind.set(el.kind, []);
                byKind.get(el.kind)!.push(el);
            }

            const kindNodes: TreeNode[] = [...byKind.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([kind, kindEls]) => {
                    const byGroup = new Map<string, MemoElement[]>();
                    const ungrouped: MemoElement[] = [];
                    for (const el of kindEls) {
                        const g = getElementGroup(el);
                        if (g) {
                            if (!byGroup.has(g)) byGroup.set(g, []);
                            byGroup.get(g)!.push(el);
                        } else {
                            ungrouped.push(el);
                        }
                    }

                    const children: TreeNode[] = [];
                    for (const [groupName, members] of [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
                        children.push({
                            id: `grp:${kind}:${groupName}`, label: groupName,
                            color: LAYER_COLORS[kindEls[0].layer] || sg.color,
                            depth: 2, count: members.length, nodeType: 'group',
                            children: members.sort((a, b) => a.name.localeCompare(b.name))
                                .map(el => ({ id: el.id, label: el.name, kind: el.kind, layer: el.layer, depth: 3, nodeType: 'element' as const })),
                        });
                    }

                    if (ungrouped.length > 0 && byGroup.size > 0) {
                        children.push({
                            id: `ungrp:${kind}`, label: 'Ungrouped', color: '#9CA3AF',
                            depth: 2, count: ungrouped.length, nodeType: 'ungrouped',
                            children: ungrouped.sort((a, b) => a.name.localeCompare(b.name))
                                .map(el => ({ id: el.id, label: el.name, kind: el.kind, layer: el.layer, depth: 3, nodeType: 'element' as const })),
                        });
                    } else if (ungrouped.length > 0) {
                        for (const el of ungrouped.sort((a, b) => a.name.localeCompare(b.name))) {
                            children.push({ id: el.id, label: el.name, kind: el.kind, layer: el.layer, depth: 2, nodeType: 'element' as const });
                        }
                    }

                    return {
                        id: `kind:${kind}`, label: kind,
                        color: LAYER_COLORS[kindEls[0].layer] || sg.color,
                        depth: 1, count: kindEls.length, nodeType: 'kind' as const, children,
                    } as TreeNode;
                });

            nodes.push({
                id: `sg:${sg.id}`, label: sg.label, color: sg.color,
                depth: 0, count: groupEls.length, nodeType: 'vcycle', children: kindNodes,
            });
        }

        // Ungrouped kinds
        const ungroupedEls = elements.filter(e => !KIND_TO_GROUP[e.kind]);
        if (ungroupedEls.length > 0) {
            const byKind = new Map<string, MemoElement[]>();
            for (const el of ungroupedEls) {
                if (!byKind.has(el.kind)) byKind.set(el.kind, []);
                byKind.get(el.kind)!.push(el);
            }
            const kindNodes: TreeNode[] = [...byKind.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([kind, els]) => ({
                    id: `kind:${kind}`, label: kind, color: '#6B7280',
                    depth: 1, count: els.length, nodeType: 'kind' as const,
                    children: els.sort((a, b) => a.name.localeCompare(b.name)).map(el => ({
                        id: el.id, label: el.name, kind: el.kind, layer: el.layer, depth: 2, nodeType: 'element' as const,
                    })),
                }));
            nodes.push({ id: 'sg:__other', label: 'Other', color: '#6B7280', depth: 0, count: ungroupedEls.length, nodeType: 'vcycle', children: kindNodes });
        }

        return nodes;
    }, [elements]);

    // ─── Expand / Collapse ──────────────────────────────────────────────
    const isExpanded = (id: string) => expanded.has(id);
    const toggleExpand = (id: string) => {
        setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    };
    const expandAll = () => {
        const all = new Set<string>();
        const walk = (nodes: TreeNode[]) => { for (const n of nodes) { if (n.nodeType !== 'element') { all.add(n.id); walk((n as FolderNode).children); } } };
        walk(tree);
        setExpanded(all);
    };
    const collapseAll = () => setExpanded(new Set());

    // ─── Group / Tag actions (persisted via SysML attributes) ────────
    const setElementAttribute = useCallback((elementId: string, key: string, value: string) => {
        const store = useModelStore.getState();
        store.updateElementAttribute(elementId, key, value);
        // applyEdit persists the pending edit and syncs the full element itself.
        store.applyEdit(elementId);
    }, []);

    const moveToGroup = useCallback((elementId: string, groupName: string) => {
        setElementAttribute(elementId, 'group', groupName);
    }, [setElementAttribute]);

    const removeFromGroup = useCallback((elementId: string) => {
        setElementAttribute(elementId, 'group', '');
    }, [setElementAttribute]);

    const addTag = useCallback((elementId: string, tag: string) => {
        const el = model?.elements[elementId];
        if (!el) return;
        const existing = getElementTags(el);
        if (existing.includes(tag)) return;
        setElementAttribute(elementId, 'tags', [...existing, tag].join(', '));
    }, [model, setElementAttribute]);

    const removeTag = useCallback((elementId: string, tag: string) => {
        const el = model?.elements[elementId];
        if (!el) return;
        setElementAttribute(elementId, 'tags', getElementTags(el).filter(t => t !== tag).join(', '));
    }, [model, setElementAttribute]);

    const deleteGroup = useCallback((kind: string, groupName: string) => {
        if (!model) return;
        for (const el of Object.values(model.elements)) {
            if (el.kind === kind && el.attributes['group'] === groupName) {
                setElementAttribute(el.id, 'group', '');
            }
        }
    }, [model, setElementAttribute]);

    const renameGroup = useCallback((kind: string, oldName: string, newName: string) => {
        if (!model) return;
        for (const el of Object.values(model.elements)) {
            if (el.kind === kind && el.attributes['group'] === oldName) {
                setElementAttribute(el.id, 'group', newName);
            }
        }
    }, [model, setElementAttribute]);

    // ─── Context menu ───────────────────────────────────────────────────
    const handleContextMenu = useCallback((e: React.MouseEvent, target?: Omit<NonNullable<typeof ctxMenu>, 'x' | 'y'>) => {
        e.preventDefault(); e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY, ...target });
    }, []);

    // ─── Detail data ────────────────────────────────────────────────────
    const selectedElement = selectedElementId && model ? model.elements[selectedElementId] : null;
    const relationships = selectedElementId && model ? getRelationshipsForElement(model, selectedElementId) : [];
    const selectedTags = selectedElement ? getElementTags(selectedElement) : [];
    const selectedGroup = selectedElement ? getElementGroup(selectedElement) : null;

    const allRelTypes = useMemo(() => {
        if (!model) return [];
        const types = new Set(model.relationships.map(r => r.type));
        for (const t of ['traceTo', 'satisfy', 'verify', 'allocateTo', 'composedOf', 'aggregation',
            'association', 'dependency', 'realization', 'mitigates', 'causes', 'leadsTo', 'identifies']) types.add(t);
        return [...types].sort();
    }, [model]);
    const allElementIds = useMemo(() => model ? Object.keys(model.elements).sort() : [], [model]);

    // ─── Field value (dirty-aware) ──────────────────────────────────────
    const fieldValue = (field: string): string => {
        if (!selectedElementId || !selectedElement) return '';
        const dirty = getDirtyValue(selectedElementId, field);
        if (dirty !== undefined) return dirty;
        return field === 'doc' ? (selectedElement.doc || '') : (selectedElement.attributes[field] || '');
    };

    // ─── Start inline edit ──────────────────────────────────────────────
    const startEdit = (field: string) => {
        setEditingField(field);
        setEditValue(fieldValue(field));
    };

    const commitEdit = () => {
        if (!editingField || !selectedElementId) return;
        markDirty(selectedElementId, editingField, editValue);
        setEditingField(null);
    };

    const cancelEdit = () => setEditingField(null);

    // ─── Add relationship ───────────────────────────────────────────────
    const handleAddRelationship = () => {
        if (!selectedElementId || !newRelType || !newRelTarget) return;
        sendAddRelationship(selectedElementId, newRelTarget, newRelType);
        setShowAddRel(false); setNewRelType(''); setNewRelTarget('');
    };

    // ─── Discussion comment ─────────────────────────────────────────────
    const addDiscussionComment = () => {
        if (!selectedElementId || !newComment.trim()) return;
        const existing = fieldValue('discussion');
        const timestamp = new Date().toISOString().slice(0, 10);
        const gitUser = model?.metadata?.gitUser || 'user';
        const entry = `[${timestamp} @${gitUser}] ${newComment.trim()}`;
        const updated = existing ? `${existing}\n${entry}` : entry;
        markDirty(selectedElementId, 'discussion', updated);
        setNewComment('');
    };

    // ─── Context menu data ──────────────────────────────────────────────
    const ctxElement = ctxMenu?.elementId ? model?.elements[ctxMenu.elementId] : undefined;
    const ctxAvailableGroups = useMemo(() => {
        if (!ctxMenu?.kind || !model) return [];
        return getGroupsForKind(model, ctxMenu.kind);
    }, [ctxMenu, model]);

    // ─── Metadata ───────────────────────────────────────────────────────
    const metadata = model?.metadata;

    // ─── Completeness helpers ────────────────────────────────────────────
    const STATUS_COLORS: Record<ElementStatus, string> = {
        complete: '#22C55E',  // green
        warning: '#F59E0B',  // amber
        error: '#EF4444',    // red
    };

    const getElementStatus = (elementId: string): ElementStatus => {
        return completeness?.elementStatus?.[elementId] || 'complete';
    };

    /** Aggregate folder status: any error → error, any warning → warning, else complete */
    const getFolderStatus = (node: FolderNode): ElementStatus => {
        let hasWarning = false;
        for (const child of node.children) {
            if (child.nodeType === 'element') {
                const s = getElementStatus(child.id);
                if (s === 'error') return 'error';
                if (s === 'warning') hasWarning = true;
            } else {
                const s = getFolderStatus(child as FolderNode);
                if (s === 'error') return 'error';
                if (s === 'warning') hasWarning = true;
            }
        }
        return hasWarning ? 'warning' : 'complete';
    };

    // ─── Render tree nodes ──────────────────────────────────────────────
    const renderFolder = (node: FolderNode) => {
        const open = isExpanded(node.id);
        const isVCycle = node.nodeType === 'vcycle';
        const isKind = node.nodeType === 'kind';
        const isGroup = node.nodeType === 'group';

        const ctxTarget = isKind ? { kind: node.label }
            : isGroup ? { kind: node.id.split(':')[1], groupName: node.label } : undefined;

        return (
            <div key={node.id}>
                <div
                    className="flex items-center gap-1.5 cursor-pointer select-none"
                    style={{
                        paddingLeft: `${10 + node.depth * 14}px`,
                        paddingRight: '10px',
                        paddingTop: isVCycle ? '5px' : '3px',
                        paddingBottom: isVCycle ? '5px' : '3px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => toggleExpand(node.id)}
                    onContextMenu={ctxTarget ? (e) => handleContextMenu(e, ctxTarget) : undefined}
                >
                    <span style={{
                        color: '#B0B0A8', fontSize: '9px', width: '12px', textAlign: 'center',
                        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block', transition: 'transform 0.1s',
                    }}>{'\u25B6'}</span>

                    <span style={{ color: node.color, fontSize: isVCycle ? '11px' : '10px', width: '14px', textAlign: 'center' }}>
                        {isVCycle ? '\u25A0' : isKind ? '\u25CB' : isGroup ? '\u2500' : '\u2022'}
                    </span>

                    <span className="flex-1 truncate" style={{
                        color: isVCycle ? '#1B3A4B' : '#4B5563',
                        fontSize: '16px',
                        fontWeight: isVCycle ? 600 : isKind ? 500 : 400,
                    }}>
                        {node.label}
                    </span>

                    {/* Folder completeness dot */}
                    {completeness && (() => {
                        const fs = getFolderStatus(node);
                        return fs !== 'complete' ? (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: STATUS_COLORS[fs] }}
                                title={fs === 'error' ? 'Has violations' : 'Has warnings'} />
                        ) : null;
                    })()}

                    <span className="tabular-nums flex-shrink-0" style={{ color: '#D1D5DB', fontSize: '10px' }}>
                        {node.count}
                    </span>
                </div>

                {open && (node as FolderNode).children.map(child =>
                    child.nodeType === 'element'
                        ? renderLeaf(child as LeafNode)
                        : renderFolder(child as FolderNode)
                )}
            </div>
        );
    };

    const renderLeaf = (node: LeafNode) => {
        const isSelected = selectedElementId === node.id;
        const el = model?.elements[node.id];
        const tags = el ? getElementTags(el) : [];
        const dirty = isDirty(node.id);
        const status = getElementStatus(node.id);

        return (
            <div
                key={node.id}
                className="flex items-center gap-1.5 cursor-pointer select-none"
                style={{
                    paddingLeft: `${10 + node.depth * 14}px`,
                    paddingRight: '10px', paddingTop: '4px', paddingBottom: '4px',
                    background: isSelected ? '#2DD4A80D' : 'transparent',
                    borderLeft: isSelected ? '2px solid #2DD4A8' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F5F5F2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#2DD4A80D' : 'transparent'; }}
                onClick={() => selectElement(node.id)}
                onContextMenu={e => handleContextMenu(e, { elementId: node.id, kind: node.kind })}
            >
                {/* Completeness status dot (replaces layer color dot) */}
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                    title={status === 'complete' ? 'No violations' : status === 'warning' ? 'Has warnings' : 'Has errors'} />

                <span className="flex-1 truncate" style={{
                    color: isSelected ? '#1B3A4B' : '#4B5563', fontSize: '16px',
                    fontWeight: isSelected ? 500 : 400,
                }}>{node.label}</span>

                {dirty && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#F59E0B' }} title="Unsaved changes" />}

                {tags.length > 0 && (
                    <span className="flex gap-0.5 flex-shrink-0">
                        {tags.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: '#2DD4A8' }} />
                        ))}
                    </span>
                )}
            </div>
        );
    };

    // ─── Editable field component ───────────────────────────────────────
    const EditableField = ({ field, label, placeholder, multiline }: {
        field: string; label: string; placeholder: string; multiline?: boolean;
    }) => {
        const value = fieldValue(field);
        const dirty = selectedElementId ? isDirty(selectedElementId, field) : false;
        const isEditing = editingField === field;

        return (
            <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{label}</h3>
                    {dirty && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} title="Modified" />}
                </div>
                {isEditing ? (
                    multiline ? (
                        <textarea
                            className="w-full p-2.5 rounded-lg text-sm focus:outline-none resize-y"
                            style={{ background: '#FFF', border: '1px solid #2DD4A8', color: '#374151', minHeight: '50px' }}
                            value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                            onBlur={commitEdit}
                        />
                    ) : (
                        <input
                            type="text"
                            className="w-full px-2.5 py-1.5 rounded-lg text-sm focus:outline-none"
                            style={{ background: '#FFF', border: '1px solid #2DD4A8', color: '#374151' }}
                            value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            onBlur={commitEdit}
                        />
                    )
                ) : (
                    <div
                        className="px-2.5 py-1.5 rounded-lg text-sm cursor-text"
                        style={{
                            background: dirty ? '#FFFBEB' : '#FFF',
                            border: `1px solid ${dirty ? '#FDE68A' : '#E5E5E0'}`,
                            color: value ? '#374151' : '#D1D5DB',
                            minHeight: multiline ? '32px' : 'auto',
                            whiteSpace: multiline ? 'pre-wrap' : 'normal',
                        }}
                        onClick={() => startEdit(field)}
                    >
                        {value || <span style={{ fontStyle: 'italic' }}>{placeholder}</span>}
                    </div>
                )}
            </div>
        );
    };

    // ─── Relationship graph popup ───────────────────────────────────────
    const RelGraphPopup = () => {
        if (!showRelGraph || !selectedElementId || !model) return null;

        const grouped = new Map<string, { id: string; name: string; kind: string; layer: string; direction: 'out' | 'in' }[]>();
        for (const rel of relationships) {
            const isOut = rel.sourceId === selectedElementId;
            const otherId = isOut ? rel.targetId : rel.sourceId;
            const other = model.elements[otherId];
            if (!other) continue;
            if (!grouped.has(rel.type)) grouped.set(rel.type, []);
            grouped.get(rel.type)!.push({ id: otherId, name: other.name, kind: other.kind, layer: other.layer, direction: isOut ? 'out' : 'in' });
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowRelGraph(false)}>
                <div className="bg-white rounded-xl shadow-xl p-5 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold" style={{ color: '#1B3A4B' }}>
                            Relationships &mdash; {selectedElement?.name}
                        </h3>
                        <button className="text-xs px-2 py-1 rounded" style={{ color: '#9CA3AF' }}
                            onClick={() => setShowRelGraph(false)}>{'\u2715'}</button>
                    </div>

                    {/* Center node */}
                    <div className="flex items-center justify-center py-4">
                        <div className="px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{
                                background: (LAYER_COLORS[selectedElement?.layer || ''] || '#666') + '20',
                                border: `2px solid ${LAYER_COLORS[selectedElement?.layer || ''] || '#666'}`,
                                color: '#1B3A4B',
                            }}>
                            {selectedElement?.name}
                            <div className="text-center mt-0.5" style={{ color: '#9CA3AF', fontSize: '9px' }}>{selectedElement?.kind}</div>
                        </div>
                    </div>

                    {[...grouped.entries()].map(([type, items]) => (
                        <div key={type} className="mb-3">
                            <div className="text-xs font-medium mb-1.5 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '10px' }}>{type}</span>
                                <span style={{ color: '#D1D5DB' }}>{items.length}</span>
                            </div>
                            <div className="space-y-1 ml-3">
                                {items.map(item => (
                                    <div key={item.id}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs"
                                        style={{ background: '#FAFAF8', border: '1px solid #E5E5E0' }}
                                        onClick={() => { selectElement(item.id); setShowRelGraph(false); }}>
                                        <span style={{ color: '#9CA3AF', fontSize: '10px' }}>{item.direction === 'out' ? '\u2192' : '\u2190'}</span>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LAYER_COLORS[item.layer] || '#666' }} />
                                        <span style={{ color: '#374151' }}>{item.name}</span>
                                        <span className="ml-auto px-1.5 py-0.5 rounded"
                                            style={{ background: (LAYER_COLORS[item.layer] || '#666') + '12', color: LAYER_COLORS[item.layer] || '#666', fontSize: '9px' }}>
                                            {item.kind}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {grouped.size === 0 && <div className="text-center text-xs py-4" style={{ color: '#D1D5DB' }}>No relationships</div>}
                </div>
            </div>
        );
    };

    // ─── Impact Analysis modal ───────────────────────────────────────────
    const ImpactModal = () => {
        if (!showImpact || !selectedElementId || !model) return null;

        const impact = computeImpact(model, selectedElementId, impactDirection, 8);
        const maxDepth = impact.nodes.length > 0 ? Math.max(...impact.nodes.map(n => n.depth)) : 0;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowImpact(false)}>
                <div className="bg-white rounded-xl shadow-xl p-5 max-w-lg w-full max-h-[70vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold" style={{ color: '#1B3A4B' }}>
                            Impact Analysis &mdash; {impact.rootName}
                        </h3>
                        <button className="text-xs px-2 py-1 rounded" style={{ color: '#9CA3AF' }}
                            onClick={() => setShowImpact(false)}>{'\u2715'}</button>
                    </div>

                    {/* Direction selector */}
                    <div className="flex gap-1 mb-3">
                        {(['downstream', 'upstream', 'both'] as ImpactDirection[]).map(d => (
                            <button key={d} className="px-2.5 py-1 text-xs rounded-md capitalize"
                                style={impactDirection === d
                                    ? { background: '#2DD4A8', color: '#FFF' }
                                    : { background: '#F0F0ED', color: '#6B7280' }}
                                onClick={() => setImpactDirection(d)}>
                                {d === 'downstream' ? '\u2193 Downstream' : d === 'upstream' ? '\u2191 Upstream' : '\u2195 Both'}
                            </button>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{ background: '#F0F0ED', color: '#6B7280' }}>
                        {impact.nodes.length} impacted element{impact.nodes.length !== 1 ? 's' : ''} across {maxDepth} depth level{maxDepth !== 1 ? 's' : ''}
                    </div>

                    {/* Root node */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                        style={{ background: (LAYER_COLORS[model.elements[selectedElementId]?.layer] || '#666') + '15',
                                 border: `2px solid ${LAYER_COLORS[model.elements[selectedElementId]?.layer] || '#666'}` }}>
                        <span className="text-xs font-semibold" style={{ color: '#1B3A4B' }}>{impact.rootName}</span>
                        <span className="ml-auto px-1.5 py-0.5 rounded text-xs"
                            style={{ background: '#F0F0ED', color: '#6B7280', fontSize: '9px' }}>{impact.rootKind}</span>
                    </div>

                    {/* Impact nodes grouped by depth */}
                    {impact.nodes.length === 0 ? (
                        <div className="text-center text-xs py-6" style={{ color: '#D1D5DB' }}>No impacted elements found</div>
                    ) : (
                        <div className="space-y-1">
                            {impact.nodes.map(node => (
                                <div key={node.elementId}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs"
                                    style={{
                                        background: '#FAFAF8', border: '1px solid #E5E5E0',
                                        marginLeft: `${(node.depth - 1) * 16}px`,
                                    }}
                                    onClick={() => { selectElement(node.elementId); setShowImpact(false); }}>
                                    <span style={{ color: '#9CA3AF', fontSize: '10px' }}>
                                        {node.direction === 'downstream' ? '\u2192' : '\u2190'}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: LAYER_COLORS[node.layer] || '#666' }} />
                                    <span style={{ color: '#374151' }}>{node.name}</span>
                                    <span className="px-1 py-0.5 rounded"
                                        style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '9px' }}>
                                        {node.viaRelType}
                                    </span>
                                    <span className="ml-auto px-1.5 py-0.5 rounded"
                                        style={{ background: (LAYER_COLORS[node.layer] || '#666') + '12',
                                                 color: LAYER_COLORS[node.layer] || '#666', fontSize: '10px' }}>
                                        {node.kind}
                                    </span>
                                    <span className="tabular-nums" style={{ color: '#D1D5DB', fontSize: '9px' }}>d{node.depth}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-1 overflow-hidden">
            {/* ─── Left: Tree explorer ─────────────────────────────────── */}
            {sidebarCollapsed && (
                <div
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                    style={{ width: '40px', background: '#FAFAF8', borderRight: '1px solid #E5E5E0' }}
                    onClick={toggleSidebar}
                    title="Expand sidebar"
                >
                    <div className="py-3" style={{ color: '#9CA3AF', fontSize: '14px' }}>{'\u25B8'}</div>
                    <div style={{
                        writingMode: 'vertical-rl', textOrientation: 'mixed',
                        color: '#1B3A4B', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                    }}>
                        Explorer
                    </div>
                </div>
            )}
            {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden"
                style={{ width: '440px', minWidth: '380px', maxWidth: '540px', background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>

                {/* Header */}
                <div className="px-3 py-2 flex items-center gap-2"
                    style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E0' }}>
                    <span className="text-base font-semibold flex-1" style={{ color: '#1B3A4B' }}>Explorer</span>
                    {metadata?.version && (
                        <span className="text-xs tabular-nums px-1.5 py-0.5 rounded"
                            style={{ background: '#F0F0ED', color: '#9CA3AF', fontSize: '10px' }}>v{metadata.version}</span>
                    )}
                    <button onClick={() => setShowTagBar(!showTagBar)} className="px-1 py-0.5 rounded"
                        style={{ color: tagFilters.length > 0 ? '#2DD4A8' : '#B0B0A8', fontSize: '11px' }} title="Filter by tags">{'\u2606'}</button>
                    <button onClick={expandAll} className="px-1 py-0.5 rounded"
                        style={{ color: '#B0B0A8', fontSize: '10px' }} title="Expand all">{'\u229E'}</button>
                    <button onClick={collapseAll} className="px-1 py-0.5 rounded"
                        style={{ color: '#B0B0A8', fontSize: '10px' }} title="Collapse all">{'\u229F'}</button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                        className="px-1 py-0.5 rounded"
                        style={{ color: '#B0B0A8', fontSize: '12px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#1B3A4B'}
                        onMouseLeave={e => e.currentTarget.style.color = '#B0B0A8'}
                        title="Collapse sidebar"
                    >
                        {'\u25C2'}
                    </button>
                </div>

                {/* Search */}
                <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
                        style={{ background: '#F5F5F2', border: '1px solid #E5E5E0' }}>
                        <span style={{ color: '#B0B0A8', fontSize: '11px' }}>{'\u2315'}</span>
                        <input type="text" placeholder="Search elements..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1 text-base bg-transparent focus:outline-none" style={{ color: '#1a1a1a' }} />
                        {searchTerm && <button className="text-xs" style={{ color: '#B0B0A8' }} onClick={() => setSearchTerm('')}>{'\u2715'}</button>}
                    </div>
                </div>

                {/* Tag filter */}
                {showTagBar && allTags.length > 0 && (
                    <div className="px-3 py-2 flex flex-wrap gap-1" style={{ borderBottom: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                        {allTags.map(tag => (
                            <button key={tag} className="px-2 py-0.5 text-xs rounded-full"
                                style={tagFilters.includes(tag) ? { background: '#2DD4A8', color: '#FFF' } : { background: '#F0F0ED', color: '#6B7280' }}
                                onClick={() => toggleTagFilter(tag)}>{tag}</button>
                        ))}
                        {tagFilters.length > 0 && <button className="text-xs underline ml-1" style={{ color: '#DC2626' }} onClick={clearTagFilters}>Clear</button>}
                    </div>
                )}

                {/* Tree */}
                <div className="flex-1 overflow-y-auto py-1" onContextMenu={e => handleContextMenu(e)}>
                    {tree.map(node => node.nodeType === 'element' ? renderLeaf(node as LeafNode) : renderFolder(node as FolderNode))}
                    {tree.length === 0 && (
                        <div className="px-4 py-8 text-center text-xs" style={{ color: '#B0B0A8' }}>
                            {searchTerm || tagFilters.length > 0 ? 'No elements match filters' : 'No elements in model'}
                        </div>
                    )}
                </div>

                {/* Save bar */}
                {totalDirty > 0 && (
                    <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #FDE68A', background: '#FFFBEB' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                        <span className="text-xs flex-1" style={{ color: '#92400E' }}>
                            {totalDirty} modified element{totalDirty > 1 ? 's' : ''}
                        </span>
                        <button className="text-xs px-2.5 py-1 rounded font-medium" style={{ background: '#2DD4A8', color: '#FFF' }} onClick={saveAll}>Save all</button>
                        <button className="text-xs px-2 py-1 rounded" style={{ color: '#9CA3AF' }} onClick={discardAll}>Discard</button>
                    </div>
                )}

                {/* Hint + git info */}
                <div className="px-3 py-1.5 flex items-center gap-2 text-xs"
                    style={{ color: '#D1D5DB', borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                    <span className="flex-1">Right-click for groups &amp; tags</span>
                    {metadata?.gitUser && (
                        <span style={{ color: '#B0B0A8' }}>
                            @{metadata.gitUser}
                            {metadata.gitBranch ? ` \u00B7 ${metadata.gitBranch}` : ''}
                        </span>
                    )}
                </div>
            </div>
            )}

            {/* ─── Center: Element detail ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ background: '#F7F7F5' }}>
                {!selectedElement ? (
                    <div className="flex flex-col items-center justify-center h-full" style={{ color: '#B0B0A8', paddingTop: '6%' }}>
                        <img src="/logo.png" alt="" style={{
                            width: '60%', maxWidth: 700, minWidth: 250,
                            opacity: 0.25,
                        }} />
                        <div className="text-base mt-2">Select an element</div>
                    </div>
                ) : (
                    <div className="p-5 max-w-2xl">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-1.5">
                            <span className="w-3 h-3 rounded mt-1 flex-shrink-0"
                                style={{ backgroundColor: LAYER_COLORS[selectedElement.layer] || '#666' }} />
                            <div className="flex-1">
                                <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>{selectedElement.name}</h2>
                                <div className="text-xs" style={{ color: '#B0B0A8' }}>{selectedElement.id}</div>
                            </div>
                            {isDirty(selectedElementId!) && (
                                <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>Modified</span>
                            )}
                        </div>

                        {/* Badges */}
                        <div className="flex gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 text-xs rounded-md font-medium"
                                style={{ background: (LAYER_COLORS[selectedElement.layer] || '#666') + '18', color: LAYER_COLORS[selectedElement.layer] || '#666' }}>
                                {selectedElement.kind}</span>
                            <span className="px-2 py-0.5 text-xs rounded-md" style={{ background: '#F0F0ED', color: '#6B7280' }}>{selectedElement.construct}</span>
                            <span className="px-2 py-0.5 text-xs rounded-md capitalize" style={{ background: '#F0F0ED', color: '#6B7280' }}>{selectedElement.layer}</span>
                            {selectedGroup && (
                                <span className="px-2 py-0.5 text-xs rounded-md" style={{ background: '#6366F118', color: '#6366F1' }}>{'\u2500'} {selectedGroup}</span>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="flex gap-1 mb-4 flex-wrap items-center">
                            {selectedTags.map(t => (
                                <span key={t} className="px-1.5 py-0.5 text-xs rounded-full flex items-center gap-1"
                                    style={{ background: '#2DD4A820', color: '#1B3A4B', fontSize: '10px' }}>
                                    {t}
                                    <button style={{ color: '#9CA3AF', fontSize: '8px' }}
                                        onClick={() => removeTag(selectedElementId!, t)}>{'\u2715'}</button>
                                </span>
                            ))}
                            <button className="px-1.5 py-0.5 text-xs rounded-full"
                                style={{ color: '#B0B0A8', border: '1px dashed #D1D5DB', fontSize: '10px' }}
                                onClick={() => { const tag = prompt('Add tag:'); if (tag) addTag(selectedElementId!, tag); }}>+ tag</button>
                        </div>

                        <EditableField field="doc" label="Description" placeholder="Click to add description..." multiline />
                        <EditableField field="rationale" label="Rationale" placeholder="Why does this element exist?" multiline />
                        <EditableField field="notes" label="Notes" placeholder="Informal observations..." multiline />

                        {/* Attributes */}
                        <div className="mb-3">
                            <h3 className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Attributes</h3>
                            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                {Object.entries(selectedElement.attributes)
                                    .filter(([k]) => !['name', 'group', 'tags', 'labels', 'rationale', 'notes', 'discussion'].includes(k))
                                    .map(([k, v]) => {
                                        const attrDirty = isDirty(selectedElementId!, k);
                                        const displayVal = getDirtyValue(selectedElementId!, k) ?? v;
                                        return (
                                            <div key={k} className="flex px-3 py-1.5 text-xs"
                                                style={{ background: attrDirty ? '#FFFBEB' : '#FFF', borderBottom: '1px solid #F0F0ED' }}>
                                                <span className="w-28 flex-shrink-0 flex items-center gap-1" style={{ color: '#6B7280' }}>
                                                    {k} {attrDirty && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#F59E0B' }} />}
                                                </span>
                                                {editingField === `attr:${k}` ? (
                                                    <input type="text" className="flex-1 px-1 rounded border text-xs" style={{ borderColor: '#2DD4A8' }}
                                                        value={editValue} onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { markDirty(selectedElementId!, k, editValue); setEditingField(null); } if (e.key === 'Escape') setEditingField(null); }}
                                                        onBlur={() => { markDirty(selectedElementId!, k, editValue); setEditingField(null); }} autoFocus />
                                                ) : (
                                                    <span className="cursor-text flex-1" style={{ color: '#1a1a1a' }}
                                                        onClick={() => { setEditingField(`attr:${k}`); setEditValue(displayVal); }}>{displayVal}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                {Object.entries(selectedElement.attributes)
                                    .filter(([k]) => !['name', 'group', 'tags', 'labels', 'rationale', 'notes', 'discussion'].includes(k)).length === 0 && (
                                    <div className="px-3 py-2 text-xs" style={{ color: '#D1D5DB', background: '#FFF' }}>No attributes</div>
                                )}
                            </div>
                        </div>

                        {/* Relationships */}
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <h3 className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Relationships ({relationships.length})</h3>
                                <button className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#2563EB', background: '#EFF6FF' }}
                                    onClick={() => setShowRelGraph(true)}>Graph</button>
                                <button className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#7C3AED', background: '#F5F3FF' }}
                                    onClick={() => setShowImpact(true)}>Impact</button>
                                <button className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#2563EB', background: '#EFF6FF' }}
                                    onClick={() => setShowAddRel(!showAddRel)}>+ Add</button>
                            </div>

                            {showAddRel && (
                                <div className="p-2.5 mb-2 rounded-lg" style={{ background: '#FFF', border: '1px solid #2DD4A8' }}>
                                    <div className="flex gap-2 items-center mb-1.5">
                                        <select className="text-xs px-2 py-1 rounded border flex-1" style={{ borderColor: '#E5E5E0' }}
                                            value={newRelType} onChange={e => setNewRelType(e.target.value)}>
                                            <option value="">Type...</option>
                                            {allRelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <select className="text-xs px-2 py-1 rounded border flex-1" style={{ borderColor: '#E5E5E0' }}
                                            value={newRelTarget} onChange={e => setNewRelTarget(e.target.value)}>
                                            <option value="">Target...</option>
                                            {allElementIds.filter(id => id !== selectedElementId).map(id => {
                                                const el = model!.elements[id];
                                                return <option key={id} value={id}>{el.name} ({el.kind})</option>;
                                            })}
                                        </select>
                                        <button className="px-2.5 py-1 text-xs rounded-md font-medium"
                                            style={{ background: newRelType && newRelTarget ? '#2DD4A8' : '#E5E5E0', color: newRelType && newRelTarget ? '#FFF' : '#9CA3AF' }}
                                            disabled={!newRelType || !newRelTarget} onClick={handleAddRelationship}>Add</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                {relationships.map(rel => {
                                    const isOut = rel.sourceId === selectedElementId;
                                    const otherId = isOut ? rel.targetId : rel.sourceId;
                                    const other = model?.elements[otherId];
                                    const oColor = other ? (LAYER_COLORS[other.layer] || '#666') : '#666';
                                    return (
                                        <div key={rel.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer"
                                            style={{ background: '#FFF', border: '1px solid #E5E5E0' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F2')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#FFF')}
                                            onClick={() => selectElement(otherId)}>
                                            <span style={{ color: '#9CA3AF', fontSize: '10px' }}>{isOut ? '\u2192' : '\u2190'}</span>
                                            <span className="px-1.5 py-0.5 rounded"
                                                style={{ color: isOut ? '#2563EB' : '#10B981', background: isOut ? '#EFF6FF' : '#ECFDF5', fontSize: '10px' }}>{rel.type}</span>
                                            <span className="truncate flex-1" style={{ color: '#374151' }}>{other?.name || otherId}</span>
                                            {other && <span className="flex-shrink-0 px-1.5 py-0.5 rounded"
                                                style={{ background: oColor + '12', color: oColor, fontSize: '9px' }}>{other.kind}</span>}
                                        </div>
                                    );
                                })}
                                {relationships.length === 0 && <div className="text-xs px-3 py-2" style={{ color: '#D1D5DB' }}>No relationships</div>}
                            </div>
                        </div>

                        {/* Violations */}
                        {validation && (() => {
                            const viol = validation.violations.filter(v => v.elementId === selectedElementId);
                            if (viol.length === 0) return <div className="text-xs flex items-center gap-1 mb-3" style={{ color: '#10B981' }}>{'\u2713'} All rules satisfied</div>;
                            return (
                                <div className="mb-3">
                                    <h3 className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Guidance</h3>
                                    {viol.map((v, i) => (
                                        <div key={`${v.ruleId}-${i}`} className="text-xs p-2 rounded-lg mb-1" style={{
                                            background: v.severity === 'error' ? '#FEF2F2' : '#FFFBEB',
                                            border: `1px solid ${v.severity === 'error' ? '#FECACA' : '#FDE68A'}`,
                                            color: v.severity === 'error' ? '#DC2626' : '#D97706',
                                        }}>{v.description} <span style={{ color: '#9CA3AF' }}>[{v.ruleId}]</span></div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Source + discussion toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs flex-1" style={{ color: '#D1D5DB' }}>{selectedElement.file}</span>
                            <button className="text-xs px-2 py-1 rounded"
                                style={{ color: showDiscussion ? '#2DD4A8' : '#9CA3AF', background: showDiscussion ? '#2DD4A80D' : 'transparent' }}
                                onClick={() => setShowDiscussion(!showDiscussion)}>
                                Discussion {selectedElement.attributes['discussion'] ? `(${selectedElement.attributes['discussion'].split('\n').filter(Boolean).length})` : ''}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Right: Discussion sidebar ───────────────────────────── */}
            {showDiscussion && selectedElement && (
                <div className="flex flex-col overflow-hidden"
                    style={{ width: '320px', minWidth: '280px', background: '#FFFFFF', borderLeft: '1px solid #E5E5E0' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E0' }}>
                        <span className="text-xs font-semibold flex-1" style={{ color: '#1B3A4B' }}>Discussion</span>
                        <button className="text-xs" style={{ color: '#9CA3AF' }} onClick={() => setShowDiscussion(false)}>{'\u2715'}</button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {(fieldValue('discussion') || '').split('\n').filter(Boolean).map((line, i) => {
                            const match = line.match(/^\[(\d{4}-\d{2}-\d{2})\s*@?([^\]]*)\]\s*(.*)/);
                            return (
                                <div key={i} className="px-3 py-2.5" style={{ borderBottom: '1px solid #F0F0ED' }}>
                                    {match ? (
                                        <>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-xs font-medium" style={{ color: '#374151' }}>@{match[2] || 'user'}</span>
                                                <span className="text-xs" style={{ color: '#D1D5DB' }}>{match[1]}</span>
                                            </div>
                                            <div className="text-xs" style={{ color: '#4B5563' }}>{match[3]}</div>
                                        </>
                                    ) : (
                                        <div className="text-xs" style={{ color: '#4B5563' }}>{line}</div>
                                    )}
                                </div>
                            );
                        })}
                        {!(fieldValue('discussion')).trim() && (
                            <div className="px-3 py-6 text-center text-xs" style={{ color: '#D1D5DB' }}>No comments yet</div>
                        )}
                    </div>

                    <div className="px-3 py-2" style={{ borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                        <div className="flex items-center gap-1.5">
                            <input type="text" placeholder="Add comment..."
                                className="flex-1 text-xs px-2 py-1.5 rounded border focus:outline-none"
                                style={{ borderColor: '#E5E5E0', background: '#FFF' }}
                                value={newComment} onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addDiscussionComment(); }} />
                            <button className="text-xs px-2 py-1.5 rounded font-medium"
                                style={{ background: newComment.trim() ? '#2DD4A8' : '#E5E5E0', color: newComment.trim() ? '#FFF' : '#9CA3AF' }}
                                disabled={!newComment.trim()} onClick={addDiscussionComment}>Post</button>
                        </div>
                        {metadata?.gitUser && <div className="text-xs mt-1" style={{ color: '#D1D5DB' }}>Posting as @{metadata.gitUser}</div>}
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}
                    target={ctxMenu} availableGroups={ctxAvailableGroups}
                    element={ctxElement} elementTags={ctxElement ? getElementTags(ctxElement) : []}
                    onCreateGroup={(kind, name) => { if (ctxMenu.elementId) moveToGroup(ctxMenu.elementId, name); }}
                    onMoveToGroup={moveToGroup} onRemoveFromGroup={removeFromGroup}
                    onAddTag={addTag} onRemoveTag={removeTag}
                    onDeleteGroup={deleteGroup} onRenameGroup={renameGroup}
                    onCollapseAll={collapseAll} onExpandAll={expandAll}
                />
            )}

            {/* Relationship Graph Popup */}
            <RelGraphPopup />

            {/* Impact Analysis Modal */}
            <ImpactModal />
        </div>
    );
}
