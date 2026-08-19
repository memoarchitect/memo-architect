// ─── Selection toolbar ───────────────────────────────────────────────────────
//
// The floating bar that appears over a multi-selection: align, match size,
// distribute, and set block styling — the board-tool gestures a
// reviewer reaches for when tidying a diagram before a design review.
//
// Arrange gestures only. Fill, border, text and opacity moved to the Style
// section of the properties panel: a bar that floats over the diagram is the
// wrong place for a control you want open while you recolour it, and it closed
// the moment the selection changed.
//
// It only ever changes presentation. Every edit here lands in the diagram's
// `.viewlayout` companion, never in SysML, because where a box sits says
// nothing about the system being modelled.
// ─────────────────────────────────────────────────────────────────────────────

import { FONT } from '../styles/tokens';
import type { AlignEdge, DistributeAxis, SizeMatch } from './arrange';

interface Props {
    count: number;
    onClose: () => void;
    onAlign: (edge: AlignEdge) => void;
    onMatchSize: (match: SizeMatch) => void;
    onDistribute: (axis: DistributeAxis) => void;
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
    count, onClose, onAlign, onMatchSize, onDistribute,
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
            <button
                type="button"
                title="Close selection tools (Esc)"
                aria-label="Close selection tools"
                onClick={onClose}
                style={{
                    width: 24, height: 24, padding: 0, borderRadius: 5,
                    border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569',
                    cursor: 'pointer', fontSize: 17, lineHeight: 1,
                }}
            >×</button>
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

        </div>
    );
}
