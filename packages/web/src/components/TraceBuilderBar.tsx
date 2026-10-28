// ─── Building a traceability matrix ───────────────────────────────────────────
//
// What is chosen to build a matrix: a quick trace, the system, the rows, the columns and the relations, then
// Build. It holds no state of its own and decides nothing: it shows what it is given and says what was asked.

import type { ReactNode } from 'react';
import { MatrixSystemSelect } from './MatrixSystemSelect';
import { TraceAxisField } from './TraceAxisField';
import { TypeFilterSelect, type TypeFilterOption } from './TypeFilterSelect';
import { ActionButton, ControlIcon, TextAction } from './TraceControls';
import type { TracePreset } from '../lib/trace-presets';
import type { AxisSelection } from '../lib/trace-axis';
import type { TraceAxisIds } from '../lib/use-trace-axis';
import { COLOR, FONT } from '../styles/tokens';

export interface TraceBuilderBarProps {
    presets: readonly TracePreset[];
    onPreset: (preset: TracePreset) => void;
    /** The quick trace in use. While there is one it stands for the rows and columns: they are not shown to pick. */
    activePresetId: string | null;
    /** Leave the quick trace and pick the rows and columns by hand, starting from the ones it chose. */
    onCustomize: () => void;
    system: string | undefined;
    onSystem: (system: string | undefined) => void;
    rowAxis: AxisSelection;
    columnAxis: AxisSelection;
    onRowAxis: (axis: AxisSelection) => void;
    onColumnAxis: (axis: AxisSelection) => void;
    rowSelection: TraceAxisIds;
    columnSelection: TraceAxisIds;
    kindOptions: TypeFilterOption[];
    kindParents?: ReadonlyMap<string, string>;
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
    const { presets, onPreset, canBuild, stale, built, building, onBuild, activePresetId, onCustomize } = props;
    const active = presets.find(entry => entry.id === activePresetId);
    return (
        <div className="flex items-start gap-4 px-4 py-3" style={{ flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: '3px', fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>
                Quick trace
                <select
                    aria-label="Quick trace" value={activePresetId ?? ''}
                    onChange={event => {
                        const preset = presets.find(entry => entry.id === event.target.value);
                        if (preset) onPreset(preset); else onCustomize();
                    }}
                    style={{ padding: '7px 8px', border: `1px solid ${COLOR.border}`, borderRadius: '6px', fontSize: FONT.xs, color: COLOR.primary, background: COLOR.surface, maxWidth: '230px' }}
                >
                    <option value="">{active ? 'Custom: pick rows and columns' : 'Choose a trace, or pick below…'}</option>
                    {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
            </label>
            <div style={{ width: '230px', maxWidth: '100%' }}><MatrixSystemSelect value={props.system} onChange={props.onSystem} /></div>
            {active ? (
                <div style={{ display: 'grid', gap: '3px', alignSelf: 'end', paddingBottom: '2px' }}>
                    <span style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary }}>{active.label}</span>
                    <span style={{ fontSize: FONT.xs, color: props.rowSelection.error || props.columnSelection.error ? '#B91C1C' : COLOR.muted }}>
                        {props.rowSelection.error ?? props.columnSelection.error
                            ?? (props.rowSelection.counting || props.columnSelection.counting
                                ? 'Counting…'
                                : `${props.rowSelection.ids.length.toLocaleString()} rows × ${props.columnSelection.ids.length.toLocaleString()} columns`)}
                        {' · '}
                        <TextAction onClick={onCustomize} title="Pick the rows and columns by hand, starting from this trace's">Customize</TextAction>
                    </span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flexBasis: '100%', order: 5 }}>
                    <TraceAxisField title="Rows" axis={props.rowAxis} onChange={props.onRowAxis} kindOptions={props.kindOptions} kindParents={props.kindParents} selection={props.rowSelection} />
                    <TraceAxisField title="Columns" axis={props.columnAxis} onChange={props.onColumnAxis} kindOptions={props.kindOptions} kindParents={props.kindParents} selection={props.columnSelection} />
                </div>
            )}
            <div style={{ display: 'grid', gap: '3px' }}>
                <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.muted }}>Relations</span>
                <TypeFilterSelect
                    label="" describedAs="Relations" allLabel="Any relationship" options={props.linkOptions} selected={props.linkTypes}
                    onChange={props.onLinkTypes} title="Relationships counted as trace" width={170}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
                <ActionButton
                    onClick={onBuild} disabled={!canBuild || building} variant={stale ? 'primary' : 'secondary'}
                    icon={built && !stale ? ControlIcon.rebuild : ControlIcon.build}
                >
                    {building ? 'Building…' : built && !stale ? 'Rebuild' : 'Build'}
                </ActionButton>
                {props.actions}
            </div>
        </div>
    );
}

