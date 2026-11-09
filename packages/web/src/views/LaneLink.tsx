// ─── How a flow's lanes are drawn, in the address ─────────────────────────────
//
// A link opens the flow grouped and drawn as it was shared: the canvas starts from `linkedLanes`, and this component,
// which draws nothing, writes a choice the reader makes back to the address.

import { useEffect, type MutableRefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActionFlowLaneGrouping, ActionFlowLaneStyle } from './templates/actionflow-view';

const GROUPING_PARAM = 'lanes';
const STYLE_PARAM = 'laneStyle';
const GROUPINGS: readonly string[] = ['allocation', 'stage', 'allocation-stage'] satisfies ActionFlowLaneGrouping[];
const STYLES: readonly string[] = ['lanes', 'boxes'] satisfies ActionFlowLaneStyle[];

/** What the page's address asks for, with the defaults for anything it does not. */
export function linkedLanes(): { grouping: ActionFlowLaneGrouping; style: ActionFlowLaneStyle } {
    const params = new URLSearchParams(window.location.search);
    const grouping = params.get(GROUPING_PARAM);
    const style = params.get(STYLE_PARAM);
    return {
        grouping: grouping && GROUPINGS.includes(grouping) ? grouping as ActionFlowLaneGrouping : 'allocation',
        style: style && STYLES.includes(style) ? style as ActionFlowLaneStyle : 'lanes',
    };
}

export function LaneLink({ grouping, style, chosen }: { grouping: ActionFlowLaneGrouping; style: ActionFlowLaneStyle; chosen: MutableRefObject<boolean> }) {
    const [, setParams] = useSearchParams();
    // Only the reader's own choice writes: while they move to another diagram the address still names the old one.
    useEffect(() => {
        if (!chosen.current) return;
        chosen.current = false;
        setParams(existing => {
            const updated = new URLSearchParams(existing);
            if (grouping === 'allocation') updated.delete(GROUPING_PARAM); else updated.set(GROUPING_PARAM, grouping);
            if (style === 'lanes') updated.delete(STYLE_PARAM); else updated.set(STYLE_PARAM, style);
            return updated;
        }, { replace: true });
    }, [grouping, style, chosen, setParams]);
    return null;
}
