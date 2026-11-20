// ─── AI Workspace ────────────────────────────────────────────────────────────
//
// Host for the AI surfaces, reached from the `✦ AI` nav mode. They sit on
// their own top-level mode rather than inside the modelling workflow, behind the
// `ai-tools` flag (see `config/feature-flags.ts`).
//
// `ask` and `sysml-generator` remain distinct view types so the existing
// /ask and /generate deep links keep resolving — this view just selects between
// them and owns the switcher.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from '../store/model-store';
import { ChatPanel } from './ChatPanel';
import { SysmlGenerator } from './SysmlGenerator';
import { PendingAiChanges } from './PendingAiChanges';

const TABS = [
    {
        view: 'ask',
        label: 'Model Assistant',
        description: 'Ask questions and propose edits',
    },
    {
        view: 'sysml-generator',
        label: 'SysML Generator',
        description: 'Natural language → SysML v2',
    },
    {
        view: 'ai-pending',
        label: 'Pending changes',
        description: 'Changes AI coding tools proposed, waiting for you to apply them',
    },
] as const;

export function AiWorkspace() {
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    // 'ai' is the mode's landing view; it opens on the assistant.
    const current = activeView.type === 'sysml-generator' || activeView.type === 'ai-pending' ? activeView.type : 'ask';
    const waiting = useModelStore(s => s.aiProposals.length);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: '#fff',
                    flexShrink: 0, flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        fontSize: '10px', fontWeight: 700, color: '#065F46',
                        letterSpacing: '0.06em',
                        display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px',
                    }}
                >
                    <span>✦</span> AI Tools
                </span>
                {TABS.map(tab => {
                    const isActive = current === tab.view;
                    return (
                        <button
                            key={tab.view}
                            onClick={() => setActiveView({ type: tab.view })}
                            title={tab.description}
                            aria-current={isActive ? 'page' : undefined}
                            style={{
                                padding: '5px 12px', borderRadius: '6px', fontSize: '13px',
                                fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                                background: isActive ? '#F0FDF9' : 'transparent',
                                border: `1px solid ${isActive ? '#A7F3D0' : 'transparent'}`,
                                color: isActive ? '#065F46' : '#6B7280',
                            }}
                        >
                            {tab.label}
                            {tab.view === 'ai-pending' && waiting > 0 && (
                                <span style={{ marginLeft: 6, padding: '0 6px', borderRadius: 9, background: '#92400E', color: '#fff', fontSize: 11, fontWeight: 700 }}>{waiting}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {current === 'ask' ? <ChatPanel /> : current === 'ai-pending' ? <PendingAiChanges /> : <SysmlGenerator />}
            </div>
        </div>
    );
}
