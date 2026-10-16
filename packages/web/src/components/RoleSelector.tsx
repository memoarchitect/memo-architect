// ─── Role ────────────────────────────────────────────────────────────────────
//
// Who this person is working as. The roles are the stakeholders the model's
// viewpoints are written for, read from the viewpoints, never a list kept
// here. The choice narrows the viewpoints the views lists show
// (`viewpointsVisibleToRole`) and is saved for this person only, in the model's
// git-ignored `memo.user.yaml`.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { viewpointRoles } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { roleLabel } from '../lib/role-viewpoints';

export function RoleSelector({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
    const light = tone === 'light';
    const viewpoints = useModelStore(s => s.model?.viewpoints);
    const role = useModelStore(s => s.role);
    const setRole = useModelStore(s => s.setRole);
    const roles = useMemo(() => viewpointRoles(viewpoints ?? []), [viewpoints]);

    if (roles.length === 0 && !role) return null;
    return (
        <label
            title="Show the viewpoints written for this role. Saved for you only, in memo.user.yaml (ignored by git)."
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: light ? '#324E67' : 'rgba(255,255,255,0.62)', fontSize: light ? '14px' : '12px' }}
        >
            Role
            <select
                aria-label="Role"
                value={role ?? ''}
                onChange={event => setRole(event.target.value || null)}
                style={{
                    background: light ? '#fff' : 'rgba(255,255,255,0.06)', color: light ? '#082744' : 'rgba(255,255,255,0.85)',
                    border: light ? '1px solid #D8E2E9' : '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: light ? '5px 8px' : '3px 6px', fontSize: light ? '14px' : '12px',
                }}
            >
                <option value="">All roles</option>
                {role && !roles.includes(role) && <option value={role}>{roleLabel(role)} (no viewpoint names it)</option>}
                {roles.map(name => <option key={name} value={name}>{roleLabel(name)}</option>)}
            </select>
        </label>
    );
}
