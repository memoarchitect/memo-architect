// Renderer-neutral SysML graphical notation scene.  This is the boundary
// between semantic projection/layout and drawing engines; it deliberately has
// no ReactFlow or maxGraph imports.

export type NotationGlyph = 'frame' | 'usage' | 'definition' | 'accept' | 'send' | 'decision' | 'merge' | 'fork' | 'join' | 'activity-final' | 'flow-final' | 'generic';
export interface NotationPort { id: string; name: string; side: 'left' | 'right' | 'top' | 'bottom'; direction?: 'in' | 'out' | 'inout'; pin?: boolean; }
export interface NotationCompartment { title?: string; entries: string[]; }
export interface NotationNode {
    id: string; subjectId: string; x: number; y: number; width: number; height: number;
    label: string; kind: string; glyph: NotationGlyph; color: string; isDefinition: boolean; isFrame: boolean;
    parentId?: string; compartments?: NotationCompartment[]; ports?: NotationPort[];
    sourceRange?: { start: number; end: number }; accessibilityText: string;
    diagnostic?: { domain: 'sysml' | 'memo-ingest' | 'memo-methodology'; severity: 'error' | 'warning' | 'info'; message: string };
    memberIds?: string[]; orientation?: 'row' | 'column';
}
export interface NotationEdge {
    id: string; subjectId: string; sourceId: string; targetId: string; label?: string;
    sourcePortId?: string; targetPortId?: string; color: string; strokeWidth: number; dashed: boolean; animated: boolean;
    routing?: string; points: Array<{ x: number; y: number }>;
}
export interface NotationScene { nodes: NotationNode[]; edges: NotationEdge[]; }

export interface NotationLayoutNode<T = Record<string, any>> { id: string; type?: string; position: { x: number; y: number }; parentId?: string; extent?: unknown; width?: number; height?: number; style?: any; data: T; draggable?: boolean; selectable?: boolean; hidden?: boolean; zIndex?: number; }
export interface NotationLayoutEdge<T = Record<string, any>> { id: string; source: string; target: string; type?: string; sourceHandle?: string | null; targetHandle?: string | null; label?: unknown; animated?: boolean; style?: any; data?: T; markerEnd?: any; markerStart?: any; selectable?: boolean; zIndex?: number; labelStyle?: any; labelBgStyle?: any; labelBgPadding?: [number, number]; labelBgBorderRadius?: number; className?: string; }
type FlowishNode = NotationLayoutNode<Record<string, unknown>>;
type FlowishEdge = NotationLayoutEdge<Record<string, unknown>>;
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && Number.isFinite(Number.parseFloat(v)) ? Number.parseFloat(v) : undefined;
const activityGlyph = (kind: string): NotationGlyph => {
    const k = kind.replace(/[ _-]/g, '').toLowerCase();
    if (k.includes('accept')) return 'accept'; if (k.includes('send')) return 'send'; if (k.includes('decision')) return 'decision'; if (k.includes('merge')) return 'merge';
    if (k.includes('fork')) return 'fork'; if (k.includes('join')) return 'join'; if (k.includes('activityfinal') || k.includes('terminate')) return 'activity-final'; if (k.includes('flowfinal')) return 'flow-final';
    return 'usage';
};
function order(nodes: readonly FlowishNode[]) { const byId = new Map(nodes.map(n => [n.id, n])); const out: FlowishNode[] = []; const seen = new Set<string>(); const visit = (n: FlowishNode) => { if (seen.has(n.id)) return; seen.add(n.id); if (n.parentId && byId.has(n.parentId)) visit(byId.get(n.parentId)!); out.push(n); }; nodes.forEach(visit); return out; }

/** Convert the legacy layout carrier once; renderers only consume NotationScene. */
export function projectLayoutToNotationScene(nodes: readonly FlowishNode[], edges: readonly FlowishEdge[]): NotationScene {
    const ids = new Set(nodes.map(n => n.id));
    const sceneNodes = order(nodes).map(n => {
        const d = n.data ?? {}; const label = typeof d.label === 'string' && d.label ? d.label : n.id; const kind = typeof d.kind === 'string' ? d.kind : n.type ?? '';
        const isDefinition = /definition$| def$/i.test(kind) || d.isDefinition === true;
        const nodeType = typeof d.nodeType === 'string' ? d.nodeType : kind;
        const glyph: NotationGlyph = d.isFrame === true ? 'frame' : d.genericRecord === true ? 'generic' : isDefinition ? 'definition' : activityGlyph(nodeType);
        const explicitPorts = Array.isArray(d.ports) ? d.ports.filter((p): p is NotationPort => !!p && typeof p === 'object' && typeof (p as NotationPort).id === 'string') : [];
        const ports = explicitPorts.length ? explicitPorts : [
            ...(Array.isArray(d.inPorts) ? d.inPorts.filter((p): p is string => typeof p === 'string').map((name, i) => ({ id: `in:${name}`, name, side: 'left' as const, direction: 'in' as const, pin: true, _i: i })) : []),
            ...(Array.isArray(d.outPorts) ? d.outPorts.filter((p): p is string => typeof p === 'string').map((name, i) => ({ id: `out:${name}`, name, side: 'right' as const, direction: 'out' as const, pin: true, _i: i })) : []),
        ];
        const compartments = Array.isArray(d.compartments) ? d.compartments as NotationCompartment[] : undefined;
        return { id: n.id, subjectId: typeof d.subjectId === 'string' ? d.subjectId : n.id, ...(n.parentId && ids.has(n.parentId) ? { parentId: n.parentId } : {}), x: n.position?.x ?? 0, y: n.position?.y ?? 0,
            width: number(n.width) ?? number((n.style as { width?: unknown } | undefined)?.width) ?? Math.max(130, label.length * 7.5 + 48), height: number(n.height) ?? number((n.style as { height?: unknown } | undefined)?.height) ?? 52,
            label, kind, glyph, color: [d.bgColor, d.color, d.layerColor].find((v): v is string => typeof v === 'string' && !!v) ?? '#6B7280', isDefinition,
            isFrame: d.isFrame === true, ...(ports.length ? { ports } : {}), ...(compartments?.length ? { compartments } : {}), ...(Array.isArray(d.memberIds) ? { memberIds: d.memberIds as string[] } : {}), ...(d.orientation === 'row' || d.orientation === 'column' ? { orientation: d.orientation as 'row' | 'column' } : {}),
            accessibilityText: `${glyph} ${label}${kind ? ` (${kind})` : ''}`,
            ...(d.diagnostic && typeof d.diagnostic === 'object' ? { diagnostic: d.diagnostic as NotationNode['diagnostic'] } : {}),
        };
    });
    return { nodes: sceneNodes, edges: edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => { const style = e.style as { stroke?: unknown; strokeWidth?: unknown; strokeDasharray?: unknown } | undefined; return ({ id: e.id, subjectId: typeof e.data?.subjectId === 'string' ? e.data.subjectId : e.id, sourceId: e.source, targetId: e.target, ...(typeof e.label === 'string' && e.label ? { label: e.label } : {}), ...(e.sourceHandle ? { sourcePortId: e.sourceHandle } : {}), ...(e.targetHandle ? { targetPortId: e.targetHandle } : {}), color: typeof style?.stroke === 'string' ? style.stroke : '#9CA3AF', strokeWidth: number(style?.strokeWidth) ?? 1.5, dashed: typeof style?.strokeDasharray === 'string', animated: e.animated === true, ...(typeof e.data?.routing === 'string' ? { routing: e.data.routing } : {}), points: Array.isArray(e.data?.points) && (e.data!.points as unknown[]).length > 2 ? (e.data!.points as Array<{x:number;y:number}>).slice(1, -1) : [] }); }) };
}

/** A deterministic export path shared by every renderer. */
export function notationSceneToSvg(scene: NotationScene): string {
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
    const maxX = Math.max(1, ...scene.nodes.map(n => n.x + n.width + 24)), maxY = Math.max(1, ...scene.nodes.map(n => n.y + n.height + 24));
    const node = (n: NotationNode) => { const shape = n.glyph === 'decision' || n.glyph === 'merge' ? `<polygon points="${n.x+n.width/2},${n.y} ${n.x+n.width},${n.y+n.height/2} ${n.x+n.width/2},${n.y+n.height} ${n.x},${n.y+n.height/2}"/>` : n.glyph === 'fork' || n.glyph === 'join' ? `<rect x="${n.x}" y="${n.y+n.height/2-4}" width="${n.width}" height="8" rx="2" fill="#111"/>` : n.glyph === 'activity-final' ? `<circle cx="${n.x+n.width/2}" cy="${n.y+n.height/2}" r="${Math.min(n.width,n.height)/2-3}"/><circle cx="${n.x+n.width/2}" cy="${n.y+n.height/2}" r="${Math.min(n.width,n.height)/2-9}" fill="white"/>` : `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="${n.isDefinition ? 2 : 12}"/>`; return `<g data-subject-id="${esc(n.subjectId)}" aria-label="${esc(n.accessibilityText)}" fill="white" stroke="${n.color}" stroke-width="1.5">${shape}<text x="${n.x+n.width/2}" y="${n.y+n.height/2}" text-anchor="middle" fill="#111" stroke="none" font-size="12">${esc(n.label)}</text>${n.diagnostic ? `<circle cx="${n.x+n.width-7}" cy="${n.y+7}" r="5" fill="#d97706" stroke="none"/>` : ''}</g>`; };
    const edge = (e: NotationEdge) => { const a = scene.nodes.find(n => n.id === e.sourceId), b = scene.nodes.find(n => n.id === e.targetId); if (!a || !b) return ''; const points = [{x:a.x+a.width,y:a.y+a.height/2}, ...e.points, {x:b.x,y:b.y+b.height/2}].map(p=>`${p.x},${p.y}`).join(' '); return `<g data-subject-id="${esc(e.subjectId)}"><polyline points="${points}" fill="none" stroke="${e.color}" stroke-width="${e.strokeWidth}"${e.dashed?' stroke-dasharray="5 3"':''}/>${e.label ? `<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-5}" font-size="11">${esc(e.label)}</text>` : ''}</g>`; };
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">${scene.edges.map(edge).join('')}${scene.nodes.map(node).join('')}</svg>`;
}
