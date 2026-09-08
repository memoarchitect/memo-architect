// @vitest-environment jsdom
//
// ─── Toolbar hierarchy: resolution + smoke render ───────────────────────────
//
// Mirrors the coverage style of diagram/__tests__/renderer-selection.test.ts:
// resolveDiagramToolbar picks the right class per DiagramProfile, and every
// toolbar renders without throwing given a minimal context — the class
// hierarchy replaced ~500 lines of inline JSX moved verbatim, so the
// regression this guards against is "a profile's controls silently stopped
// rendering" more than any particular pixel.

import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import {
    BaseDiagramToolbar, ActionFlowToolbar, InterconnectionToolbar,
    StateTransitionToolbar, UseCaseToolbar, GeneralToolbar,
    resolveDiagramToolbar, type DiagramToolbarContext,
} from '../diagram-toolbar';

/** A minimal, all-fields-present context. Every profile's render is exercised
 *  with flags set so its bespoke branch actually renders (open menus, active
 *  toggles), not just its empty/closed state. */
function makeContext(overrides: Partial<DiagramToolbarContext> = {}): DiagramToolbarContext {
    const noop = () => {};
    return {
        model: null,
        selectedDiagramId: 'diag-1',
        viewKind: 'general',
        supportsToolbarOperation: () => true,

        gridVisible: true, setGridVisible: noop, setSnapEnabled: noop,

        exportMenuOpen: true, setExportMenuOpen: noop,
        exportBusy: null, exportError: null, setExportError: noop,
        downloadDiagram: async () => {},

        tidyConnectors: noop, autoLayoutEnabled: true, markManualLayout: noop,
        mergeDiagramLayouts: noop, setRelayoutNonce: noop,

        swimlanesOn: true, setSwimlanesOn: noop, actionFlowHasStages: true,
        actionFlowLaneGrouping: 'stage', setActionFlowLaneGrouping: noop,
        actionFlowDisplayLevels: [1, 2], actionFlowLevelsOpen: true, setActionFlowLevelsOpen: noop,
        actionFlowDisplayLevel: 'all', setActionFlowDisplayLevel: noop,
        actionFlowToolbarPlacement: 'left',
        actionFlowNesting: 'nested', setActionFlowNesting: noop,
        actionFlowDirection: 'horizontal', changeActionFlowDirection: noop,
        actionFlowLegendOpen: true, setActionFlowLegendOpen: noop,
        actionFlowLegendPlacement: 'overlay', setActionFlowLegendPlacement: noop,
        setExpandedActionNodes: noop, flowFiltersOpen: true, setFlowFiltersOpen: noop,
        visibleActionFlowKinds: new Set(['control', 'data']), setVisibleActionFlowKinds: noop,
        actionPath: ['a1', 'a2'], setFocusedActionId: noop,

        interconnectionContainerIds: ['p1'], setCollapsedInterconnectionNodes: noop,
        interconnectionPortDisplay: 'all', setInterconnectionPortDisplay: noop,
        interconnectionConnectionDisplay: 'summary', setInterconnectionConnectionDisplay: noop,
        saveIbdDisplay: noop, interconnectionPath: ['p1', 'p2'], setFocusedInterconnectionId: noop,
        addAnnotation: noop, flowAnimationEnabled: true, setEdges: noop,
        interconnectionLegendOpen: true, setInterconnectionLegendOpen: noop,
        showIbdPortText: true, showIbdConnectionText: true,

        setCollapsedStateNodes: noop, compositeStateIds: ['s1'], statePath: ['s1', 's2'], setFocusedStateId: noop,

        useCaseDisplayLevel: 'all', setUseCaseDisplayLevel: noop, useCaseDepth: 2,
        useCaseEdgeStyle: 'straight', setUseCaseEdgeStyle: noop, autoArrangeUseCase: noop,
        useCaseActors: [{ id: 'a1', name: 'Clinician' }], hiddenUseCaseActorIds: new Set(['a1']), setHiddenUseCaseActorIds: noop,

        allowedGeneralModes: ['graph', 'tree', 'containment'], generalMode: 'tree', setGeneralMode: noop,
        clearPositionCache: noop, expandAll: noop, collapseAll: noop, resetLayout: noop,

        ...overrides,
    };
}

let root: Root | null = null;
let container: HTMLElement | null = null;

function renderToolbar(node: ReturnType<typeof createElement>): HTMLElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root!.render(node); });
    return container;
}

afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null; container = null;
});

describe('resolveDiagramToolbar', () => {
    it('resolves each profile to its own toolbar class', () => {
        expect(resolveDiagramToolbar('actionflow')).toBeInstanceOf(ActionFlowToolbar);
        expect(resolveDiagramToolbar('interconnection')).toBeInstanceOf(InterconnectionToolbar);
        expect(resolveDiagramToolbar('statetransition')).toBeInstanceOf(StateTransitionToolbar);
        expect(resolveDiagramToolbar('usecase')).toBeInstanceOf(UseCaseToolbar);
        expect(resolveDiagramToolbar('general')).toBeInstanceOf(GeneralToolbar);
    });

    it('falls back to the base toolbar for profiles with no bespoke controls', () => {
        for (const profile of ['sequence', 'context', 'standard'] as const) {
            const toolbar = resolveDiagramToolbar(profile);
            expect(toolbar.constructor).toBe(BaseDiagramToolbar);
        }
    });

    it('each toolbar declares its own profile', () => {
        expect(new ActionFlowToolbar().profile).toBe('actionflow');
        expect(new InterconnectionToolbar().profile).toBe('interconnection');
        expect(new StateTransitionToolbar().profile).toBe('statetransition');
        expect(new UseCaseToolbar().profile).toBe('usecase');
        expect(new GeneralToolbar().profile).toBe('general');
        expect(new BaseDiagramToolbar().profile).toBe('standard');
    });
});

describe('toolbar smoke render — every profile renders without throwing', () => {
    it('base toolbar (sequence/context/standard) renders only the common chrome', () => {
        const el = renderToolbar(createElement('div', null, resolveDiagramToolbar('standard').render(makeContext())));
        expect(el.querySelector('[aria-label="Download this diagram as an image"], [title*="Download"]')).toBeTruthy();
    });

    it('action flow toolbar renders its swimlane cluster', () => {
        const ctx = makeContext({ viewKind: 'actionflow' });
        const el = renderToolbar(createElement('div', null, new ActionFlowToolbar().render(ctx)));
        expect(el.textContent).toContain('Show connection categories');
    });

    it('interconnection toolbar renders both its lead and trailing segments', () => {
        const ctx = makeContext({ viewKind: 'interconnection' });
        const toolbar = new InterconnectionToolbar();
        const el = renderToolbar(createElement('div', null,
            toolbar.renderCommon(ctx), toolbar.renderProfileControls(ctx), toolbar.renderTrailingProfileControls(ctx),
        ));
        // Lead segment: with `actionFlowToolbarPlacement: 'left'` (the app's only
        // real value) both operations enabled renders port/connection as icon
        // toggles rather than labeled Segmented controls — this title is theirs.
        expect(el.querySelector('[title*="Ports:"]')).toBeTruthy();
        // Trailing segment (annotations/legend/caption toggles) still renders
        // when interleaved with a separate slot, exactly as DiagramCanvas does.
        expect(el.querySelector('[title="Add an editable note"]')).toBeTruthy();
    });

    it('state transition toolbar renders expand/collapse and the breadcrumb', () => {
        const el = renderToolbar(createElement('div', null, new StateTransitionToolbar().render(makeContext({ viewKind: 'statetransition' }))));
        expect(el.querySelector('[aria-label="Expand all substates"]')).toBeTruthy();
    });

    it('use case toolbar renders the level/routing controls', () => {
        const el = renderToolbar(createElement('div', null, new UseCaseToolbar().render(makeContext({ viewKind: 'general' }))));
        expect(el.textContent).toContain('Auto arrange');
    });

    it('general toolbar renders the mode switcher', () => {
        const el = renderToolbar(createElement('div', null, new GeneralToolbar().render(makeContext({ viewKind: 'general' }))));
        expect(el.querySelector('[aria-label="Expand all"]')).toBeTruthy();
    });

    it('a profile whose supportsToolbarOperation gates are all closed renders no bespoke controls', () => {
        const ctx = makeContext({ viewKind: 'actionflow', supportsToolbarOperation: () => false });
        const el = renderToolbar(createElement('div', null, new ActionFlowToolbar().renderProfileControls(ctx)));
        expect(el.textContent).toBe('');
    });
});
