import type { ReactNode } from 'react';
import type { DisciplineMode } from '../lib/discipline-guides';
import { indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { PathwayPartCreate } from './PathwayPartCreate';
import { PathwayRelationship } from './PathwayRelationship';
import './pathway-workbench.css';

const PART_KINDS = ['SoftwareSystem', 'SoftwareModule', 'SoftwareComponent', 'HardwareAssembly', 'HardwareComponent', 'MechanicalPart', 'Enclosure', 'RosNode'];

export function ImplementationLinks({ model, workspace, implementationKinds, logical, artifactId, canWrite, onSelect, onPeer, deploymentLinks, discipline = 'all' }: {
    model: MemoModelDTO; workspace: string | null; implementationKinds: readonly string[]; logical: boolean;
    artifactId?: string; canWrite: boolean; onSelect: (id: string) => void; onPeer?: (id: string) => void; deploymentLinks?: (selected: MemoElement) => ReactNode; discipline?: DisciplineMode;
}) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const memberships = model.workspaceMembership?.membership;
    const isInScope = (element: MemoElement) => !workspace || memberships?.[element.id]?.includes(workspace);
    const elements = Object.values(model.elements).filter(element => !element.isDefinition && element.construct === 'part');
    const components = elements.filter(element => isInScope(element) && memberships?.[element.id]?.length
        && kindConformsTo(element.kind, 'LogicalComponent', registry));
    const isImplementation = (element: MemoElement) => implementationKinds.some(kind => kindConformsTo(element.kind, kind, registry));
    const implementations = elements.filter(element => isImplementation(element)
        && (isInScope(element) || !memberships?.[element.id]?.length));
    const items = logical ? components : implementations;
    const selected = items.find(item => item.id === artifactId);
    const inDiscipline = (kind: string) => {
        if (discipline === 'all') return true;
        const mechanical = kindConformsTo(kind, 'MechanicalPart', registry);
        if (discipline === 'mechanical') return mechanical;
        if (discipline === 'software') return kindConformsTo(kind, 'SoftwareElement', registry);
        return !mechanical && kindConformsTo(kind, 'PhysicalElement', registry);
    };
    const displayed = items.filter(item => item === selected || inDiscipline(item.kind));
    return <section className="pathway-workspace" aria-label={logical ? 'Implementation links' : 'Implementation items'} style={{ padding: 20 }}>
        <h2>{logical ? 'Implementation links' : 'Software and hardware'}</h2>
        {!logical && <label>Implementation item{' '}
            <select value={selected?.id ?? ''} onChange={event => onSelect(event.target.value)}>
                <option value="" disabled>{displayed.length ? 'Choose an implementation item…' : 'No implementation items in this mode and scope'}</option>
                {displayed.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
        </label>}
        {!logical && canWrite && <PathwayPartCreate model={model} partKinds={PART_KINDS.filter(kind => inDiscipline(kind) && implementationKinds.some(base => kindConformsTo(kind, base, registry)))}
            addLabel={discipline === 'all' ? 'Add software or hardware' : `Add ${discipline} item`} saveLabel="Save implementation item" onCreated={onSelect} />}
        {selected && <>
            {!logical && <h3>{selected.name}</h3>}
            <PathwayRelationship model={model} selected={selected} canWrite={canWrite} type="realizedBy"
                direction={logical ? 'outgoing' : 'incoming'} heading={logical ? 'Realized by' : 'Logical components realized'}
                peerLabel={logical ? 'Implementation target' : 'Logical component'}
                linkLabel={logical ? 'Link implementation target' : 'Link logical component'}
                peerAllowed={item => (logical ? implementations : components).some(peer => peer.id === item.id)}
                onPeer={onPeer} canOpenPeer={item => logical ? isImplementation(item) : !!memberships?.[item.id]?.length} />
            {!logical && deploymentLinks?.(selected)}
            <details><summary>Source</summary><code>{selected.file}</code></details>
        </>}
    </section>;
}
