// ─── How a flow's lanes are grouped and drawn ─────────────────────────────────
//
// After SwimlanePicker in EventCatalog's packages/visualiser: each grouping says how many groups it makes, so the reader
// can see which is worth choosing before choosing it.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ActionFlowLaneGrouping, ActionFlowLaneStyle } from '../../views/templates/actionflow-view';
import { COLOR, FONT } from '../../styles/tokens';

const GROUPINGS: { id: ActionFlowLaneGrouping; label: string }[] = [
    { id: 'allocation', label: 'Allocation' },
    { id: 'stage', label: 'Stage' },
];
const STYLES: { id: ActionFlowLaneStyle; label: string }[] = [{ id: 'lanes', label: 'Lanes' }, { id: 'boxes', label: 'Boxes' }];

export function LanePicker({ trigger, grouping, onGrouping, style, onStyle, counts, hasStages }: {
    trigger: (open: boolean, toggle: () => void) => ReactNode;
    grouping: ActionFlowLaneGrouping;
    onGrouping: (grouping: ActionFlowLaneGrouping) => void;
    style: ActionFlowLaneStyle;
    onStyle: (style: ActionFlowLaneStyle) => void;
    counts: Record<ActionFlowLaneGrouping, number>;
    hasStages: boolean;
}) {
    const [open, setOpen] = useState(false);
    const anchor = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!open) return;
        const away = (event: MouseEvent) => { if (!anchor.current?.contains(event.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', away);
        return () => document.removeEventListener('mousedown', away);
    }, [open]);
    const rect = open ? anchor.current?.getBoundingClientRect() : undefined;
    const row = (active: boolean) => ({ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12, border: 'none', cursor: 'pointer', borderRadius: 4, padding: '3px 6px', fontSize: FONT.xs, background: active ? COLOR.borderLight : 'transparent', color: COLOR.primary, fontWeight: active ? 700 : 400 });
    return (
        <span ref={anchor} style={{ display: 'inline-flex' }}>
            {trigger(open, () => setOpen(value => !value))}
            {open && rect && (
                <div role="menu" aria-label="Lane options" data-testid="lane-picker" style={{ position: 'fixed', zIndex: 50, left: rect.right + 6, top: rect.top, width: 170, background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.14)', padding: 6 }}>
                    <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600, padding: '0 6px 2px' }}>Group by</div>
                    {GROUPINGS.filter(option => option.id !== 'stage' || hasStages).map(option => (
                        <button key={option.id} type="button" role="menuitemradio" aria-checked={grouping === option.id} onClick={() => onGrouping(option.id)} style={row(grouping === option.id)}>
                            <span>{option.label}</span><span style={{ color: COLOR.muted }}>{counts[option.id]} {counts[option.id] === 1 ? 'group' : 'groups'}</span>
                        </button>
                    ))}
                    <div style={{ fontSize: FONT.xs, color: COLOR.muted, fontWeight: 600, padding: '6px 6px 2px' }}>Draw as</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {STYLES.map(option => <button key={option.id} type="button" role="menuitemradio" aria-checked={style === option.id} onClick={() => onStyle(option.id)} style={{ ...row(style === option.id), justifyContent: 'center' }}>{option.label}</button>)}
                    </div>
                </div>
            )}
        </span>
    );
}
