import { useEffect, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { MemoBrandMark } from '../components/MemoBrandMark';

type Folder = { id: string; name: string };
type StarterTemplate = 'custom' | 'part-inventory' | 'requirements-review' | 'ownership-tree' | 'syside-part-api';
type Notebook = { id: string; title: string; folderId: string; createdAt: number; template: StarterTemplate };
type AnalysisLibrary = { folders: Folder[]; notebooks: Notebook[] };

const STORAGE_KEY = 'memo.analysis.notebooks.v1';
const ROOT_FOLDER = 'root';

const DEFAULT_LIBRARY: AnalysisLibrary = {
    folders: [{ id: ROOT_FOLDER, name: 'Notebooks' }],
    notebooks: [],
};

function loadLibrary(): AnalysisLibrary {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (!value) return DEFAULT_LIBRARY;
        const parsed = JSON.parse(value) as AnalysisLibrary;
        if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.notebooks)) return DEFAULT_LIBRARY;
        return parsed;
    } catch {
        return DEFAULT_LIBRARY;
    }
}

const STARTERS: { template: Exclude<StarterTemplate, 'custom'>; title: string; description: string; icon: string }[] = [
    { template: 'part-inventory', title: 'Part inventory', description: 'List part usages and their owners.', icon: '▦' },
    { template: 'requirements-review', title: 'Requirements review', description: 'List requirements and their declared text.', icon: '☑' },
    { template: 'ownership-tree', title: 'Ownership tree', description: 'Print the model hierarchy for review.', icon: '⌘' },
    { template: 'syside-part-api', title: 'Syside live model API', description: 'Query typed PartUsage elements directly from SysML v2 files.', icon: '⌁' },
];

function templateCells(template: StarterTemplate): string[] {
    switch (template) {
        case 'part-inventory': return [
            '# Part inventory from the current MEMO model snapshot\n',
            "parts = [element for element in elements if 'part' in (element.get('kind', '') + ' ' + element.get('construct', '')).lower()]\n",
            "[(part.get('shortId'), part.get('name'), part.get('kind')) for part in parts[:100]]\n",
        ];
        case 'requirements-review': return [
            '# Requirements review from the current MEMO model snapshot\n',
            "requirements = [element for element in elements if 'requirement' in element.get('kind', '').lower()]\n",
            "[(requirement.get('shortId'), requirement.get('name'), requirement.get('documentation', ''))\n",
            ' for requirement in requirements[:100]]\n',
        ];
        case 'ownership-tree': return [
            '# Ownership/containment relationships in the current model\n',
            "ownership = [relationship for relationship in relationships\n",
            "             if any(term in relationship.get('type', '').lower() for term in ('contain', 'own', 'compose'))]\n",
            "[(relationship.get('sourceId'), relationship.get('targetId'), relationship.get('type'))\n",
            ' for relationship in ownership[:100]]\n',
        ];
        case 'syside-part-api': return [
            '# Licensed Syside Automator: query the textual SysML v2 model directly\n',
            'from pathlib import Path\n',
            'import syside\n',
            '\n',
            "MODEL_ROOT = Path('../model')\n",
            "sysml_paths = [str(path) for path in MODEL_ROOT.rglob('*.sysml')]\n",
            '# GPCA currently has semantic diagnostics, so use Syside’s tolerant loader.\n',
            'sysml_model, diagnostics = syside.try_load_model(sysml_paths)\n',
            'part_usages = list(sysml_model.elements(syside.PartUsage))\n',
            "print(f'Loaded {len(sysml_model.user_docs)} documents and {len(part_usages)} PartUsage elements')\n",
            '[(part.name, part.owner.name if part.owner else None) for part in part_usages[:100]]\n',
        ];
        default: return [
            '# Query the current MEMO model snapshot\n',
            "[(element.get('shortId'), element.get('name'), element.get('kind')) for element in elements[:100]]\n",
        ];
    }
}

function notebookDocument(title: string, template: StarterTemplate, modelSnapshot: unknown) {
    const bytes = new TextEncoder().encode(JSON.stringify(modelSnapshot));
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    const snapshotBase64 = btoa(binary);
    return {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
            kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
            language_info: { name: 'python', version: '3.12' },
        },
        cells: [
            {
                cell_type: 'markdown', metadata: {}, source: [
                    `# ${title}\n`,
                    '\n',
                    'This live notebook was generated by MEMO Architect with a snapshot of the currently loaded model. The starter cells require only Python and run without a commercial license.\n',
                    '\n',
                    '> For direct textual SysML v2 access, add the optional licensed Syside Automator adapter after configuring `SYSIDE_LICENSE_KEY`.\n',
                ],
            },
            {
                cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: [
                    'import base64\n',
                    'import json\n',
                    '\n',
                    `model = json.loads(base64.b64decode('${snapshotBase64}').decode('utf-8'))\n`,
                    "elements = list(model.get('elements', {}).values())\n",
                    "relationships = list(model.get('relationships', []))\n",
                    "print(f'Loaded {len(elements)} elements and {len(relationships)} relationships')\n",
                ],
            },
            { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: templateCells(template) },
        ],
    };
}

function notebookFileName(notebook: Notebook): string {
    return `${notebook.title.replace(/[^a-z0-9_-]+/gi, '-') || 'memo-analysis'}.ipynb`;
}

async function saveLiveNotebook(notebook: Notebook, modelSnapshot: unknown) {
    const name = notebookFileName(notebook);
    const content = notebookDocument(notebook.title, notebook.template ?? 'custom', modelSnapshot);
    const response = await fetch(`http://127.0.0.1:8888/api/contents/${encodeURIComponent(name)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notebook', format: 'json', content }),
    });
    if (!response.ok) throw new Error('JupyterLab is not available at 127.0.0.1:8888.');
}

async function liveNotebookExists(notebook: Notebook): Promise<boolean> {
    const response = await fetch(`http://127.0.0.1:8888/api/contents/${encodeURIComponent(notebookFileName(notebook))}?content=0`);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error('JupyterLab is not available at 127.0.0.1:8888.');
    return true;
}

/**
 * Notebook management stays client-side until a project exposes a notebook
 * filesystem. Export is explicit: it produces a portable .ipynb that loads
 * the textual SysML model through the genuine Syside Automator API. It never
 * writes to the model unless a notebook author deliberately adds such a cell.
 */
export function AnalysisWorkspace() {
    const model = useModelStore(s => s.model);
    const [library, setLibrary] = useState<AnalysisLibrary>(loadLibrary);
    const [selectedFolder, setSelectedFolder] = useState(ROOT_FOLDER);
    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(
        () => loadLibrary().notebooks.at(-1)?.id ?? null,
    );
    const [liveError, setLiveError] = useState<string | null>(null);
    const [liveReadyId, setLiveReadyId] = useState<string | null>(null);

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(library)); }, [library]);

    const visibleNotebooks = useMemo(
        () => library.notebooks.filter(notebook => notebook.folderId === selectedFolder),
        [library.notebooks, selectedFolder],
    );
    const selectedNotebook = library.notebooks.find(notebook => notebook.id === selectedNotebookId) ?? null;

    useEffect(() => {
        if (!selectedNotebook) return;
        setLiveReadyId(null);
        setLiveError(null);
        void liveNotebookExists(selectedNotebook)
            .then(exists => exists ? setLiveReadyId(selectedNotebook.id) : saveLiveNotebook(selectedNotebook, model).then(() => setLiveReadyId(selectedNotebook.id)))
            .catch(error => setLiveError(error.message));
    // Save once per notebook selection. Model updates must not create a
    // save/rebuild loop through the project file watcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNotebookId]);

    function addFolder() {
        const name = window.prompt('Folder name');
        if (!name?.trim()) return;
        const folder: Folder = { id: `folder-${crypto.randomUUID()}`, name: name.trim() };
        setLibrary(current => ({ ...current, folders: [...current.folders, folder] }));
        setSelectedFolder(folder.id);
    }

    function addNotebook(template: StarterTemplate = 'custom', suggestedTitle = 'Model analysis', askForTitle = true) {
        const enteredTitle = askForTitle ? window.prompt('Notebook title', suggestedTitle) : suggestedTitle;
        if (!enteredTitle?.trim()) return;
        const title = enteredTitle.trim();
        const duplicateCount = library.notebooks.filter(notebook => notebook.title === title).length;
        const uniqueTitle = duplicateCount ? `${title} ${duplicateCount + 1}` : title;
        const notebook: Notebook = {
            id: `notebook-${crypto.randomUUID()}`,
            title: uniqueTitle,
            folderId: selectedFolder,
            createdAt: Date.now(),
            template,
        };
        setLibrary(current => ({ ...current, notebooks: [...current.notebooks, notebook] }));
        setSelectedNotebookId(notebook.id);
        setLiveReadyId(null);
        setLiveError(null);
        void saveLiveNotebook(notebook, model)
            .then(() => setLiveReadyId(notebook.id))
            .catch(error => setLiveError(error.message));
    }

    function retryLiveNotebook() {
        if (!selectedNotebook) return;
        setLiveError(null);
        setLiveReadyId(null);
        void liveNotebookExists(selectedNotebook)
            .then(exists => exists ? setLiveReadyId(selectedNotebook.id) : saveLiveNotebook(selectedNotebook, model).then(() => setLiveReadyId(selectedNotebook.id)))
            .catch(error => setLiveError(error.message));
    }

    const buttonStyle: React.CSSProperties = {
        border: '1px solid #BFE6D9', background: '#F2FCF8', color: '#176B55', borderRadius: 6,
        padding: '7px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    };

    return (
        <div className="flex flex-1 overflow-hidden" style={{ background: '#F7F7F5' }}>
            <aside style={{ width: 280, flexShrink: 0, borderRight: '1px solid #D9E2E7', background: '#FFF', padding: 16, overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div><div style={{ fontWeight: 700, color: '#173B4E' }}>Jupyter notebooks</div><div style={{ fontSize: 12, color: '#71889A', marginTop: 3 }}>Python analysis workspace</div></div>
                    <button title="New folder" onClick={addFolder} style={buttonStyle}>+ Folder</button>
                </div>
                <div style={{ marginBottom: 14 }}>
                    {library.folders.map(folder => (
                        <button key={folder.id} onClick={() => setSelectedFolder(folder.id)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', background: selectedFolder === folder.id ? '#E2F7F0' : 'transparent', color: '#1B3A4B', fontWeight: selectedFolder === folder.id ? 700 : 500 }}>
                            ▾ &nbsp;{folder.name}
                        </button>
                    ))}
                </div>
                <button onClick={() => addNotebook()} style={{ ...buttonStyle, width: '100%', marginBottom: 12 }}>+ New notebook</button>
                <div style={{ borderTop: '1px solid #E3ECEF', margin: '4px 0 10px', paddingTop: 12 }}>
                    <div style={{ color: '#71889A', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 7px 10px' }}>Starter examples</div>
                    {STARTERS.map(starter => (
                        <button key={starter.template} onClick={() => addNotebook(starter.template, starter.title, false)} title={starter.description} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', background: 'transparent', color: '#244D63', fontSize: 12 }}>
                            <span style={{ color: '#2D8D70', marginRight: 7 }}>{starter.icon}</span>{starter.title}
                        </button>
                    ))}
                </div>
                {visibleNotebooks.map(notebook => (
                    <button key={notebook.id} onClick={() => setSelectedNotebookId(notebook.id)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 6, padding: '9px 10px', cursor: 'pointer', background: selectedNotebookId === notebook.id ? '#EEF7FB' : 'transparent', color: '#244D63', fontSize: 13 }}>
                        ◫ &nbsp;{notebook.title}
                    </button>
                ))}
                {visibleNotebooks.length === 0 && <div style={{ color: '#8AA0AE', fontSize: 12, lineHeight: 1.5, padding: '8px 10px' }}>No notebooks in this folder yet.</div>}
            </aside>

            <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '32px clamp(24px, 5vw, 72px)' }}>
                <div style={{ maxWidth: 960 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
                        <div>
                            <div style={{ color: '#2D8D70', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Model analysis</div>
                            <h1 style={{ color: '#173B4E', fontSize: 28, margin: '6px 0 8px' }}>Analysis</h1>
                            <p style={{ color: '#587487', margin: 0, lineHeight: 1.55, maxWidth: 620 }}>Create live Jupyter notebooks that query the currently loaded MEMO model with Python. A licensed Syside adapter can be added for direct textual SysML v2 access.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><MemoBrandMark size={118} /><button onClick={() => addNotebook()} style={{ ...buttonStyle, whiteSpace: 'nowrap' }}>+ New notebook</button></div>
                    </div>

                    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 24 }}>
                        {[
                            ['Elements', Object.keys(model?.elements ?? {}).length],
                            ['Relationships', model?.relationships?.length ?? 0],
                            ['Kernel', 'Python 3.12'],
                        ].map(([label, value]) => <div key={String(label)} style={{ background: '#FFF', border: '1px solid #D9E6E9', borderRadius: 10, padding: '15px 17px' }}><div style={{ color: '#7892A1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div><div style={{ color: '#173B4E', fontSize: 20, fontWeight: 700, marginTop: 5 }}>{value}</div></div>)}
                    </section>

                    <section style={{ marginBottom: 24 }}>
                        <div style={{ color: '#587487', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>Starter notebooks</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                            {STARTERS.map(starter => <button key={starter.template} onClick={() => addNotebook(starter.template, starter.title, false)} style={{ textAlign: 'left', background: '#FFF', border: '1px solid #D9E6E9', borderRadius: 10, padding: 16, cursor: 'pointer', color: '#173B4E' }}>
                                <div style={{ fontSize: 20, color: '#2D8D70', marginBottom: 8 }}>{starter.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{starter.title}</div>
                                <div style={{ color: '#7892A1', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>{starter.description}</div>
                            </button>)}
                        </div>
                    </section>

                    <section style={{ background: '#FFF', border: '1px solid #D9E6E9', borderRadius: 10, padding: 20 }}>
                        {selectedNotebook ? <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><div><h2 style={{ margin: 0, color: '#173B4E', fontSize: 18 }}>{selectedNotebook.title}</h2><div style={{ color: '#7892A1', fontSize: 12, marginTop: 5 }}>{liveReadyId === selectedNotebook.id ? 'Saved and ready in local JupyterLab' : 'Preparing live notebook…'}</div></div>{liveReadyId === selectedNotebook.id ? <a href={`http://127.0.0.1:8888/lab/tree/${encodeURIComponent(notebookFileName(selectedNotebook))}`} target="_blank" rel="noopener noreferrer" style={{ ...buttonStyle, textDecoration: 'none' }}>▶ Open live JupyterLab</a> : <button disabled style={{ ...buttonStyle, opacity: .55, cursor: 'wait' }}>Preparing…</button>}</div>
                            {liveError && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 12, lineHeight: 1.55 }}><strong>Start JupyterLab first.</strong> From the project’s <code>analysis</code> folder, run <code style={{ padding: '1px 4px', borderRadius: 3, background: '#FEF3C7' }}>jupyter lab --port 8888</code>, then return here and retry. Architect cannot start a local process from the browser automatically. <button onClick={retryLiveNotebook} style={{ marginLeft: 8, border: 'none', background: 'none', color: '#176B55', fontWeight: 700, cursor: 'pointer' }}>Retry connection</button></div>}
                            <pre style={{ whiteSpace: 'pre-wrap', margin: '18px 0 0', padding: 14, borderRadius: 7, background: '#102A3A', color: '#BDEFE1', fontSize: 12, lineHeight: 1.55 }}>{`elements = list(model.get('elements', {}).values())\nparts = [e for e in elements if 'part' in (e.get('kind', '') + ' ' + e.get('construct', '')).lower()]\n[(p.get('shortId'), p.get('name'), p.get('kind')) for p in parts[:100]]`}</pre>
                        </> : <div style={{ color: '#587487', lineHeight: 1.6 }}><strong style={{ color: '#173B4E' }}>Start an analysis notebook.</strong><br />Choose a starter to create it instantly, then open it in live JupyterLab.</div>}
                    </section>
                </div>
            </main>
        </div>
    );
}
