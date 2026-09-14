// ─── MemoMarkdownView ────────────────────────────────────────────────────────
//
// Mounts rendered MEMO markdown (dhf/document-renderer.ts) and fills each embed
// marker with live content: a read-only diagram canvas or a dashboard widget.
// Shared by dashboards and the DHF preview so the two can never disagree about
// what a page contains.
//
// An in-app link written in markdown — `[Traceability](/traceability)` — moves
// through the router instead of reloading the page, so a quick-action list can
// be plain editable text rather than a widget.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useMemo, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { EMBED_MARKER_RE, parseEmbedSpec } from '../../dhf/document-renderer';
import { LiveDiagramEmbed } from './LiveDiagramEmbed';

export type WidgetRegistry = Record<string, () => ReactNode>;

export function MemoMarkdownView({ html, model, widgets = {}, className }: {
    html: string;
    model: MemoModelDTO | null;
    widgets?: WidgetRegistry;
    className?: string;
}) {
    const navigate = useNavigate();
    const followInAppLink = (event: MouseEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = (event.target as HTMLElement).closest('a');
        const href = anchor?.getAttribute('href');
        // Only root-relative paths: an absolute URL or a #fragment keeps the
        // browser's own behaviour, and `//host` is not a path.
        if (!href || !href.startsWith('/') || href.startsWith('//')) return;
        event.preventDefault();
        navigate(href);
    };

    // split() with one capture group alternates [html, spec, html, spec, …]
    const segments = useMemo(() => html.split(new RegExp(EMBED_MARKER_RE, 'g')), [html]);

    return (
        <div className={className} onClick={followInAppLink}>
            {segments.map((segment, i) => {
                if (i % 2 === 0) {
                    return segment.trim()
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: renderer output, escaped at the directive layer
                        ? <div key={i} dangerouslySetInnerHTML={{ __html: segment }} />
                        : <Fragment key={i} />;
                }
                const spec = parseEmbedSpec(segment);
                if (spec?.kind === 'diagram') {
                    return <LiveDiagramEmbed key={i} diagramRef={spec.ref} model={model} options={spec.options} />;
                }
                if (spec?.kind === 'widget') {
                    const render = widgets[spec.ref];
                    return render
                        ? <Fragment key={i}>{render()}</Fragment>
                        : <span key={i} className="directive-placeholder">[Unknown widget: {spec.ref}{Object.keys(widgets).length ? ` — available: ${Object.keys(widgets).join(', ')}` : ''}]</span>;
                }
                return <Fragment key={i} />;
            })}
        </div>
    );
}
