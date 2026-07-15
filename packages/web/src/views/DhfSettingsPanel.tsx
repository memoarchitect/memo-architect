// ─── DHF Settings Panel ───────────────────────────────────────────────────────
//
// Global settings for DHF document generation:
//   - Project identity (company, product, device type, version, phase)
//   - Branding (logo, compact logo, primary color)
//   - Document layout (compact mode, header/footer templates)
//   - Document numbering prefix
//   - Authors / approvers (populate approval blocks)
//
// These values resolve {{project.*}} directives in templates and control the
// look & feel of exported documents. Individual document overrides are handled
// per-document via the document's own frontmatter.
//
// Rendered as a modal overlay; open via the gear icon in DhfWorkbench toolbar.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../store/model-store';
import type { DhfSettings } from '../store/model-store';

interface Props {
    onClose: () => void;
}

const PHASES: { value: DhfSettings['phase']; label: string }[] = [
    { value: '', label: '— Select phase —' },
    { value: 'concept', label: 'Concept' },
    { value: 'design', label: 'Design & Development' },
    { value: 'verification', label: 'Verification & Validation' },
    { value: 'production', label: 'Production' },
];

const FIELD_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1B3A4B',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
};

const LABEL_STYLE: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'block',
    marginBottom: '4px',
};

const SECTION_TITLE: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1B3A4B',
    paddingBottom: '6px',
    borderBottom: '1px solid #E5E7EB',
    marginBottom: '12px',
    marginTop: '4px',
};

const GRID2: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
};

export function DhfSettingsPanel({ onClose }: Props) {
    const dhfSettings = useModelStore(s => s.dhfSettings);
    const updateDhfSettings = useModelStore(s => s.updateDhfSettings);

    // Local copy of settings — only committed on Save
    const [local, setLocal] = useState<DhfSettings>({ ...dhfSettings });
    const [activeTab, setActiveTab] = useState<'identity' | 'branding' | 'layout'>('identity');

    function set<K extends keyof DhfSettings>(key: K, value: DhfSettings[K]) {
        setLocal(prev => ({ ...prev, [key]: value }));
    }

    function handleSave() {
        updateDhfSettings(local);
        onClose();
    }

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.45)',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: '12px', width: '560px',
                maxHeight: '86vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
                    flexShrink: 0,
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1B3A4B', flex: 1 }}>
                        DHF Global Settings
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '20px', lineHeight: 1, padding: '0 2px' }}
                    >×</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0, padding: '0 20px' }}>
                    {(['identity', 'branding', 'layout'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 14px', border: 'none', background: 'none',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                color: activeTab === tab ? '#1B3A4B' : '#9CA3AF',
                                borderBottom: `2px solid ${activeTab === tab ? '#2DD4A8' : 'transparent'}`,
                                marginBottom: '-1px', textTransform: 'capitalize',
                            }}
                        >
                            {tab === 'identity' ? 'Project' : tab === 'branding' ? 'Branding' : 'Layout'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {activeTab === 'identity' && (
                        <div>
                            <p style={SECTION_TITLE}>Project Identity</p>
                            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', lineHeight: '1.5' }}>
                                These values resolve <code style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: '3px' }}>{'{{project.*}}'}</code> directives in all templates and the AI drafting context.
                            </p>
                            <div style={GRID2}>
                                <div>
                                    <label style={LABEL_STYLE}>Company / Manufacturer</label>
                                    <input style={FIELD_STYLE} value={local.company} onChange={e => set('company', e.target.value)} placeholder="Acme Medical Devices Inc." />
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Product / Device Name</label>
                                    <input style={FIELD_STYLE} value={local.product} onChange={e => set('product', e.target.value)} placeholder="InfuSafe IV Pump" />
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Device Type</label>
                                    <input style={FIELD_STYLE} value={local.deviceType} onChange={e => set('deviceType', e.target.value)} placeholder="Class II active implantable" />
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Document Version</label>
                                    <input style={FIELD_STYLE} value={local.version} onChange={e => set('version', e.target.value)} placeholder="1.0.0" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={LABEL_STYLE}>Development Phase</label>
                                    <select style={FIELD_STYLE} value={local.phase} onChange={e => set('phase', e.target.value as DhfSettings['phase'])}>
                                        {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={LABEL_STYLE}>Document ID Prefix</label>
                                    <input style={{ ...FIELD_STYLE, fontFamily: 'monospace' }} value={local.documentNumberingPrefix} onChange={e => set('documentNumberingPrefix', e.target.value)} placeholder="DOC" />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                        Used in document IDs, e.g. <code>{local.documentNumberingPrefix || 'DOC'}-RMP-001</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div>
                            <p style={SECTION_TITLE}>Branding</p>
                            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', lineHeight: '1.5' }}>
                                Branding applied to exported HTML and DOCX documents. Per-document overrides can be set in the document's frontmatter.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={LABEL_STYLE}>Full Logo URL</label>
                                    <input style={FIELD_STYLE} value={local.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://... or data:image/png;base64,..." />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Shown in document cover pages and report headers.</p>
                                    {local.logoUrl && (
                                        <img src={local.logoUrl} alt="Logo preview" style={{ maxHeight: '48px', maxWidth: '200px', marginTop: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '4px' }} />
                                    )}
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Compact Logo URL</label>
                                    <input style={FIELD_STYLE} value={local.compactLogoUrl} onChange={e => set('compactLogoUrl', e.target.value)} placeholder="https://... or data:image/png;base64,..." />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Shown in page headers (small). Falls back to Full Logo if empty.</p>
                                    {local.compactLogoUrl && (
                                        <img src={local.compactLogoUrl} alt="Compact logo preview" style={{ maxHeight: '28px', maxWidth: '120px', marginTop: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '4px' }} />
                                    )}
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Primary Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="color"
                                            value={local.primaryColor}
                                            onChange={e => set('primaryColor', e.target.value)}
                                            style={{ width: '40px', height: '32px', padding: '2px', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer' }}
                                        />
                                        <input
                                            style={{ ...FIELD_STYLE, flex: 1, fontFamily: 'monospace' }}
                                            value={local.primaryColor}
                                            onChange={e => set('primaryColor', e.target.value)}
                                            placeholder="#1B3A4B"
                                        />
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>Used for headings, table headers, and badges in exported documents.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div>
                            <p style={SECTION_TITLE}>Document Layout</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ ...LABEL_STYLE, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontSize: '13px', fontWeight: 600, color: '#1B3A4B', marginBottom: 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={local.compactMode}
                                            onChange={e => set('compactMode', e.target.checked)}
                                            style={{ accentColor: '#2DD4A8' }}
                                        />
                                        Compact mode
                                    </label>
                                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', marginLeft: '20px' }}>
                                        Tighter line spacing and smaller heading sizes. Useful for regulatory submissions.
                                    </p>
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Page Header Template</label>
                                    <input style={{ ...FIELD_STYLE, fontFamily: 'monospace', fontSize: '12px' }} value={local.headerTemplate} onChange={e => set('headerTemplate', e.target.value)} />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                        Tokens: <code>{'{{id}}'}</code>, <code>{'{{title}}'}</code>, <code>{'{{project.product}}'}</code>, <code>{'{{project.version}}'}</code>, <code>{'{{date}}'}</code>
                                    </p>
                                </div>
                                <div>
                                    <label style={LABEL_STYLE}>Page Footer Template</label>
                                    <input style={{ ...FIELD_STYLE, fontFamily: 'monospace', fontSize: '12px' }} value={local.footerTemplate} onChange={e => set('footerTemplate', e.target.value)} />
                                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                        Tokens: same as header, plus <code>{'{{page}}'}</code> and <code>{'{{pages}}'}</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '8px',
                    padding: '14px 20px', borderTop: '1px solid #E5E7EB',
                    flexShrink: 0, background: '#FAFAFA',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: '1px solid #D1D5DB', background: '#fff',
                            fontSize: '13px', cursor: 'pointer', color: '#374151',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 20px', borderRadius: '6px',
                            border: 'none', background: '#2DD4A8',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#065F46',
                        }}
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
