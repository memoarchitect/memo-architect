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
    tint,
}: {
    element: Pick<MemoElement, 'id' | 'name'> & {
        /** The id the compiled model says to show; this component chooses nothing. */
        displayId?: string;
        isDefinition?: boolean;
        /** Authored providedId, preferred over shortId where the model carries one. */
        __displayId?: string;
    };
    selected?: boolean;
    fontSize?: string | number;
    fontWeight?: number;
    /** Overrides the label colour, so a usage row can be tinted as one. */
    tint?: string;
}) {
    // The compiler decides the id a reader sees (an authored providedId, else the short id, with a
    // usage reading as its definition's id and its own number). Never expose the internal
    // SysML/UUID identifier as an explorer label.
    const identity = element.__displayId ?? element.displayId ?? 'ID-PENDING';
    return (
        <span
            className="truncate flex-1"
            style={{
                color: tint ?? (selected ? COLOR.accentDark : COLOR.primary),
                fontSize,
                fontWeight: fontWeight ?? (selected ? 500 : 400),
            }}
            title={`${identity} ${element.name}`}
        >
            {/* Monospace, and no reserved column: in a narrow explorer the name matters more than aligned ids. */}
            <span
                style={{
                    color: COLOR.muted,
                    fontWeight: 500,
                    marginRight: '4px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    flexShrink: 0,
                }}
            >
                [{identity}]
            </span>
            {element.name}
            {/* A definition carries the kind it specializes, so nothing else in
                the row distinguishes `part def Pump` from a pump. */}
            {element.isDefinition && (
                <span style={{ color: COLOR.muted, fontWeight: 600, marginLeft: '5px', fontSize: '0.85em' }}>
                    def
                </span>
            )}
        </span>
    );
}
