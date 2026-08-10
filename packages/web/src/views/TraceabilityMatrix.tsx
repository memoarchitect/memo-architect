// ─── Traceability Matrix ─────────────────────────────────────────────────────
//
// The sibling of the DSM, and deliberately a separate feature: the DSM is for
// *reading* the dependency structure, this is for *establishing* trace. Same
// hierarchical grid, but every cell is editable — click an empty one to link
// the two elements, click a linked one to see and remove what joins them.
//
// Authoring goes through the ontology, never through a list kept here: the
// types offered for a pair are the ones `legalRelationshipTypes` says are legal
// between those two kinds, so a link this view offers is a link the server
// accepts. Presets only pre-fill the pickers — the user can go anywhere from
// there, which is what makes this usable outside the regulated templates.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    legalRelationshipTypes,
    type LegalRelationshipOption,
    type MemoRelationship,
} from '@memoarchitect/tools/browser';
import { getRegistries, useModelStore } from '../store/model-store';
import {
    computeHierarchicalDSM,
    collectNodeIds,
    layersInModel,
    relationshipTypesInModel,
    suggestTraceLayers,
    type DsmAggregateCell,
    type DsmAxisEntry,
    type DsmOrdering,
} from '../analysis/dsm-hierarchy';
import { AxisControlGroup } from './DSMView';
import { HierarchicalMatrix, type MatrixCellStyle } from '../components/HierarchicalMatrix';
import { TypeFilterSelect, type TypeFilterOption } from '../components/TypeFilterSelect';
import { elementFilterOptions } from '../components/element-options';
import { AxisScopeSelect, type AxisScope } from '../components/AxisScopeSelect';
import { ToolbarPopover } from '../components/ToolbarPopover';
import { Icon, IconToggle } from './DiagramToolbarControls';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

// ─── Presets ─────────────────────────────────────────────────────────────────

interface MatrixPreset {
    id: string;
    label: string;
    description: string;
    rowKinds: string[];
    columnKinds: string[];
    linkTypes: string[];
}

/**
 * Starting points, not modes. Each one fills the three pickers; changing a
 * picker afterwards simply leaves the preset behind.
 */
const PRESETS: MatrixPreset[] = [
    {
        id: 'risk-control',
        label: 'ISO 14971: Risk → Control',
        description: 'Hazards and hazardous situations traced to risk controls',
        rowKinds: ['Hazard', 'HazardousSituation'],
        columnKinds: ['RiskControlMeasure', 'SafetyGoal'],
        linkTypes: ['mitigates', 'tracesRisk', 'causes', 'leadsTo'],
    },
    {
        id: 'req-test',
        label: 'IEC 62304: Requirement → Test',
        description: 'Software requirements traced to verification tests',
        rowKinds: ['Requirement', 'SoftwareRequirement', 'SystemRequirement'],
        columnKinds: ['Test', 'TestCase', 'VerificationCase', 'VerificationActivity'],
        linkTypes: ['verifiedBy', 'satisfiedBy', 'validates'],
    },
    {
        id: 'req-function',
        label: 'Requirement → Function',
        description: 'Requirements traced to the functions that satisfy them',
        rowKinds: ['Requirement', 'SystemRequirement'],
        columnKinds: ['Function', 'SystemFunction', 'ComponentFunction'],
        linkTypes: ['satisfiedBy', 'derivesFrom'],
    },
    {
        id: 'function-component',
        label: 'Function → Component',
        description: 'Functions allocated to logical and physical components',
        rowKinds: ['Function', 'SystemFunction', 'ComponentFunction'],
        columnKinds: ['LogicalComponent', 'SoftwareModule', 'MechanicalPart', 'Component'],
        linkTypes: ['allocatedTo', 'realizes'],
    },
    {
        id: 'everything',
        label: 'Everything',
        description: 'Every element against every element, every relationship',
        rowKinds: [],
        columnKinds: [],
        linkTypes: [],
    },
];

// ─── View ────────────────────────────────────────────────────────────────────

interface CellFocus {
    row: DsmAxisEntry;
    column: DsmAxisEntry;
    cell: DsmAggregateCell | null;
}

type Status = { kind: 'ok' | 'error'; message: string } | null;

export function TraceabilityMatrix() {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const createRelationship = useModelStore(s => s.createRelationship);
    const deleteRelationship = useModelStore(s => s.deleteRelationship);

    const [rowScope, setRowScope] = useState<AxisScope>({});
    const [columnScope, setColumnScope] = useState<AxisScope>({});
    const [rowElements, setRowElements] = useState<string[]>([]);
    const [columnElements, setColumnElements] = useState<string[]>([]);
    const [linkTypes, setLinkTypes] = useState<string[]>([]);
    const [rowOrdering, setRowOrdering] = useState<DsmOrdering>('natural');
    const [columnOrdering, setColumnOrdering] = useState<DsmOrdering>('natural');
    const [activeAxisFilter, setActiveAxisFilter] = useState<'rows' | 'columns' | null>(null);
    const [toolbarPlacement, setToolbarPlacement] = useState<'top' | 'left'>('top');
    const [editing, setEditing] = useState(false);
    const [cellSize, setCellSize] = useState(39);
    const [showColumnNames, setShowColumnNames] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
    const [focus, setFocus] = useState<CellFocus | null>(null);
    const [status, setStatus] = useState<Status>(null);
    const [linkQuery, setLinkQuery] = useState('');
    const [busy, setBusy] = useState(false);

    const registries = useMemo(() => getRegistries(model), [model]);

    const layers = useMemo(() => (model ? layersInModel(model) : []), [model]);

    const rowElementOptions = useMemo(() => elementFilterOptions(model, rowScope), [model, rowScope]);
    const columnElementOptions = useMemo(() => elementFilterOptions(model, columnScope), [model, columnScope]);

    /** Only offer relationships that the ontology permits for a visible axis pair. */
    const legalLinkOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model || !registries) return [];
        const matchesScope = (element: { id: string; layer: string; kind: string }, scope: AxisScope, picked: string[]) =>
            (!scope.layer || element.layer === scope.layer)
            && (!scope.kind || element.kind === scope.kind)
            && (picked.length === 0 || picked.includes(element.id));
        const rowCandidates = Object.values(model.elements).filter(element => matchesScope(element, rowScope, rowElements));
        const columnCandidates = Object.values(model.elements).filter(element => matchesScope(element, columnScope, columnElements));
        const names = new Set<string>();
        for (const row of rowCandidates) {
            for (const column of columnCandidates) {
                if (row.id === column.id) continue;
                for (const option of legalRelationshipTypes(row, column, registries)) names.add(option.definition.name);
            }
        }
        const counts = new Map<string, number>();
        for (const relation of model.relationships) counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
        return [...names].sort().map(value => ({ value, hint: String(counts.get(value) ?? 0), color: relationshipColor(value) }));
    }, [model, registries, rowScope, columnScope, rowElements, columnElements]);

    // Narrowing the kinds must narrow the picked elements with them, or the
    // axis would keep showing something the kind filter no longer allows.
    useEffect(() => {
        const allowed = new Set(rowElementOptions.map(option => option.value));
        setRowElements(current => current.every(id => allowed.has(id)) ? current : current.filter(id => allowed.has(id)));
    }, [rowElementOptions]);
    useEffect(() => {
        const allowed = new Set(columnElementOptions.map(option => option.value));
        setColumnElements(current => current.every(id => allowed.has(id)) ? current : current.filter(id => allowed.has(id)));
    }, [columnElementOptions]);

    useEffect(() => {
        const allowed = new Set(legalLinkOptions.map(option => option.value));
        setLinkTypes(current => current.every(type => allowed.has(type)) ? current : current.filter(type => allowed.has(type)));
    }, [legalLinkOptions]);

    const result = useMemo(() => {
        if (!model) return null;
        return computeHierarchicalDSM(model, {
            rows: { layer: rowScope.layer, kinds: rowScope.kind ? [rowScope.kind] : [], elementIds: rowElements, expanded: expandedRows, ordering: rowOrdering },
            columns: { layer: columnScope.layer, kinds: columnScope.kind ? [columnScope.kind] : [], elementIds: columnElements, expanded: expandedColumns, ordering: columnOrdering },
            dependencyTypes: linkTypes,
            // Trace is read as a link between two elements, not as a direction:
            // a requirement verified by a test and a test verifying a
            // requirement are the same coverage fact.
            symmetric: true,
        });
    }, [model, rowScope, columnScope, rowElements, columnElements, linkTypes, rowOrdering, columnOrdering, expandedRows, expandedColumns]);

    // Trace is a cross-layer question, so the matrix opens on whichever two
    // layers this model actually links across the most — requirements against
    // verification in one project, functions against components in another.
    const [seeded, setSeeded] = useState(false);
    useEffect(() => {
        if (seeded || !model) return;
        const suggestion = suggestTraceLayers(model);
        if (!suggestion.rows) return;
        setRowScope({ layer: suggestion.rows });
        setColumnScope({ layer: suggestion.columns });
        setSeeded(true);
    }, [model, seeded]);

    const [expandedSeeded, setExpandedSeeded] = useState(false);
    useEffect(() => {
        if (expandedSeeded || !seeded || !result) return;
        const rows = result.rowRoots.filter(node => node.children.length > 0).map(node => node.id);
        const columns = result.columnRoots.filter(node => node.children.length > 0).map(node => node.id);
        if (rows.length === 0 && columns.length === 0) return;
        setExpandedRows(new Set(rows));
        setExpandedColumns(new Set(columns));
        setExpandedSeeded(true);
    }, [result, seeded, expandedSeeded]);

    const setAxisExpansion = useCallback((axis: 'rows' | 'columns', next: Set<string>) => {
        if (axis === 'rows') setExpandedRows(next);
        else setExpandedColumns(next);
    }, []);
    const expandAxis = useCallback((axis: 'rows' | 'columns') => {
        if (!result) return;
        setAxisExpansion(axis, new Set(collectNodeIds(axis === 'rows' ? result.rowRoots : result.columnRoots)));
    }, [result, setAxisExpansion]);
    const collapseAxis = useCallback((axis: 'rows' | 'columns') => setAxisExpansion(axis, new Set()), [setAxisExpansion]);
    const expandAxisToDepth = useCallback((axis: 'rows' | 'columns', depth: number) => {
        if (!result) return;
        setAxisExpansion(axis, new Set(collectNodeIds(axis === 'rows' ? result.rowRoots : result.columnRoots, depth)));
    }, [result, setAxisExpansion]);

    /**
     * A preset names kinds; the axis takes one. The first kind the model
     * actually has wins, and the axis is set to that kind's own layer — so a
     * preset can never assemble the mixed axis the pickers refuse to.
     */
    const scopeForKinds = useCallback((candidates: string[]): AxisScope | null => {
        if (!model) return null;
        for (const kind of candidates) {
            const element = Object.values(model.elements).find(entry => entry.kind === kind);
            if (element) return { layer: element.layer, kind };
        }
        return null;
    }, [model]);

    const applyPreset = useCallback((preset: MatrixPreset) => {
        const types = new Set(model ? relationshipTypesInModel(model) : []);
        const rows = scopeForKinds(preset.rowKinds);
        const columns = scopeForKinds(preset.columnKinds);
        if (preset.id === 'everything') {
            // Empty kinds are meaningful here: use every element, rather than
            // leaving the scopes from the previously selected preset behind.
            setRowScope({});
            setColumnScope({});
        } else {
            if (rows) setRowScope(rows);
            if (columns) setColumnScope(columns);
        }
        setLinkTypes(preset.linkTypes.filter(type => types.has(type)));
        // A preset redefines what the axes are about, so any hand-picked
        // elements from the previous configuration no longer apply.
        setRowElements([]);
        setColumnElements([]);
        setFocus(null);
    }, [model, scopeForKinds]);

    // ── Editing ──────────────────────────────────────────────────────────────

    /** The relationship objects behind a focused cell, in model order. */
    const focusedRelationships = useMemo<MemoRelationship[]>(() => {
        if (!model || !focus) return [];
        // Resolved against the live model, not against the cell captured when
        // the user clicked: adding or removing a link has to be visible in the
        // panel that did it, and the matrix behind it has already moved on.
        const rowId = focus.row.node.id;
        const columnId = focus.column.node.id;
        const leafPair = focus.row.node.children.length === 0 && focus.column.node.children.length === 0;
        if (leafPair) {
            const types = new Set(linkTypes);
            return model.relationships.filter(rel =>
                (types.size === 0 || types.has(rel.type))
                && ((rel.sourceId === rowId && rel.targetId === columnId)
                    || (rel.sourceId === columnId && rel.targetId === rowId)));
        }
        // An aggregate mark has no single pair to resolve, so it keeps the
        // relationship ids the roll-up gave it.
        const ids = new Set(focus.cell?.relationshipIds ?? []);
        return model.relationships.filter(rel => ids.has(rel.id));
    }, [model, focus, linkTypes]);

    /**
     * Link types legal between the focused pair. Only leaf-to-leaf cells can be
     * authored: when either side is a collapsed subsystem the mark stands for
     * several elements and there is no single pair for a new link to join.
     */
    const legalOptions = useMemo<LegalRelationshipOption[]>(() => {
        if (!model || !focus || !registries) return [];
        const source = model.elements[focus.row.node.id];
        const target = model.elements[focus.column.node.id];
        if (!source || !target || source.id === target.id) return [];
        return legalRelationshipTypes(source, target, registries);
    }, [model, focus, registries]);

    /**
     * The ontology is generous: dozens of relations are legal between any two
     * MemoParts, and an unranked list buries the one the user came for. The
     * types the matrix is currently reading as trace go first and are marked,
     * because those are the links that will actually show up in this view.
     */
    const traceTypes = useMemo(() => {
        const names = new Set<string>();
        for (const type of linkTypes) {
            names.add(type);
            names.add(type.charAt(0).toUpperCase() + type.slice(1));
        }
        return names;
    }, [linkTypes]);

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
        focus
        && focus.row.node.isElement
        && focus.column.node.isElement
        && !focus.row.expanded
        && !focus.column.expanded
        && focus.row.node.children.length === 0
        && focus.column.node.children.length === 0,
    );

    const addLink = useCallback(async (option: LegalRelationshipOption) => {
        setBusy(true);
        setStatus(null);
        const outcome = await createRelationship({
            type: option.definition.name,
            sourceId: option.sourceId,
            targetId: option.targetId,
            direction: option.direction,
            diagramId: selectedDiagramId ?? undefined,
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

    const toggleTrace = useCallback(async (row: DsmAxisEntry, column: DsmAxisEntry, cell: DsmAggregateCell | null) => {
        if (!editing || !connected || !model || !registries
            || !row.node.isElement || !column.node.isElement
            || row.node.children.length > 0 || column.node.children.length > 0
            || row.node.id === column.node.id) return;

        // A direct toggle is safe only when the active relation filter names
        // one concrete relationship. Otherwise the inspector lets the user
        // choose instead of inventing a type.
        if (linkTypes.length !== 1) return;
        const type = linkTypes[0];
        const existing = model.relationships.find(rel => rel.type === type
            && ((rel.sourceId === row.node.id && rel.targetId === column.node.id)
                || (rel.sourceId === column.node.id && rel.targetId === row.node.id)));
        if (existing) {
            if (existing.named === false) {
                setStatus({ kind: 'error', message: 'This trace has no declared name, so it cannot be removed until it is named in SysML.' });
                return;
            }
            await removeLink(existing.id);
            return;
        }
        const source = model.elements[row.node.id];
        const target = model.elements[column.node.id];
        if (!source || !target) return;
        const option = legalRelationshipTypes(source, target, registries)
            .find(candidate => candidate.definition.name === type);
        if (!option) {
            setStatus({ kind: 'error', message: `${type} is not legal between these element types.` });
            return;
        }
        await addLink(option);
    }, [editing, connected, model, registries, linkTypes, addLink, removeLink]);

    // ── Rendering ────────────────────────────────────────────────────────────

    const renderCell = useCallback((cell: DsmAggregateCell | null, row: DsmAxisEntry, column: DsmAxisEntry): MatrixCellStyle => {
        // Traceability has no meaningful self-link diagonal. Keeping it blank
        // avoids presenting an internal roll-up count as a trace link.
        if (cell?.diagonal) return {};
        if (cell) {
            // Trace is a coverage fact rather than a relationship taxonomy:
            // use DSM's green dependency palette consistently for every mark.
            const color = '#65A30D';
            const intensity = Math.min(0.14 + cell.strength * 0.13, 0.55);
            return {
                // A check means exactly one trace. A number is only shown
                // when this pair (or a collapsed subtree) contains 2+ links.
                text: cell.strength === 1 ? '✓' : String(cell.strength),
                color,
                background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                title: `${row.node.name} ↔ ${column.node.name}\n${cell.types.join(', ')}${editing ? '\nClick to inspect or remove' : ''}`,
            };
        }
        if (!editing) return {};
        const linkable = row.node.isElement && column.node.isElement
            && row.node.children.length === 0 && column.node.children.length === 0
            && row.node.id !== column.node.id;
        return linkable
            ? { actionable: true, title: `Click to trace ${row.node.name} → ${column.node.name}` }
            : {};
    }, [editing]);

    const coverage = useMemo(() => {
        if (!result) return { traced: 0, total: 0 };
        const leafRows = result.rows.filter(entry => entry.node.children.length === 0);
        const traced = leafRows.filter((entry) => {
            const index = result.rows.indexOf(entry);
            return result.matrix[index].some(cell => cell && !cell.diagonal);
        }).length;
        return { traced, total: leafRows.length };
    }, [result]);

    if (!model || !result) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                No model loaded
            </div>
        );
    }

    const leftToolbar = toolbarPlacement === 'left';

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FAFAF8', position: 'relative' }}>
            {/* ── Toolbar ── */}
            <div style={leftToolbar
                ? { position: 'absolute', inset: '0 auto 0 0', width: '250px', zIndex: 30, overflow: 'auto', borderRight: `1px solid ${COLOR.border}`, background: COLOR.surface }
                : { borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface, position: 'relative' }}>
                <div className="flex items-center gap-3 px-4 py-2" style={leftToolbar
                    ? { flexDirection: 'column', alignItems: 'stretch', position: 'relative', paddingTop: '54px' }
                    : { flexWrap: 'wrap', position: 'relative', paddingRight: '52px' }}>
                    <span style={{ position: 'absolute', top: '9px', right: '12px' }}>
                        <IconToggle
                            icon={leftToolbar ? <Icon.arrowUp /> : <Icon.panelCollapse />}
                            onClick={() => setToolbarPlacement(current => current === 'top' ? 'left' : 'top')}
                            title={leftToolbar ? 'Move toolbar to top' : 'Move toolbar to left'}
                        />
                    </span>
                    <AxisControlGroup
                        axis="rows" layers={layers} scope={rowScope} onScopeChange={setRowScope}
                        elements={rowElements} onElementsChange={setRowElements} elementOptions={rowElementOptions}
                        ordering={rowOrdering} onOrderingChange={setRowOrdering}
                        onExpandAll={expandAxis} onCollapseAll={collapseAxis} onExpandToDepth={expandAxisToDepth}
                        leftDock={leftToolbar} filterOpen={activeAxisFilter === 'rows'}
                        onFilterOpenChange={open => setActiveAxisFilter(open ? 'rows' : null)} parentOf={new Map()}
                    />
                    <AxisControlGroup
                        axis="columns" layers={layers} scope={columnScope} onScopeChange={setColumnScope}
                        elements={columnElements} onElementsChange={setColumnElements} elementOptions={columnElementOptions}
                        ordering={columnOrdering} onOrderingChange={setColumnOrdering}
                        onExpandAll={expandAxis} onCollapseAll={collapseAxis} onExpandToDepth={expandAxisToDepth}
                        leftDock={leftToolbar} filterOpen={activeAxisFilter === 'columns'}
                        onFilterOpenChange={open => setActiveAxisFilter(open ? 'columns' : null)} parentOf={new Map()}
                    />
                    <div style={{
                        display: 'grid', gridTemplateColumns: leftToolbar ? '1fr' : 'max-content max-content max-content', gridTemplateRows: 'auto auto',
                        alignItems: 'center', columnGap: '10px', rowGap: '5px', padding: '6px 8px',
                        border: `1px solid ${COLOR.border}`, borderRadius: '9px', background: '#FAFBFC',
                    }}>
                        <ToolbarPopover label={<><Icon.filter /> Relations</>} ariaLabel="Filter trace relationships" title="Relationships counted as trace" width={leftToolbar ? 210 : 260} fullWidth={leftToolbar}>
                            <TypeFilterSelect label="Trace relationships" allLabel="Any relationship" options={legalLinkOptions} selected={linkTypes} onChange={setLinkTypes} title="Relationships counted as trace" />
                        </ToolbarPopover>
                        <ToolbarPopover label="Presets" ariaLabel="Traceability presets" title="Choose a traceability starting point" width={leftToolbar ? 210 : 270} fullWidth={leftToolbar}>
                            {PRESETS.map(preset => (
                                <button key={preset.id} onClick={() => applyPreset(preset)} title={preset.description} style={{
                                    padding: '6px 7px', border: 'none', borderRadius: '5px', background: 'transparent', cursor: 'pointer', fontSize: FONT.xs, color: COLOR.primary, textAlign: 'left',
                                }}>{preset.label}</button>
                            ))}
                        </ToolbarPopover>
                        <label
                        title={connected
                            ? 'Click cells to add or remove trace links. Only leaf-to-leaf cells can be edited.'
                            : 'The dev server is unreachable, so nothing can be written to the model.'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.xs,
                            width: leftToolbar ? '100%' : undefined, boxSizing: 'border-box',
                            padding: '3px 9px', borderRadius: '5px',
                            border: `1px solid ${editing ? COLOR.accent : COLOR.border}`,
                            background: editing ? '#E8F8F3' : COLOR.surface,
                            color: connected ? COLOR.primary : COLOR.faint,
                            cursor: connected ? 'pointer' : 'not-allowed', fontWeight: 600,
                        }}
                    >
                        <input
                            type="checkbox" checked={editing} disabled={!connected}
                            onChange={event => { setEditing(event.target.checked); setFocus(null); }}
                            style={{ accentColor: COLOR.accent }}
                        />
                        Edit trace
                    </label>
                        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '5px', fontSize: FONT.xs, color: COLOR.muted, justifyContent: leftToolbar ? 'center' : undefined }} title="Cell size">
                            Zoom
                            <input type="range" min={14} max={44} step={2} value={cellSize} onChange={event => setCellSize(Number(event.target.value))} style={{ width: '80px', accentColor: COLOR.accent }} />
                        </label>
                    </div>
                </div>

                {status && (
                    <div style={{
                        padding: '5px 16px', fontSize: '11px',
                        color: status.kind === 'ok' ? '#0F766E' : '#B91C1C',
                        background: status.kind === 'ok' ? '#ECFDF5' : '#FEF2F2',
                        borderTop: `1px solid ${COLOR.borderLight}`,
                    }}>
                        {status.message}
                    </div>
                )}
            </div>

            {/* ── Matrix ── */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, marginLeft: leftToolbar ? '250px' : 0, width: leftToolbar ? 'calc(100% - 250px)' : undefined }}>
            <HierarchicalMatrix
                result={result}
                onToggleRow={id => setExpandedRows(current => toggled(current, id))}
                onToggleColumn={id => setExpandedColumns(current => toggled(current, id))}
                onSelectElement={selectElement}
                selectedElementId={selectedElementId}
                renderCell={renderCell}
                onCellClick={(row, column, cell) => { setFocus({ row, column, cell }); setLinkQuery(''); }}
                onCellDoubleClick={(row, column, cell) => { void toggleTrace(row, column, cell); }}
                cellSize={cellSize}
                showColumnNames={showColumnNames}
                cornerHeader={
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>Traceability Matrix</span>
                        <span style={{ fontSize: '11px', color: COLOR.faint, marginTop: '2px' }}>
                            {result.totalDependencies} link{result.totalDependencies === 1 ? '' : 's'} shown
                            {coverage.total > 0 && ` · ${coverage.traced}/${coverage.total} rows traced (${Math.round(coverage.traced / coverage.total * 100)}%)`}
                        </span>
                    </div>
                }
            />
            </div>

            {/* ── Link inspector / editor ── */}
            {focus && (
                <div style={{
                    position: 'fixed', bottom: '76px', right: '20px', zIndex: 100,
                    width: '330px', maxHeight: '52vh', overflowY: 'auto',
                    padding: '12px 14px', borderRadius: '9px', background: COLOR.surface,
                    border: `1px solid ${COLOR.border}`, boxShadow: '0 6px 22px rgba(0,0,0,0.14)',
                    fontSize: FONT.xs,
                }}>
                    <div className="flex items-start justify-between gap-2">
                        <div style={{ fontWeight: 600, color: COLOR.primary }}>
                            {focus.row.node.name} {'↔'} {focus.column.node.name}
                        </div>
                        <button onClick={() => setFocus(null)} style={{ color: COLOR.faint, background: 'none', border: 'none', cursor: 'pointer' }}>{'✕'}</button>
                    </div>

                    {focusedRelationships.length > 0 ? (
                        <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {focusedRelationships.map(rel => (
                                <div key={rel.id} className="flex items-center justify-between gap-2" style={{ padding: '4px 6px', borderRadius: '5px', background: COLOR.surfaceAlt }}>
                                    <span style={{ color: relationshipColor(rel.type), fontWeight: 500 }}>{rel.type}</span>
                                    <span style={{ flex: 1, color: COLOR.faint, fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {model.elements[rel.sourceId]?.name ?? rel.sourceId} {'→'} {model.elements[rel.targetId]?.name ?? rel.targetId}
                                    </span>
                                    {editing && (
                                        <button
                                            disabled={busy || rel.named === false}
                                            onClick={() => void removeLink(rel.id)}
                                            title={rel.named === false
                                                ? 'This connection has no declared name, so it cannot be addressed for deletion. Name it in the source first.'
                                                : 'Remove this trace link'}
                                            style={{
                                                fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                                border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C',
                                                cursor: busy || rel.named === false ? 'not-allowed' : 'pointer',
                                                opacity: rel.named === false ? 0.5 : 1,
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ marginTop: '8px', color: COLOR.muted }}>No trace between these two.</div>
                    )}

                    {focus.cell?.aggregated && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: COLOR.faint }}>
                            This mark sums a collapsed subsystem. Expand both sides to edit individual links.
                        </div>
                    )}

                    {editing && (
                        <div style={{ marginTop: '11px', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: '9px' }}>
                            <div style={{ fontSize: '11px', color: COLOR.muted, marginBottom: '6px' }}>Add a trace link</div>
                            {!editable ? (
                                <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                    Both sides must be individual elements. Expand the subsystems first.
                                </div>
                            ) : legalOptions.length === 0 ? (
                                <div style={{ fontSize: '11px', color: COLOR.faint }}>
                                    The ontology allows no relationship between {focus.row.node.kind} and {focus.column.node.kind}.
                                </div>
                            ) : (
                                <>
                                    {legalOptions.length > 8 && (
                                        <input
                                            value={linkQuery}
                                            onChange={event => setLinkQuery(event.target.value)}
                                            placeholder={`Filter ${legalOptions.length} legal types…`}
                                            aria-label="Filter link types"
                                            style={{
                                                width: '100%', marginBottom: '7px', padding: '4px 7px',
                                                border: `1px solid ${COLOR.border}`, borderRadius: '5px',
                                                fontSize: '11px', outline: 'none', color: COLOR.primary,
                                            }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {rankedOptions.map(option => {
                                            const preferred = traceTypes.has(option.definition.name);
                                            return (
                                                <button
                                                    key={`${option.definition.name}-${option.direction}`}
                                                    disabled={busy}
                                                    onClick={() => void addLink(option)}
                                                    title={`${model.elements[option.sourceId]?.name ?? option.sourceId} → ${model.elements[option.targetId]?.name ?? option.targetId}`}
                                                    style={{
                                                        fontSize: '11px', padding: '3px 8px', borderRadius: '5px',
                                                        border: `1px solid ${preferred ? COLOR.accent : COLOR.border}`,
                                                        background: preferred ? '#E8F8F3' : COLOR.surface,
                                                        color: COLOR.primary, cursor: busy ? 'wait' : 'pointer',
                                                        fontWeight: preferred ? 600 : 400,
                                                    }}
                                                >
                                                    {option.definition.name}
                                                    <span style={{ color: COLOR.faint, marginLeft: '4px' }}>
                                                        {option.direction === 'outgoing' ? '→' : '←'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {rankedOptions.length === 0 && (
                                            <span style={{ fontSize: '11px', color: COLOR.faint }}>
                                                No legal type matches {'“'}{linkQuery}{'”'}.
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function toggled(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
}
