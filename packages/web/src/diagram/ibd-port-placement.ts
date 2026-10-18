import type { Node, Edge } from '@xyflow/react';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import type { PortInfo } from '../views/templates/interconnection-view';

/** Explicit, deterministic coordinate descent. Saved positions are fixed, including
 * legacy/generated saved entries whose provenance cannot safely be inferred. */
export function shortenAutomaticPortRoutes<N extends Node, E extends Edge>(nodes: N[], edges: E[],
    layout: DiagramLayout | undefined, evaluate: (nodes: N[]) => { edges: E[]; length: number },
    budget = 128): { nodes: N[]; edges: E[]; before: number; after: number; evaluations: number } {
    let current = nodes, measured = evaluate(nodes), evaluations = 1;
    const before = measured.length;
    const abs = (id: string): { x: number; y: number } => {
        const n = current.find(n => n.id === id);
        if (!n) return { x: 0, y: 0 };
        const parent = n.parentId ? abs(n.parentId) : { x: 0, y: 0 };
        return { x: parent.x + n.position.x, y: parent.y + n.position.y };
    };
    for (let pass = 0; pass < 2 && evaluations < budget; pass++) {
        for (const seed of nodes) {
            const node = current.find(n => n.id === seed.id)!;
            if (node.hidden || node.data.isFrame) continue;
            for (const port of (node.data.ports ?? []) as PortInfo[]) {
                if (evaluations >= budget) break;
                if (port.nested || port.nestedCount || layout?.nodes[node.id]?.ports?.[port.id]) continue;
                const vertical = port.side === 'left' || port.side === 'right';
                const size = port.size ?? 32;
                const extent = Number(vertical ? node.height ?? node.style?.height : node.width ?? node.style?.width);
                // InterconnectionNode measures size+8 along the wall for resize;
                // keep that envelope and four additional units inside the frame.
                const min = vertical ? 58 : 4, max = extent - size - 12;
                if (!Number.isFinite(max) || max < min) continue;
                const origin = abs(node.id), start = vertical ? port.y : port.x;
                const peers: number[] = [];
                for (const edge of edges) {
                    const from = edge.source === node.id && edge.data?.sourcePortId === port.id;
                    const to = edge.target === node.id && edge.data?.targetPortId === port.id;
                    if (!from && !to) continue;
                    const other = current.find(n => n.id === (from ? edge.target : edge.source));
                    const otherId = from ? edge.data?.targetPortId : edge.data?.sourcePortId;
                    const p = ((other?.data.ports ?? []) as PortInfo[]).find(p => p.id === otherId);
                    if (!other || !p) continue;
                    const position = abs(other.id);
                    peers.push((vertical ? position.y + p.y - origin.y : position.x + p.x - origin.x) + (p.size ?? 32) / 2 - size / 2);
                }
                if (!peers.length) continue;
                const ports = (current.find(n => n.id === node.id)!.data.ports ?? []) as PortInfo[];
                const candidates = [...new Set([start, ...peers, min, max].map(v => Math.max(min, Math.min(max, v))))].slice(0, 16);
                for (const value of candidates) {
                    if (evaluations >= budget) break;
                    const proposal = { ...port, [vertical ? 'y' : 'x']: value };
                    const blocked = ports.some(p => p.id !== port.id && (
                        p.nested || p.nestedCount ? true :
                        proposal.x < p.x + (p.size ?? 32) + 12 && proposal.x + size + 12 > p.x &&
                        proposal.y < p.y + (p.size ?? 32) + 12 && proposal.y + size + 12 > p.y));
                    if (blocked) continue;
                    const next = current.map(n => n.id !== node.id ? n : ({ ...n, data: { ...n.data,
                        ports: ((n.data.ports ?? []) as PortInfo[]).map(p => p.id === port.id ? proposal : p) } }));
                    const result = evaluate(next); evaluations++;
                    if (Number.isFinite(result.length) && result.length < measured.length - 1e-6) {
                        current = next; measured = result;
                    }
                }
            }
        }
    }
    return { nodes: current, edges: measured.edges, before, after: measured.length, evaluations };
}
