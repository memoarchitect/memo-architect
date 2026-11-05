// ─── Diagram table ───────────────────────────────────────────────────────────
//
// The table presentation of a diagram: one row per element, indented by depth,
// with a caret on any row that has children — a spreadsheet outline. Collapse
// state belongs to the canvas, so a block view's carries over from tree and
// containment.
//
// It is also where a diagram is authored from for now: a row can take a new
// element under it, and a trace or an allocation where the ontology allows one.
// A new element is written into its parent's body, so the source nests it the
// way the table shows it. A link goes through the same dialog and store action
// as every other relationship.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react';
import type { MemoElement, MemoModelDTO, RelationshipDefinitionDTO, RelationshipDirection } from '@memoarchitect/tools/browser';
import { AddRelationshipDialog } from '../components/AddRelationshipDialog';
import { awaitSavedElement } from '../store/await-element';
import { useModelStore } from '../store/model-store';
import type { CompositionTree } from './templates/composition-tree';
import { flattenBddRows } from './templates/bdd-table';
import {
    childKindOptions, declaredNameFor, linkCategory, linksByRow, rowLinkCategories, rowMayHold, targetMayHold,
    viewInsertionPoint, type RowLink, type TableLinkCategory,
} from './templates/table-authoring';

const INDENT = 18;
const LINE = '#E5E5E0';
const MUTED = '#5B6470';
const COLUMNS = 7;

const smallButton = {
    padding: '1px 6px', border: '1px solid #C9CFD6', borderRadius: 3, background: '#FFFFFF', color: '#374151',
    fontSize: 11, cursor: 'pointer', lineHeight: '16px',
} as const;

/** The add controls stay in view however wide the link columns grow. */
const stickyEnd = { position: 'sticky' as const, right: 0, borderLeft: `1px solid ${LINE}` };

/** Where a new row is going: under a row, or in a package when the view has no single parent. */
type AddTarget = { parent?: MemoElement; packageName?: string; file?: string };

export function BddTableView({
    tree, expanded, definitions, onToggle, onInspect, model, diagramId, readOnly, childScope, onExpand, ariaLabel, notice,
}: {
    tree: CompositionTree;
    expanded: ReadonlySet<string>;
    definitions?: ReadonlyMap<string, MemoElement>;
    onToggle: (id: string) => void;
    onInspect?: (id: string) => void;
    /** With a model, rows can be authored; a read-only surface passes `readOnly`. */
    model?: MemoModelDTO;
    diagramId?: string;
    readOnly?: boolean;
    childScope?: 'hierarchy' | 'flow';
    onExpand?: (id: string) => void;
    ariaLabel?: string;
    /** Something the view reports about its rows, which its graph mode shows on the canvas. */
    notice?: string;
}) {
    const connected = useModelStore(s => s.connected);
    const endScopes = useModelStore(s => s.relationshipEndScopes);
    const createModelElement = useModelStore(s => s.createModelElement);
    const createRelationship = useModelStore(s => s.createRelationship);
    const addElementToDiagram = useModelStore(s => s.addElementToDiagram);

    const [adding, setAdding] = useState<AddTarget | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftKind, setDraftKind] = useState('');
    const [linking, setLinking] = useState<{ element: MemoElement; category: TableLinkCategory } | null>(null);
    const [status, setStatus] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

    const registries = model?.registries;
    const authorable = Boolean(model && registries && !readOnly && connected);
    const noun = childScope === 'flow' ? 'step' : 'element';

    const rows = useMemo(() => flattenBddRows(tree, expanded, definitions), [tree, expanded, definitions]);
    const links = useMemo(() => (model && registries ? linksByRow(model, registries) : new Map<string, Record<TableLinkCategory, RowLink[]>>()), [model, registries]);

    // Legality is per kind, and a table has far fewer kinds than rows, redrawn on every keystroke in the add form.
    const categoriesByKind = useMemo(() => new Map<string, Set<TableLinkCategory>>(), [registries, endScopes]);
    const categoriesOf = (kind: string) => {
        let categories = categoriesByKind.get(kind);
        if (!categories) categoriesByKind.set(kind, categories = rowLinkCategories({ kind }, registries!, endScopes));
        return categories;
    };

    const childrenOf = useCallback((parent: MemoElement | undefined) =>
        (parent ? tree.childrenMap.get(parent.id) ?? [] : tree.roots)
            .map(id => tree.elements.get(id))
            .filter((element): element is MemoElement => Boolean(element)), [tree]);

    const kindOptions = useMemo(() => {
        if (!adding || !registries) return [];
        const anchor = adding.parent ?? tree.elements.get(tree.roots[0]);
        return anchor ? childKindOptions(anchor, childrenOf(adding.parent), registries, childScope ?? 'hierarchy') : [];
    }, [adding, registries, tree, childScope, childrenOf]);

    const openAdd = (target: AddTarget) => {
        setStatus(null); setDraftName(''); setDraftKind(''); setAdding(target);
    };

    const submitAdd = async () => {
        if (!adding || !model) return;
        const label = draftName.trim();
        const kind = kindOptions.find(option => option.name === draftKind) ?? kindOptions[0];
        if (!label || !kind) return;
        const { parent } = adding;
        const scopeId = parent?.id ?? adding.packageName;
        const qualify = (name: string) => (scopeId ? `${scopeId}::${name}` : name);
        const shortName = declaredNameFor(label, name => Boolean(model.elements[qualify(name)]));
        if (!shortName) {
            setStatus({ tone: 'error', text: `"${label}" has no letters or digits to name the ${noun} from.` });
            return;
        }
        const file = parent?.file ?? adding.file;
        const id = createModelElement({
            id: qualify(shortName), shortName, name: label, kind: kind.name, construct: kind.construct.replace(/\s*def$/, '').trim() as MemoElement['construct'],
            layer: kind.layer, doc: '', attributes: {}, file: file ?? '',
            ...(scopeId ? { package: scopeId } : {}),
        } as Omit<MemoElement, 'id'> & { id: string; package?: string });
        setAdding(null);
        if (parent) onExpand?.(parent.id);
        setStatus({ tone: 'info', text: `Writing ${label}…` });
        try {
            const saved = await awaitSavedElement(id);
            // A view listing its elements explicitly does not gain a new one by itself.
            const diagram = useModelStore.getState().model?.diagrams?.find(candidate => candidate.id === diagramId);
            if (diagramId && diagram?.elementIds && !diagram.elementIds.includes(saved)) addElementToDiagram(diagramId, saved);
            setStatus({ tone: 'info', text: `Added ${label} to ${file}.` });
        } catch (error) {
            setStatus({ tone: 'error', text: error instanceof Error ? error.message : String(error) });
        }
    };

    const confirmLink = async (request: { type: string; sourceId: string; targetId: string; direction: RelationshipDirection }) => {
        const element = linking?.element;
        setLinking(null);
        if (!element) return;
        setStatus({ tone: 'info', text: 'Writing the link…' });
        const outcome = await createRelationship({ ...request, selectedElementId: element.id, diagramId });
        setStatus(outcome.success
            ? { tone: 'info', text: `Linked ${element.name} in ${outcome.sourceFile ?? 'the model'}.` }
            : { tone: 'error', text: outcome.error ?? 'The link could not be created.' });
    };

    const offeredLink = useCallback((definition: RelationshipDefinitionDTO, direction: RelationshipDirection) =>
        Boolean(linking) && linkCategory(definition) === linking!.category
            && rowMayHold(definition, direction, linking!.element, endScopes), [linking, endScopes]);
    const allowedTarget = useCallback((definition: RelationshipDefinitionDTO, direction: RelationshipDirection, target: MemoElement) =>
        targetMayHold(definition, direction, target, endScopes), [endScopes]);

    const header = { padding: '6px 10px', textAlign: 'left' as const, fontWeight: 600, fontSize: 11, color: '#374151', background: '#F0F0ED', borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, position: 'sticky' as const, top: 0, zIndex: 1 };
    const cell = { padding: '4px 10px', fontSize: 12, borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, whiteSpace: 'nowrap' as const };

    const addForm = (depth: number, key: string) => (
        <tr key={key} data-table-add-form="true" style={{ background: '#F4FBF9' }}>
            <td colSpan={COLUMNS} style={{ ...cell, paddingLeft: 10 + depth * INDENT + 22 }}>
                <form style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onSubmit={event => { event.preventDefault(); void submitAdd(); }}>
                    <input autoFocus aria-label={`New ${noun} name`} placeholder={`New ${noun} name`} value={draftName}
                        onChange={event => setDraftName(event.target.value)}
                        onKeyDown={event => { if (event.key === 'Escape') setAdding(null); }}
                        style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #C9CFD6', borderRadius: 3, width: 220 }} />
                    <select aria-label={`New ${noun} kind`} value={draftKind || kindOptions[0]?.name || ''}
                        onChange={event => setDraftKind(event.target.value)}
                        style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #C9CFD6', borderRadius: 3, maxWidth: 240 }}>
                        {kindOptions.map(option => (
                            <option key={option.name} value={option.name}>{option.label}{option.origin === 'project' ? ' (project)' : ''}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={!draftName.trim() || kindOptions.length === 0} style={smallButton}>Add</button>
                    <button type="button" onClick={() => setAdding(null)} style={smallButton}>Cancel</button>
                </form>
            </td>
        </tr>
    );

    const linkList = (entries: RowLink[] | undefined) => (entries ?? []).map(link => (
        <div key={`${link.type}:${link.otherId}:${link.direction}`} title={`${link.label} ${link.direction === 'outgoing' ? '→' : '←'} ${link.otherId}`}>
            <span style={{ color: MUTED }}>{link.label} {link.direction === 'outgoing' ? '→' : '←'}</span>{' '}
            <a role="link" tabIndex={0} onClick={() => onInspect?.(link.otherId)} style={{ cursor: 'pointer', color: '#1B3A4B' }}>{link.otherName}</a>
        </div>
    ));

    return (
        <div role="treegrid" aria-label={ariaLabel ?? 'Block hierarchy table'} data-bdd-table="true"
            style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'auto', background: '#FFFFFF' }}>
            {status && (
                <div role="status" data-table-status={status.tone}
                    style={{ padding: '4px 10px', fontSize: 12, background: status.tone === 'error' ? '#FDECEC' : '#EEF6F4', color: status.tone === 'error' ? '#9B1C1C' : '#1B3A4B', borderBottom: `1px solid ${LINE}` }}>
                    {status.text}
                </div>
            )}
            {notice && (
                <div data-table-notice="true" style={{ padding: '4px 10px', fontSize: 12, background: '#FFF7E6', color: '#7A4B00', borderBottom: `1px solid ${LINE}` }}>
                    {notice}
                </div>
            )}
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 760 }}>
                <thead>
                    <tr>
                        <th style={{ ...header, width: '32%' }}>Name</th>
                        <th style={header}>Kind</th>
                        <th style={header}>Typed by</th>
                        <th style={header}>Id</th>
                        <th style={header}>Allocated to</th>
                        <th style={header}>Traces</th>
                        <th style={{ ...header, ...stickyEnd, background: header.background, zIndex: 2 }} aria-label="Add" />
                    </tr>
                </thead>
                <tbody>
                    {rows.flatMap(row => {
                        const branch = row.childCount > 0;
                        const typedBy = (row.element.attributes.usageType ?? '').split('::').pop() ?? '';
                        const categories = authorable ? categoriesOf(row.element.kind) : new Set<TableLinkCategory>();
                        const writable = authorable && row.element.provenance?.declaration.writable !== false;
                        const rowLinks = links.get(row.id);
                        const line = (
                            <tr key={row.id} role="row" aria-level={row.depth + 1}
                                aria-expanded={branch ? row.expanded : undefined}
                                style={{ background: row.depth === 0 ? '#F7F9FA' : undefined }}>
                                <td style={{ ...cell, paddingLeft: 10 + row.depth * INDENT }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        {branch ? (
                                            <button type="button" onClick={() => onToggle(row.id)}
                                                aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.name}`}
                                                title={row.expanded ? 'Collapse' : 'Expand'}
                                                style={{ width: 16, height: 16, lineHeight: '14px', padding: 0, border: '1px solid #9AA5AF', borderRadius: 3, background: '#FFFFFF', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                                {row.expanded ? '−' : '+'}
                                            </button>
                                        ) : <span style={{ width: 16, display: 'inline-block' }} />}
                                        <a role="link" tabIndex={0} onClick={() => onInspect?.(row.id)}
                                            onKeyDown={event => { if (event.key === 'Enter') onInspect?.(row.id); }}
                                            style={{ cursor: onInspect ? 'pointer' : 'default', fontWeight: row.depth === 0 ? 700 : 500, color: '#1B3A4B' }}>
                                            {row.name}
                                        </a>
                                        {branch && !row.expanded && (
                                            <span style={{ color: '#8CA0B1', fontSize: 11 }}>{row.childCount} hidden</span>
                                        )}
                                    </span>
                                </td>
                                <td style={cell}>{row.element.kind}</td>
                                <td style={cell}>{typedBy}</td>
                                <td style={{ ...cell, color: MUTED }}>{row.element.attributes.providedId ?? ''}</td>
                                <td style={cell}>{linkList(rowLinks?.allocation)}</td>
                                <td style={cell}>{linkList(rowLinks?.trace)}</td>
                                <td style={{ ...cell, ...stickyEnd, background: row.depth === 0 ? '#F7F9FA' : '#FFFFFF' }}>
                                    {authorable && (
                                        <span style={{ display: 'inline-flex', gap: 4 }}>
                                            {writable && (
                                                <button type="button" style={smallButton} title={`Add a ${noun} under ${row.name}`}
                                                    aria-label={`Add ${noun} under ${row.name}`} onClick={() => openAdd({ parent: row.element })}>+ {noun}</button>
                                            )}
                                            {categories.has('trace') && (
                                                <button type="button" style={smallButton} title={`Trace ${row.name} to a requirement, a risk or another element the ontology allows`}
                                                    aria-label={`Add trace from ${row.name}`} onClick={() => { setStatus(null); setLinking({ element: row.element, category: 'trace' }); }}>Trace</button>
                                            )}
                                            {categories.has('allocation') && (
                                                <button type="button" style={smallButton} title={`Allocate ${row.name} to where it runs`}
                                                    aria-label={`Allocate ${row.name}`} onClick={() => { setStatus(null); setLinking({ element: row.element, category: 'allocation' }); }}>Allocate</button>
                                            )}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                        return adding?.parent?.id === row.id ? [line, addForm(row.depth + 1, `${row.id}:add`)] : [line];
                    })}
                    {rows.length === 0 && (
                        <tr><td colSpan={COLUMNS} style={{ ...cell, color: '#8CA0B1' }}>This view has no elements.</td></tr>
                    )}
                    {adding && !rows.some(row => row.id === adding.parent?.id) && addForm(0, 'view:add')}
                    {authorable && rows.length > 0 && (
                        <tr>
                            <td colSpan={COLUMNS} style={cell}>
                                <button type="button" style={smallButton} aria-label={`Add ${noun}`} title={`Add a ${noun} to this view`}
                                    onClick={() => openAdd(viewInsertionPoint(tree, model!))}>+ Add {noun}</button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {linking && model && registries && (
                <AddRelationshipDialog
                    key={`${linking.element.id}:${linking.category}`}
                    element={linking.element} model={model} registries={registries} diagramId={diagramId}
                    title={linking.category === 'allocation' ? 'Allocate' : 'Add trace'}
                    offered={offeredLink} targetAllowed={allowedTarget}
                    onCancel={() => setLinking(null)} onConfirm={request => void confirmLink(request)} />
            )}
        </div>
    );
}
