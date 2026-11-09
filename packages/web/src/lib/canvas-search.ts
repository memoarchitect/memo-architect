// ─── Finding a box on the open diagram ────────────────────────────────────────

export interface SearchNode { id: string; hidden?: boolean; data?: Record<string, unknown> }
export interface SearchModel { elements: Record<string, { name?: string; shortName?: string; shortId?: string; kind?: string } | undefined> }
export interface SearchHit { id: string; name: string; detail?: string }

const MAX_HITS = 12;

/** A lane's name is a second node laid over the lane; the lane itself is the one to find. */
const isLaneLabel = (id: string) => id.startsWith('__lane_label_');

const scoreOf = (name: string, query: string) => {
    if (name === query) return 0;
    if (name.startsWith(query)) return 1;
    if (new RegExp(`(^|[\\s_:-])${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return 2;
    return name.includes(query) ? 3 : undefined;
};

/** The boxes drawn on the canvas that match, best first: by name, then by the id the model gives them. */
export function searchCanvas(nodes: readonly SearchNode[], query: string, model: SearchModel | null | undefined): SearchHit[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const hits: (SearchHit & { score: number })[] = [];
    for (const node of nodes) {
        if (node.hidden || isLaneLabel(node.id)) continue;
        const element = model?.elements[node.id];
        const label = typeof node.data?.label === 'string' ? node.data.label : undefined;
        const name = element?.name ?? element?.shortName ?? label;
        if (!name) continue;
        const byName = scoreOf(name.toLowerCase(), needle);
        const byId = element?.shortId && element.shortId.toLowerCase().includes(needle) ? 4 : undefined;
        const score = byName ?? byId;
        if (score === undefined) continue;
        hits.push({ id: node.id, name, detail: [element?.shortId, element?.kind].filter(Boolean).join(' · ') || undefined, score });
    }
    return hits
        .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
        .slice(0, MAX_HITS)
        .map(({ id, name, detail }) => ({ id, name, detail }));
}
