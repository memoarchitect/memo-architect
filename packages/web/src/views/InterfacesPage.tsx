// ─── Interfaces ───────────────────────────────────────────────────────────────
//
// Pick two parts and see every interface between them, pulled from the model. Each part is chosen the way a
// traceability axis is: the system, then the element types and a piece of the name, then a part from what matched.
// The second is held to what the ontology lets an interface join to the first. Save keeps the pair as a markdown
// dashboard (a page the panel on the left lists), whose body is an `{{interfaces:A | B}}` directive.

import { useMemo, useState } from 'react';
import { interfacesBetween, type DashboardScope, type MemoElement } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { isFeatureEnabled } from '../config/feature-flags';
import { saveDashboard } from '../store/ws-client';
import { dashboardIdFromTitle, uniqueDashboardId } from '../dashboard/dashboards';
import { defaultInterfacesTitle, filterParts, interfacesMarkdown, savedInterfaces, selectableParts } from '../lib/interfaces-page';
import { crossFamilyInterfaces, interfaceCompatibility, portFamiliesByPart } from '../lib/interface-compat';
import { OntologyKindCatalog } from '../lib/ontology-kinds';
import { scopeModel } from '../lib/workspace-scope';
import { renderDashboardHtml } from '../dhf/document-renderer';
import { documentThemeCss } from '../dhf/document-theme';
import { viewFor } from './DashboardPage';
import { AxisFilterCard, NO_FILTER, type FilterState } from '../components/AxisFilterCard';
import { InterfacesPanel } from '../components/InterfacesPanel';
import { MemoMarkdownView } from '../components/memo-markdown/MemoMarkdownView';
import { MatrixSystemSelect } from '../components/MatrixSystemSelect';
import { explorerTaxonomy } from '../components/ExplorerPanel';
import { ActionButton, ControlIcon } from '../components/TraceControls';
import { COLOR, FONT } from '../styles/tokens';

const field: React.CSSProperties = {
    padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary,
    background: COLOR.surface, minWidth: 0,
};
const label: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary };
const MOST_SHOWN = 60;

/** One part: its filter card, then the parts that matched, each with why it cannot be chosen when it cannot. */
function PartChooser({ title, chosen, onChoose, candidates, parents, kindOptions, refusal }: {
    title: string;
    chosen: MemoElement | undefined;
    onChoose: (id: string) => void;
    candidates: readonly MemoElement[];
    parents: Parameters<typeof filterParts>[2];
    kindOptions: ReturnType<OntologyKindCatalog['options']>;
    /** Why a candidate cannot be this part, or undefined when it can. */
    refusal: (id: string) => string | undefined;
}) {
    const [filter, setFilter] = useState<FilterState>(NO_FILTER);
    const matched = useMemo(
        () => filterParts(candidates, { kinds: filter.kinds, contains: filter.contains }, parents),
        [candidates, filter.kinds, filter.contains, parents],
    );
    return (
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'grid', gap: '8px', alignContent: 'start' }}>
            <AxisFilterCard
                title={title} filter={filter} onChange={next => setFilter({ ...next, advanced: false })} kindOptions={kindOptions} counting={false}
                evaluation={{ query: '', count: matched.length, preview: [] }}
                emptyHint="Choose element types, or part of a name."
            />
            <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                {chosen ? <>Chosen: <strong style={{ color: COLOR.primary }}>{chosen.name}</strong> <span title={chosen.id}>({chosen.kind})</span></> : 'Nothing chosen yet.'}
            </div>
            {matched.length > 0 && (
                <div role="listbox" aria-label={`${title} matches`} style={{ maxHeight: '220px', overflowY: 'auto', border: `1px solid ${COLOR.border}`, borderRadius: '8px', background: COLOR.surface }}>
                    {matched.slice(0, MOST_SHOWN).map(part => {
                        const why = refusal(part.id);
                        const on = chosen?.id === part.id;
                        return (
                            <button
                                key={part.id} type="button" role="option" aria-selected={on} disabled={Boolean(why)} onClick={() => onChoose(part.id)}
                                title={why ?? part.id}
                                style={{
                                    display: 'flex', width: '100%', justifyContent: 'space-between', gap: '10px', padding: '6px 10px', border: 'none', textAlign: 'left',
                                    fontSize: FONT.sm, cursor: why ? 'not-allowed' : 'pointer', color: why ? COLOR.faint : COLOR.primary,
                                    background: on ? COLOR.surfaceAlt : 'transparent', fontWeight: on ? 600 : 400,
                                }}
                            >
                                <span>{part.name}</span><span style={{ color: COLOR.faint }}>{part.kind}</span>
                            </button>
                        );
                    })}
                    {matched.length > MOST_SHOWN && (
                        <div style={{ padding: '6px 10px', fontSize: FONT.xs, color: COLOR.faint }}>{matched.length - MOST_SHOWN} more: narrow the types or the name.</div>
                    )}
                </div>
            )}
        </div>
    );
}

export function InterfacesPage() {
    const model = useModelStore(s => s.model);
    const connected = useModelStore(s => s.connected);
    const view = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const dashboards = useModelStore(s => s.dashboards);
    const headerWorkspace = useModelStore(s => s.workspace);
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const dhfSettings = useModelStore(s => s.dhfSettings);

    const a = view.type === 'interfaces' ? view.a ?? '' : '';
    const b = view.type === 'interfaces' ? view.b ?? '' : '';
    const choose = (next: { a?: string; b?: string }) => setActiveView({ type: 'interfaces', a: next.a ?? a, b: next.b ?? b });

    // The system the choices are drawn from; the workspace chosen in the header unless this page picks its own.
    const [system, setSystem] = useState<string | undefined>(undefined);
    const workspace = system ?? headerWorkspace ?? null;
    const scoped = useMemo(() => (model ? scopeModel(model, workspace) : null), [model, workspace]);
    const candidates = useMemo(() => selectableParts(scoped), [scoped]);

    const catalog = useMemo(() => {
        const taxonomy = explorerTaxonomy(availableOntologies).byKind;
        return OntologyKindCatalog.of(scoped, name => taxonomy.has(name));
    }, [scoped, availableOntologies]);
    // Only the types that part candidates are of: a requirement or a risk is not something an interface joins.
    const kindOptions = useMemo(() => {
        const held = new Set(candidates.map(part => part.kind));
        const reachable = (value: string): boolean => [...held].some(kind => kind === value || ancestors(kind, catalog.parents).includes(value));
        return catalog.options().filter(option => reachable(option.value));
    }, [catalog, candidates]);

    const families = useMemo(() => (model ? portFamiliesByPart(model) : new Map<string, Set<string>>()), [model]);
    const refuseB = (id: string): string | undefined => {
        if (!model || !a) return undefined;
        if (id === a) return 'Choose a different part from the first.';
        const verdict = interfaceCompatibility(model, a, id, families);
        return verdict.ok ? undefined : verdict.reason;
    };
    const refuseA = (id: string): string | undefined => (b && id === b ? 'Choose a different part from the second.' : undefined);

    const verdict = model && a && b && a !== b ? interfaceCompatibility(model, a, b, families) : null;
    const ready = Boolean(model) && a !== '' && b !== '' && a !== b && Boolean(model?.elements[a]) && Boolean(model?.elements[b]);
    const wrongFamily = useMemo(
        () => (ready && model ? crossFamilyInterfaces(model, interfacesBetween(model, a, b)) : []),
        [ready, model, a, b],
    );
    const saved = useMemo(() => savedInterfaces(dashboards), [dashboards]);
    // The preview is the page that gets saved, drawn by the same renderer, so the two cannot differ.
    const html = useMemo(
        () => (ready ? renderDashboardHtml(interfacesMarkdown(model, a, b, defaultInterfacesTitle(model, a, b)), model, dhfSettings) : ''),
        [ready, model, a, b, dhfSettings],
    );
    const css = useMemo(() => documentThemeCss(dhfSettings), [dhfSettings]);

    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [scope, setScope] = useState<DashboardScope>('shared');
    const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

    const save = async () => {
        const clean = (title.trim() || defaultInterfacesTitle(model, a, b));
        const id = uniqueDashboardId(dashboards, dashboardIdFromTitle(clean), scope);
        setStatus(null);
        try {
            await saveDashboard(id, scope, interfacesMarkdown(model, a, b, clean));
            // The saved page opens as a dashboard, a page behind the custom-dashboards feature; with it off the
            // file is still written, so say where it is rather than landing on the home page.
            if (isFeatureEnabled('custom-dashboards')) setActiveView(viewFor(id, dashboards.some(d => d.id === id) ? scope : undefined));
            else setStatus({ kind: 'ok', message: `Saved to dashboards/${scope === 'user' ? 'user/' : ''}${id}.md. It is listed on the left. Turn on Custom Dashboards in Settings > Features to open it as a page.` });
        } catch (error) {
            setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    };

    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: COLOR.surfaceAlt }}>
            <InterfacesPanel
                saved={saved} selected={{ a, b }}
                onSelect={page => setActiveView({ type: 'interfaces', a: page.a, b: page.b })}
                onNew={() => setActiveView({ type: 'interfaces' })}
            />
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: '16px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: FONT.lg, color: COLOR.primary }}>Interfaces</h1>
                        <p style={{ margin: '4px 0 0', fontSize: FONT.sm, color: COLOR.muted }}>
                            Choose two parts to list the interfaces between them. An interface on a port of something nested inside either part counts.
                        </p>
                    </div>

                    <div style={{ maxWidth: '300px' }}>
                        <MatrixSystemSelect value={system} onChange={setSystem} noneLabel={headerWorkspace ? 'The workspace in the header' : 'Whole model'} />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        <PartChooser
                            title="Part A" chosen={model?.elements[a]} onChoose={id => choose({ a: id })} candidates={candidates}
                            parents={catalog.parents} kindOptions={kindOptions} refusal={refuseA}
                        />
                        <PartChooser
                            title="Part B" chosen={model?.elements[b]} onChoose={id => choose({ b: id })} candidates={candidates}
                            parents={catalog.parents} kindOptions={kindOptions} refusal={refuseB}
                        />
                    </div>
                    {candidates.length === 0 && (
                        <div style={{ fontSize: FONT.sm, color: COLOR.muted }}>This model has no parts in a layer where interfaces or ports are defined.</div>
                    )}
                    {a !== '' && a === b && <div role="alert" style={{ fontSize: FONT.sm, color: '#B91C1C' }}>Choose two different parts.</div>}
                    {verdict && !verdict.ok && <div role="alert" style={{ fontSize: FONT.sm, color: '#B91C1C' }}>{verdict.reason}</div>}
                    {verdict?.ok && verdict.note === 'no-ports' && (
                        <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>One of these parts owns no port, so the ontology has nothing to say about which interfaces it can have.</div>
                    )}
                    {wrongFamily.length > 0 && (
                        <div role="alert" style={{ fontSize: FONT.sm, color: '#B45309' }}>
                            {wrongFamily.map(f => f.name).join(', ')} joins ports of different families, which the ontology does not allow for an interface.
                        </div>
                    )}

                    {ready && verdict?.ok && (
                        <div style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: '10px', padding: '14px 16px', display: 'grid', gap: '10px' }}>
                            <style>{css}</style>
                            <MemoMarkdownView className="memo-doc" html={html} model={model} />
                            <form
                                onSubmit={event => { event.preventDefault(); setSaving(true); void save().finally(() => setSaving(false)); }}
                                style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end', borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: '12px' }}
                            >
                                <label style={{ ...label, flex: '1 1 260px' }}>
                                    Save as a markdown page
                                    <input value={title} onChange={event => setTitle(event.target.value)} placeholder={defaultInterfacesTitle(model, a, b)} style={field} />
                                </label>
                                <label style={label}>
                                    Who sees it
                                    <select value={scope} onChange={event => setScope(event.target.value as DashboardScope)} style={field}>
                                        <option value="shared">Shared (committed)</option>
                                        <option value="user">Only me</option>
                                    </select>
                                </label>
                                <ActionButton type="submit" variant="primary" icon={ControlIcon.save} disabled={!connected || saving}>
                                    {saving ? 'Saving…' : 'Save'}
                                </ActionButton>
                            </form>
                            {status && <div role="alert" style={{ fontSize: FONT.xs, color: status.kind === 'ok' ? COLOR.secondary : '#B91C1C' }}>{status.message}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** The specialization chain of a kind, nearest first. */
function ancestors(kind: string, parents: ReadonlyMap<string, string>): string[] {
    const chain: string[] = [];
    for (let current = parents.get(kind); current && !chain.includes(current); current = parents.get(current)) chain.push(current);
    return chain;
}
