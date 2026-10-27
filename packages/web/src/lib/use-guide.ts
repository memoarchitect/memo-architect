// ─── The Guide's evaluation, for any view that shows it ──────────────────────
//
// The Guide page and the Method panel show the same evaluation: asked of the server for the chosen workspace,
// again whenever the model's revision changes, so a step turns done as the work arrives. Opening a step goes
// to the viewpoint the method names for it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { requestGuide } from '../store/ws-client';
import type { GuideStepStatus } from './guide-view';

/** Ask for the Guide while connected, and say why when it cannot be evaluated. */
export function useGuideEvaluation(): string | null {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    const connected = useModelStore(s => s.connected);
    const [problem, setProblem] = useState<string | null>(null);
    const revision = model?.revision;
    useEffect(() => {
        if (!connected) return;
        let current = true;
        requestGuide(workspace ? model?.elements[workspace]?.name ?? workspace : null)
            .then(result => { if (current) setProblem(result.error ?? null); })
            .catch(error => { if (current) setProblem(error instanceof Error ? error.message : String(error)); });
        return () => { current = false; };
    }, [connected, workspace, revision]); // eslint-disable-line react-hooks/exhaustive-deps
    return problem;
}

/** Open a step: select the viewpoint the method names for it and go to its views. */
export function useOpenStep(): (step: GuideStepStatus) => void {
    const model = useModelStore(s => s.model);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const setActiveMode = useModelStore(s => s.setActiveMode);
    const setActiveView = useModelStore(s => s.setActiveView);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);
    const navigate = useNavigate();
    return (step: GuideStepStatus) => {
        const viewpoint = step.guideViewpoint ? model?.viewpoints?.find(v => v.name === step.guideViewpoint || v.id === step.guideViewpoint) : undefined;
        if (viewpoint) selectViewpoint(viewpoint.id);
        setActiveMode('diagram');
        setExplorerTab('views');
        setActiveView({ type: 'welcome' });
        // The viewpoints index has its own address; opening a step lands on it.
        navigate('/viewpoints');
    };
}
