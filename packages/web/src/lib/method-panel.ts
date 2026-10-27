// ─── The Method panel's decisions, kept pure ─────────────────────────────────
//
// What the panel offers for a step, from the Guide's evaluation and the ontology's registries. Nothing here
// names a kind, a stage or a step: a step's output kinds say what can be created, the kind registry says how
// (construct and layer), and the model says where: in the chosen workspace, the file an element of that kind is
// declared in, else the workspace's own declaration (a new element sits beside its system), else a file of that
// kind's layer. With no workspace, the same order over the whole model. Nothing found: no write is offered. Architect generates no id: the new element's id is the SysML name it is written under.
// ─────────────────────────────────────────────────────────────────────────────

import { sysmlIdentifier, usageConstruct } from '../authoring';
import { idsInWorkspace } from './workspace-scope';
import { indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import type { GuideStepStatus } from './guide-view';

export interface CreatePlan {
    kind: string;
    label: string;
    construct: MemoElement['construct'];
    layer: string;
    /** The file it is written into; absent when nothing in the model shows where it belongs. */
    file?: string;
}

/** How to create an element of `kind`, or nothing when the ontology has no instantiable kind of that name. */
export function planCreate(model: MemoModelDTO | null, kind: string, workspace: string | null = null): CreatePlan | undefined {
    const info = model?.registries?.kinds.find(k => k.name === kind && !k.isAbstract);
    if (!info) return undefined;
    const members = idsInWorkspace(model?.workspaceMembership, workspace);
    const elements = (Object.values(model?.elements ?? {}) as MemoElement[]).filter(e => e.file && (!members || members.has(e.id)));
    const root = workspace ? (model?.elements[workspace] as MemoElement | undefined) : undefined;
    const file = elements.find(e => e.kind === kind)?.file
        ?? root?.file
        ?? elements.find(e => e.layer === info.layer)?.file;
    return { kind, label: info.label || kind, construct: usageConstruct(info.construct) as MemoElement['construct'], layer: info.layer ?? '', file };
}

/** The element the panel asks the store to create: a legal, unused SysML name is its id. */
export function newElement(model: MemoModelDTO | null, plan: CreatePlan & { file: string }, name: string): Omit<MemoElement, 'id'> & { id: string } {
    const taken = Object.entries(model?.elements ?? {}).flatMap(([id, e]) => [id, (e as MemoElement).name]);
    return {
        id: sysmlIdentifier(name, taken), name, kind: plan.kind, construct: plan.construct, layer: plan.layer,
        file: plan.file, attributes: {},
    } as Omit<MemoElement, 'id'> & { id: string };
}

/** The step to open first: the one asked for, else the next open one, else the first. */
export function initiallyExpanded(steps: readonly GuideStepStatus[], next?: string): string | undefined {
    return (next && steps.some(s => s.id === next) ? next : undefined) ?? steps.find(s => s.state === 'open')?.id ?? steps[0]?.id;
}

/** A step's elements with a link still to make, as the model names them. */
export function unlinkedElements(model: MemoModelDTO | null, step: GuideStepStatus): { rule: string; elements: { id: string; name: string }[] }[] {
    return step.links.filter(l => l.state === 'ready').map(link => ({
        rule: link.rule,
        elements: link.unlinked.map(id => ({ id, name: (model?.elements[id] as MemoElement | undefined)?.name ?? id })),
    }));
}

/**
 * Elements of the step's output kinds that are in no system yet, when one system is chosen. A workspace is the
 * closure of what is linked to its system, so a new element joins one only once it is linked: until then it is
 * work this team made and has still to link in, not work that is missing.
 */
export function notInASystem(model: MemoModelDTO | null, step: GuideStepStatus, workspace: string | null): { id: string; name: string; kind: string }[] {
    const membership = model?.workspaceMembership;
    const chosen = membership?.workspaces.find(w => w.root === workspace);
    if (!model || !membership || !chosen || chosen.scope !== 'system') return [];
    const kinds = indexKinds(model.registries?.kinds ?? []);
    return membership.unassigned
        .map(id => model.elements[id] as MemoElement | undefined)
        .filter((e): e is MemoElement => !!e && step.outputKinds.some(kind => kindConformsTo(e.kind, kind, kinds)))
        .map(e => ({ id: e.id, name: e.name || e.id.slice(e.id.lastIndexOf('::') + 2), kind: e.kind }));
}
