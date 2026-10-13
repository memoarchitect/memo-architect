// The system navigator (plan A6): the SoS, then a system, then its subsystems and components.
// Opening a row drills into the definition it is typed by; the breadcrumb is the path taken and
// each crumb goes back to that level. The rule for what drilling opens is lib/system-navigator.ts.

import { useEffect, useMemo, useState } from 'react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { childrenOf, navigatorRoots, type NavigatorNode } from '../lib/system-navigator';
import { COLOR, FONT } from '../styles/tokens';

export function SystemNavigator({ model, workspace, onSelect }: {
    model: MemoModelDTO;
    workspace: string | null;
    onSelect: (id: string) => void;
}) {
    const roots = useMemo(() => navigatorRoots(model, workspace), [model, workspace]);
    // The path of nodes opened so far; empty shows the roots.
    const [path, setPath] = useState<NavigatorNode[]>([]);
    useEffect(() => setPath([]), [workspace]);

    if (model.workspaceMembership?.missingSystem || roots.length === 0) {
        return (
            <div className="px-3 py-3" style={{ color: '#92400E', background: '#FFFBEB', fontSize: FONT.xs }}>
                This model declares no System, so there is nothing to navigate from (rule CR-ONT-084).
                Declare a part def that specializes System.
            </div>
        );
    }

    const current = path.at(-1);
    const rows = current ? childrenOf(model, current.id) : roots;

    return (
        <div className="flex-1 overflow-y-auto" style={{ fontSize: FONT.explorer.item }}>
            <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 px-3 py-2" style={{ borderBottom: `1px solid ${COLOR.border}`, fontSize: FONT.xs }}>
                <button onClick={() => setPath([])} style={{ color: COLOR.accent }}>Systems</button>
                {path.map((node, index) => (
                    <span key={`${node.id}:${index}`} className="flex items-center gap-1">
                        <span style={{ color: COLOR.muted }}>/</span>
                        <button
                            onClick={() => setPath(path.slice(0, index + 1))}
                            style={{ color: index === path.length - 1 ? COLOR.primary : COLOR.accent, fontWeight: index === path.length - 1 ? 600 : 400 }}
                        >{node.name}</button>
                    </span>
                ))}
            </nav>
            {current && (
                <div className="px-3 py-1.5" style={{ color: COLOR.secondary, fontSize: FONT.xs }}>
                    <button onClick={() => onSelect(current.id)} style={{ color: COLOR.accent }}>Open {current.name}</button>
                </div>
            )}
            {rows.length === 0 && <div className="px-3 py-2" style={{ color: COLOR.muted }}>No parts: this is a leaf.</div>}
            {rows.map(node => (
                <div key={node.id} className="flex items-center gap-2 px-3 py-1 cursor-pointer" onClick={() => onSelect(node.id)}>
                    <span className="flex-1 truncate">{node.name}</span>
                    <span style={{ color: COLOR.muted, fontSize: FONT.xs }}>{node.kind}</span>
                    {node.hasChildren
                        ? <button aria-label={`Open ${node.name}`} onClick={e => { e.stopPropagation(); setPath([...path, node]); }} style={{ color: COLOR.accent }}>›</button>
                        : <span style={{ width: 8 }} />}
                </div>
            ))}
        </div>
    );
}
