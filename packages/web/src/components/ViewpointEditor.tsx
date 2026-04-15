import { useState, useEffect, useRef } from 'react';
import type { ViewpointDTO } from '@memo/core';
import { LAYER_LABELS, LAYER_ORDER, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';

// Relationship types available for viewpoint scoping
const ALL_RELATIONSHIP_TYPES = [
    'mitigates', 'causes', 'leadsTo', 'identifies', 'traceTo', 'satisfy', 'verify',
    'allocateTo', 'aggregation', 'composedOf', 'decomposedBy', 'flow', 'succession',
];

interface Props {
    /** If provided, the editor pre-fills for editing. If null/undefined, creates a new viewpoint. */
    viewpoint?: ViewpointDTO | null;
    onSave: (vp: ViewpointDTO) => void;
    onClose: () => void;
}

// ─── Checkbox list helper ──────────────────────────────────────────────────

function CheckList({
    label,
    options,
    selected,
    onChange,
    colorMap,
}: {
    label: string;
    options: { id: string; label: string }[];
    selected: Set<string>;
    onChange: (id: string) => void;
    colorMap?: Record<string, string>;
}) {
    return (
        <div>
            <div className="font-semibold mb-2" style={{ fontSize: FONT.xs, color: '#374151' }}>{label}</div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E5E0', maxHeight: 200, overflowY: 'auto' }}>
                {options.map((opt, i) => {
                    const checked = selected.has(opt.id);
                    const color = colorMap?.[opt.id];
                    return (
                        <label
                            key={opt.id}
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                            style={{
                                borderTop: i === 0 ? 'none' : '1px solid #F0F0ED',
                                background: checked ? '#2DD4A808' : 'transparent',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onChange(opt.id)}
                                style={{ accentColor: '#2DD4A8', width: 13, height: 13 }}
                            />
                            {color && (
                                <span
                                    className="rounded-full flex-shrink-0"
                                    style={{ width: 8, height: 8, backgroundColor: color }}
                                />
                            )}
                            <span style={{ fontSize: FONT.xs, color: '#374151' }}>{opt.label}</span>
                        </label>
                    );
                })}
            </div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 4 }}>
                {selected.size === 0 ? 'All (no filter)' : `${selected.size} selected`}
            </div>
        </div>
    );
}

// ─── ViewpointEditor ───────────────────────────────────────────────────────

export function ViewpointEditor({ viewpoint, onSave, onClose }: Props) {
    const isEdit = Boolean(viewpoint);
    const overlayRef = useRef<HTMLDivElement>(null);

    const [name, setName] = useState(viewpoint?.label ?? '');
    const [nameError, setNameError] = useState('');

    const [selectedLayers, setSelectedLayers] = useState<Set<string>>(
        new Set(viewpoint?.visibleLayers ?? [])
    );
    const [selectedRelTypes, setSelectedRelTypes] = useState<Set<string>>(
        new Set(viewpoint?.visibleRelationships ?? [])
    );
    const [selectedDiagramTypes, setSelectedDiagramTypes] = useState<Set<string>>(
        new Set(viewpoint?.supportedDiagramTypes ?? [])
    );

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
        const next = new Set(set);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setFn(next);
    }

    function handleSave() {
        const trimmed = name.trim();
        if (!trimmed) {
            setNameError('Name is required');
            return;
        }
        const vp: ViewpointDTO = {
            id: viewpoint?.id ?? `user_vp_${Date.now()}`,
            label: trimmed,
            visibleKinds: viewpoint?.visibleKinds ?? [],
            visibleRelationships: [...selectedRelTypes],
            visibleLayers: [...selectedLayers],
            supportedDiagramTypes: [...selectedDiagramTypes],
        };
        onSave(vp);
    }

    const layerOptions = LAYER_ORDER.map(id => ({ id, label: LAYER_LABELS[id] ?? id }));
    const relOptions = ALL_RELATIONSHIP_TYPES.map(id => ({ id, label: id }));
    const diagramTypeOptions = Object.entries(DIAGRAM_TYPE_META).map(([id, meta]) => ({
        id,
        label: `${meta.code} — ${meta.fullName}`,
    }));

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.35)' }}
            onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div
                className="flex flex-col rounded-2xl overflow-hidden"
                style={{
                    width: 600, maxHeight: '90vh',
                    background: '#FFFFFF',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                    border: '1px solid #E5E5E0',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#2DD4A8', margin: 0 }}>
                            {isEdit ? 'Edit Viewpoint' : 'New Viewpoint'}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
                            {isEdit ? 'Modify viewpoint definition' : 'Define a new viewpoint for this model'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px',
                            color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '6px 10px', fontSize: '14px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                    {/* Name */}
                    <div>
                        <label className="block font-semibold mb-1.5" style={{ fontSize: FONT.xs, color: '#374151' }}>
                            Viewpoint Name <span style={{ color: '#E74C3C' }}>*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(''); }}
                            placeholder="e.g. Safety Viewpoint"
                            className="w-full px-3 py-2 rounded-lg focus:outline-none"
                            style={{
                                border: `1px solid ${nameError ? '#E74C3C' : '#E5E5E0'}`,
                                fontSize: FONT.sm, color: '#1a1a1a',
                                background: '#FAFAF8',
                            }}
                        />
                        {nameError && (
                            <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: 4 }}>{nameError}</p>
                        )}
                    </div>

                    {/* Three-column checklist grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <CheckList
                            label="Architecture Layers"
                            options={layerOptions}
                            selected={selectedLayers}
                            onChange={id => toggle(selectedLayers, setSelectedLayers, id)}
                            colorMap={Object.fromEntries(
                                LAYER_ORDER.map(id => [id, '#6B7280'])
                            )}
                        />
                        <CheckList
                            label="Relationship Types"
                            options={relOptions}
                            selected={selectedRelTypes}
                            onChange={id => toggle(selectedRelTypes, setSelectedRelTypes, id)}
                        />
                        <CheckList
                            label="Diagram Types"
                            options={diagramTypeOptions}
                            selected={selectedDiagramTypes}
                            onChange={id => toggle(selectedDiagramTypes, setSelectedDiagramTypes, id)}
                        />
                    </div>

                    <p style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.5, margin: 0 }}>
                        Leave a section empty to include all options (no filter applied).
                        Viewpoints are stored locally in your browser.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4"
                    style={{ borderTop: '1px solid #E5E5E0', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#374151', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F7F7F5'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: '#1B3A4B', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#244D63'}
                        onMouseLeave={e => e.currentTarget.style.background = '#1B3A4B'}
                    >
                        {isEdit ? 'Save Changes' : 'Create Viewpoint'}
                    </button>
                </div>
            </div>
        </div>
    );
}
