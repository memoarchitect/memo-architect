// ─── Settings ────────────────────────────────────────────────────────────────
//
// One place for the choices a person makes about how Architect shows the model, in sections down the
// left, the way an editor's settings are laid out. Nothing here is a new setting: each section hosts
// the control that used to sit in the top bar or above the explorer, and saves the way it always did
// (this person's `memo.user.yaml`, or the model's own settings file for the compiler).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useModelStore, type DhfSettings } from '../store/model-store';
import { CompilerSettings } from '../components/CompilerSettings';
import { RoleSelector } from '../components/RoleSelector';
import { VersionSelector } from '../components/VersionSelector';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { RulesEditor } from '../components/RulesEditor';
import { sendOntologySelection } from '../store/ws-client';
import { MODEL_PLACEHOLDER, ORIGIN_LABEL, useLlmSettingsForm } from './LlmSettings';
import { EXPLORER_MODES, groupableAttributes } from '../lib/explorer-modes';
import { experimentalGrantedByCli, FEATURE_FLAGS, isFeatureEnabled } from '../config/feature-flags';
import { COLOR, FONT } from '../styles/tokens';

type SectionId = 'model' | 'rules' | 'methodology' | 'explorer' | 'features' | 'compiler' | 'documents' | 'assistant';

/** The sections, grouped by what they act on: the model itself, the workbench around it, and what comes out of it. */
const SECTION_GROUPS: { label: string; sections: { id: SectionId; label: string; icon: string }[] }[] = [
    { label: 'The model', sections: [
        { id: 'model', label: 'Model', icon: '☰' },
        { id: 'methodology', label: 'Methodology', icon: '☑' },
        { id: 'rules', label: 'Rules', icon: '⚖' },
    ] },
    { label: 'Workbench', sections: [
        { id: 'compiler', label: 'Compiler', icon: '⚙' },
        { id: 'explorer', label: 'Explorer', icon: '▤' },
        { id: 'features', label: 'Features', icon: '✦' },
    ] },
    { label: 'Output and assistance', sections: [
        { id: 'documents', label: 'Documents', icon: '⊞' },
        { id: 'assistant', label: 'AI assistant', icon: '◉' },
    ] },
];
const SECTIONS = SECTION_GROUPS.flatMap(group => group.sections);

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
const inputStyle: React.CSSProperties = { ...selectStyle, minWidth: 280, boxSizing: 'border-box' };

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

const PHASES: { value: DhfSettings['phase']; label: string }[] = [
    { value: '', label: 'Not set' },
    { value: 'concept', label: 'Concept' },
    { value: 'design', label: 'Design & Development' },
    { value: 'verification', label: 'Verification & Validation' },
    { value: 'production', label: 'Production' },
];

/** Identity, branding and layout of generated design history documents; each change applies as it is made. */
function DocumentsSection() {
    const settings = useModelStore(s => s.dhfSettings);
    const update = useModelStore(s => s.updateDhfSettings);
    const text = (key: Exclude<keyof DhfSettings, 'compactMode' | 'phase' | 'primaryColor'>, placeholder?: string, mono?: boolean) => (
        <input aria-label={key} value={settings[key]} placeholder={placeholder} onChange={e => update({ [key]: e.target.value })}
            style={{ ...inputStyle, fontFamily: mono ? 'ui-monospace, Menlo, monospace' : undefined }} />
    );
    return (
        <>
            <Group title="Model identity">
                <p style={{ fontSize: FONT.md, color: COLOR.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                    These values fill the {'{{project.*}}'} tokens in every template and the AI drafting context.
                </p>
                <Row title="Company" hint="The manufacturer named on documents.">{text('company', 'Acme Medical Devices Inc.')}</Row>
                <Row title="Product" hint="The product or device name.">{text('product', 'InfuSafe IV Pump')}</Row>
                <Row title="Device type" hint="Its class or kind.">{text('deviceType', 'Class II active implantable')}</Row>
                <Row title="Document version" hint="The version stamped on documents.">{text('version', '1.0.0')}</Row>
                <Row title="Development phase" hint="Where the product is in its lifecycle.">
                    <select aria-label="Development phase" value={settings.phase} onChange={e => update({ phase: e.target.value as DhfSettings['phase'] })} style={selectStyle}>
                        {PHASES.map(phase => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
                    </select>
                </Row>
                <Row title="Document ID prefix" hint={`Used in document ids, for example ${settings.documentNumberingPrefix || 'DOC'}-RMP-001.`}>{text('documentNumberingPrefix', 'DOC', true)}</Row>
            </Group>
            <Group title="Branding">
                <Row title="Logo" hint="Shown on cover pages and report headers. A URL or a data URI.">{text('logoUrl', 'https://…')}</Row>
                <Row title="Compact logo" hint="Shown in page headers. Falls back to the logo when empty.">{text('compactLogoUrl', 'https://…')}</Row>
                <Row title="Primary colour" hint="Headings, table headers and badges in exported documents.">
                    <input type="color" aria-label="Primary colour" value={settings.primaryColor || '#1B3A4B'} onChange={e => update({ primaryColor: e.target.value })}
                        style={{ width: 40, height: 36, padding: 2, border: `1px solid ${COLOR.border}`, borderRadius: 8, marginRight: 8, cursor: 'pointer' }} />
                    <input aria-label="Primary colour value" value={settings.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                        style={{ ...selectStyle, minWidth: 110, width: 110, fontFamily: 'ui-monospace, Menlo, monospace' }} />
                </Row>
            </Group>
            <Group title="Layout">
                <Row title="Compact mode" hint="Tighter line spacing and smaller headings, useful for regulatory submissions.">
                    <Switch label="Compact mode" checked={settings.compactMode} onChange={on => update({ compactMode: on })} />
                </Row>
                <Row title="Page header" hint="Tokens: {{id}} {{title}} {{project.product}} {{project.version}} {{date}}">{text('headerTemplate', undefined, true)}</Row>
                <Row title="Page footer" hint="The same tokens, plus {{page}} and {{pages}}.">{text('footerTemplate', undefined, true)}</Row>
            </Group>
        </>
    );
}

/** The provider, model and key the assistant uses. The key is write-only: it is saved outside the project and never sent back. */
function AssistantSection() {
    const { settings, provider, setProvider, model, setModel, apiKey, setApiKey, saving, note, save, clearKey } = useLlmSettingsForm();
    const keyFixed = Boolean(settings && !settings.keyEditable && settings.configured);
    return (
        <Group>
            <Row title="Provider" hint="Which service answers the assistant.">
                <select aria-label="Provider" value={provider} onChange={e => setProvider(e.target.value)} style={selectStyle}>
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI-compatible</option>
                </select>
            </Row>
            <Row title="Model" hint="The model to ask. Leave empty for the provider's default.">
                <input aria-label="Model" value={model} onChange={e => setModel(e.target.value)} placeholder={MODEL_PLACEHOLDER[provider] ?? ''} style={inputStyle} />
            </Row>
            <Row title="API key"
                hint={keyFixed
                    ? `A key is supplied by ${ORIGIN_LABEL[settings!.keyOrigin ?? 'default']}, which takes precedence over anything saved here. Remove it there to set one from this screen.`
                    : 'Stored in ~/.memo/credentials.json with owner-only permissions, outside this project, so it is never committed. ANTHROPIC_API_KEY in the environment also works.'}>
                {!keyFixed && (
                    <input aria-label="API key" type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)}
                        placeholder={settings?.configured ? 'Saved. Type a new key to replace it' : 'sk-…'} style={inputStyle} />
                )}
            </Row>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                <button style={{ ...buttonStyle, background: COLOR.primary, color: '#fff', opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
                {settings?.configured && settings.keyEditable && (
                    <button style={{ ...buttonStyle, color: '#DC2626' }} disabled={saving} onClick={clearKey}>Remove saved key</button>
                )}
                {note && <span style={{ fontSize: FONT.md, color: COLOR.muted }}>{note}</span>}
            </div>
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
    // The tab is part of the view, so it is in the address: /settings/rules.
    const view = useModelStore(s => s.activeView);
    const setActiveView = useModelStore(s => s.setActiveView);
    const requested = view.type === 'settings' ? view.section : undefined;
    const section: SectionId = SECTIONS.some(candidate => candidate.id === requested) ? requested as SectionId : 'model';
    const setSection = (id: SectionId) => setActiveView({ type: 'settings', section: id });
    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: '#fff' }}>
            <nav aria-label="Settings sections" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${COLOR.border}`, padding: '20px 12px', background: COLOR.surfaceAlt, overflowY: 'auto' }}>
                {SECTION_GROUPS.map(group => (
                    <div key={group.label} style={{ marginBottom: 16 }}>
                        <div style={{ padding: '0 12px 6px', fontSize: FONT.sm, color: COLOR.muted }}>{group.label}</div>
                        {group.sections.map(s => (
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
                    </div>
                ))}
            </nav>
            <main style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
                <div style={{ maxWidth: 820 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 600, color: COLOR.primary, margin: '0 0 24px' }}>{SECTIONS.find(s => s.id === section)!.label}</h1>
                    {section === 'model' && <ModelSection />}
                    {section === 'methodology' && <MethodologySection />}
                    {section === 'rules' && <RulesSection />}
                    {section === 'compiler' && <Group><Row title="SysML compiler" hint="The model names one; your own setting overrides it for you."><CompilerSettings /></Row></Group>}
                    {section === 'explorer' && <ExplorerSection />}
                    {section === 'features' && <FeaturesSection />}
                    {section === 'documents' && <DocumentsSection />}
                    {section === 'assistant' && <AssistantSection />}
                </div>
            </main>
        </div>
    );
}
