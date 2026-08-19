// ─── StaleSceneNotice ─────────────────────────────────────────────────────────
//
// Collapsed indicator shown while the project source does not parse.
//
// The compiler reports errors; it does not prevent work. The server withholds
// the degraded model in this state, so the canvas behind this is the last one
// that compiled — still readable, still navigable.
//
// It is a BADGE, not a panel. Dumping the diagnostics inline put a wall of
// monospace file:line:column over the diagram the user was trying to read, and
// covered the thing they needed in order to fix it. The badge says one thing —
// something did not compile, and how much — and the detail is one click away
// for whoever wants it.
//
// Deliberately not a modal: unlike RestartRequiredBanner, nothing here needs
// the user to stop. Fixing the file clears it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../store/model-store';

const MAX_LISTED = 20;

export function StaleSceneNotice() {
    const sourceCoherence = useModelStore(s => s.sourceCoherence);
    const [expanded, setExpanded] = useState(false);
    if (!sourceCoherence) return null;

    const { files, diagnostics, lastGoodRevision } = sourceCoherence;
    const shown = diagnostics.slice(0, MAX_LISTED);
    const overflow = diagnostics.length - shown.length;
    const count = diagnostics.length || files.length;

    const label = `${count} source ${count === 1 ? 'error' : 'errors'} — showing the last model that compiled`;

    return (
        <div
            style={{
                // Bottom-centre: the minimap owns bottom-left and the zoom
                // stack owns bottom-right, so this is the one free corner.
                position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 9000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}
        >
            {expanded && (
                <div
                    style={{
                        maxWidth: 620, width: 'calc(100vw - 32px)', maxHeight: '40vh', overflowY: 'auto',
                        background: '#1E293B', border: '1px solid #EF4444', borderRadius: 10,
                        padding: '12px 16px', color: '#F8FAFC',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                    }}
                >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FCA5A5', marginBottom: 4 }}>
                        {lastGoodRevision > 0
                            ? `Showing the last model that compiled (revision ${lastGoodRevision})`
                            : 'Showing everything that parsed'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginBottom: shown.length ? 8 : 0 }}>
                        {files.length === 1 ? files[0] : `${files.length} files`} did not parse.
                        Edits are held until the source compiles again — no restart needed.
                    </div>
                    {shown.map((diagnostic, i) => (
                        <div
                            key={`${diagnostic.file}:${diagnostic.line ?? 0}:${i}`}
                            style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace', lineHeight: 1.5 }}
                        >
                            {diagnostic.file}
                            {diagnostic.line !== undefined ? `:${diagnostic.line}` : ''}
                            {diagnostic.column !== undefined ? `:${diagnostic.column}` : ''}
                            {' — '}
                            {diagnostic.message}
                        </div>
                    ))}
                    {overflow > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4 }}>
                            and {overflow} more
                        </div>
                    )}
                </div>
            )}

            {/* The badge itself. `aria-live` sits here rather than on the panel
                so a screen reader is told once that compilation broke, whether
                or not the detail happens to be open. */}
            <button
                type="button"
                role="status"
                aria-live="polite"
                aria-expanded={expanded}
                aria-label={label}
                title={label}
                onClick={() => setExpanded(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: 999,
                    padding: '6px 12px', color: '#FEE2E2', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 600,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="#FCA5A5" strokeWidth="2" />
                    <path d="M12 7v6" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16.5" r="1.1" fill="#FCA5A5" />
                </svg>
                {count}
            </button>
        </div>
    );
}
