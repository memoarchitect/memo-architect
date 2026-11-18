// ─── Guided Pathways ──────────────────────────────────────────────────────────────
//
// Opened from the toolbar’s Guided Pathways button: where a team starts, in any row. Its rows are
// the method's (`MethodLayer`): the architecture layers and the assurance disciplines, each as a tab; a third
// tab is the chosen system's design history. A row lists its steps' progress and opens the step a person would
// take next; nothing waits for anything, and the map never says a row is blocked. The scope is the tree of
// systems memo-tools found, with the systems at the boundary and the parts designed elsewhere listed apart.
//
// The first side's rows are numbered, from 0: they run from intent to realization. The other side's are
// disciplines worked alongside, and are not.
//
// Everything a row says is the method's data: its label, its question (doc), its viewpoints, its standard and
// how it links to the layers. Nothing here names a kind, a stage or a row.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { useGuideEvaluation } from '../lib/use-guide';
import { stepsForRole, words, type GuideStepStatus } from '../lib/guide-view';
import { approvalsOf, axesOf, continuePoint, layerOfStep, scopePath, scopeTree, suppliedParts, type LayerRow, type ScopeNode, layerRows } from '../lib/pathways';
import { roleLabel } from '../lib/role-viewpoints';
import { isFeatureEnabled } from '../config/feature-flags';
import { COLOR, FONT } from '../styles/tokens';

// Architect's tokens (index.css :root) where it has them; the teal shades are the mockup's.
const INK = '#0f766e';
const TITLE = 'var(--color-hero-from)';
const SOFT_TEAL = '#e8f8f3';
const SOFT_BLUE = '#eef3fb';
const HISTORY = 'history';

export function MethodMap() {
    const model = useModelStore(s => s.model);
    const guide = useModelStore(s => s.guide);
    const role = useModelStore(s => s.role);
    const workspace = useModelStore(s => s.workspace);
    const setWorkspace = useModelStore(s => s.setWorkspace);
    const lastStep = useModelStore(s => s.lastStep);
    const setLastStep = useModelStore(s => s.setLastStep);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const navigate = useNavigate();
    const problem = useGuideEvaluation();
    const [mine, setMine] = useState(false);
    const [scopeOpen, setScopeOpen] = useState(true);
    const [scopeFilter, setScopeFilter] = useState('');
    const scopeToggle = useRef<HTMLButtonElement>(null);
    const axes = axesOf(guide);
    const [tab, setTab] = useState<string | null>(null);
    const current = tab ?? axes[0] ?? HISTORY;

    const tree = useMemo(() => (model ? scopeTree(model) : { roots: [], external: [] }), [model]);
    const supplied = useMemo(() => (model ? suppliedParts(model, workspace) : []), [model, workspace]);
    const approvals = useMemo(() => (model ? approvalsOf(model, workspace) : { own: [], untied: [] }), [model, workspace]);
    const chosen = workspace ? model?.workspaceMembership?.workspaces.find(w => w.root === workspace) : undefined;
    const path = chosen ? scopePath(tree, chosen.root) : [];

    const shownSteps = useMemo(() => stepsForRole(guide?.steps ?? [], mine ? role : null), [guide, mine, role]);
    const shownIds = new Set(shownSteps.map(step => step.id));
    const rowsOf = (axis: string): LayerRow[] => layerRows(guide, axis)
        .map(row => {
            const steps = row.steps.filter(step => shownIds.has(step.id));
            return { ...row, steps, done: steps.filter(step => step.state === 'done').length };
        })
        .filter(row => !mine || row.steps.length > 0);
    const next = continuePoint(guide, lastStep, shownSteps);

    const openRow = (layer: LayerRow['layer'], step?: GuideStepStatus) => {
        if (step) setLastStep(step.id);
        setActiveMode('diagram');
        setActiveView({ type: 'pathway', layer: layer.name });
        navigate(`/method/${encodeURIComponent(layer.name)}`);
    };
    const open = (step: GuideStepStatus | undefined) => {
        if (!step) return;
        const layer = guide ? layerOfStep(guide, step.id) : undefined;
        if (layer) openRow(layer, step);
    };
    const go = (view: 'import' | 'releases') => {
        setActiveMode('diagram');
        setActiveView({ type: view });
        navigate(`/${view}`);
    };
    const inProgress = (rows: LayerRow[]) => rows.filter(row => row.done > 0 && row.done < row.steps.length).length;
    const systemName = chosen?.name ?? (workspace ? 'Selected system' : 'the whole model');

    return (
        <div data-testid="method-map" style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {scopeOpen && <ScopeSelector tree={tree} loading={!model} hasScopeInfo={!!model?.workspaceMembership} workspace={workspace} supplied={supplied.map(part => part.name)}
                filter={scopeFilter} onFilter={setScopeFilter} onSelect={setWorkspace} onClose={() => { setScopeOpen(false); scopeToggle.current?.focus(); }} />}

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 32px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: TITLE }}>Guided Pathways</h1>
                    <button ref={scopeToggle} type="button" data-testid="map-scope" aria-label="Choose working scope" aria-expanded={scopeOpen}
                        aria-controls="method-scope-selector" onClick={() => setScopeOpen(open => !open)}
                        style={{ cursor: 'pointer', textAlign: 'left', fontSize: FONT.sm, border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '2px 10px', background: '#fff' }}>
                        <span style={{ color: COLOR.muted }}>Working on: </span>
                        {path.length > 1 ? path.map(node => node.name).join(' ▸ ') : systemName}
                        {chosen && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#1D4ED8', background: SOFT_BLUE, padding: '1px 6px', borderRadius: 4 }}>{chosen.scope === 'sos' ? 'SYSTEM OF SYSTEMS' : 'SYSTEM'}</span>}
                        <span aria-hidden style={{ marginLeft: 8 }}>{scopeOpen ? '▴' : '▾'}</span>
                    </button>
                </div>
                {problem && <p data-testid="map-problem" style={{ fontSize: FONT.sm, color: '#B42318' }}>{problem}</p>}

                {next && (
                    <div data-testid="continue-card" style={{ display: 'flex', alignItems: 'center', gap: 16, border: `1.5px solid ${COLOR.accent}`, background: '#fff', borderRadius: 10, padding: '12px 18px', margin: '0 0 14px', maxWidth: 1100 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: INK, fontWeight: 600, letterSpacing: '0.06em' }}>{next.step.id === lastStep ? 'CONTINUE WHERE YOU LEFT OFF' : 'A PLACE TO START'}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: TITLE }}>{next.layer.label} · step {next.number} of {next.of}: {next.step.label ?? next.step.name}</div>
                            {next.step.exitCriteria && <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Done when: {lowerFirst(next.step.exitCriteria)}</div>}
                        </div>
                        <button data-testid="continue" onClick={() => open(next.step)} style={darkButton}>Continue</button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', fontSize: FONT.xs }}>
                    <span style={{ color: COLOR.muted }}>Show</span>
                    <div role="group" style={{ display: 'flex', border: `1px solid ${COLOR.border}`, borderRadius: 6, overflow: 'hidden' }}>
                        <button data-testid="show-everything" onClick={() => setMine(false)} style={segment(!mine)}>Everything</button>
                        <button data-testid="show-mine" disabled={!role} title={role ? undefined : 'Choose your role in Settings to see your own work.'} onClick={() => setMine(true)} style={segment(mine)}>
                            My work{role ? ` · ${roleLabel(role)}` : ''}
                        </button>
                    </div>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: COLOR.muted }}>Start in any row. Nothing waits for anything.</span>
                </div>

                <div role="tablist" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, paddingLeft: 8 }}>
                    {axes.map(axis => {
                        const rows = rowsOf(axis);
                        const started = inProgress(rows);
                        return (
                            <QtTab key={axis} id={axis} active={current === axis} onClick={() => setTab(axis)} title={words(axis)}
                                note={`${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · ${started > 0 ? `${started} in progress` : rows.some(row => row.done > 0) ? 'under way' : 'not started'}`} />
                        );
                    })}
                    <QtTab id={HISTORY} active={current === HISTORY} onClick={() => setTab(HISTORY)} title="Design history"
                        note={`${chosen?.name ?? 'whole model'} · ${approvals.own.length === 0 ? 'no approval yet' : `${approvals.own.length} ${approvals.own.length === 1 ? 'approval' : 'approvals'}`}`} />
                </div>
                <div data-testid={`tab-body-${current}`} style={{ border: `1px solid ${COLOR.border}`, borderRadius: '0 8px 8px 8px', background: '#fff', marginTop: -1, maxWidth: 1100 }}>
                    {current === HISTORY
                        ? <DesignHistory system={chosen} approvals={approvals} onRelease={() => go('releases')} />
                        : rowsOf(current).map((row, index) => (
                            <LayerRowView key={row.layer.id} row={row} number={current === axes[0] ? index : undefined}
                                continuing={!!next && row.steps.includes(next.step)}
                                onOpen={() => openRow(row.layer, next && row.steps.includes(next.step) ? next.step : row.steps.find(s => s.state !== 'done') ?? row.steps[0])}
                                onImport={row.layer.importable && isFeatureEnabled('import') ? () => go('import') : undefined} />
                        ))}
                    {current !== HISTORY && guide && rowsOf(current).length === 0 && (
                        <p style={{ padding: 16, fontSize: FONT.sm, color: COLOR.muted, margin: 0 }}>{mine ? 'None of this side\'s steps is written for your role.' : 'The method declares no rows here.'}</p>
                    )}
                    {!guide && !problem && <p style={{ padding: 16, fontSize: FONT.sm, color: COLOR.muted, margin: 0 }}>Reading the method…</p>}
                </div>

                {guide && (
                    <ConfidenceStrip rows={rowsOf(axes[axes.length - 1] ?? '')} system={chosen?.name ?? 'the whole model'}
                        approvals={approvals.own.length} onHistory={() => setTab(HISTORY)} />
                )}
                <p style={{ fontSize: FONT.xs, color: COLOR.muted, marginTop: 14 }}>Rows, their views and links are read from the ontology; steps and progress from the method.</p>
            </div>
        </div>
    );
}

/** A filtered hierarchy retains the path to every matching descendant. */
function matchingScopes(nodes: ScopeNode[], query: string): ScopeNode[] {
    if (!query) return nodes;
    return nodes.flatMap(node => {
        if (node.name.toLocaleLowerCase().includes(query)) return [node];
        const children = matchingScopes(node.children, query);
        return children.length ? [{ ...node, children }] : [];
    });
}

function ScopeSelector({ tree, loading, hasScopeInfo, workspace, supplied, filter, onFilter, onSelect, onClose }: {
    tree: ReturnType<typeof scopeTree>; loading: boolean; hasScopeInfo: boolean; workspace: string | null; supplied: string[];
    filter: string; onFilter: (value: string) => void; onSelect: (root: string | null) => void; onClose: () => void;
}) {
    const query = filter.trim().toLocaleLowerCase();
    const roots = matchingScopes(tree.roots, query);
    const external = tree.external.filter(system => system.name.toLocaleLowerCase().includes(query));
    return (
        <aside id="method-scope-selector" data-testid="scope-tree" aria-label="Working scope"
            style={{ width: 230, flexShrink: 0, borderRight: `1px solid ${COLOR.border}`, background: '#FFFFFF', padding: '14px 10px', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 8px' }}>
                <span style={{ fontSize: 11, color: COLOR.faint, fontWeight: 600, letterSpacing: '0.06em' }}>WORK ON</span>
                <button type="button" data-testid="scope-minimize" aria-label="Minimize system selector" onClick={onClose} style={quietLink}>‹</button>
            </div>
            <p style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '0 4px 10px' }}>Choose one system, or the whole model.</p>
            <input type="search" aria-label="Filter systems" placeholder="Filter systems…" value={filter}
                onChange={event => onFilter(event.target.value)}
                style={{ boxSizing: 'border-box', width: '100%', padding: '7px 8px', border: `1px solid ${COLOR.border}`, borderRadius: 6, marginBottom: 8, font: 'inherit', fontSize: FONT.sm }} />
            <button type="button" data-testid="scope-whole-model" aria-pressed={workspace === null} onClick={() => onSelect(null)}
                style={{ ...lightButton, width: '100%', textAlign: 'left', marginBottom: 8, background: workspace === null ? SOFT_TEAL : '#fff', color: workspace === null ? INK : COLOR.primary }}>
                Whole model
            </button>
            {loading && <p role="status" style={{ fontSize: FONT.sm, color: COLOR.muted }}>Loading system choices…</p>}
            {!loading && !hasScopeInfo && <p role="status" style={{ fontSize: FONT.sm, color: COLOR.muted }}>System scope information is not available in this snapshot.</p>}
            {!loading && hasScopeInfo && tree.roots.length === 0 && tree.external.length === 0 && <p style={{ fontSize: FONT.xs, color: COLOR.muted }}>The model declares no system yet.</p>}
            {roots.map(node => <ScopeRow key={node.root} node={node} depth={0} selected={workspace} onSelect={onSelect} />)}
            {!loading && hasScopeInfo && query && roots.length === 0 && external.length === 0 && <p role="status" style={{ fontSize: FONT.sm, color: COLOR.muted }}>No systems match.</p>}
            <div data-testid="scope-external" style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '14px 4px 4px' }}>
                Outside the boundary: {external.length === 0 ? (query ? 'no matches' : 'none yet') : external.map(system => (
                    <button type="button" key={system.root} aria-pressed={workspace === system.root} onClick={() => onSelect(system.root)}
                        style={{ ...quietLink, background: workspace === system.root ? SOFT_TEAL : 'transparent', fontWeight: workspace === system.root ? 600 : 400 }}>{system.name}</button>
                ))}
            </div>
            <div data-testid="scope-supplied" style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '6px 4px' }}>
                Supplied: {supplied.length === 0 ? 'none' : supplied.join(', ')}
            </div>
        </aside>
    );
}

function ScopeRow({ node, depth, selected, onSelect }: { node: ScopeNode; depth: number; selected: string | null; onSelect: (root: string) => void }) {
    const active = node.root === selected;
    return (
        <>
            <button type="button" data-testid="scope-node" data-root={node.root} aria-pressed={active} onClick={() => onSelect(node.root)}
                style={{ display: 'flex', alignItems: 'baseline', gap: 6, width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', borderRadius: 6,
                    padding: `4px 8px 4px ${8 + depth * 14}px`, background: active ? SOFT_TEAL : 'transparent', color: active ? INK : COLOR.primary,
                    fontSize: FONT.sm, fontWeight: active ? 600 : 400 }}>
                <span>{node.name}</span>
                {node.scope === 'sos' && <span style={{ fontSize: 11, color: COLOR.faint }}>system of systems</span>}
            </button>
            {node.children.map(child => <ScopeRow key={child.root} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />)}
        </>
    );
}

function QtTab({ id, active, onClick, title, note }: { id: string; active: boolean; onClick: () => void; title: string; note: string }) {
    return (
        <button role="tab" aria-selected={active} data-testid={`map-tab-${id}`} onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer', font: 'inherit',
                border: `1px solid ${COLOR.border}`, borderBottom: active ? '1px solid #fff' : `1px solid ${COLOR.border}`,
                borderTop: active ? `3px solid ${TITLE}` : `1px solid ${COLOR.border}`, borderRadius: '8px 8px 0 0',
                background: active ? '#fff' : 'var(--color-surface-alt)', position: 'relative', zIndex: active ? 2 : 1, color: active ? TITLE : COLOR.muted }}>
            <span style={{ fontSize: FONT.md, fontWeight: 700 }}>{title}</span>
            <span style={{ fontSize: 11, color: COLOR.muted }}>{note}</span>
        </button>
    );
}

function LayerRowView({ row, number, continuing, onOpen, onImport }: {
    row: LayerRow; number: number | undefined; continuing: boolean; onOpen: () => void; onImport?: () => void;
}) {
    const { layer, steps, done } = row;
    const started = done > 0;
    const views = layer.viewpoints.map(viewpoint => lowerFirst(viewpoint.label));
    return (
        <div data-testid="map-row" data-row={layer.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderTop: `1px solid ${COLOR.borderLight}`, background: continuing ? SOFT_TEAL : '#fff' }}>
            <div aria-hidden style={{ width: 34, height: 34, borderRadius: 8, background: TITLE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {layer.label.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FONT.md, fontWeight: 700, color: TITLE }}>
                    {number !== undefined && <span style={{ color: '#7C3AED', marginRight: 6 }}>{number}</span>}{layer.label}
                </div>
                <div style={{ fontSize: FONT.sm, color: COLOR.secondary }}>
                    {layer.purpose}{layer.standardReference ? ` · ${layer.standardReference}` : ''}
                </div>
                <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                    {!started && 'not started · '}{views.length > 0 && `views: ${views.join(', ')}`}
                </div>
                {layer.linkDescription && <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>Links: {layer.linkDescription}</div>}
            </div>
            {steps.length > 0 && started && (
                <div title={`${done} of ${steps.length} steps done`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {steps.map(step => <span key={step.id} style={{ width: 12, height: 4, borderRadius: 2, background: step.state === 'done' ? '#14b8a6' : '#b8bec6' }} />)}
                    </div>
                    <span style={{ fontSize: FONT.xs, color: COLOR.muted }}>{done} of {steps.length}</span>
                </div>
            )}
            {onImport && <button data-testid="row-import" onClick={onImport} style={lightButton}>Import…</button>}
            <button data-testid="row-open" onClick={onOpen}
                style={continuing ? darkButton : started ? lightButton : startButton}>
                {continuing ? 'Continue' : started ? 'Open' : 'Start here'}
            </button>
        </div>
    );
}

function DesignHistory({ system, approvals, onRelease }: {
    system: { name: string; scope: 'sos' | 'system' } | undefined;
    approvals: ReturnType<typeof approvalsOf>;
    onRelease: () => void;
}) {
    if (system?.scope === 'sos') {
        return (
            <div style={{ padding: 18, fontSize: FONT.sm }}>
                <p data-testid="history-sos" style={{ margin: 0, color: COLOR.secondary }}>
                    {system.name}, the system of systems, has no design history of its own: each of its systems has one. Its configuration is validated and listed in each covered release. Choose a system on the left.
                </p>
            </div>
        );
    }
    const name = system?.name ?? 'This model';
    return (
        <div style={{ padding: 18 }}>
            <p style={{ margin: '0 0 12px', fontSize: FONT.sm, color: COLOR.secondary, background: SOFT_BLUE, padding: '8px 12px', borderRadius: 6 }}>
                A design history belongs to one regulated device: an approval of this system in one jurisdiction, covering its releases. Documents are built from this system at those releases.
            </p>
            {approvals.own.length === 0 ? (
                <div data-testid="history-empty">
                    <div style={{ fontSize: FONT.md, fontWeight: 700, color: TITLE }}>{name} has no approval yet</div>
                    <p style={{ fontSize: FONT.sm, color: COLOR.secondary, maxWidth: 760 }}>
                        Add the approvals it will be cleared under, one per jurisdiction. Each selects the standards and documents it needs; until a release is recorded, its documents are drafts built from the working model.
                    </p>
                </div>
            ) : (
                <table data-testid="history-approvals" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
                    <thead><tr>{['Approval', 'Jurisdiction', 'Covers'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 11, color: COLOR.muted, padding: '4px 8px' }}>{h}</th>)}</tr></thead>
                    <tbody>{approvals.own.map(device => (
                        <tr key={device.id} style={{ borderTop: `1px solid ${COLOR.borderLight}` }}>
                            <td style={{ padding: '6px 8px', fontSize: FONT.sm }}>{device.name}</td>
                            <td style={{ padding: '6px 8px', fontSize: FONT.sm }}>{device.jurisdiction || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: FONT.sm, color: COLOR.muted }}>
                                {device.covers.length === 0 ? 'no release yet: its documents are drafts built from the working model' : device.covers.map(c => c.name).join(', ')}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            )}
            {approvals.untied.length > 0 && (
                <p data-testid="history-untied" style={{ fontSize: FONT.xs, color: COLOR.muted, maxWidth: 760 }}>
                    Not tied to a system yet: {approvals.untied.map(device => `${device.name}${device.jurisdiction ? ` (${device.jurisdiction})` : ''}`).join(', ')}.
                    An approval reaches its system through the releases it covers, and these cover none.
                </p>
            )}
            <button data-testid="record-release" onClick={onRelease} style={lightButton}>Record a release</button>
        </div>
    );
}

/** One stop per row of the last side of the map (the assurance disciplines), ending in the design history. */
function ConfidenceStrip({ rows, system, approvals, onHistory }: { rows: LayerRow[]; system: string; approvals: number; onHistory: () => void }) {
    return (
        <div data-testid="confidence-strip" style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, background: '#fff', padding: '10px 14px', marginTop: 16, maxWidth: 1100 }}>
            <div style={{ fontSize: FONT.sm, fontWeight: 700, color: TITLE, marginBottom: 8 }}>
                Toward assurance confidence <span style={{ fontWeight: 400, color: COLOR.muted, fontSize: FONT.xs }}>what the model can already show for {system}, ending in its design history</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, flexWrap: 'wrap' }}>
                {rows.map(row => (
                    <div key={row.layer.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div data-testid="strip-stop" style={{ border: `1px solid ${row.done > 0 ? COLOR.accent : COLOR.border}`, background: row.done > 0 ? SOFT_TEAL : '#fff', borderRadius: 6, padding: '4px 10px', minWidth: 96 }}>
                            <div style={{ fontSize: FONT.xs, fontWeight: 600, color: TITLE }}>{row.layer.label}</div>
                            <div style={{ fontSize: 11, color: COLOR.muted }}>{row.done > 0 ? `${row.done} of ${row.steps.length} steps` : 'none yet'}</div>
                        </div>
                        <span style={{ color: COLOR.faint }}>→</span>
                    </div>
                ))}
                <button data-testid="strip-history" onClick={onHistory} style={{ ...darkButton, textAlign: 'left', padding: '4px 12px' }}>
                    <div style={{ fontSize: FONT.xs, fontWeight: 600 }}>Design history</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>of {system} · {approvals === 0 ? 'no approval yet' : `${approvals} ${approvals === 1 ? 'approval' : 'approvals'}`}</div>
                </button>
            </div>
        </div>
    );
}

/** "State and mode" as "state and mode" in a sentence; "UI layout" keeps its acronym. */
const lowerFirst = (text: string) => /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);

const quietLink: React.CSSProperties = { background: 'none', border: 0, padding: '0 4px 0 0', cursor: 'pointer', color: INK, fontSize: FONT.xs };
const darkButton: React.CSSProperties = { background: TITLE, color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', fontSize: FONT.sm, fontWeight: 600, cursor: 'pointer' };
const lightButton: React.CSSProperties = { background: '#fff', color: TITLE, border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '5px 12px', fontSize: FONT.sm, cursor: 'pointer' };
const startButton: React.CSSProperties = { background: SOFT_TEAL, color: INK, border: '1px solid #bfe9dd', borderRadius: 6, padding: '5px 12px', fontSize: FONT.sm, fontWeight: 600, cursor: 'pointer' };
const segment = (on: boolean): React.CSSProperties => ({ background: on ? TITLE : '#fff', color: on ? '#fff' : COLOR.secondary, border: 0, padding: '4px 10px', fontSize: FONT.xs, cursor: 'pointer' });
