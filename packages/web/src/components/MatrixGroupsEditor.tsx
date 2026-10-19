// The named groups of a DSM: each is a package, a memo-query, or the clusters the
// dependencies form. Rows a group names sit under one line carrying its name.

import type { MatrixGroupDTO } from '@memoarchitect/tools/browser';
import { COLOR, FONT } from '../styles/tokens';

interface Props {
    groups: MatrixGroupDTO[];
    onChange: (groups: MatrixGroupDTO[]) => void;
}

const KINDS: { value: MatrixGroupDTO['groupedBy']; label: string; placeholder?: string }[] = [
    { value: 'owningPackage', label: 'Package', placeholder: 'package qualified name' },
    { value: 'memoQuery', label: 'Query', placeholder: 'kind: LogicalComponent' },
    { value: 'clusterResult', label: 'Cluster result' },
];

const field: React.CSSProperties = {
    padding: '3px 6px', border: `1px solid ${COLOR.border}`, borderRadius: '5px', fontSize: FONT.xs,
    color: COLOR.primary, background: COLOR.surface, minWidth: 0,
};

export function MatrixGroupsEditor({ groups, onChange }: Props) {
    const update = (index: number, patch: Partial<MatrixGroupDTO>) =>
        onChange(groups.map((group, at) => (at === index ? { ...group, ...patch } : group)));
    return (
        <section aria-label="Groups" style={{ display: 'grid', gap: '6px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${COLOR.border}`, background: '#FAFBFC' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 700, color: COLOR.secondary, flex: 1 }}>Groups</span>
                <button
                    type="button" onClick={() => onChange([...groups, { name: `Group ${groups.length + 1}`, groupedBy: 'owningPackage', expression: '' }])}
                    style={{ ...field, cursor: 'pointer', fontWeight: 600 }}
                >+ Add group</button>
            </div>
            {groups.length === 0 && <span style={{ fontSize: '11px', color: COLOR.faint }}>No groups: rows keep the model's own nesting.</span>}
            {groups.map((group, index) => {
                const kind = KINDS.find(entry => entry.value === group.groupedBy)!;
                return (
                    <div key={index} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <input aria-label="Group name" value={group.name} onChange={event => update(index, { name: event.target.value })} style={{ ...field, width: '110px' }} />
                        <select aria-label="Grouped by" value={group.groupedBy} onChange={event => update(index, { groupedBy: event.target.value as MatrixGroupDTO['groupedBy'] })} style={field}>
                            {KINDS.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                        </select>
                        {group.groupedBy !== 'clusterResult' && (
                            <input
                                aria-label="Group expression" value={group.expression ?? ''} placeholder={kind.placeholder}
                                onChange={event => update(index, { expression: event.target.value })} style={{ ...field, flex: 1 }}
                            />
                        )}
                        <button type="button" aria-label={`Remove ${group.name}`} onClick={() => onChange(groups.filter((_, at) => at !== index))} style={{ ...field, cursor: 'pointer', color: '#B91C1C' }}>✕</button>
                    </div>
                );
            })}
        </section>
    );
}
