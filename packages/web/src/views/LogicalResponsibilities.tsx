import { useState, type FormEvent, type ReactNode } from 'react';
import { functionalCatalog, functionalStructure, indexKinds, kindConformsTo, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { componentAllocationSource, writeFunctionalWork } from '../lib/functional-authoring';
import { useModelStore } from '../store/model-store';
import './pathway-workbench.css';

export function LogicalResponsibilities({ model, workspace, artifactId, canWrite, onSelect, onFunctional, implementationLinks }: {
    model: MemoModelDTO; workspace: string; artifactId?: string; canWrite: boolean;
    onSelect: (id: string) => void; onFunctional?: (id: string) => void; implementationLinks?: (componentId: string) => ReactNode;
}) {
    const [name, setName] = useState('');
    const [functionId, setFunctionId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const registry = indexKinds(model.registries?.kinds ?? []);
    const components = Object.values(model.elements).filter(element => !element.isDefinition
        && kindConformsTo(element.kind, 'LogicalComponent', registry)
        && model.workspaceMembership?.membership[element.id]?.includes(workspace));
    const responsibilities = functionalCatalog(model, workspace, 'ComponentFunction');
    const responsibility = responsibilities.find(item => item.id === artifactId);
    const allocations = model.relationships.filter(edge => edge.type === 'allocatedTo');
    const component = components.find(item => item.id === artifactId)
        ?? components.find(item => allocations.some(edge => edge.sourceId === responsibility?.id && edge.targetId === item.id));
    const owned = component ? responsibilities.filter(item => allocations.some(edge => edge.sourceId === item.id && edge.targetId === component.id)) : [];
    const structure = functionalStructure(model, workspace);
    const allocationSource = component ? componentAllocationSource(model, component.id) ?? structure.home : undefined;
    const functions = functionalCatalog(model, workspace).filter(item => item.id !== structure.root?.id);
    const linked = responsibility ? model.relationships.filter(edge => edge.type === 'realizes' && edge.sourceId === responsibility.id)
        .flatMap(edge => model.elements[edge.targetId] ? [model.elements[edge.targetId]] : []) : [];
    const candidates = functions.filter(item => !linked.some(target => target.id === item.id));
    const writable = canWrite && !busy && !!structure.home && structure.roots.length <= 1
        && structure.home.provenance?.declaration.writable !== false;
    const save = async (event: FormEvent, link: boolean) => {
        event.preventDefault();
        if (link ? !responsibility || !functionId : !component || !name.trim()) return;
        setBusy(true);
        setError('');
        try {
            const id = link && responsibility
                ? await writeFunctionalWork({ workspace, operation: 'link-realization', componentFunctionId: responsibility.id, systemFunctionId: functionId })
                : await writeFunctionalWork({ workspace, operation: 'component-function', componentId: component?.id }, name);
            setName('');
            setFunctionId('');
            const current = useModelStore.getState();
            if (id && id !== artifactId && current.workspace === workspace && current.activeView.type === 'pathway'
                && current.activeView.layer === 'layerLogical' && current.activeView.artifactId === artifactId) onSelect(id);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
            setBusy(false);
        }
    };
    return <section className="pathway-workspace" aria-label="Logical responsibilities" style={{ padding: 20 }}>
        <h2>Component responsibilities</h2>
        {components.length ? <label>Logical component{' '}
            <select value={component?.id ?? ''} onChange={event => onSelect(event.target.value)}>
                <option value="" disabled>Choose a logical component…</option>
                {components.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
        </label> : <p>Add a logical component to this system to assign responsibilities.</p>}
        {component && <div className="pathway-related">
            {owned.length > 0 && <ul>{owned.map(item => <li key={item.id}><button type="button" aria-current={item.id === responsibility?.id ? 'true' : undefined}
                className="pathway-resource" onClick={() => onSelect(item.id)}>{item.name}</button></li>)}</ul>}
            <form onSubmit={event => void save(event, false)}>
                <label>Responsibility name <input required value={name} onChange={event => setName(event.target.value)} /></label>{' '}
                <button className="pathway-button pathway-button--primary" disabled={!writable || !name.trim() || allocationSource?.provenance?.declaration.writable === false}>Save responsibility</button>
                {structure.home && <p>{structure.root ? 'Save under the parent function' : structure.adoptable ? 'Associate the existing parent function and save under it' : 'Create a parent function to contain this responsibility'} in <code>{structure.home.file}</code>. Save the allocation in <code>{allocationSource?.file}</code>.</p>}
            </form>
        </div>}
        {responsibility && <section className="pathway-related" aria-label="Selected responsibility">
            <h3>{responsibility.name}</h3>
            {component && <p>Allocated to {component.name}.</p>}
            <h4>Related system functions</h4>
            <p>{linked.length ? 'Linked' : candidates.length ? 'Ready to link' : 'Link later'}</p>
            {linked.map(item => onFunctional
                ? <button key={item.id} type="button" className="pathway-resource" onClick={() => onFunctional(item.id)}>{item.name}</button>
                : <p key={item.id}>{item.name}</p>)}
            {candidates.length > 0 && <form onSubmit={event => void save(event, true)}>
                <label>System function{' '}
                    <select required value={functionId} onChange={event => setFunctionId(event.target.value)}>
                        <option value="">Choose an existing function…</option>
                        {candidates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </label>{' '}
                <button className="pathway-button pathway-button--primary" disabled={!canWrite || busy || !functionId || responsibility.provenance?.declaration.writable === false}>Link system function</button>
                <p>Save the realization in <code>{responsibility.file}</code>.</p>
            </form>}
            <details><summary>Source</summary><code>{responsibility.file}</code></details>
        </section>}
        {component && implementationLinks?.(component.id)}
        {error && <p role="alert">{error}</p>}
    </section>;
}
