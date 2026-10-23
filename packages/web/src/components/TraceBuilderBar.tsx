// ─── Building a traceability matrix ───────────────────────────────────────────
//
// What is chosen to build a matrix: a quick trace, the system, the rows, the columns and the relations, then
// Build. It holds no state of its own and decides nothing: it shows what it is given and says what was asked.

import type { ReactNode } from 'react';
import { MatrixSystemSelect } from './MatrixSystemSelect';
import { TraceAxisField } from './TraceAxisField';
import { TypeFilterSelect, type TypeFilterOption } from './TypeFilterSelect';
import { saveButtonStyle } from './SaveMatrixDialog';
import type { TracePreset } from '../lib/trace-presets';
import type { AxisSelection } from '../lib/trace-axis';
import type { TraceAxisIds } from '../lib/use-trace-axis';
import { COLOR, FONT } from '../styles/tokens';

export interface TraceBuilderBarProps {
    presets: readonly TracePreset[];
    onPreset: (preset: TracePreset) => void;
    system: string | undefined;
    onSystem: (system: string | undefined) => void;
    rowAxis: AxisSelection;
    columnAxis: AxisSelection;
    onRowAxis: (axis: AxisSelection) => void;
    onColumnAxis: (axis: AxisSelection) => void;
    rowSelection: TraceAxisIds;
    columnSelection: TraceAxisIds;
    kindOptions: TypeFilterOption[];
    linkOptions: TypeFilterOption[];
    linkTypes: string[];
    onLinkTypes: (types: string[]) => void;
    canBuild: boolean;
    /** The pickers differ from what was built. */
    stale: boolean;
    built: boolean;
    building: boolean;
    onBuild: () => void;
    /** The buttons that keep the matrix, which the screen decides. */
    actions: ReactNode;
}

export function TraceBuilderBar(props: TraceBuilderBarProps) {
    const { presets, onPreset, canBuild, stale, built, building, onBuild } = props;
    return (
        <div className="flex items-start gap-4 px-4 py-3" style={{ flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: '3px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>
                Quick trace
                <select
                    aria-label="Quick trace" value=""
                    onChange={event => { const preset = presets.find(entry => entry.id === event.target.value); if (preset) onPreset(preset); }}
                    style={{ padding: '7px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.xs, color: COLOR.primary, background: COLOR.surface, maxWidth: '230px' }}
                >
                    <option value="">Choose a trace…</option>
                    {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
            </label>
            <MatrixSystemSelect value={props.system} onChange={props.onSystem} />
            <TraceAxisField title="Rows" axis={props.rowAxis} onChange={props.onRowAxis} kindOptions={props.kindOptions} selection={props.rowSelection} />
            <TraceAxisField title="Columns" axis={props.columnAxis} onChange={props.onColumnAxis} kindOptions={props.kindOptions} selection={props.columnSelection} />
            <div style={{ display: 'grid', gap: '3px' }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>Relations</span>
                <TypeFilterSelect
                    label="" describedAs="Relations" allLabel="Any relationship" options={props.linkOptions} selected={props.linkTypes}
                    onChange={props.onLinkTypes} title="Relationships counted as trace" width={170}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
                <button
                    type="button" onClick={onBuild} disabled={!canBuild || building}
                    style={{
                        padding: '7px 16px', borderRadius: '6px', fontSize: FONT.sm, fontWeight: 600,
                        border: `1px solid ${canBuild ? COLOR.accent : COLOR.border}`,
                        background: canBuild && stale ? COLOR.accent : COLOR.surface,
                        color: canBuild && stale ? '#fff' : COLOR.muted,
                        cursor: canBuild && !building ? 'pointer' : 'not-allowed',
                    }}
                >
                    {building ? 'Building…' : built && !stale ? 'Rebuild' : 'Build matrix'}
                </button>
                {props.actions}
            </div>
        </div>
    );
}

export { saveButtonStyle };
