// ─── Pathways: the method map, read from the method ──────────────────────────
//
// The rows of the map are the method's `MethodLayer`s (memo-tools' `guide:result` `layers`): the architecture
// layers, from context to realization, and the assurance disciplines. A row holds the steps whose stage it names,
// numbered in the method's order; a step's state is the Guide's. Nothing here names a kind, a stage, a row or a
// step: they are all the method's data.
//
// The scope is a tree of the workspaces memo-tools found: a system of systems holds the systems its parts are
// typed by, to any depth. Systems built by others (`origin` external) are listed apart, outside the boundary, and
// so are the parts designed elsewhere: those typed by a definition from a dependency package.
// ─────────────────────────────────────────────────────────────────────────────

import { functionalDisplayIds, indexKinds, kindConformsTo, relationshipsOfType, type DiagramDTO, type MemoModelDTO } from '@memoarchitect/tools/browser';
import type { GuideResult, GuideStepStatus } from './guide-view';
import { regulatedDevices, type DeviceRow } from './devices-view';
import { idsInWorkspace, workspaceOptions } from './workspace-scope';
import { DIAGRAM_TYPE_META } from '../constants';

export type GuideLayer = GuideResult['layers'][number];

export interface LayerRow {
    layer: GuideLayer;
    /** The row's steps at the level being worked, in the method's order. */
    steps: GuideStepStatus[];
    done: number;
}

/** The rows of one side of the map, each with its steps. */
export function layerRows(guide: GuideResult | null, axis: string): LayerRow[] {
    if (!guide) return [];
    return guide.layers.filter(layer => layer.axis === axis).map(layer => {
        const steps = stepsOfLayer(guide, layer);
        return { layer, steps, done: steps.filter(step => step.state === 'done').length };
    });
}

/** The sides of the map, in the order the method declares its rows. */
export function axesOf(guide: GuideResult | null): string[] {
    return [...new Set((guide?.layers ?? []).map(layer => layer.axis).filter((axis): axis is string => !!axis))];
}

export function stepsOfLayer(guide: GuideResult, layer: GuideLayer): GuideStepStatus[] {
    const stages = new Set(layer.stages);
    return guide.steps.filter(step => !!step.stage && stages.has(step.stage));
}

/** The row a step is in, if any. */
export function layerOfStep(guide: GuideResult, stepId: string): GuideLayer | undefined {
    const step = guide.steps.find(candidate => candidate.id === stepId);
    return step?.stage ? guide.layers.find(layer => layer.stages.includes(step.stage!)) : undefined;
}

/** Resume within this row, or choose its first unfinished step, then its first step. */
export function currentStep(steps: readonly GuideStepStatus[], lastStep: string | null): GuideStepStatus | undefined {
    return steps.find(step => step.id === lastStep) ?? steps.find(step => step.state !== 'done') ?? steps[0];
}

export interface LayerView {
    diagram: DiagramDTO;
    /** The row viewpoint this view conforms to. */
    viewpoint: GuideLayer['viewpoints'][number];
}

/** Authored views grouped in the order the row offers its viewpoints. */
export function layerViews(model: MemoModelDTO, layer: GuideLayer): LayerView[] {
    return layer.viewpoints.flatMap(viewpoint => {
        const ids = new Set((model.viewpoints ?? []).filter(candidate => candidate.name === viewpoint.name).map(candidate => candidate.id));
        return (model.diagrams ?? [])
            .filter(diagram => [diagram.viewpointId, ...(diagram.viewpointIds ?? [])].some(id => ids.has(id)))
            .map(diagram => ({ diagram, viewpoint }));
    });
}

/** Use the existing notation catalog, including its ordering for shared view kinds. */
export function diagramTypeFor(viewKind: string | undefined): string {
    return Object.entries(DIAGRAM_TYPE_META).find(([, meta]) => meta.viewKind === viewKind)?.[0] ?? 'bdd';
}

/** The word for an operational level is the label of the method task that works at it. */
export function operationalLevelLabel(guide: GuideResult | null | undefined, level: string): string {
    for (const layer of guide?.layers ?? []) for (const task of layer.tasks ?? []) if (task.level === level && task.label) return task.label;
    return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Row taxonomy is method data; older custom methods fall back to their produced kinds. */
export function kindsOfLayer(guide: GuideResult, layer: GuideLayer): string[] {
    return layer.elementKinds?.length ? layer.elementKinds : [...new Set(stepsOfLayer(guide, layer).flatMap(step => step.outputKinds))];
}

/** Elements admitted by any requested kind, including specializations, in the chosen workspace. */
export function elementsOfKinds(model: MemoModelDTO, kinds: readonly string[], workspace: string | null) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const workspaceIds = idsInWorkspace(model.workspaceMembership, workspace);
    const ids = workspace && workspaceIds ? functionalDisplayIds(model, workspace, workspaceIds) : workspaceIds;
    return Object.values(model.elements).filter(element => (!ids || ids.has(element.id))
        && kinds.some(kind => kindConformsTo(element.kind, kind, registry)));
}

export interface ContinuePoint {
    layer: GuideLayer;
    step: GuideStepStatus;
    /** 1-based, within the row. */
    number: number;
    of: number;
}

/**
 * Where this person continues: the step they last opened, when the method still has it at this level; else the
 * first open step among the ones shown. None when nothing is open.
 */
export function continuePoint(guide: GuideResult | null, lastStep: string | null, shown: readonly GuideStepStatus[]): ContinuePoint | undefined {
    if (!guide) return undefined;
    const step = (lastStep ? shown.find(candidate => candidate.id === lastStep) : undefined) ?? shown.find(candidate => candidate.state === 'open');
    const layer = step ? layerOfStep(guide, step.id) : undefined;
    if (!step || !layer) return undefined;
    const steps = stepsOfLayer(guide, layer);
    return { layer, step, number: steps.indexOf(step) + 1, of: steps.length };
}

// ── Scope ───────────────────────────────────────────────────────────────────

export interface ScopeNode {
    root: string;
    name: string;
    scope: 'sos' | 'system';
    children: ScopeNode[];
}

export interface ScopeTree {
    roots: ScopeNode[];
    /** Systems built by others: at the boundary, not designed here. */
    external: { root: string; name: string }[];
}

const originOf = (model: MemoModelDTO, root: string) => model.elements[root]?.attributes?.origin?.split('::').pop();

/**
 * The workspaces as a tree. A workspace is the child of another when a part the other's definition owns, at any
 * depth, is typed by its root; one nothing holds is a root. A system built by others is listed apart.
 */
export function scopeTree(model: MemoModelDTO): ScopeTree {
    const options = workspaceOptions(model.workspaceMembership);
    const definitionOf = model.workspaceMembership?.definitionOf ?? {};
    const external = options.filter(option => option.scope === 'system' && originOf(model, option.root) === 'external');
    const inside = options.filter(option => !external.includes(option));
    const roots = new Set(inside.map(option => option.root));
    // The workspace roots a definition holds directly: through its parts, or their parts when those are not systems.
    const owned = new Map<string, string[]>();
    for (const element of Object.values(model.elements)) {
        if (element.owner) owned.set(element.owner, [...(owned.get(element.owner) ?? []), element.id]);
    }
    const held = (definition: string): string[] => {
        const found: string[] = [];
        const seen = new Set<string>();
        const walk = (id: string) => {
            for (const child of owned.get(id) ?? []) {
                if (seen.has(child)) continue;
                seen.add(child);
                const type = definitionOf[child];
                if (type && roots.has(type) && type !== definition) found.push(type);
                else walk(child);
            }
        };
        walk(definition);
        return [...new Set(found)];
    };
    const childrenOf = new Map(inside.map(option => [option.root, held(option.root)]));
    const isChild = new Set([...childrenOf.values()].flat());
    const build = (root: string, path: ReadonlySet<string>): ScopeNode => {
        const option = inside.find(candidate => candidate.root === root)!;
        const next = new Set([...path, root]);
        return {
            root, name: option.name, scope: option.scope,
            children: (childrenOf.get(root) ?? []).filter(child => !next.has(child))
                .map(child => build(child, next)).sort((a, b) => a.name.localeCompare(b.name)),
        };
    };
    return {
        roots: inside.filter(option => !isChild.has(option.root)).map(option => build(option.root, new Set())),
        external: external.map(option => ({ root: option.root, name: option.name })),
    };
}

/** The workspace roots on the way from a tree root to `root`, inclusive; empty when it is not in the tree. */
export function scopePath(tree: ScopeTree, root: string): ScopeNode[] {
    const search = (nodes: ScopeNode[], path: ScopeNode[]): ScopeNode[] => {
        for (const node of nodes) {
            if (node.root === root) return [...path, node];
            const found = search(node.children, [...path, node]);
            if (found.length > 0) return found;
        }
        return [];
    };
    return search(tree.roots, []);
}

/**
 * The parts designed elsewhere: the definitions from a dependency package that the workspace's parts are typed by
 * (the whole model's, when no workspace is chosen), by name.
 */
export function suppliedParts(model: MemoModelDTO, workspace: string | null): { id: string; name: string }[] {
    const membership = model.workspaceMembership;
    const definitionOf = membership?.definitionOf ?? {};
    const inWorkspace = (id: string) => !workspace || (membership?.membership[id] ?? []).includes(workspace);
    const found = new Map<string, string>();
    for (const element of Object.values(model.elements)) {
        if (element.isDefinition || !inWorkspace(element.id)) continue;
        const definition = definitionOf[element.id] ? model.elements[definitionOf[element.id]] : undefined;
        if (definition?.provenance?.declaration.origin === 'dependency') found.set(definition.id, definition.name);
    }
    return [...found].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// ── Design history ──────────────────────────────────────────────────────────

export interface Approvals {
    /** The approvals this system is cleared under: those covering a release of it, or in its workspace. */
    own: DeviceRow[];
    /** Approvals tied to no system yet: they cover no release, and no workspace holds them. */
    untied: DeviceRow[];
}

/**
 * A system's approvals. A regulated device reaches its system through the releases it covers (`covers`, then the
 * record's `releaseOf`), so one that covers no release yet belongs to no system and is said to be untied.
 */
export function approvalsOf(model: MemoModelDTO, workspace: string | null): Approvals {
    const all = regulatedDevices(model, null);
    if (!workspace) return { own: all, untied: [] };
    const releaseOf = new Map(relationshipsOfType(model, 'releaseOf').map(r => [r.sourceId, r.targetId]));
    const membership = model.workspaceMembership;
    const roots = (id: string) => membership?.membership[id] ?? [];
    const own = all.filter(device => roots(device.id).includes(workspace) || device.covers.some(cover => releaseOf.get(cover.id) === workspace));
    const untied = all.filter(device => device.covers.length === 0 && roots(device.id).length === 0);
    return { own, untied };
}
