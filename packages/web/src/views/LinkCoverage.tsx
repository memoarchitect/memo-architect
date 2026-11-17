import { useState, type ReactNode } from 'react';
import type { MemoElement } from '@memoarchitect/tools/browser';
import type { pathwayRelationship } from '../lib/pathway-relationship';

export interface LinkCoverageRow {
    key: string;
    item: MemoElement;
    relationship: string;
    coverage: ReturnType<typeof pathwayRelationship>;
    /** Shown in place of the coverage status when the item is covered another way, such as through a flow. */
    indirect?: { status: string; related: ReactNode };
    /** Why the item needs attention apart from its links, shown under its name. */
    note?: string;
}

/** One review table for every layer: the item, the relationship it is checked for, its status and its related items. */
export function LinkCoverageTable({ label, rows, empty, onSelect }: {
    label: string; rows: LinkCoverageRow[]; empty: string; onSelect: (id: string) => void;
}) {
    const [includeLinked, setIncludeLinked] = useState(false);
    const shown = rows.filter(row => includeLinked || row.note || row.coverage.status !== 'Linked' && !row.indirect);
    return <section className="pathway-related" aria-label="Link coverage">
        <label><input type="checkbox" checked={includeLinked} onChange={event => setIncludeLinked(event.target.checked)} /> Show linked items</label>
        {shown.length > 0 ? <div className="pathway-operational-table"><table aria-label={label}>
            <thead><tr><th scope="col">Item</th><th scope="col">Relationship</th><th scope="col">Status</th><th scope="col">Related items</th></tr></thead>
            <tbody>{shown.map(({ key, item, relationship, coverage, indirect, note }) => <tr key={key}>
                <td><button type="button" className="pathway-resource" onClick={() => onSelect(item.id)}>{item.name}</button>{note && <small style={{ display: 'block' }}>{note}</small>}</td>
                <td>{relationship}</td><td>{coverage.status === 'Linked' || !indirect ? coverage.status : indirect.status}</td>
                <td>{coverage.linked.length ? coverage.linked.map(peer => peer.name).join(', ')
                    : indirect ? indirect.related : coverage.peers.length ? `${coverage.peers.length} available` : '—'}</td>
            </tr>)}</tbody>
        </table></div> : <p>{empty}</p>}
    </section>;
}
