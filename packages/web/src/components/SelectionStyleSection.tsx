// ─── Selection style ─────────────────────────────────────────────────────────
//
// Fill, border, text and opacity for whatever the canvas has selected — in the
// properties panel, where a control the user wants open while they work
// belongs. It used to live on the floating selection bar, which hovered over
// the very diagram it was recolouring and closed the moment the selection
// changed.
//
// Everything here is presentation and lands in the diagram's `.viewlayout`
// companion, never in SysML: what colour a box is says nothing about the
// system being modelled.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useModelStore } from '../store/model-store';
import { COLOR, FONT } from '../styles/tokens';

/** Fills chosen to stay legible behind dark node text in both themes. */
const FILL_SWATCHES = [
    { value: '', label: 'Default' },
    { value: '#FEF3C7', label: 'Amber' },
    { value: '#DCFCE7', label: 'Green' },
    { value: '#DBEAFE', label: 'Blue' },
    { value: '#FCE7F3', label: 'Pink' },
    { value: '#FEE2E2', label: 'Red' },
    { value: '#EDE9FE', label: 'Violet' },
    { value: '#E5E7EB', label: 'Grey' },
];

const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
    fontSize: FONT.xs, color: COLOR.secondary,
};

const labelStyle: React.CSSProperties = { width: 62, flexShrink: 0 };

export function SelectionStyleSection() {
    const selectionStyle = useModelStore(s => s.selectionStyle);
    const [open, setOpen] = useState(true);
    const [customFill, setCustomFill] = useState('#FFFFFF');

    // Nothing selected on a canvas means nothing to style. The section is
    // absent rather than disabled: a greyed-out palette invites clicking.
    if (!selectionStyle) return null;
    const { count, opacity, apply } = selectionStyle;

    return (
        <div style={{ borderTop: `1px solid ${COLOR.borderLight}`, padding: '10px 12px' }}>
            <button
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '.07em',
                    textTransform: 'uppercase', color: COLOR.muted,
                }}
            >
                <span style={{ fontSize: 9 }}>{open ? '▾' : '▸'}</span>
                Style
                <span style={{ marginLeft: 'auto', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                    {count} selected
                </span>
            </button>

            {open && (
                <div style={{ marginTop: 10 }}>
                    <div style={rowStyle}>
                        <span style={labelStyle}>Fill</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                            {FILL_SWATCHES.map(swatch => (
                                <button
                                    key={swatch.label}
                                    title={`Fill: ${swatch.label}`}
                                    aria-label={`Fill ${swatch.label}`}
                                    onClick={() => apply({ color: swatch.value })}
                                    style={{
                                        width: 20, height: 20, padding: 0, borderRadius: 4, cursor: 'pointer',
                                        border: `1px solid ${COLOR.border}`,
                                        background: swatch.value || '#FFFFFF',
                                        // The default swatch has no colour to show, so it
                                        // carries a mark rather than reading as white.
                                        color: '#94A3B8', fontSize: 11, lineHeight: 1, fontWeight: 700,
                                    }}
                                >
                                    {swatch.value ? '' : '⌫'}
                                </button>
                            ))}
                            {/* Any colour, the way a board tool offers it: the
                                swatches are the fast path, not the whole range. */}
                            <input
                                type="color"
                                aria-label="Custom fill colour"
                                title="Custom fill colour"
                                value={customFill}
                                onChange={event => { setCustomFill(event.target.value); apply({ color: event.target.value }); }}
                                style={{ width: 22, height: 20, padding: 1, border: `1px solid ${COLOR.border}`, borderRadius: 4, cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <div style={rowStyle}>
                        <span style={labelStyle}>Border</span>
                        <input
                            type="color"
                            aria-label="Border colour"
                            onChange={event => apply({ borderColor: event.target.value })}
                            style={{ width: 26, height: 22, padding: 1, border: `1px solid ${COLOR.border}`, borderRadius: 4, cursor: 'pointer' }}
                        />
                        <button
                            onClick={() => apply({ borderColor: '' })}
                            style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surface, borderRadius: 4, fontSize: 11, padding: '2px 7px', cursor: 'pointer', color: COLOR.secondary }}
                        >
                            Reset
                        </button>
                    </div>

                    <div style={rowStyle}>
                        <span style={labelStyle}>Text</span>
                        <input
                            type="color"
                            aria-label="Text colour"
                            onChange={event => apply({ textColor: event.target.value })}
                            style={{ width: 26, height: 22, padding: 1, border: `1px solid ${COLOR.border}`, borderRadius: 4, cursor: 'pointer' }}
                        />
                        <select
                            aria-label="Text size"
                            defaultValue=""
                            onChange={event => event.target.value && apply({ fontSize: Number(event.target.value) })}
                            style={{ height: 22, border: `1px solid ${COLOR.border}`, borderRadius: 4, color: COLOR.secondary, fontSize: 11 }}
                        >
                            <option value="">Auto</option>
                            {[10, 12, 14, 16, 18, 20].map(size => <option key={size} value={size}>{size}px</option>)}
                        </select>
                        <button
                            title="Bold text"
                            onClick={() => apply({ fontWeight: 700 })}
                            style={{ border: `1px solid ${COLOR.border}`, background: COLOR.surface, borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', cursor: 'pointer', color: COLOR.secondary }}
                        >
                            B
                        </button>
                    </div>

                    <div style={rowStyle}>
                        <span style={labelStyle}>Align</span>
                        {([
                            ['left', '≡', 'Align text left'],
                            ['center', '≣', 'Align text centre'],
                            ['right', '☷', 'Align text right'],
                        ] as const).map(([value, glyph, title]) => (
                            <button
                                key={value}
                                title={title}
                                aria-label={title}
                                onClick={() => apply({ textAlign: value })}
                                style={{ width: 24, height: 22, border: `1px solid ${COLOR.border}`, background: COLOR.surface, borderRadius: 4, fontSize: 12, cursor: 'pointer', color: COLOR.secondary }}
                            >
                                {glyph}
                            </button>
                        ))}
                        {([
                            ['top', '⤒', 'Align text at top'],
                            ['middle', '↕', 'Align text vertically centred'],
                            ['bottom', '⤓', 'Align text at bottom'],
                        ] as const).map(([value, glyph, title]) => (
                            <button
                                key={value}
                                title={title}
                                aria-label={title}
                                onClick={() => apply({ verticalAlign: value })}
                                style={{ width: 24, height: 22, border: `1px solid ${COLOR.border}`, background: COLOR.surface, borderRadius: 4, fontSize: 12, cursor: 'pointer', color: COLOR.secondary }}
                            >
                                {glyph}
                            </button>
                        ))}
                    </div>

                    <label style={rowStyle}>
                        <span style={labelStyle}>Opacity</span>
                        <input
                            type="range" min={0.2} max={1} step={0.05}
                            value={opacity}
                            aria-label="Fill opacity"
                            onChange={event => apply({ opacity: Number(event.target.value) })}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 30, textAlign: 'right', color: COLOR.faint }}>
                            {Math.round(opacity * 100)}%
                        </span>
                    </label>
                </div>
            )}
        </div>
    );
}
