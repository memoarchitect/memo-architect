// ─── Settings ────────────────────────────────────────────────────────────────
//
// One place for the choices a person makes about how Architect shows the model, in sections down the
// left, the way an editor's settings are laid out. Nothing here is a new setting: each section hosts
// the control that used to sit in the top bar or above the explorer, and saves the way it always did
// (this person's `memo.user.yaml`, or the model's own settings file for the compiler).
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import { CompilerSettings } from '../components/CompilerSettings';
import { RoleSelector } from '../components/RoleSelector';
import { VersionSelector } from '../components/VersionSelector';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { EXPLORER_MODES, groupableAttributes } from '../lib/explorer-modes';
import { COLOR, FONT } from '../styles/tokens';

const DhfSettingsPanel = lazy(() => import('./DhfSettingsPanel').then(m => ({ default: m.DhfSettingsPanel })));
const LlmSettings = lazy(() => import('./LlmSettings').then(m => ({ default: m.LlmSettings })));

type SectionId = 'model' | 'explorer' | 'compiler' | 'documents' | 'assistant';

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'model', label: 'Model' },
    { id: 'explorer', label: 'Explorer' },
    { id: 'compiler', label: 'Compiler' },
    { id: 'documents', label: 'Documents' },
    { id: 'assistant', label: 'AI assistant' },
];

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '14px 0', borderBottom: `1px solid ${COLOR.borderLight}` }}>
            <div style={{ fontSize: FONT.md, fontWeight: 600, color: COLOR.primary, marginBottom: 2 }}>{title}</div>
            {hint && <div style={{ fontSize: FONT.sm, color: COLOR.muted, marginBottom: 8 }}>{hint}</div>}
            {children}
        </div>
    );
}

function ModelSection() {
    return (
        <>
            <Row title="Version" hint="Show the working model, a release, or an unreleased ref (read only).">
                <VersionSelector tone="light" />
            </Row>
            <Row title="Workspace" hint="Show one system or the whole model. Saved for you only, in memo.user.yaml.">
                <WorkspaceSelector tone="light" />
            </Row>
            <Row title="Role" hint="Show the viewpoints written for one stakeholder. Saved for you only.">
                <RoleSelector tone="light" />
            </Row>
        </>
    );
}

function ExplorerSection() {
    const model = useModelStore(s => s.model);
    const mode = useModelStore(s => s.explorerMode);
    const setMode = useModelStore(s => s.setExplorerMode);
    const split = useModelStore(s => s.explorerSplit);
    const setSplit = useModelStore(s => s.setExplorerSplit);
    const attributes = useMemo(() => groupableAttributes(Object.values(model?.elements ?? {})), [model]);
    const select: React.CSSProperties = { background: '#fff', color: COLOR.primary, border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '5px 8px', fontSize: FONT.md };
    return (
        <>
            <Row title="Group the Model Explorer" hint="How the top level of the tree is organised. The tree below it follows the model's packages.">
                <select aria-label="Group the Model Explorer" value={mode} onChange={e => setMode(e.target.value as typeof mode)} style={select}>
                    {EXPLORER_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
            </Row>
            <Row title="Split folders by" hint="Split each folder by an attribute with a few values. Saved for you only.">
                <select aria-label="Split folders by" data-testid="explorer-group-by" value={split} onChange={e => setSplit(e.target.value)} style={select}>
                    <option value="">nothing</option>
                    {attributes.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
            </Row>
        </>
    );
}

export function SettingsPage() {
    const [section, setSection] = useState<SectionId>('model');
    const [panel, setPanel] = useState<'documents' | 'assistant' | null>(null);
    const button: React.CSSProperties = { padding: '6px 14px', border: `1px solid ${COLOR.border}`, borderRadius: 6, background: '#fff', color: COLOR.primary, fontSize: FONT.md, cursor: 'pointer' };
    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#fff' }}>
            <nav aria-label="Settings sections" style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${COLOR.border}`, padding: '20px 8px', background: COLOR.surfaceAlt }}>
                <div style={{ padding: '0 12px 12px', fontSize: FONT.lg, fontWeight: 700, color: COLOR.primary }}>Settings</div>
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        aria-current={section === s.id ? 'page' : undefined}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', border: 0, borderRadius: 6, cursor: 'pointer',
                            fontSize: FONT.md, color: COLOR.primary, background: section === s.id ? '#fff' : 'transparent', fontWeight: section === s.id ? 600 : 400,
                        }}
                    >{s.label}</button>
                ))}
            </nav>
            <main style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', maxWidth: 760 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: COLOR.primary, margin: '0 0 4px' }}>{SECTIONS.find(s => s.id === section)!.label}</h1>
                {section === 'model' && <ModelSection />}
                {section === 'explorer' && <ExplorerSection />}
                {section === 'compiler' && <Row title="SysML compiler" hint="The model names one; your own setting overrides it for you."><CompilerSettings /></Row>}
                {section === 'documents' && <Row title="Design history documents" hint="Model identity, branding, layout and numbering for generated documents."><button style={button} onClick={() => setPanel('documents')}>Open document settings</button></Row>}
                {section === 'assistant' && <Row title="AI assistant" hint="The provider and key the assistant uses."><button style={button} onClick={() => setPanel('assistant')}>Open assistant settings</button></Row>}
            </main>
            <Suspense fallback={null}>
                {panel === 'documents' && <DhfSettingsPanel onClose={() => setPanel(null)} />}
                {panel === 'assistant' && <LlmSettings onClose={() => setPanel(null)} />}
            </Suspense>
        </div>
    );
}
