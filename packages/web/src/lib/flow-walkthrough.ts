// ─── Walking through a flow: the graph it walks ───────────────────────────────
//
// The structure the walkthrough reads from an action flow view as drawn: which edges are the order of the flow,
// where it starts, the ways on from a step, and how much of the canvas to keep lit. Successions are the order. A
// step with none leaving it goes on along its item flows: the view draws one line where a succession and an item
// flow join the same two actions, and a pure function flow has no successions at all.

export interface WalkNode { id: string; data?: Record<string, unknown> }
export interface WalkEdge { id: string; source: string; target: string; label?: unknown; data?: Record<string, unknown> }
export interface WalkPath { edgeId: string; targetId: string; label?: string }

const isControl = (edge: WalkEdge) => edge.data?.flowCategory === 'control';

/** The edges the walkthrough follows. */
export function walkEdges<E extends WalkEdge>(edges: readonly E[]): E[] {
    const ordered = new Set(edges.filter(isControl).map(edge => edge.source));
    return edges.filter(edge => isControl(edge) || !ordered.has(edge.source));
}

/** The step a flow starts at: its start marker, or the first step nothing leads to. */
export function walkStart(nodes: readonly WalkNode[], edges: readonly WalkEdge[]): string | undefined {
    const walked = walkEdges(edges);
    const steps = new Set(walked.flatMap(edge => [edge.source, edge.target]));
    const targets = new Set(walked.map(edge => edge.target));
    const present = nodes.filter(node => steps.has(node.id));
    return (present.find(node => node.id.endsWith('__start') && !targets.has(node.id))
        ?? present.find(node => !targets.has(node.id))
        ?? present[0])?.id;
}

export function waysOn(nodeId: string, edges: readonly WalkEdge[]): WalkPath[] {
    return walkEdges(edges)
        .filter(edge => edge.source === nodeId)
        .map(edge => ({ edgeId: edge.id, targetId: edge.target, label: typeof edge.label === 'string' ? edge.label : undefined }));
}

/** A decision whose guards could all be false: every way on is guarded and none is the `else`. */
export function canStopHere(paths: readonly WalkPath[]): boolean {
    return paths.length > 0 && paths.every(path => path.label?.startsWith('[')) && !paths.some(path => path.label === '[else]');
}

/** How many steps the walk has: those walked, then the first way on from each until it ends or loops. */
export function walkLength(trail: readonly string[], edges: readonly WalkEdge[]): number {
    const seen = new Set(trail);
    let steps = trail.length;
    let next = waysOn(trail[trail.length - 1], edges)[0]?.targetId;
    while (next && !seen.has(next)) {
        seen.add(next);
        steps++;
        next = waysOn(next, edges)[0]?.targetId;
    }
    return steps;
}

/** The opacity of each node and edge at a point in a walk. Anything that is not a step, such as a lane, stays lit. */
export function walkEmphasis(trail: readonly string[], edges: readonly WalkEdge[]) {
    const walked = walkEdges(edges);
    const current = trail[trail.length - 1];
    const steps = new Set(walked.flatMap(edge => [edge.source, edge.target]));
    const taken = new Set(trail);
    const next = new Set(waysOn(current, edges).map(path => path.targetId));
    const walkedIds = new Set(walked.map(edge => edge.id));
    const takenEdges = new Set(trail.slice(1).flatMap((target, index) =>
        walked.filter(edge => edge.source === trail[index] && edge.target === target).map(edge => edge.id)));
    return {
        node: (id: string) => (!steps.has(id) || taken.has(id) ? 1 : next.has(id) ? 0.75 : 0.15),
        edge: (edge: WalkEdge) => {
            if (!walkedIds.has(edge.id)) return edge.source === current || edge.target === current ? 1 : 0.15;
            return edge.source === current || takenEdges.has(edge.id) ? 1 : 0.15;
        },
        next: [...next],
    };
}

/** The items crossing at a step, from the item flows drawn to and from it. */
export function itemsAt(nodeId: string, edges: readonly WalkEdge[]): { receives: string[]; sends: string[] } {
    const named = (rows: WalkEdge[]) => [...new Set(rows.map(edge => edge.data?.flowItem).filter((item): item is string => typeof item === 'string' && item.length > 0))];
    const flows = edges.filter(edge => !isControl(edge));
    return { receives: named(flows.filter(edge => edge.target === nodeId)), sends: named(flows.filter(edge => edge.source === nodeId)) };
}

// ─── What a step checks ───────────────────────────────────────────────────────

export interface WalkModel {
    elements: Record<string, { id: string; shortName?: string; name?: string; construct?: string; owner?: string; attributes?: Record<string, string> }>;
    workspaceMembership?: { definitionOf?: Record<string, string> };
}
export interface WalkCondition { key: string; when: 'before' | 'after'; text: string }
export type WalkConditionState = 'open' | 'held' | 'failed' | 'unchecked';

/** A declared attribute that was never given a value reads as its type in angle brackets. */
const stated = (value: string | undefined) => (value && !/^<.*>$/.test(value) ? value : undefined);

/**
 * What a step must hold before it starts and once it is done, in that order: the `precondition` and `postcondition`
 * a function or scenario redefines with an expression, and the same two written in words. A usage also has its
 * definition's. The model states these and cannot evaluate them, so whether one holds is the reader's call.
 */
export function stepConditions(model: WalkModel | null | undefined, id: string): WalkCondition[] {
    if (!model) return [];
    const definition = model.workspaceMembership?.definitionOf?.[id];
    const owners = definition ? [id, definition] : [id];
    const found: WalkCondition[] = [];
    const add = (when: WalkCondition['when'], feature: string, attribute: string) => {
        for (const owner of owners) {
            for (const element of Object.values(model.elements)) {
                if (element.owner !== owner || element.construct !== 'constraint' || (element.shortName ?? element.name) !== feature) continue;
                const text = stated(element.attributes?.expression);
                if (text) found.push({ key: element.id, when, text });
            }
            const words = stated(model.elements[owner]?.attributes?.[attribute]);
            if (words) found.push({ key: `${owner}#${attribute}`, when, text: words });
        }
    };
    add('before', 'precondition', 'preCondition');
    add('after', 'postcondition', 'postCondition');
    const seen = new Set<string>();
    return found.filter(condition => !seen.has(condition.text) && seen.add(condition.text));
}

/** Where a check failed: those before it held, it failed, and those after it were never reached. */
export function conditionStates(count: number, failed: number | undefined): WalkConditionState[] {
    return Array.from({ length: count }, (_, index) =>
        failed === undefined ? 'open' : index < failed ? 'held' : index === failed ? 'failed' : 'unchecked');
}

// ─── Playing ──────────────────────────────────────────────────────────────────

const READING_CHARS_PER_SECOND = 20;
const SHORTEST_HOLD_MS = 1400;
const LONGEST_HOLD_MS = 15000;

/** How long a step stays on screen when playing: long enough to read what it says. */
export function holdMs(text: string, speed = 1): number {
    return Math.min(LONGEST_HOLD_MS, Math.max(SHORTEST_HOLD_MS, (text.length / READING_CHARS_PER_SECOND) * 1000)) / speed;
}

/** Playing goes on by itself only along a single way on to a step not yet walked. */
export function autoStep(trail: readonly string[], paths: readonly WalkPath[]): WalkPath | undefined {
    if (paths.length !== 1 || canStopHere(paths) || trail.includes(paths[0].targetId)) return undefined;
    return paths[0];
}

// ─── A walk in a link ─────────────────────────────────────────────────────────

export type WalkStop = { kind: 'guards' } | { kind: 'check'; index: number };

/** `s.1.0` is the start and then the way taken at each step; a last `x` is "no guard holds", `c2` the third check failing. */
export function walkToParam(trail: readonly string[], stop: WalkStop | null, edges: readonly WalkEdge[]): string {
    const ways = trail.slice(1).map((target, index) => waysOn(trail[index], edges).findIndex(path => path.targetId === target));
    return ['s', ...ways, ...(stop ? [stop.kind === 'guards' ? 'x' : `c${stop.index}`] : [])].join('.');
}

/** Reads a walk back. A model that has changed since the link was made keeps as much of the walk as still exists. */
export function walkFromParam(param: string, startId: string, edges: readonly WalkEdge[]): { trail: string[]; stop: WalkStop | null } {
    const [head, ...parts] = param.split('.');
    const trail = [startId];
    if (head !== 's') return { trail, stop: null };
    for (const [position, part] of parts.entries()) {
        if (position === parts.length - 1) {
            if (part === 'x') return { trail, stop: { kind: 'guards' } };
            const check = /^c(\d+)$/.exec(part);
            if (check) return { trail, stop: { kind: 'check', index: Number(check[1]) } };
        }
        const path = /^\d+$/.test(part) ? waysOn(trail[trail.length - 1], edges)[Number(part)] : undefined;
        if (!path) break;
        trail.push(path.targetId);
    }
    return { trail, stop: null };
}
