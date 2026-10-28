import { test, expect, type Page } from '@playwright/test';
import { readIbdGeometry, type IbdGeometry } from './ibd-geometry';

// Manual editing of an internal block diagram, on the vehicle example. Each
// test reloads the page, but edits persist in the served copy, so tests read
// positions afresh rather than assuming the authored layout.
const V = 'memo_vehicle_routing::vehicle::';
const POWERTRAIN = V + 'powertrain', ENGINE = POWERTRAIN + '::engine', TRANSMISSION = POWERTRAIN + '::transmission';

async function openDiagram(page: Page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.getByText('All views', { exact: true }).click();
    await page.getByText('Vehicle interconnection', { exact: true }).first().click();
    await expect(page.locator('.react-flow__edge').first()).toBeVisible({ timeout: 30_000 });
    await settle(page);
}

async function settle(page: Page) {
    await page.waitForTimeout(1200);
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
