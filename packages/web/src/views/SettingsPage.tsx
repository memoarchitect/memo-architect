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
import { RulesEditor } from '../components/RulesEditor';
import { sendOntologySelection } from '../store/ws-client';
import { EXPLORER_MODES, groupableAttributes } from '../lib/explorer-modes';
import { experimentalGrantedByCli, FEATURE_FLAGS, isFeatureEnabled } from '../config/feature-flags';
import { COLOR, FONT } from '../styles/tokens';

const DhfSettingsPanel = lazy(() => import('./DhfSettingsPanel').then(m => ({ default: m.DhfSettingsPanel })));
const LlmSettings = lazy(() => import('./LlmSettings').then(m => ({ default: m.LlmSettings })));

type SectionId = 'model' | 'rules' | 'methodology' | 'explorer' | 'features' | 'compiler' | 'documents' | 'assistant';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
    { id: 'model', label: 'Model', icon: '☰' },
    { id: 'rules', label: 'Rules', icon: '⚖' },
    { id: 'methodology', label: 'Methodology', icon: '☑' },
    { id: 'explorer', label: 'Explorer', icon: '▤' },
    { id: 'features', label: 'Features', icon: '✦' },
    { id: 'compiler', label: 'Compiler', icon: '⚙' },
    { id: 'documents', label: 'Documents', icon: '⊞' },
    { id: 'assistant', label: 'AI assistant', icon: '◉' },
];

/** A heading over a group of rows. */
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: 32 }}>
            {title && <h2 style={{ fontSize: 18, fontWeight: 600, color: COLOR.primary, margin: '0 0 8px' }}>{title}</h2>}
            {children}
        </section>
    );
}

/** One setting: its name and what it does on the left, its control on the right. */
function Row({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, padding: '16px 0', borderBottom: `1px solid ${COLOR.borderLight}` }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: FONT.lg, fontWeight: 500, color: COLOR.primary }}>{title}</div>
                {hint && <div style={{ fontSize: FONT.md, color: COLOR.muted, marginTop: 2, lineHeight: 1.45 }}>{hint}</div>}
            </div>
            {children && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{children}</div>}
        </div>
    );
}

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
    return (
        <button
            type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
            style={{
                width: 44, height: 26, borderRadius: 13, border: 0, padding: 3, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
                background: checked ? COLOR.accent : COLOR.border, display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start', transition: 'background 120ms',
            }}
        >
            <span style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
        </button>
    );
}

const selectStyle: React.CSSProperties = { background: '#fff', color: COLOR.primary, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '8px 12px', fontSize: FONT.md, minWidth: 200 };
const buttonStyle: React.CSSProperties = { padding: '8px 16px', border: `1px solid ${COLOR.border}`, borderRadius: 8, background: '#fff', color: COLOR.primary, fontSize: FONT.md, cursor: 'pointer' };

function ModelSection() {
    return (
        <Group>
            <Row title="Version" hint="Show the working model, a release, or an unreleased ref (read only)."><VersionSelector tone="light" /></Row>
            <Row title="Workspace" hint="Show one system or the whole model. Saved for you only, in memo.user.yaml."><WorkspaceSelector tone="light" /></Row>
            <Row title="Role" hint="Show the viewpoints written for one stakeholder. Saved for you only."><RoleSelector tone="light" /></Row>
        </Group>
    );
}

/** The rules the project is checked against, with the means to tailor them: the editor itself, not a link to it. */
function RulesSection() {
    return (
        <Group>
            <p style={{ fontSize: FONT.md, color: COLOR.muted, margin: '0 0 16px', lineHeight: 1.45 }}>
                What this project is checked against, and the clause each rule enforces. You may switch off, downgrade or replace any rule; the record of who decided and why is kept.
            </p>
            <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 10, overflow: 'hidden' }}><RulesEditor /></div>
        </Group>
    );
}

/** The packages every project builds on; they cannot be turned off. */
const FOUNDATION_PACKAGES = ['@memoarchitect/ontology'];

const TYPE_LABEL: Record<string, string> = { ontology: 'Ontology', profile: 'Profile', extension: 'Extension', methodology: 'Methodology' };

/**
 * Which MEMO extensions and layers the model uses. Each installed package is a switch; a package's
 * layers are listed under it. Turning one off is saved the way the Ontology tab saves it, after
 * the same check for elements whose kinds the package defines.
 */
function MethodologySection() {
    const available = useModelStore(s => s.availableOntologies);
    const selected = useModelStore(s => s.selectedOntologies);
    const toggle = useModelStore(s => s.toggleOntologySelection);
    const check = useModelStore(s => s.saveOntologySelection);
    const methodology = useModelStore(s => s.methodology);
    const effective = methodology?.effective;
    const chosen = effective?.chain[effective.chain.length - 1];

    function change(name: string, on: boolean) {
        toggle(name);
        const next = new Set(selected);
        if (on) next.add(name); else next.delete(name);
        if (!on) {
            // `check` reads the store after the toggle; keep the elements that depend on this package.
            const orphanedElements = (check().orphanedElements ?? []).filter(element => element.fromOntology === name);
            if (orphanedElements.length > 0 && !window.confirm(
                `${orphanedElements.length} element(s) use kinds that ${name} defines. They stay in the model but lose their kind. Turn it off?`,
            )) { toggle(name); return; }
        }
        sendOntologySelection([...next]);
    }

    if (available.length === 0) {
        return <Group><Row title="No packages found" hint="Architect has not loaded the project's ontology packages." /></Group>;
    }
    return (
        <Group>
            <p style={{ fontSize: FONT.md, color: COLOR.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                The MEMO extensions and layers this model uses. Each layer is a group of element kinds, such as requirements, risk or architecture.
                {chosen ? ` Methodology: ${chosen.displayName ?? chosen.usageName}${chosen.version ? ` ${chosen.version}` : ''}.` : ''}
            </p>
            {available.map(pkg => {
                const foundation = FOUNDATION_PACKAGES.includes(pkg.name);
                const layers = pkg.layers.map(layer => `${layer.label} (${layer.kindCount})`).join(', ');
                return (
                    <Row key={pkg.name} title={`${pkg.name} ${pkg.version}`}
                        hint={[TYPE_LABEL[pkg.type] ?? pkg.type, pkg.extends ? `extends ${pkg.extends}` : '', pkg.description, layers ? `Layers: ${layers}` : ''].filter(Boolean).join(' · ')}>
                        <Switch label={pkg.name} checked={selected.has(pkg.name)} disabled={foundation} onChange={on => change(pkg.name, on)} />
                    </Row>
                );
            })}
        </Group>
    );
}

/**
 * The experimental features, each a switch. They are off until a person turns one on, and that
 * choice is saved for them only (memo.user.yaml). Which features exist and what each is comes from
 * the registry in config/feature-flags.ts, not from a list here.
 */
function FeaturesSection() {
    const features = useModelStore(s => s.features);
    const setFeatureEnabled = useModelStore(s => s.setFeatureEnabled);
    const grantedByCli = experimentalGrantedByCli();
    const experimental = FEATURE_FLAGS.filter(flag => flag.stage === 'experimental');
    return (
        <Group>
            <p style={{ fontSize: FONT.md, color: COLOR.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                Features that are not part of the regulated workflow stay off until you switch them on. Saved for you only, in memo.user.yaml.
                {grantedByCli && ' Architect was started with --experimental, so all of them are on.'}
            </p>
            {experimental.map(flag => (
                <Row key={flag.id} title={flag.label} hint={flag.description}>
                    <Switch label={flag.label} checked={isFeatureEnabled(flag.id)} disabled={grantedByCli} onChange={on => setFeatureEnabled(flag.id, on)} />
                </Row>
            ))}
            {/* Re-reads the saved list, so the switches follow a change made elsewhere. */}
            <span hidden>{features.length}</span>
        </Group>
    );
}

function ExplorerSection() {
    const model = useModelStore(s => s.model);
    const mode = useModelStore(s => s.explorerMode);
    const setMode = useModelStore(s => s.setExplorerMode);
    const split = useModelStore(s => s.explorerSplit);
    const setSplit = useModelStore(s => s.setExplorerSplit);
    const packageFolders = useModelStore(s => s.packageFolders);
    const setPackageFolders = useModelStore(s => s.setPackageFolders);
    const attributes = useMemo(() => groupableAttributes(Object.values(model?.elements ?? {})), [model]);
    return (
        <Group>
            <Row title="Group the Model Explorer" hint="How the top level of the tree is organised. The tree below it follows the model's packages.">
                <select aria-label="Group the Model Explorer" value={mode} onChange={e => setMode(e.target.value as typeof mode)} style={selectStyle}>
                    {EXPLORER_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
            </Row>
            <Row title="Show packages as folders" hint="On, each SysML package is a folder in the tree. Off, the package level is skipped and elements are listed by type. Saved for you only.">
                <Switch label="Show packages as folders" checked={packageFolders} onChange={setPackageFolders} />
            </Row>
            <Row title="Split folders by" hint="Split each folder by an attribute with a few values. Saved for you only.">
                <select aria-label="Split folders by" data-testid="explorer-group-by" value={split} onChange={e => setSplit(e.target.value)} style={selectStyle}>
                    <option value="">nothing</option>
                    {attributes.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
            </Row>
        </Group>
    );
}

export function SettingsPage() {
    const [section, setSection] = useState<SectionId>('model');
    const [panel, setPanel] = useState<'documents' | 'assistant' | null>(null);
    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#fff' }}>
            <nav aria-label="Settings sections" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${COLOR.border}`, padding: '20px 12px', background: COLOR.surfaceAlt, overflowY: 'auto' }}>
                <div style={{ padding: '0 12px 12px', fontSize: FONT.md, color: COLOR.muted }}>Settings</div>
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        aria-current={section === s.id ? 'page' : undefined}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '9px 12px', marginBottom: 2, border: 0, borderRadius: 8, cursor: 'pointer',
                            fontSize: FONT.lg, color: COLOR.primary, background: section === s.id ? COLOR.borderLight : 'transparent', fontWeight: section === s.id ? 600 : 400,
                        }}
                    ><span style={{ width: 20, textAlign: 'center', color: COLOR.muted }}>{s.icon}</span>{s.label}</button>
                ))}
            </nav>
            <main style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
                <div style={{ maxWidth: 820 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 600, color: COLOR.primary, margin: '0 0 24px' }}>{SECTIONS.find(s => s.id === section)!.label}</h1>
                    {section === 'model' && <ModelSection />}
                    {section === 'rules' && <RulesSection />}
                    {section === 'methodology' && <MethodologySection />}
                    {section === 'explorer' && <ExplorerSection />}
                    {section === 'features' && <FeaturesSection />}
                    {section === 'compiler' && <Group><Row title="SysML compiler" hint="The model names one; your own setting overrides it for you."><CompilerSettings /></Row></Group>}
                    {section === 'documents' && <Group><Row title="Design history documents" hint="Model identity, branding, layout and numbering for generated documents."><button style={buttonStyle} onClick={() => setPanel('documents')}>Document settings</button></Row></Group>}
                    {section === 'assistant' && <Group><Row title="AI assistant" hint="The provider and key the assistant uses."><button style={buttonStyle} onClick={() => setPanel('assistant')}>Assistant settings</button></Row></Group>}
                </div>
            </main>
            <Suspense fallback={null}>
                {panel === 'documents' && <DhfSettingsPanel onClose={() => setPanel(null)} />}
                {panel === 'assistant' && <LlmSettings onClose={() => setPanel(null)} />}
            </Suspense>
        </div>
    );
}
