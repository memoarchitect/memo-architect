import { Link } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { useGuideEvaluation } from '../lib/use-guide';

/** Route shell for the guided layer; the editor and guide rail follow in P2.4. */
export function GuidedLayer({ layer }: { layer: string }) {
    const guide = useModelStore(s => s.guide);
    const problem = useGuideEvaluation();
    const row = guide?.layers.find(row => row.name === layer);
    return (
        <main data-testid="guided-layer" style={{ flex: 1, padding: 24 }}>
            <Link to="/method" onClick={() => useModelStore.getState().setActiveView({ type: 'guide' })}>‹ Method map</Link>
            <h1>{row?.label ?? layer}</h1>
            {row?.purpose && <p>{row.purpose}</p>}
            <p>{problem ?? (!guide ? 'Reading the method…' : row ? 'The guided layer workspace is being built.' : 'This row is not in the selected method.')}</p>
        </main>
    );
}
