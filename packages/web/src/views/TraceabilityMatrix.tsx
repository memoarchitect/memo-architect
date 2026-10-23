// ─── Traceability Matrix ─────────────────────────────────────────────────────
//
// Pick the rows, pick the columns, get the matrix. The screen only composes: each concern lives in a part of
// its own that can be used, tested and changed alone.
//
//   the panel on the left     MatrixDefinitionTree      the saved matrices, by package; New starts one here
//   what is being chosen      useTraceDraft             system, rows, columns, relations
//   how an axis is counted    useTraceAxis              types read from the model, queries run by the server
//   which types are offered   OntologyKindCatalog       the ontology's element types the model holds
//   the quick traces          TracePresetRegistry       a trace is data; more can be added
//   building and showing      useTraceMatrix            progress, narrowing, a kept result, refusals
//   keeping a matrix          useSavedTraceMatrix       open, save, save as; sees the builder only through TraceBuilder
//   authoring links           useTraceLinkEditing       the focused cell and the writes
//   what is drawn             TraceBuilderBar, TraceDisplayBar, HierarchicalMatrix, TraceList,
//                             TraceLinkInspector, SaveMatrixDialog
//
// The builder (axes, relations, Build, Save) stays out of the way until New or Edit view asks for it. The grid
// draws only what is in view, so a large matrix does not freeze the screen.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { relationshipTypesInModel, type DsmAggregateCell, type DsmAxisEntry } from '../analysis/dsm-hierarchy';
import { ProgressBar } from '../components/ProgressBar';
import { HierarchicalMatrix, type MatrixCellStyle } from '../components/HierarchicalMatrix';
import type { TypeFilterOption } from '../components/TypeFilterSelect';
import { MatrixDefinitionTree } from '../components/MatrixDefinitionTree';
import { TraceBuilderBar } from '../components/TraceBuilderBar';
import { TraceDisplayBar } from '../components/TraceDisplayBar';
import { TraceList } from '../components/TraceList';
import { TraceLinkInspector } from '../components/TraceLinkInspector';
import { SaveMatrixDialog, saveButtonStyle } from '../components/SaveMatrixDialog';
import { explorerTaxonomy } from '../components/ExplorerPanel';
import { OntologyKindCatalog } from '../lib/ontology-kinds';
import { DEFAULT_TRACE_PRESETS, type TracePreset } from '../lib/trace-presets';
import { scopeModel } from '../lib/workspace-scope';
import { useTraceAxis } from '../lib/use-trace-axis';
import { useTraceDraft } from '../lib/use-trace-draft';
import { useTraceMatrix } from '../lib/use-trace-matrix';
import { useSavedTraceMatrix } from '../lib/use-saved-trace-matrix';
import { useTraceLinkEditing } from '../lib/use-trace-link-editing';
import { loadDisplay, saveDisplay, traceLimit, type LineFilter, type TraceView } from '../lib/trace-axis';
import { relationshipColor } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

const NO_IDS: string[] = [];

export function TraceabilityMatrix() {
    const wholeModel = useModelStore(s => s.model);
    const headerWorkspace = useModelStore(s => s.workspace);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const setActiveView = useModelStore(s => s.setActiveView);

    // What is being chosen, and what the model looks like for it.
    const draft = useTraceDraft();
    const workspace = draft.system ?? headerWorkspace ?? null;
    const model = useMemo(() => (wholeModel ? scopeModel(wholeModel, workspace) : null), [wholeModel, workspace]);

    // The display choices, remembered across reloads.
    const display = useRef(loadDisplay());
    const [view, setView] = useState<TraceView>(display.current.view);
    const [rowFilter, setRowFilter] = useState<LineFilter>(display.current.rowFilter);
    const [columnFilter, setColumnFilter] = useState<LineFilter>(display.current.columnFilter);
    const [cellSize, setCellSize] = useState(30);
    const [editing, setEditing] = useState(false);
    useEffect(() => { saveDisplay({ view, rowFilter, columnFilter }); }, [view, rowFilter, columnFilter]);

    // Which types are offered: the ontology's, from the same catalog the explorer's type filter uses.
    const catalog = useMemo(() => {
        const taxonomy = explorerTaxonomy(availableOntologies).byKind;
        return OntologyKindCatalog.of(model, name => taxonomy.has(name));
    }, [model, availableOntologies]);
    const kindOptions = useMemo(() => catalog.options(), [catalog]);
    const linkOptions = useMemo<TypeFilterOption[]>(() => {
        if (!model) return [];
        const counts = new Map<string, number>();
        for (const relation of model.relationships) counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
        return relationshipTypesInModel(model).map(value => ({ value, hint: String(counts.get(value) ?? 0), color: relationshipColor(value) }));
    }, [model]);

    // How the rows and columns are counted.
    const rowSelection = useTraceAxis(model, draft.rowAxis, catalog.parents, workspace);
    const columnSelection = useTraceAxis(model, draft.columnAxis, catalog.parents, workspace);
    const counting = rowSelection.counting || columnSelection.counting;
    const limit = traceLimit(rowSelection.ids.length, columnSelection.ids.length);
    const canBuild = rowSelection.ids.length > 0 && columnSelection.ids.length > 0 && !limit && !counting;

    // Building, and keeping.
    const matrix = useTraceMatrix({ model, view, rowFilter, columnFilter });
    const [builderOpen, setBuilderOpen] = useState(false);
    /** The quick trace in use, until the rows and columns are picked by hand. */
    const [activePresetId, setActivePresetId] = useState<string | null>(null);
    const [saveDialog, setSaveDialog] = useState(false);
    const buildWhenCounted = useRef(false);

    const build = useCallback(() => {
        if (!canBuild) return;
        matrix.commit({ rowIds: rowSelection.ids, columnIds: columnSelection.ids, linkTypes: draft.linkTypes });
    }, [canBuild, matrix.commit, rowSelection.ids, columnSelection.ids, draft.linkTypes]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!buildWhenCounted.current || !canBuild) return;
        buildWhenCounted.current = false;
        build();
    }, [canBuild, build]);

    const saved = useSavedTraceMatrix(draft, {
        requestBuild: () => { buildWhenCounted.current = true; },
        commit: matrix.commit,
        report: matrix.report,
    });
    const openedId = saved.definition?.elementId;
    useEffect(() => { if (openedId) { setBuilderOpen(false); setActivePresetId(null); } }, [openedId]);

    const editor = useTraceLinkEditing({ model, activeTypes: matrix.committed?.linkTypes ?? NO_IDS, editing });

    const stale = !matrix.committed
        || matrix.committed.rowIds.join(',') !== rowSelection.ids.join(',')
        || matrix.committed.columnIds.join(',') !== columnSelection.ids.join(',')
        || [...matrix.committed.linkTypes].sort().join(',') !== [...draft.linkTypes].sort().join(',');

    /** New: an empty draft with the builder open to fill it in. */
    const startNew = useCallback((packageName?: string) => {
        saved.startNew(packageName);
        draft.clear();
        matrix.clear();
        editor.inspect(null);
        setActivePresetId(null);
        setBuilderOpen(true);
    }, [saved.startNew, draft.clear, matrix.clear, editor.inspect]); // eslint-disable-line react-hooks/exhaustive-deps

    /** A quick trace: its rows and columns go in the draft and it is built as soon as they are counted. */
    const applyPreset = useCallback((preset: TracePreset) => {
        draft.replace({ rowAxis: preset.rows, columnAxis: preset.columns, linkTypes: [] });
        setRowFilter('all');
        setColumnFilter('all');
        matrix.clear();
        setActivePresetId(preset.id);
        buildWhenCounted.current = true;
    }, [draft.replace, matrix.clear]); // eslint-disable-line react-hooks/exhaustive-deps

    const renderCell = useCallback((cell: DsmAggregateCell | null, row: DsmAxisEntry, column: DsmAxisEntry): MatrixCellStyle => {
        // Traceability has no meaningful self-link diagonal: leave it blank rather than show a roll-up count as a link.
        if (cell?.diagonal) return {};
        if (cell) {
            const color = '#65A30D';
            const intensity = Math.min(0.14 + cell.strength * 0.13, 0.55);
            return {
                // A check is exactly one trace; a number is two or more (this pair, or a collapsed subtree).
                text: cell.strength === 1 ? '✓' : String(cell.strength),
                color,
                background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                title: `${row.node.name} ↔ ${column.node.name}\n${cell.types.join(', ')}${editing ? '\nClick to inspect or remove' : ''}`,
            };
        }
        if (!editing) return {};
        const linkable = row.node.isElement && column.node.isElement
            && row.node.children.length === 0 && column.node.children.length === 0 && row.node.id !== column.node.id;
        return linkable ? { actionable: true, title: `Click to trace ${row.node.name} → ${column.node.name}` } : {};
    }, [editing]);

    const coverage = useMemo(() => {
        if (!matrix.result) return { traced: 0, total: 0 };
        let traced = 0;
        let total = 0;
        matrix.result.rows.forEach((entry, index) => {
            if (entry.node.children.length > 0) return;
            total++;
            if (matrix.result!.matrix[index].some(cell => cell && !cell.diagonal)) traced++;
        });
        return { traced, total };
    }, [matrix.result]);

    if (!model) {
        return <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>No model loaded</div>;
    }

    const building = matrix.progress !== null;
    const message = matrix.refusal
        ?? limit
        ?? (counting
            ? 'Counting…'
            : rowSelection.ids.length === 0 || columnSelection.ids.length === 0
                ? (builderOpen
                    ? 'Choose the element types for the rows and the columns, then Build matrix.'
                    : 'Select a traceability matrix on the left, or click + New to create one.')
                : null);
    const status = saved.status ?? editor.status;
    const { definition } = saved;

    const actions = (
        <>
            {definition && (
                <button
                    type="button" onClick={() => { void saved.save(); }} disabled={!saved.savable || !saved.unsaved || saved.saving}
                    title={saved.unsaved ? `Write these rows, columns and relations to “${definition.name}”` : 'Nothing has changed since it was saved'}
                    style={saveButtonStyle(saved.savable && saved.unsaved && !saved.saving, true)}
                >
                    {saved.saving ? 'Saving…' : 'Save'}
                </button>
            )}
            <button
                type="button" onClick={() => { saved.clearSaveError(); setSaveDialog(true); }} disabled={!saved.savable || saved.saving}
                title={editor.connected
                    ? 'Keep this selection as a matrix in the model; it is listed in the panel on the left'
                    : 'The dev server is unreachable, so nothing can be written to the model.'}
                style={saveButtonStyle(saved.savable && !saved.saving, !definition)}
            >
                {definition ? 'Save as…' : 'Save'}
            </button>
            {matrix.committed && (
                <button type="button" onClick={() => setBuilderOpen(false)} style={saveButtonStyle(true, false)} title="Hide these options">Done</button>
            )}
        </>
    );

    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#FAFAF8' }}>
            <MatrixDefinitionTree
                screen="traceability" noun="traceability matrix" plural="traceability matrices" title="Traceability matrices"
                selectedId={saved.definitionId}
                onSelect={id => setActiveView(id ? { type: 'traceability', definitionId: id } : { type: 'traceability' })}
                onNew={startNew}
            />
            <div className="flex-1 flex flex-col" style={{ background: '#FAFAF8', position: 'relative', minWidth: 0, overflowY: 'auto' }}>
                {(builderOpen || matrix.committed || building || status || saved.customNote) && (
                    <div style={{ borderBottom: `1px solid ${COLOR.border}`, background: COLOR.surface, flexShrink: 0 }}>
                        {builderOpen && (
                            <TraceBuilderBar
                                presets={DEFAULT_TRACE_PRESETS.all()} onPreset={applyPreset}
                                activePresetId={activePresetId} onCustomize={() => setActivePresetId(null)}
                                system={draft.system} onSystem={draft.setSystem}
                                rowAxis={draft.rowAxis} columnAxis={draft.columnAxis}
                                onRowAxis={draft.setRowAxis} onColumnAxis={draft.setColumnAxis}
                                rowSelection={rowSelection} columnSelection={columnSelection}
                                kindOptions={kindOptions} linkOptions={linkOptions}
                                linkTypes={draft.linkTypes} onLinkTypes={draft.setLinkTypes}
                                canBuild={canBuild} stale={stale} built={Boolean(matrix.result)} building={building}
                                onBuild={build} actions={actions}
                            />
                        )}
                        {matrix.committed && (
                            <TraceDisplayBar
                                view={view} onView={setView}
                                rowFilter={rowFilter} onRowFilter={setRowFilter} emptyRows={matrix.emptyRows}
                                columnFilter={columnFilter} onColumnFilter={setColumnFilter} emptyColumns={matrix.emptyColumns}
                                cellSize={cellSize} onCellSize={setCellSize}
                                editing={editing} onEditing={next => { setEditing(next); editor.inspect(null); }} connected={editor.connected}
                                divided={builderOpen}
                                leading={definition && (
                                    <>
                                        <span style={{ fontSize: FONT.xs, color: COLOR.muted }} title={definition.elementId}>
                                            <strong style={{ color: COLOR.primary, fontSize: FONT.sm }}>{definition.name}</strong>{saved.unsaved ? ' · unsaved changes' : ''}
                                        </span>
                                        {!builderOpen && (
                                            <button type="button" onClick={() => setBuilderOpen(true)} style={saveButtonStyle(editor.connected, false)} title="Change the rows, columns and relations">Edit view</button>
                                        )}
                                    </>
                                )}
                            />
                        )}
                        {saved.customNote && (
                            <div style={{ padding: '5px 16px', fontSize: '11px', color: '#92400E', background: '#FFFBEB', borderTop: `1px solid ${COLOR.borderLight}` }}>{saved.customNote}</div>
                        )}
                        {building && <div style={{ padding: '0 16px 10px' }}><ProgressBar progress={matrix.progress!} /></div>}
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
                )}

                {/* At least most of the window, so the table or matrix is never squeezed to nothing by the options above it. */}
                <div style={{ display: 'flex', flex: '1 0 65vh', minHeight: 0, minWidth: 0, opacity: view === 'matrix' && building && matrix.result ? 0.5 : 1 }}>
                    {view === 'list' ? (
                        matrix.shown && matrix.links ? (
                            <TraceList model={model} rowIds={matrix.shown.rowIds} links={matrix.links} onSelect={selectElement} selectedId={selectedElementId} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center px-8 text-center" role="status" style={{ color: COLOR.faint, fontSize: FONT.sm }}>{message}</div>
                        )
                    ) : !matrix.result ? (
                        <div className="flex-1 flex items-center justify-center px-8 text-center" role="status" style={{ color: matrix.refusal ? '#B45309' : COLOR.faint, fontSize: FONT.sm }}>
                            {building ? 'Building…' : message}
                        </div>
                    ) : (
                        <HierarchicalMatrix
                            result={matrix.result}
                            onToggleRow={matrix.toggleRow} onToggleColumn={matrix.toggleColumn}
                            onSelectElement={selectElement} selectedElementId={selectedElementId}
                            renderCell={renderCell}
                            onCellClick={(row, column, cell) => editor.inspect({ row, column, cell })}
                            onCellDoubleClick={(row, column) => { void editor.toggleTrace(row, column); }}
                            cellSize={cellSize} showColumnNames
                            cornerHeader={
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                                    <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>Traceability Matrix</span>
                                    <span style={{ fontSize: '11px', color: COLOR.faint, marginTop: '2px' }}>
                                        {matrix.result.rows.length.toLocaleString()} × {matrix.result.columns.length.toLocaleString()} · {matrix.result.totalDependencies} link{matrix.result.totalDependencies === 1 ? '' : 's'}
                                        {coverage.total > 0 && ` · ${coverage.traced}/${coverage.total} rows traced (${Math.round(coverage.traced / coverage.total * 100)}%)`}
                                    </span>
                                </div>
                            }
                        />
                    )}
                </div>

                {editor.focus && (
                    <TraceLinkInspector
                        model={model} focus={editor.focus} editing={editing} busy={editor.busy} editable={editor.editable}
                        relationships={editor.focusedRelationships} legalOptions={editor.legalOptions} rankedOptions={editor.rankedOptions}
                        traceTypes={editor.traceTypes} linkQuery={editor.linkQuery} onLinkQuery={editor.setLinkQuery}
                        onAdd={option => { void editor.addLink(option); }} onRemove={id => { void editor.removeLink(id); }}
                        onClose={() => editor.inspect(null)}
                    />
                )}
                {saveDialog && (
                    <SaveMatrixDialog
                        packages={saved.packageChoices} busy={saved.saving} error={saved.saveError}
                        initialName={definition ? `${definition.name} copy` : ''} initialPackage={definition ? '' : saved.newPackage}
                        onSubmit={value => { void saved.saveAs(value).then(done => { if (done) setSaveDialog(false); }); }}
                        onClose={() => setSaveDialog(false)}
                    />
                )}
            </div>
        </div>
    );
}
