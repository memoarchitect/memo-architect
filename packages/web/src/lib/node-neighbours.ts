// ─── What a box is connected to on the diagram ───────────────────────────────
//
// Read from the connectors drawn, so it says what the diagram says and needs no list of kinds. Grouped by what the
// neighbour is to the box, after getNodeNeighbours in EventCatalog's packages/visualiser.

export interface NeighbourEdge { source: string; target: string; hidden?: boolean; label?: unknown; data?: Record<string, unknown> }
export interface Neighbour { id: string; name: string; note?: string }
export interface NeighbourGroup { heading: string; items: Neighbour[] }

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

export function neighbourGroups(nodeId: string, edges: readonly NeighbourEdge[], nameOf: (id: string) => string): NeighbourGroup[] {
    const groups = new Map<string, Map<string, Neighbour>>();
    const add = (heading: string, id: string, note?: string) => {
        const items = groups.get(heading) ?? new Map<string, Neighbour>();
        groups.set(heading, items);
        const existing = items.get(id);
        if (existing) { if (note && !existing.note?.split(', ').includes(note)) existing.note = existing.note ? `${existing.note}, ${note}` : note; }
        else items.set(id, { id, name: nameOf(id), note });
    };
    for (const edge of edges) {
        if (edge.hidden || edge.source === edge.target) continue;
        const outgoing = edge.source === nodeId;
        if (!outgoing && edge.target !== nodeId) continue;
        const other = outgoing ? edge.target : edge.source;
        const item = text(edge.data?.flowItem);
        const label = text(edge.label);
        if (edge.data?.flowCategory === 'control') add(outgoing ? 'Leads to' : 'Comes after', other, label);
        else if (item) add(outgoing ? 'Sends to' : 'Receives from', other, item);
        else add('Connected to', other, label);
    }
    const order = ['Comes after', 'Leads to', 'Receives from', 'Sends to', 'Connected to'];
    return order.filter(heading => groups.has(heading)).map(heading => ({ heading, items: [...groups.get(heading)!.values()] }));
}
