// ─── Diagram toolbar hierarchy ────────────────────────────────────────────────
//
// Mirrors diagram/renderers/interconnection-renderer.tsx: a real class
// hierarchy, not object spread. `BaseDiagramToolbar` renders the controls
// every diagram gets regardless of kind — grid/snap, download, re-route,
// auto-layout — and declares one overridable extension point,
// `renderProfileControls`, that a subclass fills in with whatever is specific
// to its DiagramProfile (see ../diagram-profile.ts): the swimlane/legend/
// filter cluster for action flow, port/connection display and drill-down for
// interconnection, expand/collapse for state transition, the level/routing
// controls for use case, the tree/containment mode switcher for general.
// Sequence, context, and standard currently add nothing beyond the shared
// base, so they render through `BaseDiagramToolbar` directly rather than
// through an empty override.
//
// A subclass may still call `super.renderProfileControls(ctx)` — none need to
// today, but the hook exists so a future combination (e.g. a project profile
// specializing `ActionFlowToolbar`) can extend rather than replace.
//
// Selection is by `DiagramProfile`, resolved once per render in DiagramCanvas
// via `resolveDiagramProfile` and handed to `resolveDiagramToolbar`. Unlike
// the interconnection renderer (which a view opts into per its layout
// companion), a toolbar is not a per-view choice — the profile already says
// which one applies, so there is no registry to opt into, just a lookup.
// ─────────────────────────────────────────────────────────────────────────────

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { Edge as RFEdge } from '@xyflow/react';
import type { MemoModelDTO, DiagramLayout } from '@memoarchitect/tools/browser';
import type { DiagramExportFormat } from '../export-diagram';
import type { ActionFlowDisplayLevel, ActionFlowLaneGrouping, ActionFlowNesting } from '../../views/templates/actionflow-view';
import type { UseCaseEdgeStyle } from '../../views/templates/use-case-view';
import type { PortDisplay } from '../../views/templates/interconnection-view';
import type { GeneralViewMode } from '../../views/templates/general-view';
import type { DiagramToolbarOperation } from '../../views/diagram-toolbar-capabilities';
import type { DiagramProfile } from '../diagram-profile';
import { Icon, ToolbarSep, Segmented, IconButton, IconToggle, DrillBreadcrumb } from '../../views/DiagramToolbarControls';
import { useModelStore } from '../../store/model-store';
import { sendDiagramLayoutUpdate } from '../../store/ws-client';

type FlowEdge = RFEdge<Record<string, unknown>>;
type AnnotationKind = 'note' | 'text' | 'constraint';

/** Read the current layout companion for a diagram, defaulting to empty. */
function currentLayout(diagramId: string): DiagramLayout {
    return useModelStore.getState().diagramLayouts[diagramId] ?? { nodes: {}, edges: {} };
}

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Everything a toolbar may read or act on, assembled once per render by
 * DiagramCanvas. A method reads only the fields its own profile needs — the
 * bag is a superset (mirroring TemplateOptionSlices in ../template-provider.ts)
 * rather than one interface per profile, because unlike template option
 * slices, toolbar controls freely mix a couple of "common" fields (`viewKind`,
 * `model`) into otherwise profile-specific rendering.
 */
export interface DiagramToolbarContext {
    // ── Identity ─────────────────────────────────────────────────────────────
    model: MemoModelDTO | null;
    selectedDiagramId: string | null;
    viewKind: string | undefined;
    supportsToolbarOperation: (operation: DiagramToolbarOperation) => boolean;

    // ── Common: grid/snap ────────────────────────────────────────────────────
    gridVisible: boolean;
    setGridVisible: Dispatch<SetStateAction<boolean>>;
    setSnapEnabled: (enabled: boolean) => void;

    // ── Common: export ───────────────────────────────────────────────────────
    exportMenuOpen: boolean;
    setExportMenuOpen: Dispatch<SetStateAction<boolean>>;
    exportBusy: DiagramExportFormat | null;
    exportError: string | null;
    setExportError: Dispatch<SetStateAction<string | null>>;
    downloadDiagram: (format: DiagramExportFormat) => Promise<void>;

    // ── Common: route / auto-layout ──────────────────────────────────────────
    tidyConnectors: () => void;
    autoLayoutEnabled: boolean;
    markManualLayout: () => void;
    mergeDiagramLayouts: (patch: Record<string, DiagramLayout>) => void;
    setRelayoutNonce: Dispatch<SetStateAction<number>>;

    // ── Action flow ──────────────────────────────────────────────────────────
    swimlanesOn: boolean;
    setSwimlanesOn: Dispatch<SetStateAction<boolean>>;
    actionFlowHasStages: boolean;
    actionFlowLaneGrouping: ActionFlowLaneGrouping;
    setActionFlowLaneGrouping: Dispatch<SetStateAction<ActionFlowLaneGrouping>>;
    actionFlowDisplayLevels: ActionFlowDisplayLevel[];
    actionFlowLevelsOpen: boolean;
    setActionFlowLevelsOpen: Dispatch<SetStateAction<boolean>>;
    actionFlowDisplayLevel: ActionFlowDisplayLevel;
    setActionFlowDisplayLevel: Dispatch<SetStateAction<ActionFlowDisplayLevel>>;
    actionFlowToolbarPlacement: 'left';
    actionFlowNesting: ActionFlowNesting;
    setActionFlowNesting: Dispatch<SetStateAction<ActionFlowNesting>>;
    actionFlowDirection: 'horizontal' | 'vertical';
    changeActionFlowDirection: (next: 'horizontal' | 'vertical') => void;
    actionFlowLegendOpen: boolean;
    setActionFlowLegendOpen: Dispatch<SetStateAction<boolean>>;
    actionFlowLegendPlacement: 'overlay' | 'above';
    setActionFlowLegendPlacement: Dispatch<SetStateAction<'overlay' | 'above'>>;
    setExpandedActionNodes: Dispatch<SetStateAction<Set<string>>>;
    flowFiltersOpen: boolean;
    setFlowFiltersOpen: Dispatch<SetStateAction<boolean>>;
    visibleActionFlowKinds: Set<'control' | 'data' | 'energy' | 'material'>;
    setVisibleActionFlowKinds: Dispatch<SetStateAction<Set<'control' | 'data' | 'energy' | 'material'>>>;
    actionPath: string[];
    setFocusedActionId: Dispatch<SetStateAction<string | null>>;
    parentViewId: string | null;
    navigateToParentView?: () => void;

    // ── Interconnection ──────────────────────────────────────────────────────
    interconnectionContainerIds: string[];
    setCollapsedInterconnectionNodes: Dispatch<SetStateAction<Set<string>>>;
    interconnectionPortDisplay: PortDisplay;
    setInterconnectionPortDisplay: Dispatch<SetStateAction<PortDisplay>>;
    interconnectionConnectionDisplay: 'summary' | 'all' | 'none';
    setInterconnectionConnectionDisplay: Dispatch<SetStateAction<'summary' | 'all' | 'none'>>;
    saveIbdDisplay: (patch: { portDisplay?: PortDisplay; connectionDisplay?: 'summary' | 'all' | 'none' }) => void;
    interconnectionPath: string[];
    setFocusedInterconnectionId: Dispatch<SetStateAction<string | null>>;
    addAnnotation: (kind: AnnotationKind) => void;
    flowAnimationEnabled: boolean;
    setEdges: Dispatch<SetStateAction<FlowEdge[]>>;
    interconnectionLegendOpen: boolean;
    setInterconnectionLegendOpen: Dispatch<SetStateAction<boolean>>;
    showIbdPortText: boolean;
    showIbdConnectionText: boolean;

    // ── State transition ─────────────────────────────────────────────────────
    setCollapsedStateNodes: Dispatch<SetStateAction<Set<string>>>;
    compositeStateIds: string[];
    statePath: string[];
    setFocusedStateId: Dispatch<SetStateAction<string | null>>;

    // ── Use case ──────────────────────────────────────────────────────────────
    useCaseDisplayLevel: number | 'all';
    setUseCaseDisplayLevel: Dispatch<SetStateAction<number | 'all'>>;
    useCaseDepth: number;
    useCaseEdgeStyle: UseCaseEdgeStyle;
    setUseCaseEdgeStyle: Dispatch<SetStateAction<UseCaseEdgeStyle>>;
    autoArrangeUseCase: () => void;
    useCaseActors: Array<{ id: string; name: string }>;
    hiddenUseCaseActorIds: Set<string>;
    setHiddenUseCaseActorIds: Dispatch<SetStateAction<Set<string>>>;

    // ── General ──────────────────────────────────────────────────────────────
    allowedGeneralModes: readonly GeneralViewMode[];
    generalMode: GeneralViewMode;
    setGeneralMode: Dispatch<SetStateAction<GeneralViewMode>>;
    clearPositionCache: () => void;
    expandAll: () => void;
    collapseAll: () => void;
    resetLayout: () => void;
}

const nameOf = (model: MemoModelDTO | null, id: string): string => model?.elements[id]?.name ?? id;

// ─── Base toolbar: the controls every diagram gets ─────────────────────────────

/**
 * The root of the toolbar hierarchy. `renderCommon` is the chrome every
 * diagram shares; subclasses never override its pieces except
 * `renderRouteAndAutoLayout`, which interconnection wraps in a class name hook
 * used by an onboarding tour — everything else about it is identical across
 * profiles. `renderProfileControls` is the one extension point a profile
 * fills in with its own bespoke content.
 */
export class BaseDiagramToolbar {
    get profile(): DiagramProfile { return 'standard'; }

    /** Snap-to-grid toggle. */
    protected renderGridToggle(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('grid')) return null;
        return (
            <IconToggle
                icon={ctx.gridVisible ? <Icon.grid /> : <Icon.gridOff />}
                active={ctx.gridVisible}
                onClick={() => {
                    ctx.setGridVisible(visible => {
                        const next = !visible;
                        ctx.setSnapEnabled(next);
                        return next;
                    });
                }}
                title="Show or hide the canvas grid and snapping (⌘⇧G)"
            />
        );
    }

    /** Image export ("download diagram") — the one action every diagram type shares verbatim. */
    protected renderExportMenu(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('export')) return null;
        return (
            <div className="memo-diagram-tools__document-action" style={{ position: 'relative' }}>
                <IconToggle
                    icon={<Icon.download />}
                    active={ctx.exportMenuOpen}
                    onClick={() => { ctx.setExportError(null); ctx.setExportMenuOpen(open => !open); }}
                    title="Download this diagram as an image"
                />
                {ctx.exportMenuOpen && (
                    <div
                        role="menu"
                        aria-label="Export diagram"
                        className="absolute z-20 rounded-lg overflow-hidden"
                        style={{
                            top: 'calc(100% + 6px)', left: 0, minWidth: 128,
                            background: '#FFFFFF', border: '1px solid #E2E1DB',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                        }}
                    >
                        {(['png', 'svg', 'pdf'] as const).map(format => (
                            <button
                                key={format}
                                role="menuitem"
                                onClick={() => { void ctx.downloadDiagram(format); }}
                                disabled={ctx.exportBusy !== null}
                                className="w-full text-left px-3 py-1.5 text-xs font-medium"
                                style={{
                                    background: '#FFFFFF', color: '#374151', border: 0,
                                    cursor: ctx.exportBusy ? 'default' : 'pointer',
                                }}
                            >
                                {format.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
                {ctx.exportError && (
                    <div
                        role="alert"
                        className="absolute z-20 rounded-lg px-3 py-1.5 text-xs"
                        style={{
                            top: 'calc(100% + 6px)', left: 0, minWidth: 200,
                            background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA',
                        }}
                    >
                        Export failed: {ctx.exportError}
                    </div>
                )}
            </div>
        );
    }

    /** Re-route connectors + recalculate layout. Interconnection wraps this in
     *  a class name an onboarding tour anchors on — see the override below. */
    protected renderRouteAndAutoLayout(ctx: DiagramToolbarContext): ReactNode {
        return (
            <>
                {ctx.supportsToolbarOperation('route') && (
                    <IconToggle
                        icon={<Icon.tidy />}
                        active={false}
                        onClick={ctx.tidyConnectors}
                        title="Layout: re-route connectors. Warns before replacing hand-drawn bends."
                    />
                )}
                {ctx.selectedDiagramId && ctx.supportsToolbarOperation('autoLayout') && (
                    <IconToggle
                        icon={<Icon.arrange />}
                        active={ctx.autoLayoutEnabled}
                        onClick={() => {
                            if (ctx.autoLayoutEnabled) {
                                ctx.markManualLayout();
                            } else {
                                if (!window.confirm(
                                    'Recalculate the layout? This replaces saved manual positions and hand-routed connectors for this diagram.',
                                )) return;
                                const previous = currentLayout(ctx.selectedDiagramId!);
                                const layout: DiagramLayout = {
                                    nodes: {}, edges: {}, canvas: { ...previous?.canvas, autoLayout: true },
                                };
                                ctx.mergeDiagramLayouts({ [ctx.selectedDiagramId!]: layout });
                                sendDiagramLayoutUpdate(ctx.selectedDiagramId!, layout);
                                ctx.setRelayoutNonce(value => value + 1);
                            }
                        }}
                        title={ctx.autoLayoutEnabled
                            ? 'Auto layout is on. Drag an item to preserve a manual layout.'
                            : 'Layout: recalculate. Replaces saved manual positions after confirmation.'}
                    />
                )}
            </>
        );
    }

    /** Grid/snap toggle, download menu, and re-route/auto-layout — every
     *  profile gets exactly this, unchanged. */
    renderCommon(ctx: DiagramToolbarContext): ReactNode {
        return (
            <>
                {this.renderGridToggle(ctx)}
                {this.renderExportMenu(ctx)}
                <div className="memo-diagram-tools__layout-divider memo-diagram-tools__document-actions-divider" aria-hidden="true" />
                {this.renderRouteAndAutoLayout(ctx)}
            </>
        );
    }

    /** Extension point: a profile's own bespoke controls, rendered right after
     *  the common route/auto-layout controls. Empty by default — sequence,
     *  context, and standard render nothing beyond the common chrome. Public
     *  (not protected) because DiagramCanvas renders it directly, ahead of the
     *  source-editor slot that sits between it and `renderTrailingProfileControls`. */
    renderProfileControls(_ctx: DiagramToolbarContext): ReactNode { return null; }

    /**
     * Second extension point, rendered after the dock's fixed source-editor
     * slot. Only interconnection uses it (its annotation/legend/caption
     * toggles sit after that slot today); everything else is empty. Kept
     * separate from `renderProfileControls` rather than merged ahead of the
     * slot, because the dock is a CSS grid with `grid-auto-flow: dense` —
     * moving these controls earlier in DOM order could repack them into
     * different cells, a purely cosmetic reshuffle this refactor should not
     * cause as a side effect.
     */
    renderTrailingProfileControls(_ctx: DiagramToolbarContext): ReactNode { return null; }

    /** Full toolbar content, for a caller that has no fixed slot to interleave
     *  (DiagramCanvas instead calls the pieces individually — see above). */
    render(ctx: DiagramToolbarContext): ReactNode {
        return (
            <>
                {this.renderCommon(ctx)}
                {this.renderProfileControls(ctx)}
                {this.renderTrailingProfileControls(ctx)}
            </>
        );
    }
}

// ─── Action flow ────────────────────────────────────────────────────────────────

/** Swimlane, hierarchy, nesting, direction, legend, filter, and drill-down
 *  controls (KK-4) — the iOS-style grouped cluster unique to action flow. */
export class ActionFlowToolbar extends BaseDiagramToolbar {
    override get profile(): DiagramProfile { return 'actionflow'; }

    override renderProfileControls(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('flowSwimlanes')) return null;
        return (
            <>
                {/* Display toggles: grid (above) + swimlanes read as one group */}
                <IconToggle
                    icon={ctx.swimlanesOn ? <Icon.lanes /> : <Icon.lanesOff />}
                    active={ctx.swimlanesOn}
                    onClick={() => ctx.setSwimlanesOn(s => !s)}
                    title="Toggle allocation swimlanes"
                />
                {ctx.swimlanesOn && ctx.actionFlowHasStages && (
                    <IconToggle
                        icon={<Icon.lanes />}
                        label={ctx.actionFlowToolbarPlacement === 'left' ? undefined : 'Stage'}
                        active={ctx.actionFlowLaneGrouping === 'stage'}
                        onClick={() => ctx.setActionFlowLaneGrouping(current => current === 'stage' ? 'allocation' : 'stage')}
                        title="Group this flow by its modeled stages"
                    />
                )}
                {ctx.supportsToolbarOperation('flowHierarchy') && ctx.swimlanesOn && ctx.actionFlowLaneGrouping === 'allocation' && ctx.actionFlowDisplayLevels.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <IconToggle
                            icon={<Icon.library />}
                            active={ctx.actionFlowLevelsOpen}
                            onClick={() => ctx.setActionFlowLevelsOpen(open => !open)}
                            title={`Responsibility hierarchy level: ${ctx.actionFlowDisplayLevel === 'all' ? 'all levels' : `level ${ctx.actionFlowDisplayLevel}`}`}
                        />
                        {ctx.actionFlowLevelsOpen && (
                            <div className="absolute z-30 rounded-lg p-1" style={{ top: 'calc(100% + 5px)', left: 0, width: 112, background: '#FFFFFF', border: '1px solid #D1D5DB', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                                {(['all', ...ctx.actionFlowDisplayLevels] as Array<ActionFlowDisplayLevel>).map(level => {
                                    const selected = ctx.actionFlowDisplayLevel === level;
                                    return <button key={String(level)} type="button" className="w-full rounded px-2 py-1 text-left text-xs font-semibold" style={{ background: selected ? '#E8FBF5' : 'transparent', color: selected ? '#0F766E' : '#475569' }} onClick={() => { ctx.setActionFlowDisplayLevel(level); ctx.setActionFlowLevelsOpen(false); }}>
                                        {level === 'all' ? 'All levels' : `Level ${level}`}
                                    </button>;
                                })}
                            </div>
                        )}
                    </div>
                )}

                <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />

                {/* How an expanded composite action shows its steps */}
                {ctx.supportsToolbarOperation('flowNesting') && <IconToggle
                    icon={ctx.actionFlowNesting === 'flat' ? <Icon.split /> : <Icon.rectangle />}
                    active={ctx.actionFlowNesting === 'nested'}
                    onClick={() => ctx.setActionFlowNesting(current => current === 'flat' ? 'nested' : 'flat')}
                    title={ctx.actionFlowNesting === 'flat'
                        ? 'Steps: inline. Click to show nested steps.'
                        : 'Steps: nested. Click to show inline steps.'}
                />}

                <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />

                {/* Reading direction — segmented control */}
                {ctx.supportsToolbarOperation('flowDirection') && <IconToggle
                    icon={ctx.actionFlowDirection === 'horizontal' ? <Icon.arrowRight /> : <Icon.arrowDown />}
                    active={ctx.actionFlowDirection === 'vertical'}
                    onClick={() => ctx.changeActionFlowDirection(ctx.actionFlowDirection === 'horizontal' ? 'vertical' : 'horizontal')}
                    title={ctx.actionFlowDirection === 'horizontal'
                        ? 'Flow direction: left to right. Click for top to bottom.'
                        : 'Flow direction: top to bottom. Click for left to right.'}
                />}

                <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />

                {ctx.supportsToolbarOperation('flowLegend') && <IconToggle
                    icon={<Icon.lanes />}
                    active={ctx.actionFlowLegendOpen}
                    onClick={() => ctx.setActionFlowLegendOpen(open => !open)}
                    title={ctx.actionFlowLegendOpen ? 'Hide flow legend' : 'Show flow legend'}
                />}
                {ctx.supportsToolbarOperation('flowLegend') && ctx.actionFlowLegendOpen && (
                    <IconToggle
                        icon={ctx.actionFlowLegendPlacement === 'overlay' ? <Icon.overlay /> : <Icon.arrowUp />}
                        active={ctx.actionFlowLegendPlacement === 'above'}
                        onClick={() => ctx.setActionFlowLegendPlacement(current => current === 'overlay' ? 'above' : 'overlay')}
                        title={ctx.actionFlowLegendPlacement === 'overlay'
                            ? 'Legend over diagram. Click to place it above.'
                            : 'Legend above diagram. Click to overlay it.'}
                    />
                )}

                <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />

                {/* Tree state — clustered expand / collapse */}
                <IconToggle
                    icon={<Icon.expand />}
                    title="Expand all sub-actions"
                    onClick={() => ctx.setExpandedActionNodes(new Set(
                        Object.values(ctx.model?.elements ?? {})
                            .map(element => element.parentAction)
                            .filter((id): id is string => Boolean(id)),
                    ))}
                />
                <IconToggle
                    icon={<Icon.collapse />}
                    title="Collapse all sub-actions"
                    onClick={() => ctx.setExpandedActionNodes(new Set())}
                />

                <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />

                {/* Connection filter */}
                {ctx.supportsToolbarOperation('flowFilters') && <ActionFlowFilterMenu ctx={ctx} />}
                {/* Drill-down: the ↳ button on a composite action, or double-click */}
                <DrillBreadcrumb
                    path={ctx.actionPath}
                    nameOf={id => nameOf(ctx.model, id)}
                    onFocus={ctx.setFocusedActionId}
                    rootLabel="Back to the whole action flow"
                />
            </>
        );
    }
}

/** The connection-category filter popover — split out only because it owns
 *  its own open/close state via a hook, which a plain method cannot. */
function ActionFlowFilterMenu({ ctx }: { ctx: DiagramToolbarContext }) {
    return (
        <div style={{ position: 'relative' }}>
            <IconToggle
                icon={<Icon.filter />}
                active={ctx.flowFiltersOpen}
                badge={`${ctx.visibleActionFlowKinds.size}/4`}
                fullWidth={false}
                onClick={() => ctx.setFlowFiltersOpen(open => !open)}
                title="Choose which modeled connection categories are visible"
            />
            {ctx.flowFiltersOpen && (
                <div
                    className="absolute p-3 rounded-lg"
                    style={{
                        width: 264,
                        ...(ctx.actionFlowToolbarPlacement === 'left'
                            ? { top: 0, left: 'calc(100% + 8px)' }
                            : { top: 'calc(100% + 8px)', right: 0 }),
                        background: '#FFFFFF', border: '1px solid #D1D5DB', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 30,
                    }}
                >
                    <div style={{ color: '#1F2937', fontWeight: 700, fontSize: 11 }}>Show connection categories</div>
                    <div style={{ color: '#6B7280', fontSize: 11, lineHeight: 1.4, marginTop: 3, marginBottom: 8 }}>
                        Changes this diagram view only; the SysML model is not modified.
                    </div>
                    {(['control', 'data', 'energy', 'material'] as const).map(kind => {
                        const shown = ctx.visibleActionFlowKinds.has(kind);
                        const color = kind === 'control' ? '#4B5563' : kind === 'data' ? '#3498DB' : kind === 'energy' ? '#D97706' : '#16A34A';
                        return (
                            <button
                                key={kind}
                                role="switch"
                                aria-checked={shown}
                                onClick={() => ctx.setVisibleActionFlowKinds(previous => {
                                    const next = new Set(previous);
                                    if (next.has(kind)) next.delete(kind); else next.add(kind);
                                    return next;
                                })}
                                className="w-full flex items-center justify-between px-1 py-1.5 rounded"
                                style={{ color: '#374151', textTransform: 'capitalize' }}
                                title={`${shown ? 'Hide' : 'Show'} ${kind} connections`}
                            >
                                <span className="flex items-center gap-2"><span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />{kind}</span>
                                <span aria-hidden="true" style={{ width: 32, height: 18, borderRadius: 9, background: shown ? '#2563EB' : '#D1D5DB', padding: 2, transition: 'background 160ms ease' }}>
                                    <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.22)', transform: shown ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 160ms ease' }} />
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Interconnection ────────────────────────────────────────────────────────────

/** Expand/collapse, port/connection display, drill-down, annotations, and
 *  flow-animation/legend/caption toggles (KK-3) — everything specific to the
 *  IBD/parametric canvas. */
export class InterconnectionToolbar extends BaseDiagramToolbar {
    override get profile(): DiagramProfile { return 'interconnection'; }

    /** Interconnection wraps route/auto-layout in a class name an onboarding
     *  tour anchors on; every other view gets the base's plain version. */
    protected override renderRouteAndAutoLayout(ctx: DiagramToolbarContext): ReactNode {
        return (
            <div className="memo-diagram-tools__layout-reset" style={{ display: 'contents' }}>
                {super.renderRouteAndAutoLayout(ctx)}
            </div>
        );
    }

    override renderProfileControls(ctx: DiagramToolbarContext): ReactNode {
        return (
            <>
                {ctx.supportsToolbarOperation('expandCollapse') && (
                    <>
                        <ToolbarSep hidden={ctx.actionFlowToolbarPlacement === 'left'} />
                        <div className="memo-diagram-tools__layout-reset" style={{ display: 'contents' }}>
                            <IconButton
                                icon={<Icon.expand />}
                                onClick={() => ctx.setCollapsedInterconnectionNodes(new Set())}
                                title="Expand all parts" ariaLabel="Expand all"
                            />
                            <IconButton
                                icon={<Icon.collapse />}
                                onClick={() => ctx.setCollapsedInterconnectionNodes(new Set(ctx.interconnectionContainerIds))}
                                title="Collapse all parts" ariaLabel="Collapse all"
                            />
                        </div>
                        <div className="memo-diagram-tools__layout-divider memo-diagram-tools__layout-reset-divider" aria-hidden="true" />
                        {ctx.supportsToolbarOperation('interconnectionPorts') && ctx.supportsToolbarOperation('interconnectionConnections') && ctx.actionFlowToolbarPlacement === 'left' ? (
                            <>
                                <IconToggle
                                    icon={ctx.interconnectionPortDisplay === 'all' ? <Icon.library /> : ctx.interconnectionPortDisplay === 'ports' ? <Icon.rectangle /> : <Icon.minus />}
                                    active={ctx.interconnectionPortDisplay !== 'none'}
                                    onClick={() => ctx.setInterconnectionPortDisplay(current => { const next = current === 'all' ? 'ports' : current === 'ports' ? 'none' : 'all'; ctx.saveIbdDisplay({ portDisplay: next }); return next; })}
                                    title={ctx.interconnectionPortDisplay === 'all'
                                        ? 'Ports: nested. Click for top-level ports.'
                                        : ctx.interconnectionPortDisplay === 'ports'
                                            ? 'Ports: top-level only. Click to hide ports.'
                                            : 'Ports: hidden. Click to show nested ports.'}
                                />
                                <IconToggle
                                    icon={ctx.interconnectionConnectionDisplay === 'summary' ? <Icon.tidy /> : ctx.interconnectionConnectionDisplay === 'all' ? <Icon.lanes /> : <Icon.minus />}
                                    active={ctx.interconnectionConnectionDisplay !== 'none'}
                                    onClick={() => ctx.setInterconnectionConnectionDisplay(current => { const next = current === 'summary' ? 'all' : current === 'all' ? 'none' : 'summary'; ctx.saveIbdDisplay({ connectionDisplay: next }); return next; })}
                                    title={ctx.interconnectionConnectionDisplay === 'summary'
                                        ? 'Connections: summary. Click to show all.'
                                        : ctx.interconnectionConnectionDisplay === 'all'
                                            ? 'Connections: all. Click to hide them.'
                                            : 'Connections: hidden. Click for summary.'}
                                />
                            </>
                        ) : (
                            <>
                                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>Ports</span>
                                <Segmented
                                    value={ctx.interconnectionPortDisplay}
                                    onChange={value => { ctx.setInterconnectionPortDisplay(value); ctx.saveIbdDisplay({ portDisplay: value }); }}
                                    options={[
                                        { value: 'all', label: 'Nested', title: 'Show ports and their nested ports' },
                                        { value: 'ports', label: 'Top', title: 'Show top-level ports only (nested connectors lift to the parent port)' },
                                        { value: 'none', label: 'Off', title: 'Hide ports; connectors run part to part' },
                                    ]}
                                />
                                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>Connections</span>
                                <Segmented
                                    value={ctx.interconnectionConnectionDisplay}
                                    onChange={value => { ctx.setInterconnectionConnectionDisplay(value); ctx.saveIbdDisplay({ connectionDisplay: value }); }}
                                    options={[
                                        { value: 'summary', label: 'Summary', title: 'Show focused-subsystem boundary flows and bundle repeated rendered endpoint pairs' },
                                        { value: 'all', label: 'All', title: 'Show every model connector' },
                                        { value: 'none', label: 'Off', title: 'Hide connectors while inspecting block structure' },
                                    ]}
                                />
                            </>
                        )}
                        {/* Drill-down breadcrumb (double-click a part to descend) */}
                        <DrillBreadcrumb
                            path={ctx.interconnectionPath}
                            nameOf={id => nameOf(ctx.model, id)}
                            onFocus={ctx.setFocusedInterconnectionId}
                            rootLabel="Back to the whole diagram"
                        />
                    </>
                )}
            </>
        );
    }

    /** Annotation/flow-animation/legend/caption toggles. These render after
     *  the dock's fixed source-editor slot in the original layout — see the
     *  base class doc for why that split is preserved rather than folded in
     *  above. */
    override renderTrailingProfileControls(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.selectedDiagramId) return null;
        return (
            <>
                {ctx.actionFlowToolbarPlacement !== 'left' && <span style={{ color: '#E5E5E0' }}>|</span>}
                <IconButton icon={<Icon.plus />} onClick={() => ctx.addAnnotation('note')}
                    title="Add an editable note" ariaLabel="Add note" />
                <IconToggle icon={<Icon.arrowRight />} active={ctx.flowAnimationEnabled}
                    onClick={() => {
                        const previous = currentLayout(ctx.selectedDiagramId!);
                        const layout: DiagramLayout = {
                            ...previous,
                            canvas: { ...previous.canvas, flowAnimation: !ctx.flowAnimationEnabled },
                        };
                        ctx.mergeDiagramLayouts({ [ctx.selectedDiagramId!]: layout });
                        sendDiagramLayoutUpdate(ctx.selectedDiagramId!, layout);
                        ctx.setEdges(current => current.map(edge => ({
                            ...edge,
                            data: { ...edge.data, flowAnimation: !ctx.flowAnimationEnabled },
                        })));
                    }} title="Toggle animated source-to-target flow" />
                <IconToggle icon={<Icon.library />} active={ctx.interconnectionLegendOpen}
                    onClick={() => ctx.setInterconnectionLegendOpen(open => !open)} title="Show or hide the IBD notation legend" />
                <IconToggle icon={<Icon.elements />} active={ctx.showIbdPortText}
                    onClick={() => {
                        const previous = currentLayout(ctx.selectedDiagramId!);
                        const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, showPortText: !ctx.showIbdPortText } };
                        ctx.mergeDiagramLayouts({ [ctx.selectedDiagramId!]: layout });
                        sendDiagramLayoutUpdate(ctx.selectedDiagramId!, layout);
                    }}
                    title="Show or hide port captions" />
                <IconToggle icon={<Icon.code />} active={ctx.showIbdConnectionText}
                    onClick={() => {
                        const previous = currentLayout(ctx.selectedDiagramId!);
                        const layout: DiagramLayout = { ...previous, canvas: { ...previous.canvas, showConnectionText: !ctx.showIbdConnectionText } };
                        ctx.mergeDiagramLayouts({ [ctx.selectedDiagramId!]: layout });
                        sendDiagramLayoutUpdate(ctx.selectedDiagramId!, layout);
                    }}
                    title="Show or hide connector labels" />
            </>
        );
    }
}

// ─── State transition ───────────────────────────────────────────────────────────

/** Expand/collapse every composite state, and the drill-down breadcrumb. */
export class StateTransitionToolbar extends BaseDiagramToolbar {
    override get profile(): DiagramProfile { return 'statetransition'; }

    override renderProfileControls(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('expandCollapse')) return null;
        return (
            <>
                <ToolbarSep />
                <IconButton
                    icon={<Icon.expand />}
                    onClick={() => ctx.setCollapsedStateNodes(new Set())}
                    title="Show all substates" ariaLabel="Expand all substates"
                />
                <IconButton
                    icon={<Icon.collapse />}
                    onClick={() => ctx.setCollapsedStateNodes(new Set(ctx.compositeStateIds))}
                    title="Fold every composite state" ariaLabel="Collapse all substates"
                />
                {/* Drill-down: the ↳ button on a composite state, or double-click */}
                <DrillBreadcrumb
                    path={ctx.statePath}
                    nameOf={id => nameOf(ctx.model, id)}
                    onFocus={ctx.setFocusedStateId}
                    rootLabel="Back to the whole machine"
                />
            </>
        );
    }
}

// ─── Use case ────────────────────────────────────────────────────────────────────

/** Hierarchy level, connector routing style, auto-arrange, and the
 *  hide-related-use-cases actor picker (KK-7). */
export class UseCaseToolbar extends BaseDiagramToolbar {
    override get profile(): DiagramProfile { return 'usecase'; }

    override renderProfileControls(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('useCaseOptions')) return null;
        return (
            <>
                <span style={{ color: '#E5E5E0' }}>|</span>
                <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569' }}>
                    Level
                    <select
                        aria-label="Use case hierarchy level"
                        value={ctx.useCaseDisplayLevel}
                        onChange={event => ctx.setUseCaseDisplayLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                        style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}
                    >
                        <option value="all">All levels</option>
                        {Array.from({ length: ctx.useCaseDepth + 1 }, (_, level) => (
                            <option key={level} value={level}>L{level}</option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569' }}>
                    Routing
                    <select aria-label="Use case connector routing" value={ctx.useCaseEdgeStyle}
                        onChange={event => ctx.setUseCaseEdgeStyle(event.target.value as UseCaseEdgeStyle)}
                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                        style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                        <option value="straight">Straight</option>
                        <option value="elbow">Elbow</option>
                        <option value="rounded">Rounded</option>
                        <option value="curved">Curved</option>
                        <option value="arc">Arc</option>
                    </select>
                </label>
                <button onClick={ctx.autoArrangeUseCase}
                    className="px-2 py-0.5 text-xs font-semibold rounded"
                    style={{ color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0' }}
                    title="Reapply the constrained hierarchy layout and obstacle-aware routes">
                    Auto arrange
                </button>
                {ctx.useCaseActors.length > 0 && (
                    <details className="relative">
                        <summary className="px-2 py-0.5 text-xs font-semibold rounded cursor-pointer"
                            style={{ color: '#374151', background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                            Actors{ctx.hiddenUseCaseActorIds.size ? `: ${ctx.hiddenUseCaseActorIds.size} hidden` : ''}
                        </summary>
                        <div className="absolute top-7 left-0 z-30 min-w-48 p-2 rounded shadow-lg"
                            style={{ background: '#FFFFFF', border: '1px solid #D1D5DB' }}>
                            <div className="mb-1 text-xs" style={{ color: '#64748B' }}>Hide related use cases</div>
                            {ctx.useCaseActors.map(actor => <label key={actor.id} className="flex items-center gap-2 py-1 text-xs" style={{ color: '#374151' }}>
                                <input type="checkbox" checked={ctx.hiddenUseCaseActorIds.has(actor.id)}
                                    onChange={() => ctx.setHiddenUseCaseActorIds(previous => {
                                        const next = new Set(previous);
                                        if (next.has(actor.id)) next.delete(actor.id); else next.add(actor.id);
                                        return next;
                                    })} />
                                {actor.name}
                            </label>)}
                        </div>
                    </details>
                )}
            </>
        );
    }
}

// ─── General ─────────────────────────────────────────────────────────────────────

/** The tree/containment/graph mode switcher (KK-2), plus expand/collapse and
 *  reset-layout once a hierarchy mode is active. */
export class GeneralToolbar extends BaseDiagramToolbar {
    override get profile(): DiagramProfile { return 'general'; }

    override renderProfileControls(ctx: DiagramToolbarContext): ReactNode {
        if (!ctx.supportsToolbarOperation('generalMode')) return null;
        return (
            <>
                <span style={{ color: '#E5E5E0' }}>|</span>
                {/* Three modes in a two-column dock of 38px tiles left the
                    third clipped off the edge, so containment looked as
                    though it did not exist. Full width, stacked, and each
                    mode named — an icon cannot tell "tree" from "nested
                    containment", and captioning three glyphs "View as"
                    explained neither. */}
                {ctx.allowedGeneralModes.includes('graph') && (
                    <IconToggle icon={<Icon.tidy />} active={ctx.generalMode === 'graph'}
                        onClick={() => { ctx.setGeneralMode('graph'); ctx.clearPositionCache(); }}
                        title="Relationship graph with compartments" />
                )}
                {/* Tree and containment are two ways of drawing the same
                    hierarchy, so they are one control that swaps between
                    them — which also keeps the group inside the dock's two
                    columns, where a third tile was being clipped off the
                    edge and containment looked as though it did not exist.
                    The icon shows the mode you are in. */}
                <IconToggle
                    icon={ctx.generalMode === 'containment' ? <Icon.rectangle /> : <Icon.library />}
                    active={ctx.generalMode !== 'graph'}
                    onClick={() => {
                        ctx.setGeneralMode(ctx.generalMode === 'tree' ? 'containment' : 'tree');
                        ctx.clearPositionCache();
                    }}
                    title={ctx.generalMode === 'containment'
                        ? 'Nested containment blocks — switch to the decomposition tree'
                        : 'Decomposition tree — switch to nested containment blocks'} />
                {ctx.generalMode !== 'graph' && (
                    <>
                        <IconButton icon={<Icon.expand />} onClick={ctx.expandAll}
                            title="Expand all nodes" ariaLabel="Expand all" />
                        <IconButton icon={<Icon.collapse />} onClick={ctx.collapseAll}
                            title="Collapse all nodes" ariaLabel="Collapse all" />
                        {ctx.generalMode === 'tree' && (
                            <button onClick={ctx.resetLayout} className="px-2 py-0.5 text-xs font-medium rounded"
                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                title="Re-layout the tree from scratch">
                                ↻ Reset
                            </button>
                        )}
                    </>
                )}
            </>
        );
    }
}

// ── Resolution ────────────────────────────────────────────────────────────────

/** The toolbar type used across the app is the base class; every subclass is
 *  assignable to it. */
export type DiagramToolbar = BaseDiagramToolbar;

export const baseDiagramToolbar = new BaseDiagramToolbar();
const actionFlowToolbar = new ActionFlowToolbar();
const interconnectionToolbar = new InterconnectionToolbar();
const stateTransitionToolbar = new StateTransitionToolbar();
const useCaseToolbar = new UseCaseToolbar();
const generalToolbar = new GeneralToolbar();

/**
 * Resolve a diagram's toolbar from its DiagramProfile (see ../diagram-profile.ts).
 * Sequence, context, and standard have no bespoke controls today, so they get
 * the base toolbar directly rather than an empty subclass.
 */
export function resolveDiagramToolbar(profile: DiagramProfile): DiagramToolbar {
    switch (profile) {
        case 'actionflow': return actionFlowToolbar;
        case 'interconnection': return interconnectionToolbar;
        case 'statetransition': return stateTransitionToolbar;
        case 'usecase': return useCaseToolbar;
        case 'general': return generalToolbar;
        default: return baseDiagramToolbar;
    }
}
