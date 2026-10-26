// ─── Authoring trace links from the matrix ────────────────────────────────────
//
// With editing on, a cell can be inspected, a link removed, or one added. The types offered for a pair are the
// ones the ontology says are legal between the two kinds, so a link offered here is a link the server accepts.
// This owns the focused cell and the writes; the inspector panel only shows what it is given.

import { useCallback, useMemo, useState } from 'react';
import { legalRelationshipTypes, type LegalRelationshipOption, type MemoModelDTO, type MemoRelationship } from '@memoarchitect/tools/browser';
import { getRegistries, useModelStore } from '../store/model-store';
import type { DsmAggregateCell, DsmAxisEntry } from '../analysis/dsm-hierarchy';
import { isRemovable } from './relationship-removable';

export interface CellFocus {
    row: DsmAxisEntry;
    column: DsmAxisEntry;
    cell: DsmAggregateCell | null;
}

export type EditStatus = { kind: 'ok' | 'error'; message: string } | null;

export interface TraceLinkEditingOptions {
    model: MemoModelDTO | null;
    /** The relations the matrix counts (empty means any). */
    activeTypes: readonly string[];
    editing: boolean;
}

export function useTraceLinkEditing({ model, activeTypes, editing }: TraceLinkEditingOptions) {
    const connected = useModelStore(s => s.connected);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const createRelationship = useModelStore(s => s.createRelationship);
    const deleteRelationship = useModelStore(s => s.deleteRelationship);
    const registries = useMemo(() => getRegistries(model), [model]);

    const [focus, setFocus] = useState<CellFocus | null>(null);
    const [status, setStatus] = useState<EditStatus>(null);
    const [linkQuery, setLinkQuery] = useState('');
    const [busy, setBusy] = useState(false);

    /** The relationship objects behind the focused cell, in model order. */
    const focusedRelationships = useMemo<MemoRelationship[]>(() => {
        if (!model || !focus) return [];
        // Resolved against the live model, not against the cell captured when the user clicked: adding or
        // removing a link has to be visible in the panel that did it, and the matrix behind it has moved on.
        const rowId = focus.row.node.id;
        const columnId = focus.column.node.id;
        const leafPair = focus.row.node.children.length === 0 && focus.column.node.children.length === 0;
        if (leafPair) {
            const types = new Set(activeTypes);
            return model.relationships.filter(rel =>
                (types.size === 0 || types.has(rel.type))
                && ((rel.sourceId === rowId && rel.targetId === columnId)
                    || (rel.sourceId === columnId && rel.targetId === rowId)));
        }
        // An aggregate mark has no single pair to resolve, so it keeps the ids the roll-up gave it.
        const ids = new Set(focus.cell?.relationshipIds ?? []);
        return model.relationships.filter(rel => ids.has(rel.id));
    }, [model, focus, activeTypes]);

    /** Link types legal between the focused pair. Only leaf-to-leaf cells can be authored. */
    const legalOptions = useMemo<LegalRelationshipOption[]>(() => {
        if (!model || !focus || !registries) return [];
        const source = model.elements[focus.row.node.id];
        const target = model.elements[focus.column.node.id];
        if (!source || !target || source.id === target.id) return [];
        return legalRelationshipTypes(source, target, registries);
    }, [model, focus, registries]);

    /** The types the matrix reads as trace go first and are marked: those are the links that show up here. */
    const traceTypes = useMemo(() => {
        const names = new Set<string>();
        for (const type of activeTypes) {
            names.add(type);
            names.add(type.charAt(0).toUpperCase() + type.slice(1));
        }
        return names;
    }, [activeTypes]);

    const rankedOptions = useMemo(() => {
        const needle = linkQuery.trim().toLowerCase();
        return legalOptions
            .filter(option => !needle || option.definition.name.toLowerCase().includes(needle))
            .sort((a, b) => {
                const preference = Number(traceTypes.has(b.definition.name)) - Number(traceTypes.has(a.definition.name));
                return preference !== 0 ? preference : a.definition.name.localeCompare(b.definition.name);
            });
    }, [legalOptions, linkQuery, traceTypes]);

    const editable = Boolean(
        focus && focus.row.node.isElement && focus.column.node.isElement
        && !focus.row.expanded && !focus.column.expanded
        && focus.row.node.children.length === 0 && focus.column.node.children.length === 0,
    );

    const addLink = useCallback(async (option: LegalRelationshipOption) => {
        setBusy(true);
        setStatus(null);
        const outcome = await createRelationship({
            type: option.definition.name, sourceId: option.sourceId, targetId: option.targetId,
            direction: option.direction, diagramId: selectedDiagramId ?? undefined,
        });
        setBusy(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Trace written to ${outcome.sourceFile ?? 'the model'}.` }
            : { kind: 'error', message: outcome.error ?? 'The trace could not be created.' });
    }, [createRelationship, selectedDiagramId]);

    const removeLink = useCallback(async (relationshipId: string) => {
        setBusy(true);
        setStatus(null);
        const outcome = await deleteRelationship(relationshipId);
        setBusy(false);
        setStatus(outcome.success
            ? { kind: 'ok', message: `Trace removed from ${outcome.sourceFile ?? 'the model'}.` }
            : { kind: 'error', message: outcome.error ?? 'The trace could not be removed.' });
    }, [deleteRelationship]);

    /** Double-click: toggle the one relation the matrix counts, when it names exactly one. */
    const toggleTrace = useCallback(async (row: DsmAxisEntry, column: DsmAxisEntry) => {
        if (!editing || !connected || !model || !registries
            || !row.node.isElement || !column.node.isElement
            || row.node.children.length > 0 || column.node.children.length > 0
            || row.node.id === column.node.id) return;
        // A direct toggle is safe only when the filter names one concrete relationship; otherwise the
        // inspector lets the person choose instead of inventing a type.
        if (activeTypes.length !== 1) return;
        const type = activeTypes[0];
        const existing = model.relationships.find(rel => rel.type === type
            && ((rel.sourceId === row.node.id && rel.targetId === column.node.id)
                || (rel.sourceId === column.node.id && rel.targetId === row.node.id)));
        if (existing) {
            if (!isRemovable(existing)) {
                setStatus({ kind: 'error', message: 'This trace has neither a declared name nor a recorded source range, so it cannot be removed from here.' });
                return;
            }
            await removeLink(existing.id);
            return;
        }
        const source = model.elements[row.node.id];
        const target = model.elements[column.node.id];
        if (!source || !target) return;
        const option = legalRelationshipTypes(source, target, registries).find(candidate => candidate.definition.name === type);
        if (!option) {
            setStatus({ kind: 'error', message: `${type} is not legal between these element types.` });
            return;
        }
        await addLink(option);
    }, [editing, connected, model, registries, activeTypes, addLink, removeLink]);

    const inspect = useCallback((next: CellFocus | null) => { setFocus(next); setLinkQuery(''); }, []);

    return {
        focus, inspect, status, linkQuery, setLinkQuery, busy, editable, connected,
        focusedRelationships, legalOptions, rankedOptions, traceTypes,
        addLink, removeLink, toggleTrace,
    };
}
