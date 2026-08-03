// ─── What renaming actually does ─────────────────────────────────────────────
//
// A name field that silently behaves like a refactoring is worse than one that
// admits it does not. MEMO's write-back edits the declaration it is pointed at
// and nothing else: there is no cross-file name resolution yet — that is the
// linker, and it is scheduled work, not a setting — so a reference to the old
// identifier somewhere else in the project stays as written.
//
// This note says so where the editing happens, rather than leaving the user to
// discover it from a model that stopped resolving.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param identifier The element's SysML identifier, shown so the user can see
 * what a reference to this element actually looks like.
 */
export function RenameScopeNote({ identifier }: { identifier?: string }) {
    return (
        <p
            data-testid="rename-scope-note"
            style={{ fontSize: 11, lineHeight: 1.5, color: '#6B7280', margin: '4px 0 0' }}
        >
            Renaming is a text edit. It changes this declaration
            {identifier ? <> (<code style={{ fontFamily: 'ui-monospace, monospace' }}>{identifier}</code>)</> : null}
            {' '}only — MEMO cannot update references to it elsewhere in the project yet, so any that exist
            keep pointing at the old name until you edit them.
        </p>
    );
}
