// ─── DHF Document Theme ───────────────────────────────────────────────────────
//
// Single source of document styling for every DHF document: the workbench
// preview, HTML/Word export, and the PDF print view all inject this stylesheet.
// Change it here and every document follows — formatting is deliberately kept
// out of the renderer and the components.
//
// The stylesheet is parameterized by DhfSettings (brand color, compact mode)
// and scoped under `.memo-doc` so it can be embedded anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import type { DhfSettings } from '../store/model-store';

export const DOC_ACCENT_COLOR = '#2DD4A8';

export function documentThemeCss(settings: DhfSettings): string {
    const primary = settings.primaryColor || '#1B3A4B';
    const accent = DOC_ACCENT_COLOR;
    const scale = settings.compactMode ? 0.9 : 1;
    const px = (n: number) => `${Math.round(n * scale)}px`;

    return `
.memo-doc{font-size:${px(14)};line-height:1.7;color:#1B3A4B;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.memo-doc h1{font-size:${px(22)};font-weight:700;color:${primary};border-bottom:2px solid ${accent};padding-bottom:8px;margin:0 0 20px}
.memo-doc h2{font-size:${px(17)};font-weight:700;color:${primary};margin:28px 0 12px}
.memo-doc h3{font-size:${px(14)};font-weight:600;color:#374151;margin:20px 0 8px}
.memo-doc h4{font-size:${px(13)};font-weight:600;color:#6B7280;margin:12px 0 6px}
.memo-doc h5,.memo-doc h6{font-size:${px(12)};font-weight:600;color:#6B7280;margin:10px 0 5px}
.memo-doc p{margin:8px 0}
.memo-doc ul,.memo-doc ol{margin:8px 0;padding-left:24px}
.memo-doc li{margin:3px 0}
.memo-doc table{border-collapse:collapse;width:100%;margin:12px 0;font-size:${px(12)}}
.memo-doc th,.memo-doc td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left;vertical-align:top}
.memo-doc th{background:#f3f4f6;font-weight:600}
.memo-doc code{background:#f3f4f6;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:${px(12)}}
.memo-doc pre{background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;overflow-x:auto}
.memo-doc pre code{background:none;color:inherit;padding:0}
.memo-doc blockquote{border-left:3px solid ${accent};margin:12px 0;padding:6px 14px;background:#f0fdf9;font-style:italic;color:#374151}
.memo-doc hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
.memo-doc a{color:${primary};text-decoration:underline}
.memo-doc .directive-placeholder{color:#8B5CF6;font-style:normal;font-size:${px(12)};background:#F5F3FF;padding:1px 5px;border-radius:3px;display:inline-block}
.memo-doc .directive-error{color:#DC2626;font-size:${px(12)};background:#FEF2F2;border:1px solid #FECACA;padding:1px 6px;border-radius:3px;display:inline-block;font-family:monospace}
.memo-doc .query-preview{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:10px 0;font-size:${px(12)}}
.memo-doc .query-preview.empty{color:#9CA3AF}
.memo-doc .query-preview.count{display:flex;align-items:baseline;gap:6px}
.memo-doc .query-preview.count strong{font-size:${px(24)};color:#2563eb;font-weight:700}
.memo-doc .query-preview.count span{font-size:${px(13)};color:#6B7280}
.memo-doc .query-preview.script{color:#7c3aed;font-style:italic}
@media print {
  .memo-doc{font-size:11pt;color:#000}
  .memo-doc .query-preview{border:1px solid #ccc;background:#fff}
  .memo-doc .directive-placeholder,.memo-doc .directive-error{background:#fff;border:1px dashed #999;color:#555}
  .memo-doc h2{break-after:avoid}
  .memo-doc table{break-inside:avoid}
}`;
}
