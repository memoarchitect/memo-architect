import { useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { methodologySource } from '../store/ws-client';
import { COLOR, FONT } from '../styles/tokens';

/** Source-preserving methodology and RulePolicy editor through Tools. */
export function MethodologySourceEditor() {
    const methodology = useModelStore(state => state.methodology);
    const files = useMemo(() => [...new Set(
        (methodology?.folders ?? []).flatMap(folder => folder.sourceFiles),
    )].sort(), [methodology]);
    const [selected, setSelected] = useState('');
    const [text, setText] = useState('');
    const [revision, setRevision] = useState('');
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState('');

    const load = async (file: string) => {
        if (!file) return;
        const result = await methodologySource('load', file);
        setSelected(file);
        setText(result.text ?? '');
        setRevision(result.revision ?? '');
        setDirty(false);
        setMessage(result.success ? '' : (result.error ?? 'Could not load source.'));
    };
    const save = async () => {
        if (!selected || !revision) return;
        const result = await methodologySource('save', selected, { text, baseRevision: revision });
        if (result.success) {
            setRevision(result.revision ?? revision);
            setDirty(false);
            setMessage('Saved. The reusable semantic runtime is restarting.');
        } else {
            setMessage(result.error ?? 'Save rejected; the draft remains in the editor.');
        }
    };

    if (files.length === 0) return null;
    return (
        <section style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            <div className="px-3 py-2 font-semibold" style={{ fontSize: FONT.xs, color: COLOR.primary }}>
                Methodology &amp; Rule Policies
            </div>
            <select value={selected} onChange={event => void load(event.target.value)}
                className="mx-3 mb-2" style={{ width: 'calc(100% - 24px)', fontSize: FONT.xs }}>
                <option value="">Select resolved SysML source…</option>
                {files.map(file => <option key={file} value={file}>{file}</option>)}
            </select>
            {selected && <>
                <textarea value={text} onChange={event => { setText(event.target.value); setDirty(true); }}
                    aria-label="Methodology SysML source"
                    style={{ width: 'calc(100% - 24px)', height: 220, margin: '0 12px', padding: 8,
                        fontFamily: 'monospace', fontSize: 11, color: '#E2E8F0', background: '#1E293B' }} />
                <div className="flex gap-2 px-3 py-2">
                    <button disabled={!dirty} onClick={() => void save()}>Save SysML</button>
                    <button onClick={() => void navigator.clipboard.writeText(text)}>Copy draft</button>
                    <button onClick={() => void load(selected)}>Reload</button>
                </div>
                {message && <div className="px-3 pb-2" role="status" style={{ fontSize: 11, color: '#B45309' }}>{message}</div>}
            </>}
        </section>
    );
}
