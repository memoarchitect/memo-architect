// Golden SVG for the action-flow acceptance fixture — topology, not pixels.
//
// The fixture is `activity_example::FulfillOrder`, the SysML v2 activity sample
// that the standard-sysml-diagrams example ships as runnable model source. This
// drives the real pipeline for it — template → scene → SVG export — and pins
// the result against a checked-in golden.
//
// The golden has every coordinate replaced by `#`. That is the point: layout is
// free to move, and a diff here means the *notation* changed — a glyph, a
// subject, an edge endpoint, a guard label — which is a review-worthy event and
// exactly what "compared for topology, not pixels" asks for.
//
// Regenerate deliberately, never reflexively:
//   MEMO_UPDATE_GOLDEN=1 vitest run src/diagram/__tests__/action-flow-golden.test.ts

import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { computeActionFlowViewLayout } from '../../views/templates/actionflow-view';
import { notationSceneToSvg, projectLayoutToNotationScene } from '../notation-scene';

const GOLDEN = join(__dirname, 'action-flow-golden.svg');

const FILE = 'model/sysml_v2_activity_example.sysml';

function node(id: string, kind: string, name = id): MemoElement {
    return {
        id, name, kind, construct: 'action', layer: 'operational',
        file: FILE, attributes: {}, parentAction: 'FulfillOrder',
    } as MemoElement;
}

function edge(
    id: string, type: string, sourceId: string, targetId: string,
    extra: Partial<MemoRelationship> = {},
): MemoRelationship {
    return {
        id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: FILE, ...extra,
    } as MemoRelationship;
}

/**
 * `FulfillOrder`, element for element as the fixture declares it: accept and
 * send actions, a decision with both guarded branches, a merge, a fork/join
 * pair around two concurrent steps, an object flow of `Order`, and a
 * termination distinct from the flow's end.
 */
const elements: MemoElement[] = [
    { ...node('FulfillOrder', 'ActionDefinition'), parentAction: undefined } as MemoElement,
    node('receiveOrder', 'AcceptActionUsage'),
    node('validateOrder', 'ActionUsage'),
    node('routeOrder', 'DecisionNodeUsage'),
    node('processOrder', 'ActionUsage'),
    node('rejectOrder', 'ActionUsage'),
    node('afterDecision', 'MergeNodeUsage'),
    node('parallelWork', 'ForkNodeUsage'),
    node('prepareShipment', 'ActionUsage'),
    node('createInvoice', 'ActionUsage'),
    node('readyToNotify', 'JoinNodeUsage'),
    node('notifyCustomer', 'ActionUsage'),
    node('sendReceipt', 'SendActionUsage'),
];

const relationships: MemoRelationship[] = [
    edge('s1', 'succession', 'receiveOrder', 'validateOrder'),
    edge('f1', 'flow', 'receiveOrder', 'validateOrder', { flowItem: 'Order' } as Partial<MemoRelationship>),
    edge('s2', 'succession', 'validateOrder', 'routeOrder'),
    edge('s3', 'succession', 'routeOrder', 'processOrder', { sourceEnd: '[true]' }),
    edge('s4', 'succession', 'routeOrder', 'rejectOrder', { sourceEnd: '[false]' }),
    edge('s5', 'succession', 'processOrder', 'afterDecision'),
    edge('s6', 'succession', 'rejectOrder', 'afterDecision'),
    edge('s7', 'succession', 'afterDecision', 'parallelWork'),
    edge('s8', 'succession', 'parallelWork', 'prepareShipment'),
    edge('s9', 'succession', 'parallelWork', 'createInvoice'),
    edge('s10', 'succession', 'prepareShipment', 'readyToNotify'),
    edge('s11', 'succession', 'createInvoice', 'readyToNotify'),
    edge('s12', 'succession', 'readyToNotify', 'notifyCustomer'),
    edge('s13', 'succession', 'notifyCustomer', 'sendReceipt'),
];

const model = {
    elements: Object.fromEntries(elements.map(element => [element.id, element])),
    relationships,
    errors: [],
    revision: 1,
} as unknown as MemoModelDTO;

/**
 * The SVG with geometry erased and everything else kept.
 *
 * Only the attributes that carry position and size are blanked. Subject ids,
 * element names, guard text, glyph shapes and colours all survive verbatim —
 * those are the topology. A number substitution across the whole document would
 * also flatten `s1`/`s13` into `s#` and take identity with it, which is the one
 * thing this golden exists to hold.
 */
const GEOMETRY_ATTRIBUTES = [
    'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx',
    'width', 'height', 'viewBox', 'points', 'stroke-width', 'font-size',
];

function topologyOf(svg: string): string {
    let out = svg;
    for (const attribute of GEOMETRY_ATTRIBUTES) {
        out = out.replace(new RegExp(`(\\s${attribute})="[^"]*"`, 'g'), '$1="#"');
    }
    return out.replace(/></g, '>\n<');
}

async function renderFixture() {
    const layout = await computeActionFlowViewLayout(model, { swimlanes: false });
    const scene = projectLayoutToNotationScene(layout.nodes, layout.edges);
    return { scene, svg: notationSceneToSvg(scene) };
}

describe('action-flow fixture', () => {
    it('renders every fixture node with its SysML v2 glyph', async () => {
        const { scene } = await renderFixture();
        const glyphOf = (subject: string) =>
            scene.nodes.find(n => n.label === subject || n.id === subject)?.glyph;

        expect(glyphOf('receiveOrder')).toBe('accept');
        expect(glyphOf('sendReceipt')).toBe('send');
        expect(glyphOf('routeOrder')).toBe('decision');
        expect(glyphOf('afterDecision')).toBe('merge');
        expect(glyphOf('parallelWork')).toBe('fork');
        expect(glyphOf('readyToNotify')).toBe('join');
    });

    it('attaches both guard labels to the decision branches', async () => {
        const { scene } = await renderFixture();
        const fromDecision = scene.edges.filter(e => {
            const source = scene.nodes.find(n => n.id === e.sourceId);
            return source?.label === 'routeOrder';
        });
        expect(fromDecision).toHaveLength(2);
        expect(fromDecision.map(e => e.label).sort()).toEqual(['[false]', '[true]']);
    });

    it('matches the golden topology', async () => {
        const { svg } = await renderFixture();
        const topology = topologyOf(svg);

        if (process.env.MEMO_UPDATE_GOLDEN === '1' || !existsSync(GOLDEN)) {
            writeFileSync(GOLDEN, topology);
        }
        expect(topology).toBe(readFileSync(GOLDEN, 'utf8'));
    });
});
