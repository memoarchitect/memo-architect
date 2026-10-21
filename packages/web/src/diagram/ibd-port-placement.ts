import type { Node, Edge } from '@xyflow/react';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { legalPortSlot } from './ibd-port-constraints';
import type { PortInfo, PortSide } from '../views/templates/interconnection-view';

export interface PortPlacementMetric<E> {
    edges: E[];
    length: number;
    bends?: number;
    crossings?: number;
    blocked?: number;
    overlap?: number;
}
export const placementCost = (value: Omit<PortPlacementMetric<never>, 'edges'>) =>
    value.length + 24 * (value.bends ?? 0) + 600 * (value.crossings ?? 0)
    + 10_000 * (value.blocked ?? 0) + 50 * (value.overlap ?? 0);

/** Proposal estimates may disagree with final routing. Keep the best verified
 * placement and never trade a body intersection or extra overlap for its score. */
export const improvesPlacement = (
    candidate: Omit<PortPlacementMetric<never>, 'edges'>,
    previous: Omit<PortPlacementMetric<never>, 'edges'>,
    baseline = previous,
) => Number.isFinite(placementCost(candidate)) && (candidate.blocked ?? 0) === 0
    && (candidate.overlap ?? 0) <= (baseline.overlap ?? 0) + 1e-6
    && placementCost(candidate) < placementCost(previous) - 1e-6;

export interface PortPlacementOptions<N> {
    allWalls?: boolean;
    orderWalls?: boolean;
    orderOnly?: boolean;
    includeSaved?: boolean;
    priority?: (node: N, port: PortInfo) => number;
    legal?: (node: N, port: PortInfo, side: PortSide, along: number, nodes: N[]) =>
        { x: number; y: number; side: PortSide } | null;
}

/** Deterministic bounded coordinate descent. Saved entries are fixed unless the
 * caller explicitly requests their replacement, including legacy saved ports
 * whose automatic/manual provenance cannot safely be inferred. */
export function shortenAutomaticPortRoutes<N extends Node, E extends Edge>(
    nodes: N[], edges: E[], layout: DiagramLayout | undefined,
    evaluate: (nodes: N[]) => PortPlacementMetric<E>, budget = 128,
    options: PortPlacementOptions<N> = {},
): { nodes: N[]; edges: E[]; before: number; after: number; evaluations: number } {
    let current = nodes, measured = evaluate(nodes), evaluations = 1;
    const before = measured.length;
    const absolute = (id: string): { x: number; y: number } => {
        const node = current.find(n => n.id === id);
        if (!node) return { x: 0, y: 0 };
        const parent = node.parentId ? absolute(node.parentId) : { x: 0, y: 0 };
        return { x: parent.x + node.position.x, y: parent.y + node.position.y };
    };
    const wallOrder = (base:N[],owner:N,side:PortSide):N[] => {
        const absoluteIn = (id:string):{x:number;y:number} => {
            const n=base.find(n=>n.id===id)!;
            const parent=n.parentId?absoluteIn(n.parentId):{x:0,y:0};
            return {x:n.position.x+parent.x,y:n.position.y+parent.y};
        };
        const ports = ((owner.data.ports ?? []) as PortInfo[]).filter(p => p.side === side
            && !p.nested && !p.nestedCount && (options.includeSaved || !layout?.nodes[owner.id]?.ports?.[p.id]));
        if (ports.length < 2) return base;
        const axis = side === 'left' || side === 'right' ? 'y' : 'x';
        const projection = (port: PortInfo) => {
            const values = edges.flatMap(edge => {
                const from = edge.source === owner.id && edge.data?.sourcePortId === port.id;
                const to = edge.target === owner.id && edge.data?.targetPortId === port.id;
                if (!from && !to) return [];
                const peer = base.find(n => n.id === (from ? edge.target : edge.source));
                const peerPort = ((peer?.data.ports ?? []) as PortInfo[]).find(p => p.id === (from ? edge.data?.targetPortId : edge.data?.sourcePortId));
                return peer && peerPort ? [absoluteIn(peer.id)[axis] + peerPort[axis] + (peerPort.size ?? 32) / 2] : [];
            });
            return values.length ? values.reduce((a,b) => a+b,0) / values.length : absoluteIn(owner.id)[axis] + port[axis];
        };
        const slots = ports.map(p => p[axis]).sort((a,b) => a-b);
        const ordered = [...ports].sort((a,b) => projection(a)-projection(b) || a.id.localeCompare(b.id));
        const positions = new Map(ordered.map((port,index) => [port.id, slots[index]]));
        if (ports.every(port => port[axis] === positions.get(port.id))) return base;
        const next = base.map(n => n.id !== owner.id ? n : ({...n,data:{...n.data,
            ports:(n.data.ports as PortInfo[]).map(p => positions.has(p.id) ? {...p,[axis]:positions.get(p.id)!} : p)}}));
        return next;
    };
    const legalOrder = (base:N[],proposal:N[]) => proposal.every(owner => {
        const old = base.find(n=>n.id===owner.id)!;
        const ports = (owner.data.ports??[]) as PortInfo[];
        return ports.every(port => {
            const previous = ((old.data.ports??[]) as PortInfo[]).find(p=>p.id===port.id)!;
            if (previous.x===port.x && previous.y===port.y) return true;
            const axis=port.side==='left'||port.side==='right'?'y':'x';
            const slot=options.legal?options.legal(owner,port,port.side,port[axis],proposal)
                :legalPortSlot(port,ports,port.side,port[axis],Number(owner.width??owner.style?.width),Number(owner.height??owner.style?.height));
            const valid = slot && Math.abs(slot.x-port.x)<1e-6 && Math.abs(slot.y-port.y)<1e-6;
            return valid;
        });
    });
    const considerOrder = (proposal:N[]) => {
        if (proposal===current || !legalOrder(current,proposal) || evaluations>=budget) return;
        const result=evaluate(proposal);evaluations++;
        if (Number.isFinite(result.length)&&placementCost(result)<placementCost(measured)-1e-6) {
            current=proposal;measured=result;
        }
    };
    if (options.orderWalls) {
        // A crossing can require exchanges on both ends. Evaluate a coordinated
        // sweep before local improvements so an intermediate worse wall cannot
        // trap the optimizer in the original ordering.
        let batch=current;
        for(let pass=0;pass<3;pass++)for(const original of nodes)for(const side of ['left','right','top','bottom'] as const){
            const owner=batch.find(n=>n.id===original.id)!;
            if(!owner.hidden&&!owner.data.isFrame)batch=wallOrder(batch,owner,side);
        }
        considerOrder(batch);
        for(let pass=0;pass<3&&evaluations<budget;pass++)for(const original of nodes)for(const side of ['left','right','top','bottom'] as const){
            const owner=current.find(n=>n.id===original.id)!;
            if(!owner.hidden&&!owner.data.isFrame)considerOrder(wallOrder(current,owner,side));
        }
    }
    if (options.orderOnly) return { nodes: current, edges: measured.edges, before, after: measured.length, evaluations };
    const seeds = nodes.flatMap(node => ((node.data.ports ?? []) as PortInfo[])
        .filter(port => !node.hidden && !node.data.isFrame && !port.nested && !port.nestedCount
            && (options.includeSaved || !layout?.nodes[node.id]?.ports?.[port.id]))
        .map(port => ({ nodeId: node.id, portId: port.id, priority: options.priority?.(node, port) ?? 0 })))
        .sort((a, b) => b.priority - a.priority);
    for (let pass = 0; pass < 2 && evaluations < budget; pass++) {
        for (const seed of seeds) {
            if (evaluations >= budget) break;
            const node = current.find(n => n.id === seed.nodeId)!;
            const port = (node.data.ports as PortInfo[]).find(p => p.id === seed.portId)!;
            const sides = options.allWalls
                ? [port.side, ...(['left', 'right', 'top', 'bottom'] as const).filter(side => side !== port.side)]
                : [port.side];
            for (const side of sides) {
                const vertical = side === 'left' || side === 'right', size = port.size ?? 32;
                const width = Number(node.width ?? node.style?.width), height = Number(node.height ?? node.style?.height);
                const min = vertical ? 58 : 12, max = (vertical ? height : width) - size - 12;
                if (!Number.isFinite(max) || max < min) continue;
                const origin = absolute(node.id), peers: number[] = [];
                for (const edge of edges) {
                    const from = edge.source === node.id && edge.data?.sourcePortId === port.id;
                    const to = edge.target === node.id && edge.data?.targetPortId === port.id;
                    if (!from && !to) continue;
                    const other = current.find(n => n.id === (from ? edge.target : edge.source));
                    const otherId = from ? edge.data?.targetPortId : edge.data?.sourcePortId;
                    const peer = ((other?.data.ports ?? []) as PortInfo[]).find(p => p.id === otherId);
                    if (!other || !peer) continue;
                    const position = absolute(other.id);
                    peers.push((vertical ? position.y + peer.y - origin.y : position.x + peer.x - origin.x)
                        + (peer.size ?? 32) / 2 - size / 2);
                }
                if (!peers.length) continue;
                const start = vertical ? port.y : port.x;
                const candidates = [...new Set([start, ...peers, min, max]
                    .map(value => Math.max(min, Math.min(max, value))))].slice(0, 16);
                for (const value of candidates) {
                    if (evaluations >= budget) break;
                    const owner = current.find(n => n.id === node.id)!, ports = owner.data.ports as PortInfo[];
                    const live = ports.find(p => p.id === port.id)!;
                    const slot = options.legal ? options.legal(owner, live, side, value, current)
                        : legalPortSlot(live, ports, side, value, width, height);
                    if (!slot || live.side === slot.side && live.x === slot.x && live.y === slot.y) continue;
                    const proposal = { ...live, ...slot };
                    if (ports.some(p => p.id !== port.id && (p.nested || p.nestedCount
                        || proposal.x < p.x + (p.size ?? 32) + 12 && proposal.x + size + 12 > p.x
                        && proposal.y < p.y + (p.size ?? 32) + 12 && proposal.y + size + 12 > p.y))) continue;
                    const next = current.map(n => n.id !== node.id ? n : ({ ...n, data: { ...n.data,
                        ports: (n.data.ports as PortInfo[]).map(p => p.id === port.id ? proposal : p) } }));
                    const result = evaluate(next); evaluations++;
                    if (Number.isFinite(result.length) && placementCost(result) < placementCost(measured) - 1e-6) {
                        current = next; measured = result;
                    }
                }
            }
        }
    }
    return { nodes: current, edges: measured.edges, before, after: measured.length, evaluations };
}
