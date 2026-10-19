// ─── Matrix definition tree ───────────────────────────────────────────────────
//
// The list of traceability matrices (or DSMs) the model declares, organised by
// the package that declares each one: a package is the folder, exactly as in
// the Explorer's Views tree. The list is not kept here. It is `model.diagrams`
// filtered to one `view def`, so the main Explorer's Views tree shows the same
// definitions in the same packages, and a change made in either shows in both.
//
// Every write goes the way the Views tree writes: a new or changed matrix is a
// `diagram:create` / `diagram:update` that edits the view's declaration, a move
// is `element:move-package`, and a delete removes the declaration. Nothing is
// created or renamed in this component's own state.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { DiagramDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { useScopedModel } from '../store/scoped-model';
import {
    buildViewPackageTree, ChevronIcon, FolderIcon, reportPackageResult, type ViewPackageNode,
} from './ExplorerPanel';
import { ExplorerCountBadge } from './ExplorerCountBadge';
import { confirmViewDelete } from './confirm-destructive';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    /** The `view def` this tree lists, e.g. MemoTraceabilityMatrixView. */
    viewDefinition: string;
    /** What one entry is called in prompts: "traceability matrix". */
    noun: string;
    plural: string;
    title: string;
    selectedId?: string;
    /** `created` is true for a definition just made here, which opens in editing mode. */
    onSelect: (elementId: string | null, created?: boolean) => void;
}

const lastSegment = (qualifiedName: string) => qualifiedName.split('::').pop() ?? qualifiedName;

const iconButton: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 3px',
    fontSize: FONT.xs, color: COLOR.muted, lineHeight: 1,
};

export function MatrixDefinitionTree({ viewDefinition, noun, plural, title, selectedId, onSelect }: Props) {
    const model = useScopedModel();
    const connected = useModelStore(s => s.connected);
    const createMatrixView = useModelStore(s => s.createMatrixView);
    const updateMatrixView = useModelStore(s => s.updateMatrixView);
    const deleteModelElement = useModelStore(s => s.deleteModelElement);
    const moveElementToPackage = useModelStore(s => s.moveElementToPackage);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [hovered, setHovered] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const definitions = useMemo(
        () => (model?.diagrams ?? []).filter(d => d.viewDefinition === viewDefinition && d.elementId),
        [model?.diagrams, viewDefinition],
    );
    // The folders on offer: wherever this kind of definition already is, and
    // wherever the project keeps its views, so the first one has a place to go.
    const folders = useMemo(
        () => [...new Set((model?.diagrams ?? []).map(d => d.package).filter((name): name is string => Boolean(name)))],
        [model?.diagrams],
    );
    // Folders that hold one of these definitions form the tree; the rest of the
    // project's view packages wait in one collapsed section, still offering New.
    const tree = useMemo(() => buildViewPackageTree(definitions), [definitions]);
    const emptyFolders = useMemo(() => {
        const used = new Set(definitions.map(d => d.package));
        return folders.filter(name => !used.has(name)).sort();
    }, [definitions, folders]);
    const [showEmpty, setShowEmpty] = useState(false);

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

    const create = (packageName: string) => {
        const name = window.prompt(`Name of the new ${noun} in ${packageName}`);
        if (!name?.trim()) return;
        void run(async () => {
            const result = await createMatrixView({ name: name.trim(), viewDefinition, package: packageName, matrix: {} });
            if (result.success && result.elementId) onSelect(result.elementId, true);
            return result;
        });
    };

    const createAtRoot = () => {
        const packageName = window.prompt(
            `Create the ${noun} in which package? (qualified name, e.g. ${folders[0] ?? 'Views::Safety'})`, folders[0] ?? '');
        if (packageName?.trim()) create(packageName.trim());
    };

    const rename = (definition: DiagramDTO) => {
        const name = window.prompt(`Rename the ${noun}`, definition.name);
        if (!name?.trim() || name.trim() === definition.name) return;
        void run(() => updateMatrixView(definition.elementId!, { name: name.trim() }));
    };

    const move = (definition: DiagramDTO) => {
        const target = window.prompt(
            `Move “${definition.name}” into which package? (qualified name)`, definition.package ?? '');
        if (target === null || !target.trim() || target.trim() === definition.package) return;
        void run(async () => {
            const wasSelected = selectedId === definition.elementId;
            let moved = false;
            await reportPackageResult(moveElementToPackage(definition.elementId!, target.trim()).then(result => {
                moved = result.success;
                return result;
            }));
            // Moving changes the qualified name, which is the id the screen is open on.
            if (moved && wasSelected) onSelect(`${target.trim()}::${lastSegment(definition.elementId!)}`);
        });
    };

    const duplicate = (definition: DiagramDTO) => {
        void run(async () => {
            const result = await createMatrixView({
                name: `${definition.name} copy`, viewDefinition,
                package: definition.package ?? folders[0] ?? '', matrix: definition.matrix ?? {},
            });
            if (result.success && result.elementId) onSelect(result.elementId);
            return result;
        });
    };

    const remove = (definition: DiagramDTO) => {
        if (!confirmViewDelete(definition.name)) return;
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

    const countIn = (node: ViewPackageNode): number =>
        node.diagrams.length + node.children.reduce((total, child) => total + countIn(child), 0);

    const renderPackage = (node: ViewPackageNode, depth = 0): React.ReactNode => {
        const open = !collapsed.has(node.id);
        const total = countIn(node);
        // A folder with nothing under it stays visible only when it is where
        // some view lives; the rest of the model's packages are not offered.
        return (
            <div key={node.id} style={{ marginLeft: depth ? '12px' : 0 }}>
                <div
                    onMouseEnter={() => setHovered(`pkg:${node.id}`)}
                    onMouseLeave={() => setHovered(null)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 font-semibold"
                    style={{ color: COLOR.muted, fontSize: FONT.explorer.group, cursor: 'pointer' }}
                    onClick={() => setCollapsed(current => {
                        const next = new Set(current);
                        if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                        return next;
                    })}
                    title={node.id}
                >
                    <ChevronIcon expanded={open} size={12} color={COLOR.muted} />
                    <FolderIcon open={open} color={COLOR.muted} pkg={node.id !== '__unpackaged'} />
                    <span className="flex-1 truncate">{node.name}</span>
                    {node.id !== '__unpackaged' && hovered === `pkg:${node.id}` && connected && (
                        <button
                            style={{ ...iconButton, fontWeight: 700, color: COLOR.accentDark }}
                            disabled={busy}
                            title={`New ${noun} in ${node.id}`} aria-label={`New ${noun} in ${node.id}`}
                            onClick={event => { event.stopPropagation(); create(node.id); }}
                        >+ New</button>
                    )}
                    <ExplorerCountBadge count={total} color={COLOR.muted} />
                </div>
                {open && (
                    <>
                        <div style={{ marginLeft: '8px' }}>{node.diagrams.map(renderDefinition)}</div>
                        {node.children.map(child => renderPackage(child, depth + 1))}
                    </>
                )}
            </div>
        );
    };

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
                    onClick={createAtRoot}
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
                        This model declares no {plural} yet. Use New, or open Other packages.
                    </div>
                )}
                {tree.map(node => renderPackage(node))}
                {emptyFolders.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                        <div
                            onClick={() => setShowEmpty(open => !open)} className="flex items-center gap-1.5 px-2 py-1"
                            style={{ cursor: 'pointer', color: COLOR.faint, fontSize: FONT.xs }}
                        >
                            <ChevronIcon expanded={showEmpty} size={12} color={COLOR.faint} />
                            <span>Other packages ({emptyFolders.length})</span>
                        </div>
                        {showEmpty && emptyFolders.map(name => (
                            <div
                                key={name} className="flex items-center gap-1.5 px-2 py-1" title={name}
                                style={{ marginLeft: '14px', fontSize: FONT.explorer.item, color: COLOR.muted }}
                            >
                                <FolderIcon open={false} color={COLOR.muted} pkg />
                                <span className="flex-1 truncate">{name}</span>
                                {connected && (
                                    <button style={{ ...iconButton, fontWeight: 700, color: COLOR.accentDark }} disabled={busy} onClick={() => create(name)}
                                        aria-label={`New ${noun} in ${name}`}>+ New</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
