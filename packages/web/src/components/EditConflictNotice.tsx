import { useModelStore } from '../store/model-store';
import { sendOpenFile } from '../store/ws-client';

export function EditConflictNotice() {
    const conflict = useModelStore(state => state.editConflict);
    const dismiss = useModelStore(state => state.setEditConflict);
    if (!conflict) return null;

    // A stale address and a changed file are both "reload and repeat", but they
    // are not the same event, and saying the file changed when it did not sends
    // the user looking for an edit nobody made.
    const staleAddress = conflict.reason === 'stale-identity';
    const draft = JSON.stringify(conflict.rejectedDraft, null, 2);
    const download = () => {
        const url = URL.createObjectURL(new Blob([draft], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `rejected-edit-${conflict.rejectedCommandId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <aside role="alert" style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9000,
            maxWidth: 520, padding: 16, borderRadius: 10, border: '1px solid #FCA5A5',
            background: '#FEF2F2', color: '#7F1D1D', boxShadow: '0 12px 30px rgba(0,0,0,.18)' }}>
            <strong>{staleAddress
                ? 'Edit rejected — it targeted an older model revision'
                : 'Edit rejected — file changed externally'}</strong>
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>{conflict.sourceFile}</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>{staleAddress
                ? 'No source was overwritten. The element this edit addressed is not in the current '
                  + 'revision, so applying it could have changed the wrong declaration. Reopen the '
                  + 'element and repeat the edit.'
                : 'No source was overwritten. The disk version was reloaded; edits to other files remain available.'}</div>
            {conflict.detail && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#9F1239' }}>{conflict.detail}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button onClick={() => void navigator.clipboard.writeText(draft)}>Copy draft</button>
                <button onClick={download}>Download rejected edit</button>
                <button onClick={() => sendOpenFile(conflict.sourceFile)}>Reveal file</button>
                <button onClick={() => dismiss(null)}>Dismiss</button>
            </div>
        </aside>
    );
}
