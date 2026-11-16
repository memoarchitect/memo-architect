import { indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { PathwayAllocation } from './PathwayAllocation';
import { PathwayPartCreate } from './PathwayPartCreate';

const MODULE = 'SoftwareModule';
const UNIT = 'SoftwareDeploymentUnit';

function isDeploymentPart(element: MemoElement, kind: string, registry: ReturnType<typeof indexKinds>) {
    return element.construct === 'part' && !element.isDefinition && kindConformsTo(element.kind, kind, registry);
}

function visibleInScope(model: MemoModelDTO, element: MemoElement, workspace: string | null) {
    const scopes = model.workspaceMembership?.membership[element.id];
    return !workspace || !scopes?.length || scopes.includes(workspace);
}

export function DeploymentLinks({ model, workspace, selected, canWrite, direction, onPeer }: {
    model: MemoModelDTO; workspace: string | null; selected: MemoElement; canWrite: boolean;
    direction: 'outgoing' | 'incoming'; onPeer?: (id: string) => void;
}) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const outgoing = direction === 'outgoing';
    if (!isDeploymentPart(selected, outgoing ? MODULE : UNIT, registry)) return null;
    const peerKind = outgoing ? UNIT : MODULE;
    const isPeer = (element: MemoElement) => isDeploymentPart(element, peerKind, registry);
    const allowed = (element: MemoElement) => {
        if (!isPeer(element) || !visibleInScope(model, element, workspace)) return false;
        const selectedScopes = model.workspaceMembership?.membership[selected.id];
        const peerScopes = model.workspaceMembership?.membership[element.id];
        return !selectedScopes?.length || !peerScopes?.length || selectedScopes.some(scope => peerScopes.includes(scope));
    };
    return <PathwayAllocation model={model} selected={selected} canWrite={canWrite} type="buildsInto" direction={direction}
        heading={outgoing ? 'Builds into' : 'Software modules'}
        peerLabel={outgoing ? 'Deployment unit' : 'Software module'}
        linkLabel={outgoing ? 'Link deployment unit' : 'Link software module'}
        peerAllowed={allowed} onPeer={onPeer} canOpenPeer={isPeer} />;
}

export function DeploymentWorkbench({ model, workspace, artifactId, canWrite, onSelect, onModule }: {
    model: MemoModelDTO; workspace: string | null; artifactId?: string; canWrite: boolean;
    onSelect: (id: string) => void; onModule?: (id: string) => void;
}) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const units = Object.values(model.elements).filter(element => isDeploymentPart(element, UNIT, registry) && visibleInScope(model, element, workspace));
    const unit = units.find(item => item.id === artifactId);
    return <section className="pathway-workspace" aria-label="Deployment units" style={{ padding: 20 }}>
        <h2>Deployment units</h2>
        <label>Deployment unit{' '}
            <select value={unit?.id ?? ''} onChange={event => onSelect(event.target.value)}>
                <option value="" disabled>{units.length ? 'Choose a deployment unit…' : 'No deployment units in this scope'}</option>
                {units.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
        </label>
        {canWrite && <PathwayPartCreate model={model} partKinds={[UNIT]} addLabel="Add deployment unit"
            saveLabel="Save deployment unit" onCreated={onSelect} />}
        {unit && <>
            <h3>{unit.name}</h3>
            <DeploymentLinks model={model} workspace={workspace} selected={unit} canWrite={canWrite} direction="incoming" onPeer={onModule} />
            <details><summary>Source</summary><code>{unit.file}</code></details>
        </>}
    </section>;
}
