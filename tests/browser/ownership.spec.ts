import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLayoutSource as parse } from './fixture-layout.mjs';
const out = resolve(process.env.MEMO_BASELINE_OUTPUT ?? 'artifacts/ibd-baseline');

test('settings saves are observed after disk writes and retain placement/native state', async ({ page }) => {
    const runtime = JSON.parse(readFileSync(resolve(out, 'runtime.json'), 'utf8'));
    expect(runtime.session2Seed, 'Run with MEMO_SESSION2_FIXTURE=1 and ownership.spec.ts').toBe(true);
    const disk = () => parse(readFileSync(resolve(runtime.fixture, 'model/catalog/views.sysml'), 'utf8')).layouts.vehicleRoutingPilot;
    const before = disk(), sent: any[] = [], observed: any[] = [];
    let prior: any, latest: any, injected = false;
    await page.routeWebSocket(/.*/, socket => {
        const server = socket.connectToServer();
        socket.onMessage(message => {
            const m = JSON.parse(String(message));
            if (m.type === 'diagram:layout:update') { prior = latest; latest = m.payload; }
            server.send(message);
        });
        server.onMessage(message => {
            socket.send(message);
            const m = JSON.parse(String(message));
            if (!injected && m.type === 'diagram:layout:saved' && latest?.layout.canvas?.routingType === 'arc' && prior) {
                injected = true;
                // Re-deliver an earlier save completion and its older full snapshot.
                socket.send(JSON.stringify({type:'diagram:layout:saved',payload:{diagramId:prior.diagramId,requestId:prior.requestId}}));
                socket.send(JSON.stringify({type:'diagram:layout',payload:{layouts:{[prior.diagramId]:prior.layout}}}));
                socket.send(JSON.stringify({type:'diagram:layout',payload:{layouts:{[prior.diagramId]:before}}}));
            }
        });
    });
    page.on('websocket', socket => {
        socket.on('framesent', event => { const m=JSON.parse(String(event.payload)); if(m.type==='diagram:layout:update')sent.push(m.payload); });
        socket.on('framereceived', event => { const m=JSON.parse(String(event.payload)); if(m.type==='diagram:layout:saved')observed.push({ ...m.payload, disk: disk() }); });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.getByText('All diagrams', { exact: true }).click();
    await page.getByText('Vehicle routing comparison', { exact: true }).first().click();
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });
    const waitSaved = async () => {
        await expect.poll(() => observed.some(o => o.requestId === sent.at(-1)?.requestId)).toBe(true);
        const result = observed.find(o => o.requestId === sent.at(-1).requestId);
        expect(result.error).toBeUndefined();
        return result.disk;
    };
    await page.getByLabel('IBD routing mode').selectOption('manual');
    let saved = await waitSaved();
    expect(saved.canvas.autoLayout).toBe(true);
    await page.getByLabel('IBD routing type').selectOption('arc');
    saved = await waitSaved();
    expect(saved.canvas).toMatchObject({autoLayout:true,routingMode:'manual',routingType:'arc'});
    expect(injected).toBe(true);
    await expect(page.getByLabel('IBD routing type')).toHaveValue('arc');
    expect(saved.nodes).toEqual(before.nodes);
    expect(saved.edges).toEqual(before.edges);
    expect(saved.canvas.jointjs).toEqual(before.canvas.jointjs);
    expect(saved.canvas.x6).toEqual(before.canvas.x6);
    expect(saved.futureLayout).toEqual(before.futureLayout);
    expect(saved.canvas.futureCanvas).toEqual(before.canvas.futureCanvas);
    // A placement setting alone must save without changing connector ownership.
    await page.getByRole('button', { name: 'Show or hide Toolbar', exact: true }).click();
    await page.getByTitle('Auto layout is on. Drag an item to preserve a manual layout.', { exact: true }).click();
    saved = await waitSaved();
    expect(saved.canvas).toMatchObject({autoLayout:false,routingMode:'manual',routingType:'arc'});
    await page.reload();
    await expect(page.getByLabel('IBD routing mode')).toHaveValue('manual');
    await expect(page.getByLabel('IBD routing type')).toHaveValue('arc');
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(disk()).toEqual(saved);
    writeFileSync(resolve(out,'session2-save-observations.json'),JSON.stringify({before,sent,observed,final:disk()},null,2));
});
