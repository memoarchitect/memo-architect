// ─── StaleSceneNotice ─────────────────────────────────────────────────────────
//
// Non-blocking strip shown while the project source does not parse.
//
// The compiler reports errors; it does not prevent work. The server withholds
// the degraded model in this state, so the canvas behind this notice is the
// last one that compiled — still readable, still navigable. This says so, and
// names what is broken, so stale content is never presented as current.
//
// Deliberately not a modal: unlike RestartRequiredBanner, nothing here needs
// the user to stop. Fixing the file clears it.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from '../store/model-store';

const MAX_LISTED = 4;

export function StaleSceneNotice() {
    const sourceCoherence = useModelStore(s => s.sourceCoherence);
    if (!sourceCoherence) return null;

    const { files, diagnostics, lastGoodRevision } = sourceCoherence;
    const shown = diagnostics.slice(0, MAX_LISTED);
    const overflow = diagnostics.length - shown.length;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 9000, maxWidth: 620, width: 'calc(100% - 32px)',
                background: '#1E293B', border: '1px solid #F59E0B', borderRadius: 10,
                padding: '12px 16px', color: '#F8FAFC',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            }}
        >
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FBBF24', marginBottom: 4 }}>
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
    );
}
