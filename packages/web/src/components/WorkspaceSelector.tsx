// ─── Workspace ───────────────────────────────────────────────────────────────
//
// Which part of the model the pages show: the system of systems, or one system. The choices are
// the workspaces memo-tools found from the links (`workspaceMembership`), never a list kept here.
// Saved for this person only, in the model's git-ignored `memo.user.yaml`, with the role.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { groupWorkspaces, workspaceOptions } from '../lib/workspace-scope';

export function WorkspaceSelector({ tone = 'dark', label = 'Workspace', compact = false }: { tone?: 'dark' | 'light'; label?: string; compact?: boolean }) {
    const light = tone === 'light';
    const membership = useModelStore(s => s.model?.workspaceMembership);
    const workspace = useModelStore(s => s.workspace);
    const setWorkspace = useModelStore(s => s.setWorkspace);
    const options = useMemo(() => workspaceOptions(membership), [membership]);
    const elements = useModelStore(s => s.model?.elements);

    if (options.length === 0) return null;
    const known = options.some(option => option.root === workspace);
    const groups = groupWorkspaces(options, root => elements?.[root]?.attributes?.origin);
    return (
        <label
            title="Show one system, or the system of systems. Saved for you only, in memo.user.yaml (ignored by git)."
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: light ? '#324E67' : 'rgba(255,255,255,0.62)', fontSize: light ? '14px' : '12px' }}
        >
            {label}
            <select
                aria-label={label}
                value={known ? workspace ?? '' : ''}
                onChange={event => setWorkspace(event.target.value || null)}
                style={{
                    background: light ? '#fff' : 'rgba(255,255,255,0.06)', color: light ? '#082744' : 'rgba(255,255,255,0.85)',
                    border: light ? '1px solid #D8E2E9' : '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: light ? '5px 8px' : '3px 6px', fontSize: light && !compact ? '14px' : '12px',
                    ...(compact ? { minWidth: 0, maxWidth: 170 } : {}),
                }}
            >
                <option value="">Whole model</option>
                {groups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                        {group.options.map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                    </optgroup>
                ))}
            </select>
        </label>
    );
}
