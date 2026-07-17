// ─── BulkEditPanel ───────────────────────────────────────────────────────────
//
// Shown in the right panel when 2+ elements are selected in the Model Explorer.
// Computes the intersection of attributes across all selected elements and
// lets the user bulk-edit the common ones — Jira-style.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { FONT, COLOR } from '../styles/tokens';
import type { MemoElement } from '@memoarchitect/tools/browser';

function sectionStyle(color = COLOR.border) {
    return { borderTop: `1px solid ${color}` };
}

// ─── EditableField ────────────────────────────────────────────────────────────

function EditableField({
    placeholder,
    value,
    onChange,
}: {
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-2 py-1 rounded focus:outline-none"
            style={{
                background: '#F7F7F5',
                border: '1px solid #E5E5E0',
                color: COLOR.primary,
                fontSize: FONT.xs,
                minWidth: 0,
            }}
        />
    );
}

// ─── ValueHint — shows diversity of current values ────────────────────────────

function ValueHint({ values }: { values: string[] }) {
    const unique = [...new Set(values.filter(Boolean))];
    if (unique.length === 0) return <span style={{ color: COLOR.faint, fontSize: '12px' }}>—</span>;
    if (unique.length === 1) return <span style={{ color: COLOR.muted, fontSize: '12px' }}>{unique[0]}</span>;
    return (
        <span style={{ color: '#F59E0B', fontSize: '12px' }}>{unique.length} different values</span>
    );
}

// ─── BulkEditPanel ────────────────────────────────────────────────────────────

export function BulkEditPanel() {
    const model = useModelStore(s => s.model);
    const selectedElementIds = useModelStore(s => s.selectedElementIds);
    const clearElementSelection = useModelStore(s => s.clearElementSelection);
    const bulkUpdateAttributes = useModelStore(s => s.bulkUpdateAttributes);

    const ids = useMemo(() => [...selectedElementIds], [selectedElementIds]);

    // Resolved element objects
    const elements = useMemo((): MemoElement[] =>
        ids.map(id => model?.elements[id]).filter(Boolean) as MemoElement[],
        [ids, model]
    );

    // Common attribute keys — intersection across all selected elements
    const commonKeys = useMemo((): string[] => {
        if (elements.length === 0) return [];
        const privatePrefix = '_';
        const allKeySets = elements.map(el =>
            new Set(Object.keys(el.attributes).filter(k => !k.startsWith(privatePrefix)))
        );
        const base = [...allKeySets[0]].filter(k => allKeySets.every(s => s.has(k)));
        return base.sort();
    }, [elements]);

    // Values per key across all selected elements
    const valueMap = useMemo((): Record<string, string[]> => {
        const map: Record<string, string[]> = {};
        for (const key of commonKeys) {
            map[key] = elements.map(el => el.attributes[key] ?? '');
        }
        return map;
    }, [elements, commonKeys]);

    // Unique kinds among selected elements
    const kinds = useMemo((): string[] =>
        [...new Set(elements.map(e => e.kind))].sort(),
        [elements]
    );

    // Draft edits — only keys the user has touched
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    const setDraft = useCallback((key: string, value: string) => {
        setDrafts(prev => ({ ...prev, [key]: value }));
    }, []);

    const hasDrafts = Object.values(drafts).some(v => v !== '');

    const apply = useCallback(() => {
        const toApply = Object.fromEntries(
            Object.entries(drafts).filter(([, v]) => v !== '')
        );
        if (Object.keys(toApply).length === 0) return;
        bulkUpdateAttributes(ids, toApply);
        setDrafts({});
    }, [drafts, ids, bulkUpdateAttributes]);

    const cancel = useCallback(() => {
        setDrafts({});
    }, []);

    if (elements.length < 2) return null;

    return (
        <div
            className="flex flex-col overflow-hidden"
            style={{ width: '280px', background: COLOR.surface, borderLeft: `1px solid ${COLOR.border}`, fontSize: FONT.xs }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: `1px solid ${COLOR.border}` }}
            >
                <div>
                    <div className="font-semibold" style={{ color: COLOR.primary, fontSize: FONT.sm }}>
                        Bulk Edit
                    </div>
                    <div style={{ color: COLOR.muted, fontSize: '12px', marginTop: '2px' }}>
                        {ids.length} elements selected
                    </div>
                </div>
                <button
                    onClick={clearElementSelection}
                    className="px-2 py-1 rounded"
                    style={{ color: COLOR.muted, background: '#F0F0ED', fontSize: '12px' }}
                    title="Clear selection"
                >✕ Clear</button>
            </div>

            {/* ── Selection summary ── */}
            <div className="px-4 py-3 flex-shrink-0" style={sectionStyle()}>
                <div style={{ color: COLOR.muted, fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Selection
                </div>
                <div className="flex flex-wrap gap-1">
                    {kinds.map(k => (
                        <span
                            key={k}
                            className="px-2 py-0.5 rounded-full"
                            style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', fontWeight: 500 }}
                        >{k}</span>
                    ))}
                </div>
                <div style={{ color: COLOR.faint, fontSize: '12px', marginTop: '6px' }}>
                    {elements.map(e => e.name).slice(0, 5).join(', ')}
                    {elements.length > 5 && ` +${elements.length - 5} more`}
                </div>
            </div>

            {/* ── Common attributes ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={sectionStyle()}>
                <div style={{ color: COLOR.muted, fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Common Attributes
                    {commonKeys.length > 0 && <span style={{ color: COLOR.faint, fontWeight: 400, marginLeft: '4px' }}>({commonKeys.length})</span>}
                </div>

                {commonKeys.length === 0 ? (
                    <div style={{ color: COLOR.faint, fontSize: '12px' }}>
                        No common attributes across selected elements.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {commonKeys.map(key => (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                    <span style={{ color: COLOR.secondary, fontSize: '12px', fontWeight: 500 }}>{key}</span>
                                    <ValueHint values={valueMap[key]} />
                                </div>
                                <EditableField
                                    placeholder={`Set for all ${ids.length} elements…`}
                                    value={drafts[key] ?? ''}
                                    onChange={v => setDraft(key, v)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Actions ── */}
            {commonKeys.length > 0 && (
                <div
                    className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                    style={sectionStyle()}
                >
                    <button
                        onClick={cancel}
                        disabled={!hasDrafts}
                        className="flex-1 py-1.5 rounded"
                        style={{
                            fontSize: FONT.xs, fontWeight: 500,
                            color: hasDrafts ? COLOR.secondary : COLOR.faint,
                            background: hasDrafts ? '#F0F0ED' : '#F7F7F5',
                            cursor: hasDrafts ? 'pointer' : 'default',
                        }}
                    >Reset</button>
                    <button
                        onClick={apply}
                        disabled={!hasDrafts}
                        className="flex-1 py-1.5 rounded font-semibold"
                        style={{
                            fontSize: FONT.xs,
                            color: '#FFFFFF',
                            background: hasDrafts ? '#2DD4A8' : '#A7F3D0',
                            cursor: hasDrafts ? 'pointer' : 'default',
                        }}
                    >Apply to {ids.length}</button>
                </div>
            )}
        </div>
    );
}
