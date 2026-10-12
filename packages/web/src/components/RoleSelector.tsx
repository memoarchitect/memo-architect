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

export function RoleSelector() {
    const viewpoints = useModelStore(s => s.model?.viewpoints);
    const role = useModelStore(s => s.role);
    const setRole = useModelStore(s => s.setRole);
    const roles = useMemo(() => viewpointRoles(viewpoints ?? []), [viewpoints]);

    if (roles.length === 0 && !role) return null;
    return (
        <label
            title="Show the viewpoints written for this role. Saved for you only, in memo.user.yaml (ignored by git)."
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.62)', fontSize: '12px' }}
        >
            Role
            <select
                aria-label="Role"
                value={role ?? ''}
                onChange={event => setRole(event.target.value || null)}
                style={{
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '3px 6px', fontSize: '12px',
                }}
            >
                <option value="">All roles</option>
                {role && !roles.includes(role) && <option value={role}>{roleLabel(role)} (no viewpoint names it)</option>}
                {roles.map(name => <option key={name} value={name}>{roleLabel(name)}</option>)}
            </select>
        </label>
    );
}
