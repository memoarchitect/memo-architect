import { useState, type FormEvent } from 'react';
import { indexKinds, kindConformsTo, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { disciplineModes, disciplineTasks, loadPersonalGuides, rosTasks, type DisciplineMode, type EngineeringLayer, type GuideTask, type PersonalGuide } from '../lib/discipline-guides';
import './pathway-workbench.css';

const blankTask = (): GuideTask => ({ title: '', instructions: '', kinds: [] });

export function DisciplineGuides({ layer, model, workspace, mode, onMode, onOpen }: {
    layer: EngineeringLayer; model: MemoModelDTO; workspace: string | null; mode: DisciplineMode;
    onMode: (mode: DisciplineMode) => void; onOpen: (id: string) => void;
}) {
    const storageKey = `memo:pathways-guides:${model.metadata?.modelName ?? model.metadata?.projectName ?? 'model'}:${layer}`;
    const [guides, setGuides] = useState(() => loadPersonalGuides(storageKey));
    const [selectedId, setSelectedId] = useState('');
    const [draft, setDraft] = useState<PersonalGuide>();
    const [error, setError] = useState('');
    const [taskIndex, setTaskIndex] = useState(0);
    const active = guides.find(guide => guide.id === selectedId);
    const tasks = active?.tasks ?? (mode === 'all' ? [] : disciplineTasks[layer][mode]);
    const selected = tasks[taskIndex] ?? tasks[0];
    const kinds = model.registries?.kinds ?? [];
    const registry = indexKinds(kinds);
    const artifacts = selected ? Object.values(model.elements).filter(element => {
        const scopes = model.workspaceMembership?.membership[element.id];
        return (!workspace || !scopes?.length || scopes.includes(workspace))
            && selected.kinds.some(kind => kindConformsTo(element.kind, kind, registry));
    }) : [];
    const updateTask = (index: number, patch: Partial<GuideTask>) => setDraft(previous => previous && ({
        ...previous, tasks: previous.tasks.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
    const begin = (guide?: PersonalGuide) => {
        setError('');
        setDraft(guide ?? { id: crypto.randomUUID(), title: '', tasks: [blankTask()] });
    };
    const store = (next: PersonalGuide[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
            setGuides(next);
            return true;
        } catch {
            setError('This browser could not save the guide.');
            return false;
        }
    };
    const save = (event: FormEvent) => {
        event.preventDefault();
        if (!draft || !draft.title.trim() || draft.tasks.some(item => !item.title.trim() || !item.instructions.trim())) return;
        const guide = { ...draft, title: draft.title.trim(), tasks: draft.tasks.map(item => ({
            ...item, title: item.title.trim(), instructions: item.instructions.trim(),
        })) };
        if (store([...guides.filter(item => item.id !== guide.id), guide])) {
            setSelectedId(guide.id);
            setTaskIndex(0);
            onMode('all');
            setDraft(undefined);
        }
    };

    return <section className="pathway-workspace" aria-label="Engineering guides" style={{ padding: 20 }}>
        <h2>Guided modes</h2>
        <div className="pathway-resources" role="group" aria-label="Engineering discipline">
            {disciplineModes.map(item => <button type="button" key={item.id} className="pathway-button"
                aria-pressed={!active && mode === item.id} onClick={() => { setSelectedId(''); setTaskIndex(0); onMode(item.id); }}>{item.title}</button>)}
        </div>
        <div className="pathway-resources">
            {guides.length > 0 && <label>My guide{' '}
                <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setTaskIndex(0); onMode('all'); }}>
                    <option value="">Choose a saved guide…</option>
                    {guides.map(guide => <option key={guide.id} value={guide.id}>{guide.title}</option>)}
                </select>
            </label>}
            <button type="button" className="pathway-button" onClick={() => begin()}>Create guide</button>
            {active && <button type="button" className="pathway-button" onClick={() => begin(active)}>Edit guide</button>}
        </div>
        {draft && <form className="pathway-context-link-form" aria-label="Guide editor" onSubmit={save}>
            <p>Saved in this browser for this model and layer.</p>
            <label>Guide name<input required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
            <button type="button" className="pathway-button" onClick={() => setDraft({ ...draft, title: 'ROS 2', tasks: rosTasks(layer) })}>Use ROS 2 starter</button>
            {draft.tasks.map((item, index) => <fieldset key={index}>
                <legend>Step {index + 1}</legend>
                <label>Step title<input required value={item.title} onChange={event => updateTask(index, { title: event.target.value })} /></label>
                <label>Instructions<textarea required value={item.instructions} onChange={event => updateTask(index, { instructions: event.target.value })} /></label>
                <label>Related model kinds
                    <select multiple value={item.kinds} onChange={event => updateTask(index, { kinds: Array.from(event.target.selectedOptions, option => option.value) })}>
                        {kinds.map(kind => <option key={kind.name} value={kind.name}>{kind.label ?? kind.name}</option>)}
                        {item.kinds.filter(name => !registry.has(name)).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                {draft.tasks.length > 1 && <button type="button" onClick={() => setDraft({ ...draft, tasks: draft.tasks.filter((_, i) => i !== index) })}>Remove step</button>}
            </fieldset>)}
            <button type="button" className="pathway-button" onClick={() => setDraft({ ...draft, tasks: [...draft.tasks, blankTask()] })}>Add step</button>
            <button className="pathway-button pathway-button--primary">Save guide</button>
            <button type="button" className="pathway-button" onClick={() => { setDraft(undefined); setError(''); }}>Cancel</button>
        </form>}
        {error && <p role="alert">{error}</p>}
        {selected && <section className="pathway-related" aria-label="Guide steps">
            {active && <h3>{active.title}</h3>}
            <div className="pathway-resources" role="group" aria-label="Guide steps">
                {tasks.map((item, index) => <button type="button" key={index} className="pathway-button"
                    aria-pressed={selected === item} onClick={() => setTaskIndex(index)}>{item.title}</button>)}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{selected.instructions}</p>
            {artifacts.length > 0 && <div className="pathway-resources">{artifacts.map(item =>
                <button type="button" className="pathway-resource" key={item.id} onClick={() => onOpen(item.id)}>{item.name}</button>)}</div>}
            {selected.kinds.length > 0 && !artifacts.length && <p>No matching model items in this scope.</p>}
        </section>}
    </section>;
}
