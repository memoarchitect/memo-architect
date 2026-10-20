// Filter the Model Explorer by system: a list of checkboxes, searchable, grouped by who builds each system,
// the way "Filter element types" is. Choosing none shows everything. The systems are the workspaces the
// model has (`workspaceMembership`), with Unassigned for what no system holds.

import { useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { groupWorkspaces, workspaceOptions } from '../lib/workspace-scope';
import { COLOR, FONT } from '../styles/tokens';

export const UNASSIGNED_SYSTEM = 'unassigned';

export function ExplorerSystemFilter() {
    const model = useModelStore(s => s.model);
    const selected = useModelStore(s => s.explorerSystems);
    const setSelected = useModelStore(s => s.setExplorerSystems);
    const [search, setSearch] = useState('');
    const membership = model?.workspaceMembership;
    const options = useMemo(() => workspaceOptions(membership), [membership]);
    const counts = useMemo(() => {
        const byRoot = new Map<string, number>();
        for (const roots of Object.values(membership?.membership ?? {})) for (const root of roots) byRoot.set(root, (byRoot.get(root) ?? 0) + 1);
        byRoot.set(UNASSIGNED_SYSTEM, membership?.unassigned.length ?? 0);
        return byRoot;
    }, [membership]);
    const groups = useMemo(() => {
        const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matching = options.filter(option => words.every(word => option.name.toLowerCase().includes(word)));
        return groupWorkspaces(matching, root => model?.elements[root]?.attributes?.origin);
    }, [options, search, model?.elements]);
    if (options.length === 0) return null;

    const all = [...options.map(option => option.root), UNASSIGNED_SYSTEM];
    const chosen = new Set(selected);
    // With nothing chosen everything shows, so the first system clicked is the one to look at, not one to leave out.
    const toggle = (root: string) => {
        if (chosen.size === 0) { setSelected([root]); return; }
        const next = new Set(chosen);
        if (next.has(root)) next.delete(root); else next.add(root);
        setSelected(next.size === all.length ? [] : [...next]);
    };
    const row = (root: string, name: string) => (
        <label key={root} className="flex items-center gap-1 py-0.5">
            <input type="checkbox" checked={chosen.has(root)} onChange={() => toggle(root)} />
            <span className="flex-1 truncate">{name}</span>
            <span style={{ color: COLOR.faint }}>{counts.get(root) ?? 0}</span>
        </label>
    );
    const showUnassigned = !search.trim() || 'unassigned'.includes(search.trim().toLowerCase());

    return (
        <details className="px-3 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${COLOR.border}`, fontSize: FONT.xs }}>
            <summary style={{ cursor: 'pointer', color: COLOR.secondary }}>Filter systems{chosen.size ? ` (${chosen.size})` : ''}</summary>
            <div className="mt-1">
                <input
                    type="text" value={search} onChange={event => setSearch(event.target.value)} aria-label="Find a system"
                    placeholder="Find a system…" className="w-full px-2 py-1 rounded mb-1" style={{ border: `1px solid ${COLOR.border}`, fontSize: FONT.xs }}
                />
                <button onClick={() => setSelected([])} style={{ color: COLOR.accent, fontSize: FONT.xs }}>Show all</button>
                <div className="max-h-40 overflow-y-auto">
                    {groups.map(group => (
                        <div key={group.label}>
                            <div style={{ color: COLOR.muted, fontWeight: 600, margin: '4px 0 1px' }}>{group.label}</div>
                            {group.options.map(option => row(option.root, option.name))}
                        </div>
                    ))}
                    {showUnassigned && (
                        <div>
                            <div style={{ color: COLOR.muted, fontWeight: 600, margin: '4px 0 1px' }}>Held by no system</div>
                            {row(UNASSIGNED_SYSTEM, 'Unassigned')}
                        </div>
                    )}
                </div>
            </div>
        </details>
    );
}
