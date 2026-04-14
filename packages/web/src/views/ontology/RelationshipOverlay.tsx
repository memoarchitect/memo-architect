// ─── RelationshipOverlay ───────────────────────────────────────────────────────
//
// SVG overlay positioned inside the same transform container as LayerGrid.
// Draws SysML v2 connector notation edges between kind cards.
//
// Positioning: the overlay SVG shares the pre-transform coordinate space with
// the card layout. Card positions are measured via getBoundingClientRect()
// deltas divided by the container's effective CSS scale.
//
// Edges are only drawn when both endpoint kinds are visible in the DOM.
// Swimlane-collapsed cards are absent from the DOM → their edges are skipped.
//
// SVG markers (diamonds, triangles, arrows) are defined in a hidden <svg>
// injected into the document so they can be referenced by any edge.
// ─────────────────────────────────────────────────────────────────────────────

import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { OntologyPackageInfo } from '../../types/ontology';
import { getEdgeStyle, type SysmlEdgeStyle } from './sysml-edge-styles';

// ─── SVG marker defs (injected once into the document) ───────────────────────

const MARKER_SVG_ID = 'memo-sysml-edge-defs';

function ensureMarkerDefs() {
    if (document.getElementById(MARKER_SVG_ID)) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = MARKER_SVG_ID;
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
<defs>
  <!-- Open arrowhead -->
  <marker id="sysml-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linejoin="round"/>
  </marker>
  <!-- Filled arrowhead -->
  <marker id="sysml-filled-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 Z" fill="context-stroke" stroke="none"/>
  </marker>
  <!-- Open hollow triangle (realization) -->
  <marker id="sysml-triangle-open" viewBox="0 0 12 12" refX="11" refY="6"
          markerWidth="10" markerHeight="10" orient="auto-start-reverse">
    <polygon points="0,0 12,6 0,12" fill="white" stroke="context-stroke" stroke-width="1.5"/>
  </marker>
  <!-- Hollow diamond (aggregation) -->
  <marker id="sysml-diamond-open" viewBox="0 0 20 10" refX="0" refY="5"
          markerWidth="16" markerHeight="10" orient="auto">
    <polygon points="0,5 9,0 18,5 9,10" fill="white" stroke="context-stroke" stroke-width="1.5"/>
  </marker>
  <!-- Filled diamond (composition) -->
  <marker id="sysml-diamond-filled" viewBox="0 0 20 10" refX="0" refY="5"
          markerWidth="16" markerHeight="10" orient="auto">
    <polygon points="0,5 9,0 18,5 9,10" fill="context-stroke" stroke="context-stroke" stroke-width="1"/>
  </marker>
  <!-- Small circle (interface lollipop) -->
  <marker id="sysml-circle" viewBox="0 0 12 12" refX="11" refY="6"
          markerWidth="10" markerHeight="10" orient="auto-start-reverse">
    <circle cx="6" cy="6" r="4.5" fill="white" stroke="context-stroke" stroke-width="1.5"/>
  </marker>
</defs>`;
    document.body.appendChild(svg);
}

// ─── Edge data ────────────────────────────────────────────────────────────────

interface EdgeData {
    id: string;
    relName: string;
    style: SysmlEdgeStyle;
    sx: number; sy: number;   // source card right-center (in SVG coords)
    tx: number; ty: number;   // target card left-center
    sW: number; sH: number;   // source card dimensions (for offset)
    tW: number; tH: number;
}

// ─── Position measurement ─────────────────────────────────────────────────────

/**
 * Measure all edge positions from the DOM.
 * Returns EdgeData for every relationship whose both endpoints are visible.
 */
function measureEdges(
    containerEl: HTMLElement,
    relTypes: OntologyPackageInfo['relationshipTypes'],
    activeTypes: Set<string>,
): EdgeData[] {
    const containerRect = containerEl.getBoundingClientRect();
    if (containerRect.width === 0) return [];
    // CSS scale of the ancestor transform (container itself is not transformed)
    const scale = containerRect.width / (containerEl.offsetWidth || containerRect.width);

    const result: EdgeData[] = [];
    const seen = new Set<string>();

    for (const rel of relTypes) {
        if (!rel.sourceKind || !rel.targetKind) continue;
        if (rel.sourceKind === rel.targetKind) continue;
        const edgeKey = `${rel.name}::${rel.sourceKind}::${rel.targetKind}`;
        if (seen.has(edgeKey)) continue;
        seen.add(edgeKey);

        // Only render if this type is active (in the active set, or all active when set is empty)
        if (activeTypes.size > 0 && !activeTypes.has(rel.name)) continue;

        const srcEl = containerEl.querySelector(`[data-kind="${CSS.escape(rel.sourceKind)}"]`) as HTMLElement | null;
        const tgtEl = containerEl.querySelector(`[data-kind="${CSS.escape(rel.targetKind)}"]`) as HTMLElement | null;
        if (!srcEl || !tgtEl) continue;

        const srcRect = srcEl.getBoundingClientRect();
        const tgtRect = tgtEl.getBoundingClientRect();
        // Skip cards with zero size (hidden / collapsed)
        if (srcRect.width === 0 || tgtRect.width === 0) continue;

        // Convert to SVG coordinate space (pre-transform)
        const sx0 = (srcRect.left - containerRect.left) / scale;
        const sy0 = (srcRect.top  - containerRect.top)  / scale;
        const tx0 = (tgtRect.left - containerRect.left) / scale;
        const ty0 = (tgtRect.top  - containerRect.top)  / scale;
        const sW  = srcEl.offsetWidth;
        const sH  = srcEl.offsetHeight;
        const tW  = tgtEl.offsetWidth;
        const tH  = tgtEl.offsetHeight;

        result.push({
            id: edgeKey,
            relName: rel.name,
            style: getEdgeStyle(rel.name),
            sx: sx0 + sW,   sy: sy0 + sH / 2,   // right-center of source
            tx: tx0,        ty: ty0 + tH / 2,    // left-center of target
            sW, sH, tW, tH,
        });
    }
    return result;
}

// ─── SVG path for an edge ─────────────────────────────────────────────────────

function edgePath(e: EdgeData): string {
    const dx = Math.abs(e.tx - e.sx);
    const cp = Math.min(Math.max(dx * 0.45, 40), 120);
    const cpSx = e.sx + cp;
    const cpTx = e.tx - cp;
    return `M ${e.sx},${e.sy} C ${cpSx},${e.sy} ${cpTx},${e.ty} ${e.tx},${e.ty}`;
}

// ─── Individual edge SVG element ──────────────────────────────────────────────

function EdgeElement({ edge, dim }: { edge: EdgeData; dim: boolean }) {
    const { style, relName } = edge;
    const color = style.color;
    const opacity = dim ? 0.12 : 1;

    const markerEnd = style.targetMarker === 'arrow'         ? 'url(#sysml-arrow)'
                    : style.targetMarker === 'filled-arrow'  ? 'url(#sysml-filled-arrow)'
                    : style.targetMarker === 'triangle-open' ? 'url(#sysml-triangle-open)'
                    : style.targetMarker === 'circle'        ? 'url(#sysml-circle)'
                    : undefined;

    const markerStart = style.sourceMarker === 'diamond-open'   ? 'url(#sysml-diamond-open)'
                      : style.sourceMarker === 'diamond-filled' ? 'url(#sysml-diamond-filled)'
                      : undefined;

    const strokeDasharray = style.lineStyle === 'dashed' ? '6 4' : undefined;

    const path = edgePath(edge);
    // Midpoint for label
    const mx = (edge.sx + edge.tx) / 2;
    const my = (edge.sy + edge.ty) / 2 - 6;

    const labelText = style.stereotype ? `«${style.stereotype}»` : relName;
    const showLabel = !dim;

    return (
        <g opacity={opacity} style={{ transition: 'opacity 0.2s ease' }}>
            {/* Invisible wider hit-area */}
            <path d={path} fill="none" stroke="transparent" strokeWidth={8} />
            {/* Actual visible edge */}
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={dim ? 1 : 1.5}
                strokeDasharray={strokeDasharray}
                markerEnd={markerEnd}
                markerStart={markerStart}
                style={{ stroke: color }}
            />
            {/* Label */}
            {showLabel && (
                <text
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    style={{
                        fontSize: '9px',
                        fill: color,
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 600,
                        pointerEvents: 'none',
                    }}
                >
                    <tspan
                        style={{
                            paintOrder: 'stroke',
                            stroke: 'white',
                            strokeWidth: 3,
                            strokeLinejoin: 'round',
                        }}
                    >
                        {labelText}
                    </tspan>
                    {labelText}
                </text>
            )}
        </g>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RelationshipOverlayProps {
    containerRef: RefObject<HTMLDivElement | null>;
    ontology: OntologyPackageInfo;
    activeTypes: Set<string>;  // empty = show all, non-empty = show only these
}

export function RelationshipOverlay({ containerRef, ontology, activeTypes }: RelationshipOverlayProps) {
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    // Measure card positions after every render that might change layout
    useLayoutEffect(() => {
        ensureMarkerDefs();
        const container = containerRef.current;
        if (!container) return;

        const doMeasure = () => {
            const measured = measureEdges(container, ontology.relationshipTypes ?? [], activeTypes);
            setEdges(measured);
        };

        doMeasure();

        // Re-measure on resize (swimlane expand/collapse changes layout)
        const ro = new ResizeObserver(doMeasure);
        ro.observe(container);
        return () => ro.disconnect();
    }, [containerRef, ontology.relationshipTypes, activeTypes]);

    if (edges.length === 0) return null;

    return (
        <svg
            ref={svgRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 5,
            }}
        >
            {edges.map(edge => (
                <EdgeElement
                    key={edge.id}
                    edge={edge}
                    dim={activeTypes.size > 0 && !activeTypes.has(edge.relName)}
                />
            ))}
        </svg>
    );
}
