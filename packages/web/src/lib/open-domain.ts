// Opening a domain of the model from anywhere: the explorer's chips, a dashboard tile, a guide step.
// One way, so every such link ends at the same address (/catalog?domain=...) with nothing left selected.

import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';

/** Returns a function that opens the catalog on one domain, or on all of them when given null. */
export function useOpenDomain(): (domain: string | null) => void {
    const navigate = useNavigate();
    const setExplorerDomain = useModelStore(s => s.setExplorerDomain);
    const inspectElement = useModelStore(s => s.inspectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    return domain => {
        setExplorerDomain(domain);
        inspectElement(null);
        setActiveMode('catalog');
        setExplorerTab('model');
        setActiveView({ type: 'welcome' });
        navigate('/catalog');
    };
}
