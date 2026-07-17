// ─── New Document Wizard ──────────────────────────────────────────────────────
//
// Guided three-step flow for creating DHF documents:
//   1. Category  — the built-in groups plus a custom "Other" category
//   2. Template  — meMO templates in the category, a blank document, or any
//                  markdown file from the project git repo
//   3. Confirm   — preview computed document IDs, adjust titles, create
//
// Repo templates are listed/read through the dev server (dhf:templates:*).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useModelStore } from '../store/model-store';
import type { DhfDoc } from '../store/model-store';
import { sendDhfTemplatesList, sendDhfTemplateRead } from '../store/ws-client';
import type { DhfRepoTemplateInfo } from '@memoarchitect/tools/browser';
import {
    DHF_GROUPS, OTHER_GROUP_ID, OTHER_GROUP_COLOR,
    prefixFromTitle,
} from './dhf-groups';
import type { DhfGroup, DhfTemplate } from './dhf-groups';

/** One document the wizard resolved for creation */
export interface NewDocSpec {
    title: string;
    prefix: string;
    /** Built-in template id, `repo:<path>`, or `blank` */
    templateId: string;
    groupLabel: string;
    /** Resolved markdown body; null → caller loads the built-in template */
    content: string | null;
}

interface PickState {
    builtIn: Set<string>;
    repo: Set<string>;
    blank: boolean;
}

const MODAL_BG = {
    position: 'fixed' as const, inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.4)',
};
const MODAL = {
    background: '#fff', borderRadius: '12px', padding: '20px',
    width: '460px', maxHeight: '560px', display: 'flex', flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const STEP_LABELS = ['Category', 'Template', 'Confirm'];

function requestFromServer<T>(send: (requestId: string) => void, timeoutMs = 10000): Promise<T> {
    const { registerLlmRequest } = useModelStore.getState();
    const requestId = `dhf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise<T>((resolve, reject) => {
        registerLlmRequest(requestId, resolve, reject);
        send(requestId);
        setTimeout(() => reject(new Error('Request timed out.')), timeoutMs);
    });
}

export function NewDocumentWizard({ initialGroupId, existingDocs, numberingPrefix, onCreate, onClose }: {
    /** Preselect a category (right-click entry) and skip to step 2 */
    initialGroupId?: string;
    existingDocs: DhfDoc[];
    numberingPrefix: string;
    onCreate: (specs: NewDocSpec[]) => void;
    onClose: () => void;
}) {
    const connected = useModelStore(s => s.connected);
    const initialGroup = DHF_GROUPS.find(g => g.id === initialGroupId) ?? null;
    const [step, setStep] = useState(initialGroup ? 1 : 0);
    const [group, setGroup] = useState<DhfGroup | null>(initialGroup);
    const [customLabel, setCustomLabel] = useState('');
    const [picks, setPicks] = useState<PickState>({ builtIn: new Set(), repo: new Set(), blank: false });
    const [blankTitle, setBlankTitle] = useState('Untitled Document');
    const [repoTemplates, setRepoTemplates] = useState<DhfRepoTemplateInfo[] | null>(null);
    const [repoError, setRepoError] = useState<string | null>(null);
    const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const isOther = group === null && step > 0;
    const groupLabel = isOther ? (customLabel.trim() || 'Other') : group?.label ?? '';
    const groupColor = group?.color ?? OTHER_GROUP_COLOR;
    const existingTemplateIds = useMemo(() => new Set(existingDocs.map(d => d.templateId)), [existingDocs]);

    // Load repo templates when the template step opens
    useEffect(() => {
        if (step !== 1 || repoTemplates !== null || !connected) return;
        requestFromServer<DhfRepoTemplateInfo[]>(id => sendDhfTemplatesList(id))
            .then(setRepoTemplates)
            .catch(e => setRepoError(e?.message ?? 'Could not list repository files.'));
    }, [step, repoTemplates, connected]);

    // ─── Selection → draft documents for the confirm step ───────────────────
    interface Draft { key: string; defaultTitle: string; prefix: string; templateId: string; }
    const drafts: Draft[] = useMemo(() => {
        const out: Draft[] = [];
        for (const t of group?.templates ?? []) {
            if (picks.builtIn.has(t.id)) out.push({ key: t.id, defaultTitle: t.title, prefix: t.prefix, templateId: t.id });
        }
        for (const path of picks.repo) {
            const info = repoTemplates?.find(t => t.path === path);
            const title = info?.title ?? path.split('/').pop()!.replace(/\.md$/, '');
            out.push({ key: `repo:${path}`, defaultTitle: title, prefix: prefixFromTitle(title), templateId: `repo:${path}` });
        }
        if (picks.blank) {
            out.push({ key: 'blank', defaultTitle: blankTitle.trim() || 'Untitled Document', prefix: prefixFromTitle(blankTitle), templateId: 'blank' });
        }
        return out;
    }, [picks, group, repoTemplates, blankTitle]);

    const draftTitle = (d: Draft) => (titleOverrides[d.key] ?? d.defaultTitle);
    /** Built-ins keep their registry prefix; blank/repo docs derive one from the title */
    const draftPrefix = (d: Draft) =>
        d.templateId === 'blank' || d.templateId.startsWith('repo:') ? prefixFromTitle(draftTitle(d)) : d.prefix;

    /** Preview IDs with the same numbering rule used at creation */
    const previewIds = useMemo(() => {
        const counts = new Map<string, number>();
        return drafts.map(d => {
            const idPrefix = `${numberingPrefix}-${draftPrefix(d)}-`;
            const already = existingDocs.filter(doc => doc.id.startsWith(idPrefix)).length;
            const offset = counts.get(idPrefix) ?? 0;
            counts.set(idPrefix, offset + 1);
            return `${idPrefix}${String(already + offset + 1).padStart(3, '0')}`;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drafts, titleOverrides, existingDocs, numberingPrefix]);

    async function handleCreate() {
        setCreating(true);
        setCreateError(null);
        try {
            const specs: NewDocSpec[] = [];
            for (const d of drafts) {
                let content: string | null = null;
                if (d.templateId.startsWith('repo:')) {
                    content = await requestFromServer<string>(id => sendDhfTemplateRead(id, d.templateId.slice(5)));
                } else if (d.templateId === 'blank') {
                    content = `# ${draftTitle(d)}\n\n_[TODO: Add content]_\n`;
                }
                specs.push({ title: draftTitle(d), prefix: draftPrefix(d), templateId: d.templateId, groupLabel, content });
            }
            onCreate(specs);
        } catch (e: any) {
            setCreateError(e?.message ?? 'Could not read template.');
            setCreating(false);
        }
    }

    const canNext = step === 0
        ? true
        : step === 1
            ? drafts.length > 0
            : drafts.length > 0 && !creating;

    return (
        <div style={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={MODAL}>
                {/* Header + step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1B3A4B', flex: 1 }}>New Document</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {STEP_LABELS.map((label, i) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: i === step ? 700 : 500, color: i === step ? '#1B3A4B' : i < step ? '#059669' : '#9CA3AF' }}>
                            <span style={{
                                width: '16px', height: '16px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px', fontWeight: 700, color: '#fff',
                                background: i === step ? '#1B3A4B' : i < step ? '#059669' : '#D1D5DB',
                            }}>{i < step ? '✓' : i + 1}</span>
                            {label}
                            {i < STEP_LABELS.length - 1 && <span style={{ color: '#D1D5DB' }}>—</span>}
                        </div>
                    ))}
                </div>

                {/* ── Step 1: Category ── */}
                {step === 0 && (
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {DHF_GROUPS.map(g => (
                            <CategoryRow key={g.id} label={g.label} color={g.color}
                                detail={`${g.templates.length} meMO templates`}
                                selected={group?.id === g.id}
                                onClick={() => { setGroup(g); setPicks({ builtIn: new Set(), repo: new Set(), blank: false }); }} />
                        ))}
                        <CategoryRow label="Other" color={OTHER_GROUP_COLOR}
                            detail="Custom category — blank or repository template"
                            selected={group === null && customLabel !== ''}
                            onClick={() => { setGroup(null); setCustomLabel(customLabel || 'Other'); setPicks({ builtIn: new Set(), repo: new Set(), blank: false }); }} />
                        {group === null && customLabel !== '' && (
                            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                                placeholder="Category name, e.g. Clinical"
                                autoFocus
                                style={{ margin: '2px 0 0 26px', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '5px', fontSize: '12px', color: '#1B3A4B', outline: 'none' }} />
                        )}
                    </div>
                )}

                {/* ── Step 2: Template ── */}
                {step === 1 && (
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: groupColor, display: 'inline-block' }} />
                            <strong style={{ color: '#1B3A4B' }}>{groupLabel}</strong>
                            <span>— pick one or more sources</span>
                        </div>

                        {group && group.templates.length > 0 && (
                            <Section title="meMO templates" hint="Prefilled sections and model queries">
                                {group.templates.map(t => (
                                    <PickRow key={t.id}
                                        label={t.title} sub={t.id} color={groupColor}
                                        checked={picks.builtIn.has(t.id)}
                                        disabled={existingTemplateIds.has(t.id)}
                                        disabledNote="exists"
                                        onToggle={() => setPicks(p => {
                                            const next = new Set(p.builtIn);
                                            next.has(t.id) ? next.delete(t.id) : next.add(t.id);
                                            return { ...p, builtIn: next };
                                        })} />
                                ))}
                            </Section>
                        )}

                        <Section title="Blank document" hint="Start from an empty page">
                            <PickRow label={picks.blank ? '' : 'Blank document'} color={groupColor}
                                checked={picks.blank}
                                onToggle={() => setPicks(p => ({ ...p, blank: !p.blank }))}>
                                {picks.blank && (
                                    <input value={blankTitle} onChange={e => setBlankTitle(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: '5px', fontSize: '12px', color: '#1B3A4B', outline: 'none' }} />
                                )}
                            </PickRow>
                        </Section>

                        <Section title="From repository" hint="Any markdown file in this project">
                            {!connected && <Note text="Dev server not connected — repository templates unavailable." />}
                            {connected && repoError && <Note text={repoError} error />}
                            {connected && !repoError && repoTemplates === null && <Note text="Loading repository files…" />}
                            {connected && repoTemplates?.length === 0 && <Note text="No markdown files found in this project." />}
                            {connected && repoTemplates?.map(t => (
                                <PickRow key={t.path}
                                    label={t.title} sub={t.path} color={groupColor}
                                    checked={picks.repo.has(t.path)}
                                    onToggle={() => setPicks(p => {
                                        const next = new Set(p.repo);
                                        next.has(t.path) ? next.delete(t.path) : next.add(t.path);
                                        return { ...p, repo: next };
                                    })} />
                            ))}
                        </Section>
                    </div>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 2 && (
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                            {drafts.length} document{drafts.length === 1 ? '' : 's'} will be created in
                            <strong style={{ color: '#1B3A4B' }}> {groupLabel}</strong> and saved to <code style={{ background: '#F3F4F6', padding: '0 4px', borderRadius: '3px', fontSize: '11px' }}>dhf/documents/</code>:
                        </div>
                        {drafts.map((d, i) => (
                            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: groupColor, whiteSpace: 'nowrap' }}>{previewIds[i]}</span>
                                <input value={draftTitle(d)}
                                    onChange={e => setTitleOverrides(o => ({ ...o, [d.key]: e.target.value }))}
                                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: '5px', fontSize: '12px', color: '#1B3A4B', outline: 'none' }} />
                                <span style={{ fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                    {d.templateId === 'blank' ? 'blank' : d.templateId.startsWith('repo:') ? 'repo' : 'meMO'}
                                </span>
                            </div>
                        ))}
                        {createError && <Note text={createError} error />}
                    </div>
                )}

                {/* ── Footer ── */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)} disabled={creating}
                            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151', marginRight: 'auto' }}>
                            ← Back
                        </button>
                    )}
                    <button onClick={onClose}
                        style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                        Cancel
                    </button>
                    {step < 2 ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                            style={{
                                padding: '7px 16px', borderRadius: '6px', border: 'none',
                                background: canNext ? '#1B3A4B' : '#E5E7EB', color: canNext ? '#fff' : '#9CA3AF',
                                fontSize: '13px', fontWeight: 600, cursor: canNext ? 'pointer' : 'default',
                            }}>
                            Next →
                        </button>
                    ) : (
                        <button onClick={handleCreate} disabled={!canNext}
                            style={{
                                padding: '7px 16px', borderRadius: '6px', border: 'none',
                                background: canNext ? groupColor : '#E5E7EB', color: canNext ? '#fff' : '#9CA3AF',
                                fontSize: '13px', fontWeight: 600, cursor: canNext ? 'pointer' : 'default',
                            }}>
                            {creating ? 'Creating…' : `Create ${drafts.length > 0 ? `(${drafts.length})` : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Small presentational pieces ──────────────────────────────────────────────

function CategoryRow({ label, color, detail, selected, onClick }: {
    label: string; color: string; detail: string; selected: boolean; onClick: () => void;
}) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px',
            borderRadius: '6px', border: `1px solid ${selected ? color : '#E5E7EB'}`,
            background: selected ? `${color}10` : '#fff', cursor: 'pointer', textAlign: 'left',
        }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#1B3A4B' }}>{label}</span>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{detail}</span>
        </button>
    );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                {title} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9CA3AF' }}>— {hint}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div>
        </div>
    );
}

function PickRow({ label, sub, color, checked, disabled, disabledNote, onToggle, children }: {
    label: string; sub?: string; color: string; checked: boolean;
    disabled?: boolean; disabledNote?: string; onToggle: () => void; children?: React.ReactNode;
}) {
    return (
        <label style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px',
            borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
            background: checked ? `${color}10` : 'transparent', opacity: disabled ? 0.45 : 1,
        }}>
            <input type="checkbox" checked={checked} disabled={disabled}
                onChange={() => !disabled && onToggle()} style={{ accentColor: color }} />
            {label && <span style={{ fontSize: '13px', color: '#1B3A4B' }}>{label}</span>}
            {children}
            {sub && <span style={{ marginLeft: 'auto', fontSize: '10px', fontFamily: 'monospace', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{sub}</span>}
            {disabled && disabledNote && <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{disabledNote}</span>}
        </label>
    );
}

function Note({ text, error }: { text: string; error?: boolean }) {
    return (
        <div style={{ fontSize: '11px', color: error ? '#DC2626' : '#9CA3AF', fontStyle: 'italic', padding: '4px 8px' }}>
            {text}
        </div>
    );
}
