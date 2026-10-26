// ─── Drawing views for a generated document ──────────────────────────────────
//
// MEMO Tools has no renderer: the picture of a view is the one the Architect canvas draws. This is the
// `DiagramRenderer` Architect hands to `memo export dhf`. It builds the standalone viewer with the project's
// model and the views' stored layouts baked in, opens it in headless Chromium, and asks the page
// (`diagram/headless-render.ts`) for the SVG of each view, so the file is the export a person gets from the
// toolbar. A view with no stored layout is not drawn; the caller keeps its note and says why.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    loadViewLayouts, savedNodeIdResolver, serializeForInlineScript,
    type DiagramImage, type DiagramRenderer,
} from '@memoarchitect/tools';
import { chromium, type Browser } from 'playwright-core';

/** The function `diagram/headless-render.ts` installs in the page; this program has no DOM types. */
interface PageHook {
    __memoRenderDiagram(ref: string, layouts: unknown): Promise<{ ok: true; svg: string; png: string } | { ok: false; reason: string }>;
}

function architectPackageRoot(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

/** A file name for a view, safe on every filesystem. */
const fileStem = (ref: string): string => ref.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'diagram';

/** The newest Chromium Playwright cached on this machine, if any. */
function cachedChromium(): string | undefined {
    const caches = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright')];
    for (const cache of caches) {
        if (!cache || !existsSync(cache)) continue;
        const revisions = readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
        for (const revision of revisions) {
            for (const relative of [
                'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
                'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
                'chrome-linux/chrome',
                'chrome-win/chrome.exe',
            ]) {
                const candidate = join(cache, revision, relative);
                if (existsSync(candidate)) return candidate;
            }
        }
    }
    return undefined;
}

/** Launch Chromium: the one named by MEMO_CHROMIUM, Playwright's own, a cached one, then the installed Chrome. */
async function launchBrowser(): Promise<Browser> {
    const named = process.env.MEMO_CHROMIUM;
    const candidates: Array<() => Promise<Browser>> = [];
    if (named) candidates.push(() => chromium.launch({ executablePath: named }));
    candidates.push(() => chromium.launch());
    const cached = cachedChromium();
    if (cached) candidates.push(() => chromium.launch({ executablePath: cached }));
    candidates.push(() => chromium.launch({ channel: 'chrome' }));
    let failure: unknown;
    for (const launch of candidates) {
        try { return await launch(); } catch (error) { failure = error; }
    }
    throw new Error(
        'no Chromium to draw diagrams with. Install one (`npx playwright-core install chromium`), install Chrome, or set MEMO_CHROMIUM to a '
        + `Chromium executable. Last error: ${failure instanceof Error ? failure.message.split('\n')[0] : String(failure)}`,
    );
}

export const renderDiagramsWithChromium: DiagramRenderer = async (refs, outDir, source) => {
    const images: Record<string, DiagramImage> = {};
    const warnings: string[] = [];

    const sourceHtml = resolve(architectPackageRoot(), 'dist-standalone', 'index.html');
    if (!existsSync(sourceHtml)) {
        throw new Error('the standalone Architect viewer is missing; run `pnpm run build:client:standalone`.');
    }
    // The model and the project it was read from are the caller's: a pinned release draws its own commit, with
    // that commit's authored layouts, not the working directory's.
    const layouts = loadViewLayouts(source.projectRoot, source.model.diagrams ?? [], savedNodeIdResolver(source.model as never));

    const scratch = mkdtempSync(join(tmpdir(), 'memo-render-'));
    const page = join(scratch, 'index.html');
    const payload = serializeForInlineScript({ model: source.model, validation: source.validation, completeness: source.completeness });
    writeFileSync(page, readFileSync(sourceHtml, 'utf8').replace('</head>', () => `<script>window.__MEMO_DATA__=${payload};</script>\n</head>`));

    const browser = await launchBrowser();
    try {
        const tab = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
        await tab.goto(pathToFileURL(page).href);
        await tab.waitForFunction(() => typeof (globalThis as unknown as PageHook).__memoRenderDiagram === 'function', undefined, { timeout: 30_000 });
        const used = new Set<string>();
        for (const ref of refs) {
            const result = await tab.evaluate(
                ([wanted, all]) => (globalThis as unknown as PageHook).__memoRenderDiagram(wanted as string, all), [ref, layouts] as const);
            if (!result.ok) { warnings.push(`Diagram ${ref} was not drawn: ${result.reason}`); continue; }
            let stem = fileStem(ref);
            for (let n = 2; used.has(stem); n++) stem = `${fileStem(ref)}-${n}`;
            used.add(stem);
            mkdirSync(outDir, { recursive: true });
            const file = join(outDir, `${stem}.svg`);
            writeFileSync(file, result.svg, 'utf8');
            const png = join(outDir, `${stem}.png`);
            writeFileSync(png, Buffer.from(result.png, 'base64'));
            images[ref] = { file, png };
        }
    } finally {
        await browser.close();
        rmSync(scratch, { recursive: true, force: true });
    }
    return { images, warnings };
};
