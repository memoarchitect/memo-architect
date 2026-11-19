import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { isFeatureEnabled } from '../config/feature-flags';

/** The home page names the modelling destination as well as reporting model health. */
export function PathwaysEntry() {
    const navigate = useNavigate();
    useModelStore(state => state.features);
    if (!isFeatureEnabled('guide')) return null;
    return <section aria-label="Modelling workspace" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', background: '#eef8f5', borderBottom: '1px solid #cde7de' }}>
        <div style={{ flex: 1 }}><strong style={{ color: '#0B1E2D' }}>Guided Pathways</strong><p style={{ margin: '4px 0 0', fontSize: 13, color: '#526a75' }}>Choose a system and a modelling layer to work on.</p></div>
        <button type="button" onClick={() => { const state = useModelStore.getState(); state.setActiveMode('diagram'); state.setActiveView({ type: 'guide' }); navigate('/method'); }}
            style={{ border: '1px solid #0f766e', borderRadius: 6, padding: '9px 14px', background: '#0f766e', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Open Guided Pathways</button>
    </section>;
}
