// ─── Where a definition is used ───────────────────────────────────────────────
//
// On the profile of an item, port or interface definition: who produces and consumes it and what carries it, each
// a tab, a tab with nothing in it left out, and the chosen tab in the URL so it can be linked to. The attributes
// above are its contract. `whereUsed` (memo-tools) does the reading.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { relationshipsOfType, whereUsed, type DefinitionVersion, type MemoElement, type UsedElement, type UsedLink } from '@memoarchitect/tools/browser';
import { requestDefinitionHistory } from '../../store/ws-client';
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

const VERSION_STATUS: Record<DefinitionVersion['status'], string> = {
    added: 'First appears', changed: 'Changed', unchanged: 'No change', removed: 'Removed', absent: 'Not present', unavailable: 'Could not be built',
};

/** Read when the tab is opened: it builds each release that has not been built yet. */
function Versions({ elementId }: { elementId: string }) {
    const [state, setState] = useState<{ versions?: DefinitionVersion[]; error?: string }>({});
    useEffect(() => {
        let current = true;
        setState({});
        requestDefinitionHistory(elementId).then(
            result => { if (current) setState(result.error ? { error: result.error } : { versions: result.versions ?? [] }); },
            error => { if (current) setState({ error: error instanceof Error ? error.message : String(error) }); },
        );
        return () => { current = false; };
    }, [elementId]);
    if (state.error) return <p role="alert" style={{ margin: 0, color: '#B91C1C' }}>{state.error}</p>;
    if (!state.versions) return <p role="status" style={{ margin: 0, color: COLOR.muted }}>Reading the releases… the first time, each one is built.</p>;
    return (
        <ul data-testid="definition-versions" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {state.versions.map(version => (
                <li key={`${version.label}-${version.commit}`} style={{ padding: '3px 0' }}>
                    <b>{version.label}</b>
                    {version.commit && <code style={{ marginLeft: 6, fontSize: FONT.xs, color: COLOR.muted }}>{version.commit.slice(0, 8)}</code>}
                    <span style={{ marginLeft: 8, color: COLOR.muted }}>{VERSION_STATUS[version.status]}</span>
                    {version.changes.length > 0 && <ul style={{ margin: '2px 0 0 14px', padding: 0, fontSize: FONT.xs, color: COLOR.secondary }}>{version.changes.map(change => <li key={change}>{change}</li>)}</ul>}
                </li>
            ))}
        </ul>
    );
}

export function ElementUsage({ element }: { element: MemoElement }) {
    const model = useModelStore(s => s.model);
    const [params, setParams] = useSearchParams();
    const used = useMemo(() => (model ? whereUsed(model, element.id) : null), [model, element.id]);
    if (!used) return null;
    const hasReleases = Boolean(model && relationshipsOfType(model, 'releaseOf').length > 0);
    const tabs = [
        { id: 'producers', label: 'Producers', count: used.producers.length, body: <Elements rows={used.producers} /> },
        { id: 'consumers', label: 'Consumers', count: used.consumers.length, body: <Elements rows={used.consumers} /> },
        { id: 'flows', label: 'Flows', count: used.flows.length, body: <Links rows={used.flows} /> },
        { id: 'interfaces', label: 'Interfaces', count: used.interfaces.length, body: <Links rows={used.interfaces} /> },
        { id: 'ports', label: 'Ports', count: used.ports.length, body: <Elements rows={used.ports.map(port => ({ ...port, name: `${port.owner.name}.${port.name}` }))} /> },
        { id: 'behaviours', label: 'Behaviours', count: used.behaviours.length, body: <Elements rows={used.behaviours} /> },
        ...(hasReleases ? [{ id: 'versions', label: 'Versions', count: 1, plain: true, body: <Versions elementId={element.id} /> }] : []),
    ].filter(tab => tab.count > 0) as { id: string; label: string; count: number; plain?: boolean; body: ReactNode }[];
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
                    >{tab.plain ? tab.label : `${tab.label} (${tab.count})`}</button>
                ))}
            </div>
            <div role="tabpanel" style={{ fontSize: FONT.sm }}>{active.body}</div>
        </ProfileSection>
    );
}
