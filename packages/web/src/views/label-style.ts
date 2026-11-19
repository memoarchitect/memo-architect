// ─── Label style ─────────────────────────────────────────────────────────────
//
// How a person has chosen to draw a label: its colour, size, weight and which
// way it runs. Boxes carry theirs in their node data; ports and connectors read
// theirs from the view's layout through this context, so a change in the Style
// section redraws the label at once without rebuilding the diagram.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, type CSSProperties } from 'react';
import type { DiagramLabelStyle, DiagramLayout } from '@memoarchitect/tools/browser';

/** A connector label's style, and whether the view shows it at all. */
export interface ConnectorLabelStyle extends DiagramLabelStyle {
    labelVisible?: boolean;
}

export interface DiagramLabelStyles {
    edges: Record<string, ConnectorLabelStyle>;
    ports: Record<string, DiagramLabelStyle>;
    /** Puts a connector's label where a person dragged it; absent on a read-only canvas. */
    moveEdgeLabel?: (edgeId: string, point: { x: number; y: number }) => void;
}

const NONE: DiagramLabelStyles = { edges: {}, ports: {} };

export const DiagramLabelStyleContext = createContext<DiagramLabelStyles>(NONE);

const styleOf = ({ textColor, fontSize, fontWeight, textOrientation }: DiagramLabelStyle): DiagramLabelStyle | undefined =>
    textColor || fontSize || fontWeight || textOrientation
        ? { textColor, fontSize, fontWeight, textOrientation } : undefined;

/** The label styles a layout records for its connectors and ports, keyed by connector id and port id. */
export function labelStylesOf(layout: DiagramLayout | undefined): DiagramLabelStyles {
    if (!layout) return NONE;
    const edges: Record<string, ConnectorLabelStyle> = {};
    for (const [id, edge] of Object.entries(layout.edges ?? {})) {
        const style = styleOf(edge);
        if (style || typeof edge.labelVisible === 'boolean')
            edges[id] = { ...style, ...(typeof edge.labelVisible === 'boolean' ? { labelVisible: edge.labelVisible } : {}) };
    }
    const ports: Record<string, DiagramLabelStyle> = {};
    for (const node of Object.values(layout.nodes ?? {})) {
        for (const [id, port] of Object.entries(node.ports ?? {})) {
            const style = styleOf(port);
            if (style) ports[id] = style;
        }
    }
    return { edges, ports };
}

export const useEdgeLabelStyle = (edgeId: string): ConnectorLabelStyle | undefined =>
    useContext(DiagramLabelStyleContext).edges[edgeId];

export const useMoveEdgeLabel = () => useContext(DiagramLabelStyleContext).moveEdgeLabel;

export const usePortLabelStyle = (portId: string): DiagramLabelStyle | undefined =>
    useContext(DiagramLabelStyleContext).ports[portId];

/**
 * Vertical text reads bottom to top, the way a drawing labels a vertical wall:
 * the glyphs run down the page and the whole is turned half a turn.
 */
export const VERTICAL_TEXT: CSSProperties = { writingMode: 'vertical-rl', transform: 'rotate(180deg)' };

/** The colour, size and weight a style overrides, for spreading over a label's own defaults. */
export function labelTextOverrides(style: DiagramLabelStyle | undefined): CSSProperties {
    if (!style) return {};
    return {
        ...(style.textColor ? { color: style.textColor } : {}),
        ...(style.fontSize ? { fontSize: `${style.fontSize}px` } : {}),
        ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    };
}

/** The text style a box's node data carries from its layout entry. */
export interface BoxTextStyle {
    textColor?: string;
    fontSize?: number;
    fontWeight?: number;
    textOrientation?: 'horizontal' | 'vertical';
}

/** A box title's overrides, orientation included, for spreading over the title's own style. */
export function boxTitleOverrides(data: BoxTextStyle): CSSProperties {
    return {
        ...labelTextOverrides(data),
        ...(data.textOrientation === 'vertical' ? { ...VERTICAL_TEXT, whiteSpace: 'nowrap', maxHeight: '100%' } : {}),
    };
}
