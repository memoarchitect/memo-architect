// ─── Version ─────────────────────────────────────────────────────────────────
//
// Which state of the model the pages show: the working model, a release, or an unreleased ref (the
// latest tag, the tip of the current branch), the last labelled "not a release". A release or a ref
// opens as a read-only server of its own and the browser goes there; from a pinned view the way back is
// the working model. Releases are the records the model holds, grouped by the item they release; the
// refs come from the repository through the server. The choice is not remembered: the app opens on
// Working, because remembering it would start a pinned server at launch.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { sendVersionOpen } from '../store/ws-client';
import { releaseRecords, releasesByItem } from '../lib/releases-view';

const WORKING = '__working__';

export function VersionSelector({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
    const light = tone === 'light';
    const model = useModelStore(s => s.model);
    const validation = useModelStore(s => s.validation);
    const pinned = useModelStore(s => s.pinned);
    const refs = useModelStore(s => s.versionRefs);
    const opening = useModelStore(s => s.versionOpening);
    const error = useModelStore(s => s.versionError);
    const groups = useMemo(() => model ? releasesByItem(releaseRecords(model, validation, null)) : [], [model, validation]);

    const choose = (value: string) => {
        if (value === WORKING) {
            if (pinned?.workingUrl) window.location.assign(pinned.workingUrl);
            return;
        }
        if (value.startsWith('release:')) sendVersionOpen({ release: value.slice('release:'.length) });
        else if (value.startsWith('ref:')) sendVersionOpen({ ref: value.slice('ref:'.length) });
    };
    // In a pinned view only the way back is offered: another version is opened from the working one.
    const current = pinned ? `pinned:${pinned.label}` : WORKING;
    return (
        <label
            title={pinned ? 'You are looking at a pinned version, read only. Choose Working to edit.' : 'Show the working model, a release, or an unreleased ref (read only).'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: light ? '#324E67' : 'rgba(255,255,255,0.62)', fontSize: light ? '14px' : '12px' }}
        >
            Version
            <select
                aria-label="Version"
                value={current}
                disabled={opening !== null}
                onChange={event => choose(event.target.value)}
                style={{
                    background: light ? '#fff' : 'rgba(255,255,255,0.06)', color: light ? '#082744' : 'rgba(255,255,255,0.85)',
                    border: light ? '1px solid #D8E2E9' : '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: light ? '5px 8px' : '3px 6px', fontSize: light ? '14px' : '12px', maxWidth: 220,
                }}
            >
                {pinned && <option value={current}>{pinned.label}{pinned.notARelease ? ' (not a release)' : ''}</option>}
                <option value={WORKING}>Working</option>
                {!pinned && groups.filter(group => group.records.length > 0).map(group => (
                    <optgroup key={group.itemId || 'none'} label={group.itemName}>
                        {group.records.map(record => (
                            <option key={record.id} value={`release:${record.id}`}>
                                {record.label}{record.revision ? ` · rev ${record.revision}` : ''}{record.status ? ` · ${record.status}` : ''}
                            </option>
                        ))}
                    </optgroup>
                ))}
                {!pinned && refs.length > 0 && (
                    <optgroup label="Unreleased: can change at any commit">
                        {refs.map(ref => <option key={ref.name} value={`ref:${ref.name}`}>{ref.label} (not a release)</option>)}
                    </optgroup>
                )}
            </select>
            {opening !== null && <span style={{ color: '#2DD4A8' }}>opening…</span>}
            {error && <span role="alert" title={error} style={{ color: '#F59E0B', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</span>}
        </label>
    );
}
