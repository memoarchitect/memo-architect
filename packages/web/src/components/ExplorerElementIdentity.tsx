import type { MemoElement } from '@memoarchitect/tools/browser';
import { COLOR, FONT } from '../styles/tokens';

/**
 * Canonical label for an element wherever it appears in an explorer.
 * Diagrams use their diagram-type badge; model elements always lead with
 * their stable identity so that navigation never loses the model context.
 */
export function ExplorerElementIdentity({
    element,
    selected = false,
    fontSize = FONT.explorer.item,
    fontWeight,
}: {
    element: Pick<MemoElement, 'id' | 'name' | 'shortId'>;
    selected?: boolean;
    fontSize?: string | number;
    fontWeight?: number;
}) {
    // The builder assigns this deterministic, human-facing form to every
    // element (for example STT-1). Never expose the internal SysML/UUID
    // identifier as an explorer label.
    const identity = element.shortId ?? 'ID-PENDING';
    return (
        <span
            className="truncate flex-1"
            style={{
                color: selected ? COLOR.accentDark : COLOR.primary,
                fontSize,
                fontWeight: fontWeight ?? (selected ? 500 : 400),
            }}
            title={`${identity} ${element.name}`}
        >
            <span style={{ color: COLOR.muted, fontWeight: 500, marginRight: '4px' }}>
                [{identity}]
            </span>
            {element.name}
        </span>
    );
}
