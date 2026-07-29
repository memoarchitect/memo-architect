// ─── Feature grants (CLI side) ───────────────────────────────────────────────
//
// The CLI grants a *stage*, not a feature list. Which surfaces a stage unlocks
// is decided by the client's registry in
// `packages/web/src/config/feature-flags.ts`, so adding an experimental feature
// never means touching the CLI.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialised into the client HTML as `window.__MEMO_FLAGS__`.
 *
 * The index signature keeps this assignable to the `Record<string, unknown>`
 * the transport carries: Tools forwards grants opaquely and must not need a
 * type update every time a stage is added.
 */
export interface FeatureGrants {
    experimental?: boolean;
    [grant: string]: unknown;
}

export function resolveFeatureGrants(options: { experimental?: boolean }): FeatureGrants {
    return { experimental: options.experimental === true };
}

/** Shared `--experimental` help text, so every subcommand says the same thing. */
export const EXPERIMENTAL_FLAG_DESCRIPTION =
    'Enable experimental surfaces (currently the AI Tools: Model Assistant and SysML Generator). '
    + 'Off by default: generated content is unreviewed and carries no design-control provenance';

/**
 * Splice grants into the client HTML shell.
 *
 * This runs before the bundle so the first paint already knows which surfaces
 * exist; delivering grants over the WebSocket instead would let gated nav
 * render and then disappear. Idempotent — a static viewer built by
 * `memo-architect build` already carries its grants and is left alone.
 *
 * Lives here rather than in Tools: the dev server hosts a client it does not
 * own, so `__MEMO_FLAGS__` is Architect's vocabulary to define.
 */
export function injectFeatureGrants(html: string, grants: FeatureGrants): string {
    if (html.includes('__MEMO_FLAGS__')) return html;
    const tag = `<script>window.__MEMO_FLAGS__=${JSON.stringify(grants)};</script>`;
    return html.includes('</head>') ? html.replace('</head>', `${tag}\n</head>`) : tag + html;
}
