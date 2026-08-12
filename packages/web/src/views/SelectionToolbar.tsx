// ─── Selection toolbar ───────────────────────────────────────────────────────
//
// The floating bar that appears over a multi-selection: align, match size,
// distribute, and set block styling — the board-tool gestures a
// reviewer reaches for when tidying a diagram before a design review.
//
// It only ever changes presentation. Every edit here lands in the diagram's
// `.viewlayout` companion, never in SysML, because where a box sits and what
// colour it is say nothing about the system being modelled.
// ─────────────────────────────────────────────────────────────────────────────

import { FONT } from '../styles/tokens';
import type { AlignEdge, DistributeAxis, SizeMatch } from './arrange';

/** Fills chosen to stay legible behind dark node text in both themes. */
const FILL_SWATCHES = [
    { value: '', label: 'Default' },
    { value: '#FEF3C7', label: 'Amber' },
    { value: '#DCFCE7', label: 'Green' },
    { value: '#DBEAFE', label: 'Blue' },
    { value: '#FCE7F3', label: 'Pink' },
    { value: '#E5E7EB', label: 'Grey' },
];

interface Props {
    count: number;
    onAlign: (edge: AlignEdge) => void;
    onMatchSize: (match: SizeMatch) => void;
    onDistribute: (axis: DistributeAxis) => void;
    onFill: (color: string) => void;
    onOpacity: (opacity: number) => void;
    onTextStyle: (patch: { textColor?: string; fontSize?: number; fontWeight?: number; textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle' | 'bottom'; borderColor?: string }) => void;
    opacity: number;
}

const groupStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 2,
};

const sepStyle: React.CSSProperties = {
    width: 1, height: 18, background: '#E2E8F0', margin: '0 4px', flexShrink: 0,
};

function Btn({ title, label, onClick }: { title: string; label: string; onClick: () => void }) {
    return (
        <button
            title={title}
            aria-label={title}
            onClick={onClick}
            style={{
                minWidth: 26, height: 26, padding: '0 5px', borderRadius: 5,
                border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#374151',
                fontSize: 13, lineHeight: 1, cursor: 'pointer', fontWeight: 600,
            }}
        >
            {label}
        </button>
    );
}

export function SelectionToolbar({
    count, onAlign, onMatchSize, onDistribute, onFill, onOpacity, onTextStyle, opacity,
}: Props) {
    return (
        <div
            className="nodrag nopan"
            style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                zIndex: 25, display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 8px', borderRadius: 9, background: '#FFFFFF',
                border: '1px solid #E2E8F0', boxShadow: '0 6px 20px rgba(15,23,42,0.14)',
                flexWrap: 'wrap', maxWidth: 'calc(100% - 24px)',
            }}
        >
            <span style={{ fontSize: FONT.xs, color: '#6B7280', fontWeight: 700, paddingRight: 2 }}>
                {count} selected
            </span>
            <span style={sepStyle} />

            <div style={groupStyle}>
                <Btn title="Align left edges" label="⇤" onClick={() => onAlign('left')} />
                <Btn title="Align horizontal centres" label="⇹" onClick={() => onAlign('centerX')} />
                <Btn title="Align right edges" label="⇥" onClick={() => onAlign('right')} />
                <Btn title="Align top edges" label="⤒" onClick={() => onAlign('top')} />
                <Btn title="Align vertical centres" label="⇳" onClick={() => onAlign('centerY')} />
                <Btn title="Align bottom edges" label="⤓" onClick={() => onAlign('bottom')} />
            </div>
            <span style={sepStyle} />

            <div style={groupStyle}>
                <Btn title="Match width to the widest" label="↔" onClick={() => onMatchSize('width')} />
                <Btn title="Match height to the tallest" label="↕" onClick={() => onMatchSize('height')} />
                <Btn title="Match width and height" label="⤢" onClick={() => onMatchSize('both')} />
            </div>
            <span style={sepStyle} />

            {/* Distribute needs three boxes to divide a gap between. */}
            <div style={groupStyle}>
                <Btn
                    title={count >= 3 ? 'Even horizontal gaps' : 'Even horizontal gaps (needs 3 blocks)'}
                    label="⇿"
                    onClick={() => onDistribute('horizontal')}
                />
                <Btn
                    title={count >= 3 ? 'Even vertical gaps' : 'Even vertical gaps (needs 3 blocks)'}
                    label="⇕"
                    onClick={() => onDistribute('vertical')}
                />
            </div>
            <span style={sepStyle} />

            <div style={groupStyle}>
                {FILL_SWATCHES.map(swatch => (
                    <button
                        key={swatch.label}
                        title={`Fill: ${swatch.label}`}
                        aria-label={`Fill ${swatch.label}`}
                        onClick={() => onFill(swatch.value)}
                        style={{
                            width: 20, height: 20, padding: 0, borderRadius: 4, cursor: 'pointer',
                            border: '1px solid #CBD5E1',
                            background: swatch.value || '#FFFFFF',
                            // The default swatch is the only one with no colour to
                            // show, so it carries a mark instead of reading as white.
                            color: '#94A3B8', fontSize: 11, lineHeight: 1, fontWeight: 700,
                        }}
                    >
                        {swatch.value ? '' : '⌫'}
                    </button>
                ))}
            </div>
            <span style={sepStyle} />

            <div style={groupStyle} aria-label="Text styling">
                <Btn title="Align text left" label="≡" onClick={() => onTextStyle({ textAlign: 'left' })} />
                <Btn title="Align text centre" label="≣" onClick={() => onTextStyle({ textAlign: 'center' })} />
                <Btn title="Align text right" label="☷" onClick={() => onTextStyle({ textAlign: 'right' })} />
                <Btn title="Align text at top" label="⤒" onClick={() => onTextStyle({ verticalAlign: 'top' })} />
                <Btn title="Align text vertically centred" label="↕" onClick={() => onTextStyle({ verticalAlign: 'middle' })} />
                <Btn title="Align text at bottom" label="⤓" onClick={() => onTextStyle({ verticalAlign: 'bottom' })} />
                <select aria-label="Text size" title="Text size" defaultValue="" onChange={event => event.target.value && onTextStyle({ fontSize: Number(event.target.value) })} style={{ height: 26, border: '1px solid #CBD5E1', borderRadius: 4, color: '#475569', fontSize: 11 }}>
                    <option value="">Auto size</option>
                    {[10, 12, 14, 16, 18, 20].map(size => <option key={size} value={size}>{size}px</option>)}
                </select>
                <Btn title="Bold text" label="B" onClick={() => onTextStyle({ fontWeight: 700 })} />
                <label title="Text colour" style={{ display: 'flex', alignItems: 'center' }}><input aria-label="Text colour" type="color" onChange={event => onTextStyle({ textColor: event.target.value })} style={{ width: 24, height: 24, padding: 1 }} /></label>
                <label title="Border colour" style={{ display: 'flex', alignItems: 'center' }}><input aria-label="Border colour" type="color" onChange={event => onTextStyle({ borderColor: event.target.value })} style={{ width: 24, height: 24, padding: 1 }} /></label>
            </div>
            <span style={sepStyle} />

            <label
                title="Fill opacity"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: FONT.xs, color: '#6B7280' }}
            >
                <span style={{ fontWeight: 700 }}>Opacity</span>
                <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={Math.round(opacity * 100)}
                    onChange={event => onOpacity(Number(event.target.value) / 100)}
                    style={{ width: 72, accentColor: '#2DD4A8' }}
                />
                <span style={{ width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(opacity * 100)}%
                </span>
            </label>
            <div style={groupStyle} aria-label="Opacity presets">
                {[1, 0.75, 0.5].map(value => (
                    <button
                        key={value}
                        aria-label={`Set opacity to ${Math.round(value * 100)}%`}
                        title={`Set opacity to ${Math.round(value * 100)}%`}
                        onClick={() => onOpacity(value)}
                        style={{
                            height: 22, minWidth: 30, padding: '0 4px', borderRadius: 4,
                            border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569',
                            cursor: 'pointer', fontSize: 10, fontWeight: 700,
                        }}
                    >{Math.round(value * 100)}</button>
                ))}
            </div>
        </div>
    );
}
