import { indexKinds, kindConformsTo, type MemoElement, type MemoModelDTO, type RelationshipDirection } from '@memoarchitect/tools/browser';
import { PathwayRelationship } from './PathwayRelationship';
import { PathwayPartCreate } from './PathwayPartCreate';

const MODULE = 'SoftwareModule';
const UNIT = 'SoftwareDeploymentUnit';
const NODE = 'ProcessingNode';
const ENVIRONMENT = 'RuntimeEnvironment';

const categories = [
    { kind: UNIT, label: 'Deployment unit' },
    { kind: NODE, label: 'Processing node' },
    { kind: ENVIRONMENT, label: 'Runtime environment' },
];

const buildsInto = {
    type: 'buildsInto', sourceKind: MODULE, targetKind: UNIT,
    outgoing: { heading: 'Builds into', peerLabel: 'Deployment unit', linkLabel: 'Link deployment unit' },
    incoming: { heading: 'Software modules', peerLabel: 'Software module', linkLabel: 'Link software module' },
} as const;
const deploysTo = {
    type: 'deploysTo', sourceKind: UNIT, targetKind: NODE,
    outgoing: { heading: 'Deploys to', peerLabel: 'Processing node', linkLabel: 'Link processing node' },
    incoming: { heading: 'Deployed units', peerLabel: 'Deployment unit', linkLabel: 'Link deployment unit' },
} as const;
const providesEnvironment = {
    type: 'providesEnvironment', sourceKind: NODE, targetKind: ENVIRONMENT,
    outgoing: { heading: 'Provides runtime environments', peerLabel: 'Runtime environment', linkLabel: 'Link runtime environment' },
    incoming: { heading: 'Provided by processing nodes', peerLabel: 'Processing node', linkLabel: 'Link processing node' },
} as const;

function isDeploymentPart(element: MemoElement, kind: string, registry: ReturnType<typeof indexKinds>) {
    return element.construct === 'part' && !element.isDefinition && kindConformsTo(element.kind, kind, registry);
}

function visibleInScope(model: MemoModelDTO, element: MemoElement, workspace: string | null) {
    const scopes = model.workspaceMembership?.membership[element.id];
    return !workspace || !scopes?.length || scopes.includes(workspace);
}

type LinkProps = {
    model: MemoModelDTO; workspace: string | null; selected: MemoElement; canWrite: boolean;
    direction: RelationshipDirection; onPeer?: (id: string) => void; admittedKinds?: readonly string[];
};

export function DeploymentLinks(props: LinkProps) {
    return <DeploymentRelationship {...props} recipe={buildsInto} />;
}

function DeploymentRelationship({ model, workspace, selected, canWrite, direction, onPeer, admittedKinds, recipe }: LinkProps & {
    recipe: typeof buildsInto | typeof deploysTo | typeof providesEnvironment;
}) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const outgoing = direction === 'outgoing';
    if (!isDeploymentPart(selected, outgoing ? recipe.sourceKind : recipe.targetKind, registry)) return null;
    const peerKind = outgoing ? recipe.targetKind : recipe.sourceKind;
    const isPeer = (element: MemoElement) => isDeploymentPart(element, peerKind, registry)
        && (!admittedKinds || admittedKinds.some(kind => kindConformsTo(element.kind, kind, registry)));
    const allowed = (element: MemoElement) => {
        if (!isPeer(element) || !visibleInScope(model, element, workspace)) return false;
        const selectedScopes = model.workspaceMembership?.membership[selected.id];
        const peerScopes = model.workspaceMembership?.membership[element.id];
        return !selectedScopes?.length || !peerScopes?.length || selectedScopes.some(scope => peerScopes.includes(scope));
    };
    return <PathwayRelationship model={model} selected={selected} canWrite={canWrite} type={recipe.type} direction={direction}
        {...recipe[direction]} peerAllowed={allowed} onPeer={onPeer} canOpenPeer={isPeer}
        placementNoun={recipe.type === 'providesEnvironment' ? 'link' : 'allocation'} />;
}

export function DeploymentWorkbench({ model, workspace, artifactId, canWrite, realizationKinds, onSelect, onModule }: {
    model: MemoModelDTO; workspace: string | null; artifactId?: string; canWrite: boolean; realizationKinds: readonly string[];
    onSelect: (id: string) => void; onModule?: (id: string) => void;
}) {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const enabled = categories.filter(({ kind }) => realizationKinds.includes(kind));
    const items = Object.values(model.elements).filter(element => visibleInScope(model, element, workspace));
    const selected = items.find(item => item.id === artifactId && enabled.some(({ kind }) => isDeploymentPart(item, kind, registry)));
    const links = selected && { model, workspace, selected, canWrite };
    return <section className="pathway-workspace" aria-label="Deployment and runtime" style={{ padding: 20 }}>
        <h2>Deployment and runtime</h2>
        <div className="pathway-resources">
            {enabled.map(({ kind, label }) => {
                const choices = items.filter(item => isDeploymentPart(item, kind, registry));
                return <section className="pathway-related" key={kind}>
                    <label>{label}{' '}
                        <select value={choices.some(item => item.id === artifactId) ? artifactId : ''} onChange={event => onSelect(event.target.value)}>
                            <option value="" disabled>{choices.length ? 'Choose an existing item…' : 'No items in this scope'}</option>
                            {choices.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
                        </select>
                    </label>
                    {canWrite && <PathwayPartCreate model={model} partKinds={[kind]} addLabel={`Add ${label.toLowerCase()}`}
                        saveLabel={`Save ${label.toLowerCase()}`} onCreated={onSelect} />}
                </section>;
            })}
        </div>
        {links && <>
            <h3>{links.selected.name}</h3>
            <DeploymentLinks {...links} direction="incoming" onPeer={onModule} />
            <DeploymentRelationship {...links} recipe={deploysTo} direction="outgoing" onPeer={onSelect} admittedKinds={realizationKinds} />
            <DeploymentRelationship {...links} recipe={deploysTo} direction="incoming" onPeer={onSelect} admittedKinds={realizationKinds} />
            <DeploymentRelationship {...links} recipe={providesEnvironment} direction="outgoing" onPeer={onSelect} admittedKinds={realizationKinds} />
            <DeploymentRelationship {...links} recipe={providesEnvironment} direction="incoming" onPeer={onSelect} admittedKinds={realizationKinds} />
            <details><summary>Source</summary><code>{links.selected.file}</code></details>
        </>}
    </section>;
}
