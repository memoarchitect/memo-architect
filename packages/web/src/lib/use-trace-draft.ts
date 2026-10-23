// ─── The matrix being chosen ──────────────────────────────────────────────────
//
// What the person has picked so far: the system, the rows, the columns and the relations. It is a draft until
// it is built or saved, and it is the only state the builder edits, so it lives here and nothing else does.

import { useCallback, useMemo, useState } from 'react';
import { EMPTY_AXIS, type AxisSelection } from './trace-axis';

export interface TraceDraftValue {
    rowAxis: AxisSelection;
    columnAxis: AxisSelection;
    linkTypes: string[];
    /** The system (workspace root) the matrix is about; none means the workspace chosen in the header. */
    system: string | undefined;
}

export interface TraceDraft extends TraceDraftValue {
    setRowAxis: (axis: AxisSelection) => void;
    setColumnAxis: (axis: AxisSelection) => void;
    setLinkTypes: (types: string[]) => void;
    setSystem: (system: string | undefined) => void;
    /** Replace the whole draft, as opening a saved matrix or a quick trace does. */
    replace: (next: Partial<TraceDraftValue>) => void;
    clear: () => void;
}

export function useTraceDraft(): TraceDraft {
    const [rowAxis, setRowAxis] = useState<AxisSelection>(EMPTY_AXIS);
    const [columnAxis, setColumnAxis] = useState<AxisSelection>(EMPTY_AXIS);
    const [linkTypes, setLinkTypes] = useState<string[]>([]);
    const [system, setSystem] = useState<string | undefined>(undefined);

    const replace = useCallback((next: Partial<TraceDraftValue>) => {
        if (next.rowAxis) setRowAxis(next.rowAxis);
        if (next.columnAxis) setColumnAxis(next.columnAxis);
        if (next.linkTypes) setLinkTypes(next.linkTypes);
        if ('system' in next) setSystem(next.system);
    }, []);
    const clear = useCallback(() => {
        setRowAxis(EMPTY_AXIS);
        setColumnAxis(EMPTY_AXIS);
        setLinkTypes([]);
    }, []);

    return useMemo(
        () => ({ rowAxis, columnAxis, linkTypes, system, setRowAxis, setColumnAxis, setLinkTypes, setSystem, replace, clear }),
        [rowAxis, columnAxis, linkTypes, system, replace, clear],
    );
}
