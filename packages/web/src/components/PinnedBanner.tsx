// ─── The banner of a pinned view ─────────────────────────────────────────────

import { useModelStore } from '../store/model-store';

export function PinnedBanner() {
    const pinned = useModelStore(s => s.pinned);
    if (!pinned) return null;
    const commits = (pinned.commits ?? []).map(c => `${c.name} ${c.commit.slice(0, 7)}`).join(' · ');
    return (
        <div
            role="status"
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', fontSize: 12,
                background: pinned.notARelease ? '#7C2D12' : '#1E3A5F', color: '#fff',
            }}
        >
            <strong>{pinned.notARelease ? 'This is not a release.' : 'Pinned release.'}</strong>
            <span>
                {pinned.label}{commits ? ` · ${commits}` : ''} — read only.
                {pinned.ontologyDrift?.length ? ` Built with ${pinned.ontologyDrift.map(d => `${d.name} ${d.used}, not the ${d.locked} it was made with`).join('; ')}.` : ''}
                {pinned.notARelease ? ' Content can change with every commit and may be incomplete.' : ''}
                {' '}Role and workspace changes last for this session only.
            </span>
            <span style={{ flex: 1 }} />
            {pinned.workingUrl && (
                <button
                    onClick={() => window.location.assign(pinned.workingUrl!)}
                    style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}
                >
                    Open the working version
                </button>
            )}
        </div>
    );
}
