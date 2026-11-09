// ─── Where a definition is used ───────────────────────────────────────────────
//
// On the profile of an item, port or interface definition: who produces and consumes it and what carries it, each
// a tab, a tab with nothing in it left out, and the chosen tab in the URL so it can be linked to. The attributes
// above are its contract. `whereUsed` (memo-tools) does the reading.

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { whereUsed, type MemoElement, type UsedElement, type UsedLink } from '@memoarchitect/tools/browser';
import { useModelStore } from '../../store/model-store';
import { COLOR, FONT } from '../../styles/tokens';
import { ProfileSection } from './ProfileValue';

const TAB_PARAM = 'usage';

function ElementLink({ element }: { element: UsedElement }) {
    const selectElement = useModelStore(s => s.selectElement);
    return (
        <button
            type="button" onClick={() => selectElement(element.id)} title={element.id}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: COLOR.accent, fontSize: FONT.sm }}
        >{element.name}</button>
    );
}

const Elements = ({ rows }: { rows: UsedElement[] }) => (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
        {rows.map(row => <li key={row.id}><ElementLink element={row} /> <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>{row.kind}</span></li>)}
    </ul>
);

const Links = ({ rows }: { rows: UsedLink[] }) => (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
        {rows.map(row => (
            <li key={row.id}>
                <ElementLink element={row.source} /> → <ElementLink element={row.target} />
                <span style={{ color: COLOR.faint, fontSize: FONT.xs }}> {[row.item, row.kind].filter(Boolean).join(', ')}</span>
            </li>
        ))}
    </ul>
);

export function ElementUsage({ element }: { element: MemoElement }) {
    const model = useModelStore(s => s.model);
    const [params, setParams] = useSearchParams();
    const used = useMemo(() => (model ? whereUsed(model, element.id) : null), [model, element.id]);
    if (!used) return null;
    const tabs = [
        { id: 'producers', label: 'Producers', count: used.producers.length, body: <Elements rows={used.producers} /> },
        { id: 'consumers', label: 'Consumers', count: used.consumers.length, body: <Elements rows={used.consumers} /> },
        { id: 'flows', label: 'Flows', count: used.flows.length, body: <Links rows={used.flows} /> },
        { id: 'interfaces', label: 'Interfaces', count: used.interfaces.length, body: <Links rows={used.interfaces} /> },
        { id: 'ports', label: 'Ports', count: used.ports.length, body: <Elements rows={used.ports.map(port => ({ ...port, name: `${port.owner.name}.${port.name}` }))} /> },
        { id: 'behaviours', label: 'Behaviours', count: used.behaviours.length, body: <Elements rows={used.behaviours} /> },
    ].filter(tab => tab.count > 0);
    if (tabs.length === 0) return null;
    const active = tabs.find(tab => tab.id === params.get(TAB_PARAM)) ?? tabs[0];
    const choose = (id: string) => setParams(current => {
        const next = new URLSearchParams(current);
        if (id === tabs[0].id) next.delete(TAB_PARAM); else next.set(TAB_PARAM, id);
        return next;
    }, { replace: true });
    return (
        <ProfileSection title="Where used" density="page">
            <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id} type="button" role="tab" aria-selected={tab.id === active.id} onClick={() => choose(tab.id)}
                        style={{
                            padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: FONT.xs, fontWeight: 600,
                            border: `1px solid ${COLOR.border}`,
                            background: tab.id === active.id ? COLOR.surfaceAlt : 'transparent',
                            color: tab.id === active.id ? COLOR.primary : COLOR.muted,
                        }}
                    >{tab.label} ({tab.count})</button>
                ))}
            </div>
            <div role="tabpanel" style={{ fontSize: FONT.sm }}>{active.body}</div>
        </ProfileSection>
    );
}
