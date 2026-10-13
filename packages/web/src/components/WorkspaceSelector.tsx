// ─── Workspace ───────────────────────────────────────────────────────────────
//
// Which part of the model the pages show: the system of systems, or one system. The choices are
// the workspaces memo-tools found from the links (`workspaceMembership`), never a list kept here.
// Saved for this person only, in the model's git-ignored `memo.user.yaml`, with the role.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { workspaceOptions } from '../lib/workspace-scope';

export function WorkspaceSelector() {
    const membership = useModelStore(s => s.model?.workspaceMembership);
    const workspace = useModelStore(s => s.workspace);
    const setWorkspace = useModelStore(s => s.setWorkspace);
    const options = useMemo(() => workspaceOptions(membership), [membership]);

    if (options.length === 0) return null;
    const known = options.some(option => option.root === workspace);
    const sos = options.filter(option => option.scope === 'sos');
    const systems = options.filter(option => option.scope === 'system');
    return (
        <label
            title="Show one system, or the system of systems. Saved for you only, in memo.user.yaml (ignored by git)."
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.62)', fontSize: '12px' }}
        >
            Workspace
            <select
                aria-label="Workspace"
                value={known ? workspace ?? '' : ''}
                onChange={event => setWorkspace(event.target.value || null)}
                style={{
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '3px 6px', fontSize: '12px',
                }}
            >
                <option value="">Whole model</option>
                {sos.length > 0 && (
                    <optgroup label="System of systems">
                        {sos.map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                    </optgroup>
                )}
                {systems.length > 0 && (
                    <optgroup label="Systems">
                        {systems.map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                    </optgroup>
                )}
            </select>
        </label>
    );
}
