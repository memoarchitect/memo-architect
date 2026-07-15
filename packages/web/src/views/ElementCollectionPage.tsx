// ─── Element Collection Page ──────────────────────────────────────────────────
//
// Renders at /catalog/:family — shows all elements belonging to a kind-family
// (e.g. /catalog/SW → all SW-REQ, SW-COMP, SW-SPEC elements).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { FONT, COLOR } from '../styles/tokens';
import { elementUrl } from '../router';
import type { MemoElement } from '@memo/core';

interface Props {
    family: string;
}

export function ElementCollectionPage({ family }: Props) {
    const model = useModelStore(s => s.model);
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const elements: MemoElement[] = useMemo(() => {
        if (!model) return [];
        return Object.values(model.elements).filter(el => {
            const sid = el.shortId ?? '';
            return sid.startsWith(family + '-') || sid.startsWith(family + ' ');
        });
    }, [model, family]);

    const filtered = useMemo(() => {
        if (!search.trim()) return elements;
        const q = search.toLowerCase();
        return elements.filter(el =>
            el.name.toLowerCase().includes(q) ||
            (el.shortId ?? '').toLowerCase().includes(q) ||
            el.kind.toLowerCase().includes(q)
        );
    }, [elements, search]);

    // Group by kind for the summary header
    const byKind = useMemo(() => {
        const m: Record<string, number> = {};
        for (const el of elements) {
            m[el.kind] = (m[el.kind] ?? 0) + 1;
        }
        return m;
    }, [elements]);

    if (!model) {
        return <CollectionShell family={family}><p style={{ color: COLOR.muted, fontSize: FONT.sm }}>Loading model…</p></CollectionShell>;
    }

    if (elements.length === 0) {
        return (
            <CollectionShell family={family}>
                <p style={{ color: COLOR.muted, fontSize: FONT.sm }}>
                    No elements found with family prefix <code>{family}</code>.
                </p>
            </CollectionShell>
        );
    }

    return (
        <CollectionShell family={family}>
            {/* Kind summary chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {Object.entries(byKind).map(([kind, count]) => {
                    const color = LAYER_COLORS[kind] ?? '#9CA3AF';
                    return (
                        <span
                            key={kind}
                            style={{
                                fontSize: FONT.xs,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: color + '20',
                                color,
                                border: `1px solid ${color}40`,
                                fontWeight: 500,
                            }}
                        >
                            {kind} · {count}
                        </span>
                    );
                })}
            </div>

            {/* Search */}
            <input
                type="search"
                placeholder={`Search ${elements.length} elements…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '7px 12px',
                    fontSize: FONT.sm,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: '6px',
                    background: COLOR.surface,
                    color: COLOR.primary,
                    outline: 'none',
                    marginBottom: '12px',
                }}
            />

            {/* Element table */}
            <div style={{
                background: COLOR.surface,
                border: `1px solid ${COLOR.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 120px 120px',
                    padding: '8px 16px',
                    background: COLOR.surfaceAlt,
                    borderBottom: `1px solid ${COLOR.border}`,
                    fontSize: FONT.xs,
                    fontWeight: 600,
                    color: COLOR.muted,
                    gap: '12px',
                }}>
                    <span>ID</span>
                    <span>Name</span>
                    <span>Kind</span>
                    <span>Layer</span>
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                    <div style={{ padding: '24px 16px', color: COLOR.muted, fontSize: FONT.sm, textAlign: 'center' }}>
                        No results for "{search}"
                    </div>
                ) : (
                    filtered.map((el, i) => (
                        <ElementRow
                            key={el.id}
                            element={el}
                            zebra={i % 2 === 1}
                            onClick={() => navigate(elementUrl(el.shortId ?? el.id))}
                        />
                    ))
                )}
            </div>

            <p style={{ color: COLOR.faint, fontSize: '11px', marginTop: '8px' }}>
                {filtered.length} of {elements.length} elements shown
            </p>
        </CollectionShell>
    );
}

function ElementRow({ element, zebra, onClick }: { element: MemoElement; zebra: boolean; onClick: () => void }) {
    const layerColor = LAYER_COLORS[element.layer] ?? '#9CA3AF';

    return (
        <div
            onClick={onClick}
            style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 120px 120px',
                padding: '10px 16px',
                gap: '12px',
                background: zebra ? '#FAFAF8' : COLOR.surface,
                cursor: 'pointer',
                borderBottom: `1px solid ${COLOR.borderLight}`,
                alignItems: 'center',
                transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
            onMouseLeave={e => (e.currentTarget.style.background = zebra ? '#FAFAF8' : COLOR.surface)}
        >
            <code style={{ fontSize: '11px', color: '#2DD4A8', fontWeight: 600, fontFamily: 'monospace' }}>
                {element.shortId ?? element.id}
            </code>
            <span style={{ fontSize: FONT.sm, color: COLOR.primary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {element.name}
            </span>
            <span style={{ fontSize: FONT.xs, color: COLOR.secondary }}>
                {element.kind}
            </span>
            <span style={{
                fontSize: '11px',
                color: layerColor,
                fontWeight: 500,
                background: layerColor + '15',
                padding: '2px 6px',
                borderRadius: '4px',
                width: 'fit-content',
            }}>
                {element.layer}
            </span>
        </div>
    );
}

function CollectionShell({ family, children }: { family: string; children: React.ReactNode }) {
    const navigate = useNavigate();
    return (
        <div style={{
            flex: 1,
            overflow: 'auto',
            background: '#F7F7F5',
            padding: '32px 40px',
        }}>
            {/* Breadcrumb */}
            <nav style={{ fontSize: FONT.xs, color: COLOR.muted, marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/catalog')}
                    style={{ background: 'none', border: 'none', color: '#2DD4A8', cursor: 'pointer', padding: 0, fontSize: FONT.xs }}
                >
                    Catalog
                </button>
                {' / '}
                <span style={{ color: COLOR.primary, fontWeight: 600 }}>{family}</span>
            </nav>

            {/* Heading */}
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: COLOR.primary, marginBottom: '6px', marginTop: 0 }}>
                {family}
            </h1>

            {children}
        </div>
    );
}
