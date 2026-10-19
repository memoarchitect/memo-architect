// Which system, or system of systems, a matrix is about. The choices are the
// workspaces memo-tools found (`workspaceMembership`), never a list kept here.
// A matrix tied to one runs its queries in that workspace and shows its model.

import { useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { groupWorkspaces, workspaceOptions } from '../lib/workspace-scope';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    value: string | undefined;
    onChange: (system: string | undefined) => void;
    disabled?: boolean;
    /** What "no system" means where this is shown. */
    noneLabel?: string;
}

/** The workspaces on offer, or none when the model has no systems. */
export function useSystemOptions() {
    const membership = useModelStore(s => s.model?.workspaceMembership);
    return useMemo(() => workspaceOptions(membership), [membership]);
}

export function MatrixSystemSelect({ value, onChange, disabled, noneLabel = 'Whole model' }: Props) {
    const options = useSystemOptions();
    const elements = useModelStore(s => s.model?.elements);
    const groups = useMemo(
        () => groupWorkspaces(options, root => elements?.[root]?.attributes?.origin),
        [options, elements],
    );
    if (options.length === 0) return null;
    return (
        <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>System</span>
            <select
                aria-label="System" value={options.some(option => option.root === value) ? value : ''} disabled={disabled}
                onChange={event => onChange(event.target.value || undefined)}
                style={{ padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary, background: COLOR.surface, width: '100%', boxSizing: 'border-box' }}
            >
                <option value="">{noneLabel}</option>
                {groups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                        {group.options.map(option => <option key={option.root} value={option.root}>{option.name}</option>)}
                    </optgroup>
                ))}
            </select>
        </label>
    );
}
