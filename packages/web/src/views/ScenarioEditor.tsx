import { useScopedModel } from '../store/scoped-model';
import { groupUseCases } from '../lib/use-case-groups';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { sendElementUpdate } from '../store/ws-client';
import { DIAGRAM_TYPE_META, LAYER_COLORS, resolveActionFlowDiagramType } from '../constants';
import { COLOR, FONT } from '../styles/tokens';
import { ExplorerElementIdentity } from '../components/ExplorerElementIdentity';
import { ExplorerCountBadge } from '../components/ExplorerCountBadge';
import { MemoBrandMark } from '../components/MemoBrandMark';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import { relationshipsOfType } from '@memoarchitect/tools/browser';

const SCENARIO_VIEW_GROUPS = [
    { label: 'Activity diagram', types: new Set(['act']) },
    { label: 'Operative flow', types: new Set(['afd', 'ofd']) },
    { label: 'Function flow', types: new Set(['ffd']) },
    { label: 'Sequence diagram', types: new Set(['seq']) },
] as const;

function groupScenarioViews<T extends { diagramType: string }>(views: T[]) {
    return SCENARIO_VIEW_GROUPS.map(group => {
        const items = views.filter(view => group.types.has(view.diagramType.toLowerCase()));
        return { label: group.label, items };
    }).filter(group => group.items.length > 0);
}

function getScenarioDiagramMeta(diagram: { diagramType: string }) {
    const diagramType = diagram.diagramType.toLowerCase();
    const resolvedType = ['afd', 'ofd', 'ffd'].includes(diagramType)
        ? resolveActionFlowDiagramType(diagram)
        : diagramType;
    return DIAGRAM_TYPE_META[resolvedType];
}

// Keep the scenario browser visually and behaviorally aligned with the Model
// Explorer. This is intentionally local for now because scenarios use a
// domain-specific hierarchy rather than the Explorer's ontology tree.
function ChevronIcon({ expanded, color = COLOR.muted }: { expanded: boolean; color?: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 150ms ease', flexShrink: 0 }}>
            <path d="M6 4L10 8L6 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FolderIcon({ open, color }: { open: boolean; color: string }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1.5 3.5h4.8l1.2 1.5H14.5v8H1.5z" fill={color} opacity="0.15" stroke={color} strokeWidth="1" strokeLinejoin="round" />
            {open && <path d="M1.5 5h13v8H1.5z" fill={color} opacity="0.08" />}
        </svg>
    );
}

function ItemIcon({ color }: { color: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="1.5" width="12" height="13" rx="1.5" fill={color} opacity="0.1" stroke={color} strokeWidth="1" />
            <line x1="5" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="0.8" opacity="0.5" />
            <line x1="5" y1="8" x2="11" y2="8" stroke={color} strokeWidth="0.8" opacity="0.5" />
        </svg>
    );
}

// ─── Scenario Step (parsed from doc field) ──────────────────────────────────

interface ScenarioStep {
    index: number;
    text: string;
    linkedElementId?: string;
}

interface ScenarioDetails {
    scenario: MemoElement;
    views: Array<{ id: string; name: string; diagramType: string }>;
}

function parseSteps(doc: string): ScenarioStep[] {
    if (!doc) return [];
    const lines = doc.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
        const match = line.match(/^\d+\.\s*(.*)/);
        return { index: i, text: match ? match[1] : line };
    });
}

function serializeSteps(steps: ScenarioStep[]): string {
    return steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
}

// ─── Scenario Editor Component ──────────────────────────────────────────────

export function ScenarioEditor({ explorerOnly = false }: { explorerOnly?: boolean }) {
    const model = useModelStore(s => s.model);
    const scoped = useScopedModel();
    const createRelationship = useModelStore(s => s.createRelationship);
    const inspectElement = useModelStore(s => s.inspectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSteps, setEditingSteps] = useState<ScenarioStep[] | null>(null);
    const [newStepText, setNewStepText] = useState('');
    const [linkingStepIndex, setLinkingStepIndex] = useState<number | null>(null);
    const [linkSearch, setLinkSearch] = useState('');
    // A branch of the use-case tree to look at alone: the use case and everything it includes.
    const [focusKey, setFocusKey] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    const scenarioTree = useMemo(() => {
        // The listing reads the workspace the person chose; the editors below keep the whole model.
        if (!scoped) return [];
        const model = scoped;
        const elements = Object.values(model.elements);
        const byId = model.elements;
        const byType = (...types: string[]) => relationshipsOfType(model, ...types);
        const rawUseCases = elements.filter(e => e.kind.endsWith('UseCase'));
        const useCaseIds = new Set(rawUseCases.map(useCase => useCase.id));
        // O8: procedures first, the system use cases they include nested under them, then the rest
        // under their system (lib/use-case-groups.ts). `include` lowers to an `includesStep`
        // relationship in the builder, not `Includes`, which the ontology never declared.
        const grouped = groupUseCases(
            [...useCaseIds],
            byType('includesStep'),
            scoped?.workspaceMembership,
            id => byId[id]?.name ?? id,
        );
        const useCases = grouped.flatMap(group => group.entries.map((entry, index) => ({
            element: byId[entry.id], depth: entry.depth, group, firstInGroup: index === 0,
        }))).filter((row): row is typeof row & { element: MemoElement } => Boolean(row.element));
        const matchesSearch = (el: MemoElement) => !searchTerm
            || el.name.toLowerCase().includes(searchTerm.toLowerCase())
            || el.kind.toLowerCase().includes(searchTerm.toLowerCase());

        return useCases
            .map(({ element: useCase, depth, group, firstInGroup }) => {
                // The operational chain is two hops: RealizesUseCase from a workflow
                // to the use case it serves, and the scenario nested in the workflow
                // (the ontology removed a `HasScenario` relation for that). A
                // scenario reaches its use case THROUGH its workflow. There is no
                // scenario-to-use-case relation, because a scenario is a path
                // through a body of work and not a second statement of the goal.
                //
                // This read used to be `Supports` / `supportsUseCase`, plus
                // `parentUseCase` and `parentWorkflow` attributes on the scenario,
                // plus a direct `scenarioRealizesUseCase`. The ontology declares
                // none of those four: not the relations (memo_workflows.sysml has
                // RealizesUseCase) and not
                // the attributes (OperativeScenario has no parent refs — its own
                // comment says the workflow expresses the relationship). So the
                // view asked for a vocabulary that never existed and every model
                // read as "No workflows".
                const workflowElements = [...new Map(byType('RealizesUseCase')
                    .filter(r => r.targetId === useCase.id)
                    .map(r => byId[r.sourceId])
                    .filter((el): el is MemoElement => Boolean(el) && el.kind === 'OperationalWorkflow')
                    .map(workflow => [workflow.id, workflow] as const)).values()];
                // A workflow owns its scenarios by nesting them, so each scenario can
                // own the operative actions on its path. A workflow is the analysis of
                // a body of work, a part, so the builder records it as the scenario's
                // `owner`; one written as an action is its `parentAction`.
                const scenariosOfWorkflow = (workflow: MemoElement) => elements.filter(
                    candidate => candidate.kind.endsWith('Scenario') && (candidate.owner ?? candidate.parentAction) === workflow.id);
                // Nominal first: the expected path is what a reader needs before
                // the exceptions, and ScenarioKind defaults to nominal when unset.
                const nominalFirst = (a: MemoElement, b: MemoElement) => {
                    const rank = (el: MemoElement) => (el.attributes.scenarioKind ?? 'nominal') === 'nominal' ? 0 : 1;
                    return rank(a) - rank(b) || a.name.localeCompare(b.name);
                };
                const workflows = workflowElements.map(workflow => ({
                    workflow,
                    scenarios: scenariosOfWorkflow(workflow).sort(nominalFirst).map(scenario => ({
                        scenario,
                        // MEMO diagrams are linked to a scenario by an explicit
                        // authored `scenario` reference. Do not infer a link
                        // from selected elements or matching names.
                        views: (model.diagrams ?? []).filter(d => d.scenarioIds?.includes(scenario.id)),
                    })),
                }));
                return { useCase, workflows, depth, group, firstInGroup };
            })
            .filter(branch => matchesSearch(branch.useCase)
                || branch.workflows.some(({ workflow, scenarios }) => matchesSearch(workflow)
                    || scenarios.some(({ scenario }) => matchesSearch(scenario))));
    }, [scoped, searchTerm]);

    const selectedElement = selectedElementId && model ? model.elements[selectedElementId] : null;
    const rels = useMemo(() => getRelationshipsForElement(model, selectedElementId || ''), [model, selectedElementId]);

    const steps = useMemo(() => {
        if (editingSteps) return editingSteps;
        if (!selectedElement) return [];
        return parseSteps(selectedElement.doc || '');
    }, [selectedElement, editingSteps]);

    const startEditing = useCallback(() => {
        if (selectedElement) {
            setEditingSteps(parseSteps(selectedElement.doc || ''));
        }
    }, [selectedElement]);

    const saveSteps = useCallback(() => {
        if (!selectedElement || !editingSteps) return;
        const doc = serializeSteps(editingSteps);
        sendElementUpdate({ ...selectedElement, doc });
        setEditingSteps(null);
    }, [selectedElement, editingSteps]);

    const addStep = useCallback(() => {
        if (!newStepText.trim()) return;
        const next = [...(editingSteps || steps), { index: steps.length, text: newStepText.trim() }];
        setEditingSteps(next);
        setNewStepText('');
    }, [newStepText, editingSteps, steps]);

    const removeStep = useCallback((idx: number) => {
        const next = (editingSteps || steps).filter((_, i) => i !== idx);
        setEditingSteps(next);
    }, [editingSteps, steps]);

    const moveStep = useCallback((idx: number, dir: -1 | 1) => {
        const arr = [...(editingSteps || steps)];
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        setEditingSteps(arr);
    }, [editingSteps, steps]);

    const updateStepText = useCallback((idx: number, text: string) => {
        const arr = [...(editingSteps || steps)];
        arr[idx] = { ...arr[idx], text };
        setEditingSteps(arr);
    }, [editingSteps, steps]);

    // Link search results
    const linkCandidates = useMemo(() => {
        if (!model || !linkSearch) return [];
        const lower = linkSearch.toLowerCase();
        return Object.values(model.elements)
            .filter(e => e.id !== selectedElementId && e.name.toLowerCase().includes(lower))
            .slice(0, 10);
    }, [model, linkSearch, selectedElementId]);

    // Match the other explorers: nothing is expanded until the user opens it.
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const toggleGroup = (g: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(g)) next.delete(g); else next.add(g);
            return next;
        });
    };
    const openElementProfile = (id: string) => {
        setEditingSteps(null);
        setActiveMode('scenario');
        inspectElement(id);
        setActiveView({ type: 'element-detail', elementId: id });
    };

    // The branch being looked at is in the address (?focus=USE-3), so it can be linked to.
    const focusRestored = useRef(false);
    // Read once, at first render: the view sync may rewrite the address before the model has loaded.
    const linkedFocus = useRef(searchParams.get('focus'));
    useEffect(() => {
        if (focusRestored.current || scenarioTree.length === 0) return;
        focusRestored.current = true;
        const wanted = linkedFocus.current;
        const row = wanted ? scenarioTree.find(candidate => (candidate.useCase.shortId ?? candidate.useCase.id) === wanted) : undefined;
        if (row) setFocusKey(`${row.group.id}:${row.useCase.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenarioTree]);
    useEffect(() => {
        if (!focusRestored.current) return;
        const row = focusKey ? scenarioTree.find(candidate => `${candidate.group.id}:${candidate.useCase.id}` === focusKey) : undefined;
        const value = row ? (row.useCase.shortId ?? row.useCase.id) : null;
        // The address as the browser has it: the router's copy can still hold a link the view sync has since rewritten.
        if ((new URLSearchParams(window.location.search).get('focus') ?? null) === value) return;
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            if (value) next.set('focus', value); else next.delete('focus');
            return next;
        }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey]);

    const ScenarioWorkflowBranch = ({ workflow, scenarios }: { workflow: MemoElement; scenarios: ScenarioDetails[] }) => {
        const workflowKey = `workflow:${workflow.id}`;
        const isExpanded = expandedGroups.has(workflowKey);
        const toggleWorkflow = () => toggleGroup(workflowKey);
        const openDiagram = (diagram: { id: string }) => {
            // Keep the Use Cases mode active so ExplorerPanel retains this
            // hierarchy while the app-level render region opens the diagram.
            setActiveMode('scenario');
            setActiveView({ type: 'diagram', diagramId: diagram.id });
        };
        const renderElementItem = (element: MemoElement, indent: number) => {
            const isSelected = selectedElementId === element.id;
            return (
                <button
                    key={element.id}
                    type="button"
                    onClick={() => openElementProfile(element.id)}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-left"
                    style={{ borderRadius: '4px', margin: '0 4px', marginLeft: `${indent + 4}px`, width: `calc(100% - ${indent + 8}px)`, background: isSelected ? `${COLOR.accent}18` : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F0F0ED'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? `${COLOR.accent}18` : 'transparent'; }}
                >
                    <ItemIcon color={LAYER_COLORS[element.layer] || COLOR.muted} />
                    <ExplorerElementIdentity element={element} selected={isSelected} />
                </button>
            );
        };

        return (
            <div className="mb-0.5">
                <div
                    className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
                    style={{ borderRadius: '4px', margin: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => openElementProfile(workflow.id)}
                >
                    <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${workflow.name}`} onClick={event => { event.stopPropagation(); toggleWorkflow(); }}>
                        <ChevronIcon expanded={isExpanded} color={COLOR.muted} />
                    </button>
                    <FolderIcon open={isExpanded} color={LAYER_COLORS.operational || '#4A90D9'} />
                    <ExplorerElementIdentity element={workflow} fontSize={FONT.explorer.kind} fontWeight={600} />
                    <ExplorerCountBadge count={scenarios.length} color={LAYER_COLORS.operational || '#4A90D9'} title={`${scenarios.length} scenarios`} />
                </div>
                {isExpanded && scenarios.map(({ scenario, views }) => {
                    return (
                        <div key={scenario.id} style={{ marginLeft: '16px' }}>
                            {renderElementItem(scenario, 0)}
                            <div style={{ marginLeft: '20px' }}>
                                {views.length > 0 && (
                                    <div className="pt-1">
                                        {views.map(view => {
                                            const meta = getScenarioDiagramMeta(view);
                                            return (
                                                <button key={view.id} type="button" onClick={() => openDiagram(view)} className="flex w-full items-center gap-2 px-2 py-1 text-left" style={{ borderRadius: '4px', margin: '0 4px', width: 'calc(100% - 8px)' }} onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title={meta?.fullName}>
                                                    {meta && (
                                                        <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: meta.color + '20', color: meta.color, fontSize: FONT.badge }}>
                                                            {meta.code}
                                                        </span>
                                                    )}
                                                    <span className="flex-1" style={{ minWidth: 0 }}>
                                                        <span className="truncate block" style={{ color: COLOR.primary, fontSize: FONT.explorer.item }}>{view.name}</span>
                                                        <span className="truncate block font-mono" style={{ color: COLOR.faint, fontSize: '9px', marginTop: 1 }}>{view.id}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {isExpanded && scenarios.length === 0 && <div className="px-2 py-1" style={{ color: COLOR.faint, fontSize: FONT.explorer.count, marginLeft: '20px' }}>No scenarios</div>}
            </div>
        );
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* The hierarchy is rendered by ExplorerPanel; the workbench itself
                owns only the center render region. */}
            {explorerOnly && <div className="flex-1 flex flex-col overflow-hidden" style={{ background: COLOR.surface }}>
                <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <input
                        type="text"
                        placeholder={'Search ' + scenarioTree.length + ' use cases...'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg focus:outline-none"
                        style={{ background: COLOR.surfaceAlt, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }}
                    />
                    {scenarioTree.some(row => row.depth > 0) && (
                        <select aria-label="Show use cases" value={focusKey} onChange={e => setFocusKey(e.target.value)}
                            className="w-full mt-2 px-2 py-1.5 rounded-lg"
                            style={{ background: COLOR.surface, border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.explorer.search }}>
                            <option value="">All use cases</option>
                            {scenarioTree.map((row, index) => scenarioTree[index + 1] && scenarioTree[index + 1].depth > row.depth && !scenarioTree[index + 1].firstInGroup
                                ? <option key={`${row.group.id}:${row.useCase.id}`} value={`${row.group.id}:${row.useCase.id}`}>
                                    {'\u00A0\u00A0'.repeat(row.depth)}Only {row.useCase.name}
                                </option>
                                : null)}
                        </select>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto py-1" style={{ fontSize: FONT.explorer.item }}>
                    {(() => {
                        // A use case nests under the one that includes it, so collapsing a parent hides every case
                        // beneath it. A search shows its matches wherever they sit.
                        const ancestors: { depth: number; expanded: boolean }[] = [];
                        // A focused branch is the chosen use case and the rows nested beneath it, shown from its own level.
                        const start = focusKey ? scenarioTree.findIndex(row => `${row.group.id}:${row.useCase.id}` === focusKey) : -1;
                        const shown = start < 0 ? scenarioTree : (() => {
                            const rows = [scenarioTree[start]];
                            for (let i = start + 1; i < scenarioTree.length && scenarioTree[i].depth > scenarioTree[start].depth && !scenarioTree[i].firstInGroup; i++) rows.push(scenarioTree[i]);
                            return rows.map((row, index) => ({ ...row, depth: row.depth - scenarioTree[start].depth, firstInGroup: index === 0 && row.firstInGroup }));
                        })();
                        return shown.map(row => {
                            if (row.firstInGroup) ancestors.length = 0;
                            while (ancestors.length > 0 && ancestors[ancestors.length - 1].depth >= row.depth) ancestors.pop();
                            const hidden = !searchTerm && ancestors.some(ancestor => !ancestor.expanded);
                            // The root of a focused branch is open: the branch is what was asked for.
                            ancestors.push({ depth: row.depth, expanded: (start >= 0 && row.depth === 0) || expandedGroups.has(`use-case:${row.group.id}:${row.useCase.id}`) });
                            return { ...row, hidden };
                        });
                    })().filter(row => !row.hidden).map(({ useCase, workflows, depth, group, firstInGroup }) => {
                        // A system use case a procedure does not include may be listed under each
                        // system that holds it, so its expand key carries the group too.
                        const useCaseKey = `use-case:${group.id}:${useCase.id}`;
                        const isExpanded = expandedGroups.has(useCaseKey);
                        const useCaseCount = workflows.reduce((total, { scenarios }) => total + scenarios.length, 0);
                        return (
                            <div key={useCaseKey} className="mb-0.5">
                                {firstInGroup && group.label && (
                                    <div className="px-3 pt-2 pb-1 font-semibold uppercase" style={{ color: COLOR.muted, fontSize: FONT.xs, letterSpacing: '0.04em' }}>
                                        {group.label}
                                    </div>
                                )}
                                <div
                                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                                    style={{ borderRadius: '4px', margin: '0 4px', marginLeft: 4 + depth * 16 }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => openElementProfile(useCase.id)}
                                >
                                    <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${useCase.name}`} onClick={event => { event.stopPropagation(); toggleGroup(useCaseKey); }}>
                                        <ChevronIcon expanded={isExpanded} color={LAYER_COLORS.functional || '#E67E22'} />
                                    </button>
                                    <FolderIcon open={isExpanded} color={LAYER_COLORS.functional || '#E67E22'} />
                                    <ExplorerElementIdentity element={useCase} fontSize={FONT.explorer.group} fontWeight={600} />
                                    <ExplorerCountBadge count={useCaseCount} color={LAYER_COLORS.functional || '#E67E22'} title={`${useCaseCount} scenarios`} />
                                </div>
                                {isExpanded && (
                                    <div style={{ marginLeft: 16 + depth * 16 }}>
                                        {workflows.map(({ workflow, scenarios }) => (
                                            <ScenarioWorkflowBranch
                                                key={workflow.id}
                                                workflow={workflow}
                                                scenarios={scenarios}
                                            />
                                        ))}
                                        {workflows.length === 0 && (
                                            <div className="px-2 py-1" style={{ color: COLOR.faint, fontSize: FONT.explorer.kind }}>No workflows</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {scenarioTree.length === 0 && (
                        <div className="px-4 py-8 text-center" style={{ color: COLOR.faint }}>
                            No use-case scenario chains found.
                        </div>
                    )}
                </div>
            </div>}

            {/* Center render region. The selected diagram or profile replaces
                this view through the app-level route dispatcher. */}
            {!explorerOnly && <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                <>
                {!selectedElement && (
                    <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                        <div className="text-center">
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><MemoBrandMark size={180} /></div>
                            <div className="text-sm">Select a scenario to edit steps and link elements</div>
                        </div>
                    </div>
                )}
                {selectedElement && (
                    <div className="max-w-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{selectedElement.name}</h2>
                            <span className="px-2 py-0.5 text-xs rounded-md font-medium"
                                style={{ background: '#E67E2218', color: '#E67E22' }}>
                                {selectedElement.kind}
                            </span>
                        </div>

                        {/* Steps */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Steps</h3>
                                {!editingSteps && (
                                    <button
                                        onClick={startEditing}
                                        className="px-2 py-0.5 text-xs rounded"
                                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                                    >
                                        Edit
                                    </button>
                                )}
                                {editingSteps && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={saveSteps}
                                            className="px-2 py-0.5 text-xs rounded font-medium"
                                            style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingSteps(null)}
                                            className="px-2 py-0.5 text-xs rounded"
                                            style={{ background: '#F3F4F6', color: '#6B7280' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                {steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 rounded-lg"
                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                            style={{ background: '#2DD4A815', color: '#1B3A4B' }}>
                                            {idx + 1}
                                        </span>
                                        {editingSteps ? (
                                            <input
                                                type="text"
                                                value={step.text}
                                                onChange={e => updateStepText(idx, e.target.value)}
                                                className="flex-1 text-sm px-2 py-1 rounded focus:outline-none"
                                                style={{ border: '1px solid #E5E5E0', color: '#374151' }}
                                            />
                                        ) : (
                                            <span className="flex-1 text-sm" style={{ color: '#374151' }}>{step.text}</span>
                                        )}
                                        {editingSteps && (
                                            <div className="flex gap-0.5">
                                                <button onClick={() => moveStep(idx, -1)} className="px-1 text-xs" style={{ color: '#9CA3AF' }} title="Move up">{'\u25B2'}</button>
                                                <button onClick={() => moveStep(idx, 1)} className="px-1 text-xs" style={{ color: '#9CA3AF' }} title="Move down">{'\u25BC'}</button>
                                                <button onClick={() => removeStep(idx)} className="px-1 text-xs" style={{ color: '#E74C3C' }} title="Remove">{'\u2715'}</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {editingSteps && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={newStepText}
                                        onChange={e => setNewStepText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addStep()}
                                        placeholder="Add a step..."
                                        className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none"
                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', color: '#374151' }}
                                    />
                                    <button
                                        onClick={addStep}
                                        className="px-3 py-2 text-xs rounded-lg font-medium"
                                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                                    >
                                        + Add
                                    </button>
                                </div>
                            )}

                            {steps.length === 0 && !editingSteps && (
                                <div className="text-xs p-3 rounded-lg" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                                    No steps defined. Click Edit to add scenario steps.
                                </div>
                            )}
                        </div>

                        {/* Linked Elements */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                                    Linked Elements ({rels.length})
                                </h3>
                                <button
                                    onClick={() => setLinkingStepIndex(linkingStepIndex === null ? 0 : null)}
                                    className="px-2 py-0.5 text-xs rounded"
                                    style={{ background: '#4A90D915', color: '#4A90D9', border: '1px solid #4A90D940' }}
                                >
                                    {linkingStepIndex !== null ? 'Done' : '+ Link'}
                                </button>
                            </div>

                            {linkingStepIndex !== null && (
                                <div className="mb-2 p-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #4A90D940' }}>
                                    <input
                                        type="text"
                                        value={linkSearch}
                                        onChange={e => setLinkSearch(e.target.value)}
                                        placeholder="Search elements to link..."
                                        className="w-full text-sm px-2 py-1 rounded focus:outline-none mb-1"
                                        style={{ border: '1px solid #E5E5E0', color: '#374151' }}
                                    />
                                    {linkCandidates.map(el => (
                                        <div
                                            key={el.id}
                                            className="flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer"
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                                // Fire-and-forget is fine here: the row is a shortcut, and
                                                // a rejected link surfaces in the Properties panel.
                                                void createRelationship({
                                                    type: 'traceTo',
                                                    sourceId: selectedElement.id,
                                                    targetId: el.id,
                                                    direction: 'outgoing',
                                                    selectedElementId: selectedElement.id,
                                                });
                                                setLinkSearch('');
                                                setLinkingStepIndex(null);
                                            }}
                                        >
                                            <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[el.layer] || '#95A5A6' }} />
                                            <span style={{ color: '#374151' }}>{el.name}</span>
                                            <span style={{ color: '#9CA3AF' }}>{el.kind}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1">
                                {rels.map(rel => {
                                    const otherId = rel.sourceId === selectedElement.id ? rel.targetId : rel.sourceId;
                                    const other = model!.elements[otherId];
                                    const direction = rel.sourceId === selectedElement.id ? '\u2192' : '\u2190';
                                    return (
                                        <div
                                            key={rel.id}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                                            style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                                            onClick={() => openElementProfile(otherId)}
                                        >
                                            <span style={{ color: '#9CA3AF' }}>{direction}</span>
                                            <span className="font-medium" style={{ color: '#2563EB' }}>{rel.type}</span>
                                            <span style={{ color: '#374151' }}>{other?.name || otherId}</span>
                                            {other && (
                                                <span className="ml-auto px-1.5 py-0.5 rounded text-xs"
                                                    style={{ background: (LAYER_COLORS[other.layer] || '#95A5A6') + '18', color: LAYER_COLORS[other.layer] || '#95A5A6' }}>
                                                    {other.kind}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="text-xs" style={{ color: '#D1D5DB' }}>{selectedElement.file}</div>
                    </div>
                )}
                </>
            </div>}
        </div>
    );
}
