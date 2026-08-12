// ─── Standalone (single-file) client build ───────────────────────────────────
//
// Produces `dist-standalone/index.html` and nothing else: one HTML file that a
// user can double-click, mail, or drop on a share, with no server involved.
//
// The ordinary build cannot be opened that way, and two independent things stop
// it. Its asset URLs are absolute (`/assets/…`), which under `file://` means the
// root of the disk. And even with the paths fixed, a `file://` page has a null
// origin, so every `import` in a module graph is a cross-origin fetch that
// Chrome refuses. Only a build with nothing left to fetch survives, which is
// what the overrides below are for:
//
//   inlineDynamicImports  collapses the 47 route chunks into one, so the lazy
//                         `import()` calls resolve inside the bundle
//   manualChunks: none    required — vendor splitting contradicts the above
//   cssCodeSplit: false   one stylesheet instead of per-chunk ones
//   assetsInlineLimit     every font and image becomes a data: URI
//
// Then `singleFileHtml` folds the emitted JS and CSS into the HTML and drops
// everything else from the bundle.
//
// The cost is honest and worth stating: nothing is lazy any more, so the whole
// application parses at open. Prefer the ordinary build when a server exists.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import base from './vite.config';

/** Files in `public/`, which Vite copies verbatim and never inlines. */
const PUBLIC_ASSETS = ['favicon.svg', 'logo.png', 'memo-top.png'] as const;

const MIME: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

function dataUri(name: string): string {
    const path = fileURLToPath(new URL(`./public/${name}`, import.meta.url));
    const mime = MIME[name.slice(name.lastIndexOf('.'))] ?? 'application/octet-stream';
    return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
}

/**
 * Fold the bundle into `index.html`.
 *
 * Runs in `generateBundle` rather than `transformIndexHtml` because it needs
 * the emitted chunk *contents*, and it deletes what it inlines so the output
 * directory holds a single file.
 *
 * Public assets are handled by string substitution over the finished bundle.
 * That is blunt, but the alternative is worse: `/logo.png` is written as an
 * absolute URL in a dozen components, and rewriting each occurrence to a data:
 * URI would paste the same 700 KB image into the bundle a dozen times. One
 * `const` per asset, substituted for the literal, keeps exactly one copy.
 */
function singleFileHtml(): Plugin {
    return {
        name: 'memo-single-file-html',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const assetConsts: string[] = [];
            const substitutions: Array<[RegExp, string]> = [];
            PUBLIC_ASSETS.forEach((name, index) => {
                const identifier = `__memoAsset${index}`;
                assetConsts.push(`const ${identifier}=${JSON.stringify(dataUri(name))};`);
                substitutions.push([new RegExp(`"/${name.replace('.', '\\.')}"`, 'g'), identifier]);
            });

            let js = '';
            let css = '';
            let html = '';
            for (const [fileName, output] of Object.entries(bundle)) {
                if (output.type === 'chunk' && output.isEntry) js = output.code;
                else if (fileName.endsWith('.css') && output.type === 'asset') css = String(output.source);
                else if (fileName === 'index.html' && output.type === 'asset') html = String(output.source);
                if (fileName !== 'index.html') delete bundle[fileName];
            }
            if (!js) this.error('Standalone build produced no entry chunk to inline.');

            for (const [pattern, identifier] of substitutions) js = js.replace(pattern, identifier);

            // `__VITE_PRELOAD__` is the dependency list Vite substitutes into
            // each `__vitePreload` call, and it does that in a `generateBundle`
            // hook that runs after this one — so the token is still a bare
            // identifier here and the module throws a ReferenceError on load.
            // With dynamic imports inlined there is no chunk to preload, and
            // `__vitePreload` treats an undefined dependency list as "none".
            js = js.replace(/__VITE_PRELOAD__/g, 'void 0');

            html = html
                // Emitted references to the files just inlined.
                .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/g, '')
                .replace(/<link[^>]+rel="stylesheet"[^>]+>/g, '')
                .replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '')
                // The favicon and the web font are the last two network reads in
                // the document: one becomes a data: URI, the other cannot (a
                // font must be fetched), and a standalone file must not depend
                // on being online. Nunito is a brand nicety; the CSS already
                // names fallbacks.
                .replace(/<link[^>]+rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${dataUri('favicon.svg')}">`)
                .replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '')
                // Replacer functions, not replacement strings: `$&` and `` $` ``
                // occur in minified JS and in CSS, and as a replacement string
                // those are substitution patterns that would splice the
                // surrounding document into the code and break it.
                .replace('</head>', () => `<style>${css}</style>\n</head>`)
                .replace('</body>', () => `<script type="module">${assetConsts.join('')}${js}</script>\n</body>`);

            (bundle['index.html'] as { source: string }).source = html;
        },
    };
}

export default defineConfig({
    ...base,
    // `public/` is inlined by hand above; copying it as well would leave files
    // beside a distribution whose whole point is that there are none.
    publicDir: false,
    plugins: [...(Array.isArray(base.plugins) ? base.plugins : []), singleFileHtml()],
    resolve: {
        ...base.resolve,
        alias: {
            ...(base.resolve?.alias as Record<string, string>),
            // Removes the one asset a single file cannot carry: an ELK layout
            // worker, emitted from a `new URL(…, import.meta.url)` that survives
            // dead-code elimination.
            './elk-worker-factory': fileURLToPath(
                new URL('./src/diagram/providers/elk-worker-factory.standalone.ts', import.meta.url),
            ),
        },
    },
    build: {
        ...base.build,
        outDir: '../../dist-standalone',
        emptyOutDir: true,
        cssCodeSplit: false,
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        modulePreload: { polyfill: false },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
                manualChunks: undefined,
            },
        },
    },
});
