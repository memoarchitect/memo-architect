// ─── Matrix definition tree ───────────────────────────────────────────────────
//
// The list of traceability matrices (or DSMs) the model declares, under the
// system each one traces: a matrix answers a question about one system, so that
// is where it is looked for, and the package that happens to declare it is not
// shown (the Explorer's Views tree shows packages). The list is not kept here. It
// is `model.diagrams` filtered to one `view def`, so a change made in either
// place shows in both.
//
// Every write goes the way the Views tree writes: a new or changed matrix is a
// `diagram:create` / `diagram:update` that edits the view's declaration, a move
// is `element:move-package`, and a delete removes the declaration. Nothing is
// created or renamed in this component's own state.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { DiagramDTO, MatrixDefinitionDTO } from '@memoarchitect/tools/browser';
import { MATRIX_VIEW_DEFINITIONS, groupBySystem, type MatrixScreen } from '../lib/matrix-views';
import { useModelStore } from '../store/model-store';
import { useScopedModel } from '../store/scoped-model';
import { ChevronIcon } from './ExplorerPanel';
import { ExplorerCountBadge } from './ExplorerCountBadge';
import { confirmViewDelete } from './confirm-destructive';
import { useSystemOptions } from './MatrixSystemSelect';
import { MatrixDefinitionDialog, type MatrixDialogMode } from './MatrixDefinitionDialog';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    /** The screen this tree belongs to; it lists the views typed by that screen's `view def`. */
    screen: MatrixScreen;
    /** What one entry is called in prompts: "traceability matrix". */
    noun: string;
    plural: string;
    title: string;
    selectedId?: string;
    /** `created` is true for a definition just made here, which opens in editing mode. */
    onSelect: (elementId: string | null, created?: boolean) => void;
    /** When given, New hands over to the screen (which builds the matrix there) instead of opening the create dialog. */
    onNew?: (system?: string) => void;
}

const lastSegment = (qualifiedName: string) => qualifiedName.split('::').pop() ?? qualifiedName;

const iconButton: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 3px',
    fontSize: FONT.xs, color: COLOR.muted, lineHeight: 1,
};

export function MatrixDefinitionTree({ screen, noun, plural, title, selectedId, onSelect, onNew }: Props) {
    const viewDefinition = MATRIX_VIEW_DEFINITIONS[screen];
    const model = useScopedModel();
    const connected = useModelStore(s => s.connected);
    const createMatrixView = useModelStore(s => s.createMatrixView);
    const updateMatrixView = useModelStore(s => s.updateMatrixView);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);
    const moveElementToPackage = useModelStore(s => s.moveElementToPackage);
    const createPackage = useModelStore(s => s.createPackage);
    const systemOptions = useSystemOptions();
    const wholeElements = useModelStore(s => s.model?.elements);
    const systemNameOf = (root: string) => systemOptions.find(option => option.root === root)?.name ?? root.split('::').pop() ?? root;
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [hovered, setHovered] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const definitions = useMemo(
        () => (model?.diagrams ?? []).filter(d => d.viewDefinition === viewDefinition && d.elementId),
        [model?.diagrams, viewDefinition],
    );
    // Under the system each matrix traces, by name.
    const systems = useMemo(
        () => groupBySystem(definitions, systemNameOf).map(group => ({
            ...group, definitions: [...group.definitions].sort((a, b) => a.name.localeCompare(b.name)),
        })),
        [definitions, systemOptions], // eslint-disable-line react-hooks/exhaustive-deps
    );
    // The dialog offers the packages the project keeps views in, not the thousands that hold other things.
    const packageChoices = useMemo(
        () => [...new Set((model?.diagrams ?? []).map(d => d.package).filter((name): name is string => Boolean(name)))].sort(),
        [model?.diagrams],
    );
    const [dialog, setDialog] = useState<{ mode: MatrixDialogMode; definition?: DiagramDTO; packageName?: string } | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);

    const run = async (work: () => Promise<{ success: boolean; error?: string } | void>) => {
        setBusy(true);
        setError(null);
        try {
            const result = await work();
            if (result && !result.success) setError(result.error ?? 'The change was refused.');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    const openDialog = (mode: MatrixDialogMode, definition?: DiagramDTO, packageName?: string) => {
        setDialogError(null);
        setDialog({ mode, definition, packageName });
    };
    /** New, for a system when it is started from that system's heading. */
    const create = (system?: string) => (onNew ? onNew(system) : openDialog('create'));
    const rename = (definition: DiagramDTO) => openDialog('rename', definition);
    const move = (definition: DiagramDTO) => openDialog('move', definition);

    /** The definition a new matrix starts with: only the filters typed in the dialog. */
    const initialMatrix = (value: { rowQuery: string; columnQuery: string; system?: string }): MatrixDefinitionDTO => {
        const system = value.system ? { system: value.system } : {};
        if (screen === 'dsm') return { ...system, ...(value.rowQuery ? { axis: { query: value.rowQuery } } : {}) };
        return {
            ...system,
            ...(value.rowQuery ? { rowAxis: { query: value.rowQuery } } : {}),
            ...(value.columnQuery ? { columnAxis: { query: value.columnQuery } } : {}),
        };
    };

    /** Make the package first when the dialog asked for a new one; returns its qualified name. */
    const ensurePackage = async (name: string, isNew: boolean): Promise<string> => {
        if (!isNew) return name;
        const segments = name.split('::');
        const result = await createPackage(segments[segments.length - 1], segments.length > 1 ? segments.slice(0, -1).join('::') : undefined);
        if (!result.success) throw new Error(result.error ?? 'The package could not be created.');
        return result.qualifiedName ?? name;
    };

    const submitDialog = async (value: { name: string; package: string; newPackage: boolean; rowQuery: string; columnQuery: string; system?: string }) => {
        if (!dialog) return;
        setBusy(true);
        setDialogError(null);
        try {
            if (dialog.mode === 'create') {
                const packageName = value.package ? await ensurePackage(value.package, value.newPackage) : undefined;
                const result = await createMatrixView({ name: value.name, viewDefinition, package: packageName, matrix: initialMatrix(value) });
                if (!result.success) throw new Error(result.error ?? 'The matrix could not be declared.');
                setDialog(null);
                if (result.elementId) onSelect(result.elementId, true);
            } else if (dialog.mode === 'rename' && dialog.definition) {
                const result = await updateMatrixView(dialog.definition.elementId!, { name: value.name });
                if (!result.success) throw new Error(result.error ?? 'The rename was refused.');
                setDialog(null);
            } else if (dialog.mode === 'move' && dialog.definition) {
                const definition = dialog.definition;
                const packageName = await ensurePackage(value.package, value.newPackage);
                const result = await moveElementToPackage(definition.elementId!, packageName);
                if (!result.success) throw new Error(result.error ?? 'The move was refused.');
                setDialog(null);
                // Moving changes the qualified name, which is the id the screen is open on.
                if (selectedId === definition.elementId) onSelect(`${packageName}::${lastSegment(definition.elementId!)}`);
            }
        } catch (e) {
            setDialogError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    const duplicate = (definition: DiagramDTO) => {
        void run(async () => {
            const result = await createMatrixView({
                name: `${definition.name} copy`, viewDefinition,
                package: definition.package ?? '', matrix: definition.matrix ?? {},
            });
            if (result.success && result.elementId) onSelect(result.elementId);
            return result;
        });
    };

    const remove = async (definition: DiagramDTO) => {
        if (!await confirmViewDelete(definition.name)) return;
        void run(async () => {
            const result = await deleteModelElement(definition.elementId!);
            if (result.success && selectedId === definition.elementId) onSelect(null);
            return result;
        });
    };

    const renderDefinition = (definition: DiagramDTO) => {
        const selected = definition.elementId === selectedId;
        const showActions = hovered === definition.elementId && connected;
        return (
            <div
                key={definition.elementId}
                onMouseEnter={() => setHovered(definition.elementId!)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(definition.elementId!)}
                className="flex items-center gap-1 px-2 py-1 cursor-pointer"
                title={definition.elementId}
                style={{
                    margin: '0 4px', borderRadius: '4px', fontSize: FONT.explorer.item,
                    background: selected ? `${COLOR.accent}18` : hovered === definition.elementId ? '#F0F0ED' : 'transparent',
                    color: selected ? COLOR.accentDark : COLOR.primary,
                }}
            >
                <span className="flex-1 truncate">{definition.name}</span>
                {showActions && (
                    <span style={{ display: 'flex' }} onClick={event => event.stopPropagation()}>
                        <button style={iconButton} disabled={busy} title="Rename" aria-label={`Rename ${definition.name}`} onClick={() => rename(definition)}>✎</button>
                        <button style={iconButton} disabled={busy} title="Move to another package" aria-label={`Move ${definition.name}`} onClick={() => move(definition)}>⇄</button>
                        <button style={iconButton} disabled={busy} title="Duplicate" aria-label={`Duplicate ${definition.name}`} onClick={() => duplicate(definition)}>⧉</button>
                        <button style={{ ...iconButton, color: '#B91C1C' }} disabled={busy} title="Delete" aria-label={`Delete ${definition.name}`} onClick={() => remove(definition)}>✕</button>
                    </span>
                )}
            </div>
        );
    };

    const toggle = (key: string) => setCollapsed(current => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    return (
        <aside
            aria-label={title}
            style={{
                width: '270px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                borderRight: `1px solid ${COLOR.border}`, background: COLOR.surface, minHeight: 0,
            }}
        >
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.borderLight}` }}>
                <span style={{ fontSize: FONT.sm, fontWeight: 700, color: COLOR.primary }}>{title}</span>
                <button
                    onClick={() => create()}
                    disabled={!connected || busy}
                    title={connected ? `New ${noun}` : 'The dev server is unreachable, so nothing can be written to the model.'}
                    style={{
                        padding: '2px 8px', borderRadius: '5px', border: 'none', fontSize: FONT.xs, fontWeight: 600,
                        background: connected ? COLOR.accent : COLOR.border, color: connected ? '#fff' : COLOR.faint,
                        cursor: connected ? 'pointer' : 'not-allowed',
                    }}
                >+ New</button>
            </div>
            {error && (
                <div role="alert" style={{ padding: '5px 12px', fontSize: '11px', color: '#B91C1C', background: '#FEF2F2' }}>{error}</div>
            )}
            <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
                {definitions.length === 0 && (
                    <div style={{ padding: '10px 12px', fontSize: FONT.xs, color: COLOR.faint }}>
                        This model declares no {plural} yet. Use New to create one.
                    </div>
                )}
                {systems.map(group => {
                    const key = `system:${group.system}`;
                    const open = !collapsed.has(key);
                    return (
                        <div key={key} role="group" aria-label={group.name}>
                            <div
                                onMouseEnter={() => setHovered(key)}
                                onMouseLeave={() => setHovered(null)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 font-semibold"
                                style={{ color: COLOR.primary, fontSize: FONT.explorer.group, cursor: 'pointer' }}
                                onClick={() => toggle(key)}
                                title={group.system || 'Matrices over the whole model'}
                            >
                                <ChevronIcon expanded={open} size={12} color={COLOR.muted} />
                                {group.system && wholeElements?.[group.system]?.displayId && (
                                    <span className="font-mono" style={{ flexShrink: 0, color: COLOR.muted, background: COLOR.surfaceAlt, padding: '0 5px', borderRadius: 5, fontSize: FONT.xs, fontWeight: 400 }}>
                                        {wholeElements[group.system].displayId}
                                    </span>
                                )}
                                <span className="flex-1 truncate">{group.name}</span>
                                {hovered === key && connected && (
                                    <button
                                        style={{ ...iconButton, fontWeight: 700, color: COLOR.accentDark }}
                                        disabled={busy}
                                        title={`New ${noun} for ${group.name}`} aria-label={`New ${noun} for ${group.name}`}
                                        onClick={event => { event.stopPropagation(); create(group.system || undefined); }}
                                    >+ New</button>
                                )}
                                <ExplorerCountBadge count={group.definitions.length} color={COLOR.muted} />
                            </div>
                            {open && <div style={{ marginLeft: '8px' }}>{group.definitions.map(renderDefinition)}</div>}
                        </div>
                    );
                })}
            </div>
            {dialog && (
                <MatrixDefinitionDialog
                    key={`${dialog.mode}:${dialog.definition?.elementId ?? ''}`}
                    mode={dialog.mode} noun={noun} screen={screen}
                    initialName={dialog.mode === 'rename' ? dialog.definition?.name : ''}
                    initialPackage={dialog.mode === 'move' ? dialog.definition?.package : dialog.packageName ?? ''}
                    packages={packageChoices} busy={busy} error={dialogError}
                    onSubmit={value => { void submitDialog(value); }} onClose={() => setDialog(null)}
                />
            )}
        </aside>
    );
}
