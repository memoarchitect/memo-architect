// ─── AI Workspace ────────────────────────────────────────────────────────────
//
// Host for the experimental AI surfaces, reached from the `✦ AI` nav mode.
// The tools used to sit as a card inside the Model Explorer sidebar, where they
// read as part of the modelling workflow; they are gated behind
// `--experimental` (see `config/feature-flags.ts`) and belong on their own
// top-level mode instead.
//
// `ask` and `sysml-generator` remain distinct view types so the existing
// /ask and /generate deep links keep resolving — this view just selects between
// them and owns the switcher.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from '../store/model-store';
import { ChatPanel } from './ChatPanel';
import { SysmlGenerator } from './SysmlGenerator';

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
] as const;

export function AiWorkspace() {
    const activeView = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    // 'ai' is the mode's landing view; it opens on the assistant.
    const current = activeView.type === 'sysml-generator' ? 'sysml-generator' : 'ask';

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
                        textTransform: 'uppercase', letterSpacing: '0.06em',
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
                        </button>
                    );
                })}
                <span style={{ flex: 1 }} />
                <span
                    title="Enabled by --experimental. Generated content is unreviewed and carries no design-control provenance."
                    style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: '#92400E', background: '#FEF3C7',
                        border: '1px solid #FDE68A', borderRadius: '4px', padding: '2px 6px',
                    }}
                >
                    Experimental
                </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {current === 'ask' ? <ChatPanel /> : <SysmlGenerator />}
            </div>
        </div>
    );
}
