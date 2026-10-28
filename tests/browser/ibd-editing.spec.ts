import { test, expect, type Page } from '@playwright/test';
import { readIbdGeometry, type IbdGeometry } from './ibd-geometry';

// Manual editing of an internal block diagram, on the vehicle example. Each
// test reloads the page, but edits persist in the served copy, so tests read
// positions afresh rather than assuming the authored layout.
const V = 'memo_vehicle_routing::vehicle::';
const POWERTRAIN = V + 'powertrain', ENGINE = POWERTRAIN + '::engine', TRANSMISSION = POWERTRAIN + '::transmission';

/** Open the diagram; unless `keep`, start from its default layout and routing,
 * since every test edits the same served copy. */
async function openDiagram(page: Page, keep = false) {
    await page.goto('/');
    const skip = page.getByRole('button', { name: 'Skip tour' });
    if (await skip.waitFor({ timeout: 5_000 }).then(() => true, () => false)) await skip.click();
    await page.getByText('All views', { exact: true }).click();
    await page.getByText('Vehicle interconnection', { exact: true }).first().click();
    await expect(page.locator('.react-flow__edge').first()).toBeVisible({ timeout: 30_000 });
    if (!keep) {
        await page.getByLabel('IBD routing mode').selectOption('automatic');
        await page.getByLabel('IBD routing type').selectOption('manhattan');
        await page.getByTitle('Reset this view to its default layout').click();
    }
    await settle(page);
}

/** Wait until layout and routing have finished: connector paths stop changing. */
async function settle(page: Page) {
    await expect(page.getByRole('progressbar', { name: 'Laying out the diagram' })).toHaveCount(0, { timeout: 30_000 });
    const paths = () => page.locator('.react-flow__edge-path').evaluateAll(es => es.map(e => e.getAttribute('d')).join('|'));
    let last = await paths();
    for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(700);
        const now = await paths();
        if (now === last) return;
        last = now;
    }
}

const geometry = (page: Page) => page.evaluate(readIbdGeometry);

function expectCleanConnectors(g: IbdGeometry) {
    expect(g.edges).toBeGreaterThan(30);
    expect(g.loose).toEqual([]);
    expect(g.notOrthogonal).toEqual([]);
    expect(g.throughPart).toEqual([]);
    expect(g.throughPort).toEqual([]);
    expect(g.overlappingPorts).toEqual([]);
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    await page.mouse.up();
    await settle(page);
}

const centre = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

test('connectors are right-angled and clear of parts and ports they do not connect', async ({ page }) => {
    await openDiagram(page);
    expectCleanConnectors(await geometry(page));
});

test('moving a part moves its inner parts and ports, and connectors follow', async ({ page }) => {
    await openDiagram(page);
    const before = await geometry(page);
    const header = (await page.locator(`.react-flow__node[data-id="${POWERTRAIN}"] [data-ibd-header]`).first().boundingBox())!;
    const grab = { x: header.x + 40, y: header.y + header.height / 2 };
    await drag(page, grab, { x: grab.x + 30, y: grab.y - 10 });
    const after = await geometry(page);
    const moved = (id: string, boxes: 'parts' | 'ports') =>
        [Math.round(after[boxes][id].x - before[boxes][id].x), Math.round(after[boxes][id].y - before[boxes][id].y)];
    const delta = moved(POWERTRAIN, 'parts');
    expect(delta).not.toEqual([0, 0]);
    for (const id of Object.keys(before.parts).filter(id => id.startsWith(POWERTRAIN + '::'))) expect(moved(id, 'parts')).toEqual(delta);
    for (const id of Object.keys(before.ports).filter(id => id.startsWith(POWERTRAIN + '::'))) expect(moved(id, 'ports')).toEqual(delta);
    expectCleanConnectors(after);
});

test('a port slides round its part and hops over another port', async ({ page }) => {
    await openDiagram(page);
    let g = await geometry(page);
    const engine = g.parts[ENGINE];
    const [first, second] = Object.values(g.ports).filter(port => port.owner === ENGINE);
    // Round the corner onto the top wall.
    await drag(page, centre(first), { x: engine.x + engine.w / 2, y: engine.y - 12 });
    g = await geometry(page);
    const onTop = g.ports[first.id];
    expect(Math.abs(centre(onTop).y - g.parts[ENGINE].y)).toBeLessThan(2);
    expectCleanConnectors(g);
    // Dropped onto the second port, it lands beside it rather than on it.
    await drag(page, centre(onTop), centre(g.ports[second.id]));
    g = await geometry(page);
    expectCleanConnectors(g);
});

test('a part dropped on a sibling lands beside it', async ({ page }) => {
    await openDiagram(page);
    const before = await geometry(page);
    const header = (await page.locator(`.react-flow__node[data-id="${ENGINE}"] [data-ibd-header]`).first().boundingBox())!;
    const target = before.parts[TRANSMISSION];
    await drag(page, { x: header.x + 30, y: header.y + header.height / 2 },
        { x: header.x + 30, y: header.y + header.height / 2 + (target.y + target.h / 2 - before.parts[ENGINE].y) });
    const after = await geometry(page);
    const engine = after.parts[ENGINE], transmission = after.parts[TRANSMISSION];
    expect([engine.x, engine.y]).not.toEqual([before.parts[ENGINE].x, before.parts[ENGINE].y]);
    const overlaps = engine.x < transmission.x + transmission.w && transmission.x < engine.x + engine.w
        && engine.y < transmission.y + transmission.h && transmission.y < engine.y + engine.h;
    expect(overlaps).toBe(false);
    expectCleanConnectors(after);
});

test('replacing hand-drawn bends asks first, in the app\'s own dialog', async ({ page }) => {
    page.on('dialog', dialog => { throw new Error(`browser dialog: ${dialog.message()}`); });
    await openDiagram(page);
    await page.getByLabel('IBD routing mode').selectOption('manual');
    await settle(page);
    const before = await geometry(page);
    const header = (await page.locator(`.react-flow__node[data-id="${ENGINE}"] [data-ibd-header]`).first().boundingBox())!;
    const grab = { x: header.x + 30, y: header.y + header.height / 2 };
    await drag(page, grab, { x: grab.x, y: grab.y - 6 });
    const dialog = page.getByRole('dialog', { name: 'Move this part?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await settle(page);
    const kept = await geometry(page);
    expect(kept.parts[ENGINE].y).toBeCloseTo(before.parts[ENGINE].y, 0);
});

/** A point on the connector's line that the pointer actually reaches. */
async function pointOnConnector(page: Page, index: number | string) {
    return page.evaluate(i => {
        const groups = [...document.querySelectorAll<SVGGElement>('.react-flow__edge')];
        for (const group of typeof i === 'string' ? groups.filter(g => g.dataset.id === i) : groups.slice(i)) {
            const path = group.querySelector<SVGPathElement>('.react-flow__edge-path')!, length = path.getTotalLength(), m = path.getScreenCTM()!;
            for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.05, 0.95]) {
                const q = path.getPointAtLength(length * f), p = new DOMPoint(q.x, q.y).matrixTransform(m);
                if (document.elementFromPoint(p.x, p.y)?.closest('.react-flow__edge') === group) return { id: group.dataset.id!, x: p.x, y: p.y };
            }
        }
        return null;
    }, index);
}

const pathOf = (page: Page, id: string) => page.locator(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`).getAttribute('d');
/** How far a connector strays from the straight line between its ends; crossing hops stray a few pixels. */
const deviation = (page: Page, id: string) => page.locator(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`).evaluate(el => {
    const path = el as SVGPathElement, length = path.getTotalLength();
    const a = path.getPointAtLength(0), b = path.getPointAtLength(length), span = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let worst = 0;
    for (let i = 1; i < 60; i++) {
        const p = path.getPointAtLength(length * i / 60);
        worst = Math.max(worst, Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / span);
    }
    return worst;
});
const isStraight = async (page: Page, id: string) => (await deviation(page, id)) < 10;

test('selected connectors take their own routing type, kept on reload and undoable', async ({ page }) => {
    await openDiagram(page);
    const a = (await pointOnConnector(page, 0))!;
    const untouched = (await pointOnConnector(page, 12))!;
    const untouchedBefore = await pathOf(page, untouched.id);
    await page.mouse.click(a.x, a.y);
    // Selecting a connector raises it, so find the second one's point afterwards.
    const b = (await pointOnConnector(page, 5))!;
    await page.keyboard.down('Control'); await page.mouse.click(b.x, b.y); await page.keyboard.up('Control');
    expect(await page.locator('.react-flow__edge.selected').evaluateAll(es => es.map(e => (e as HTMLElement).dataset.id).sort()))
        .toEqual([a.id, b.id].sort());
    const control = page.getByLabel('Selected connector routing');
    await expect(page.getByText('2 selected connectors')).toBeVisible();
    await control.selectOption('straight');
    await settle(page);
    for (const id of [a.id, b.id]) expect(await isStraight(page, id)).toBe(true);
    expect(await pathOf(page, untouched.id)).toBe(untouchedBefore);
    // Back to the diagram's routing, then Undo returns them to straight.
    await control.selectOption('diagram');
    await settle(page);
    for (const id of [a.id, b.id]) expect(await isStraight(page, id)).toBe(false);
    await page.getByTitle('Undo last diagram edit').click();
    await settle(page);
    for (const id of [a.id, b.id]) expect(await isStraight(page, id)).toBe(true);
    // The choice is saved with the view.
    await openDiagram(page, true);
    for (const id of [a.id, b.id]) expect(await isStraight(page, id)).toBe(true);
});

test('auto-route and reset to the default layout can both be undone', async ({ page }) => {
    await openDiagram(page);
    await page.getByLabel('IBD routing mode').selectOption('manual');
    await settle(page);
    await page.getByRole('button', { name: 'Auto-route all' }).click();
    await page.getByRole('dialog', { name: 'Auto-route connectors?' }).getByRole('button', { name: 'Auto-route' }).click();
    await settle(page);
    expectCleanConnectors(await geometry(page));
    const DRIVER = 'memo_vehicle_routing::driver', VEHICLE = 'memo_vehicle_routing::vehicle';
    const header = (await page.locator(`.react-flow__node[data-id="${DRIVER}"] [data-ibd-header]`).first().boundingBox())!;
    await drag(page, { x: header.x + 30, y: header.y + header.height / 2 }, { x: header.x - 90, y: header.y + header.height / 2 - 20 });
    await page.getByRole('dialog').getByRole('button', { name: 'Replace bends' }).click({ timeout: 3_000 }).catch(() => {});
    await settle(page);
    const moved = await geometry(page);
    // The viewport refits after each step, so compare the driver's place relative to the vehicle.
    const offset = (g: IbdGeometry) => [Math.round((g.parts[DRIVER].x - g.parts[VEHICLE].x) / g.parts[VEHICLE].w * 100),
        Math.round((g.parts[DRIVER].y - g.parts[VEHICLE].y) / g.parts[VEHICLE].w * 100)];
    await page.getByTitle('Reset this view to its default layout').click();
    await settle(page);
    expect(offset(await geometry(page))).not.toEqual(offset(moved));
    await page.getByTitle('Undo last diagram edit').click();
    await settle(page);
    const restored = await geometry(page);
    expect(offset(restored)).toEqual(offset(moved));
});

test('a part resizes by its sides (one direction) and by its corners (both), never onto a neighbour', async ({ page }) => {
    await openDiagram(page);
    const DRIVER = 'memo_vehicle_routing::driver';
    const node = page.locator(`.react-flow__node[data-id="${DRIVER}"]`);
    const header = (await node.locator('[data-ibd-header]').first().boundingBox())!;
    await page.mouse.click(header.x + 20, header.y + header.height / 2);
    const grip = async (position: string) => (await node.locator(`.react-flow__resize-control.${position.split(' ').join('.')}`).first().boundingBox())!;
    const size = async () => { const b = (await node.boundingBox())!; return { w: Math.round(b.width), h: Math.round(b.height) }; };
    const resize = async (position: string, dx: number, dy: number) => {
        const g = await grip(position), from = { x: g.x + g.width / 2, y: g.y + g.height / 2 };
        await drag(page, from, { x: from.x + dx, y: from.y + dy });
    };
    let before = await size();
    await resize('right', 40, 0);
    let after = await size();
    expect(after.w).toBeGreaterThan(before.w + 20); expect(after.h).toBe(before.h);
    before = after;
    await resize('bottom', 0, 40);
    after = await size();
    expect(after.h).toBeGreaterThan(before.h + 20); expect(after.w).toBe(before.w);
    before = after;
    // Driver controls sits above the vehicle, so the free corner is the top one.
    await resize('top right', 30, -30);
    after = await size();
    expect(after.w).toBeGreaterThan(before.w + 15); expect(after.h).toBeGreaterThan(before.h + 15);
    expectCleanConnectors(await geometry(page));
});

test('spacing between parts and between ports grows and shrinks, and undoes', async ({ page }) => {
    await openDiagram(page);
    // The viewport refits, so measure within the powertrain.
    const gap = (g: IbdGeometry) => (g.parts[TRANSMISSION].y - (g.parts[ENGINE].y + g.parts[ENGINE].h)) / g.parts[POWERTRAIN].w;
    const start = await geometry(page);
    await page.getByLabel('More space between parts').click();
    await settle(page);
    let g = await geometry(page);
    expect(gap(g)).toBeGreaterThan(gap(start));
    expectCleanConnectors(g);
    await page.getByTitle('Undo last diagram edit').click();
    await settle(page);
    expect(gap(await geometry(page))).toBeCloseTo(gap(start), 3);

    const header = (await page.locator(`.react-flow__node[data-id="${ENGINE}"] [data-ibd-header]`).first().boundingBox())!;
    await page.mouse.click(header.x + 20, header.y + header.height / 2);
    const portGap = (g: IbdGeometry) => {
        const ys = Object.values(g.ports).filter(port => port.owner === ENGINE && Math.abs(port.x - g.parts[ENGINE].x) < port.w).map(port => port.y).sort((a, b) => a - b);
        return (ys[1] - ys[0]) / g.parts[POWERTRAIN].w;
    };
    const before = await geometry(page);
    await page.getByLabel('More space between ports').click();
    await settle(page);
    g = await geometry(page);
    expect(portGap(g)).toBeGreaterThan(portGap(before));
    expectCleanConnectors(g);
    await page.getByLabel('Less space between ports').click();
    await page.getByLabel('Less space between ports').click();
    await settle(page);
    expectCleanConnectors(await geometry(page));
});
