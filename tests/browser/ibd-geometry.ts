// Reads an IBD's on-screen geometry and checks the rules connectors follow.
// Runs inside the page (passed to page.evaluate), so it is self-contained.

export interface Box { id: string; owner?: string; x: number; y: number; w: number; h: number }
export interface IbdGeometry {
    parts: Record<string, Box>;
    ports: Record<string, Box>;
    edges: number;
    /** Connectors whose ends are not on a port. */
    loose: string[];
    /** Connectors with segments that are not horizontal or vertical. */
    notOrthogonal: string[];
    /** Connectors that run through a part they do not connect (or sit inside). */
    throughPart: string[];
    /** Connectors that run through a port they do not end at. */
    throughPort: string[];
    /** Pairs of ports that overlap. */
    overlappingPorts: string[];
}

export function readIbdGeometry(): IbdGeometry {
    const box = (element: Element, id: string): Box => {
        const r = element.getBoundingClientRect();
        return { id, x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const short = (id: string) => id.split('::').pop()!;
    const parts = [...document.querySelectorAll<HTMLElement>('.react-flow__node')]
        .map(node => box(node, node.dataset.id!)).filter(part => part.w > 0);
    const ports = [...document.querySelectorAll<HTMLElement>('[data-ibd-port]')].map(port => ({
        ...box(port, port.dataset.ibdPort!), owner: port.closest<HTMLElement>('.react-flow__node')?.dataset.id }));
    const inside = (p: number[], b: Box, pad: number) => p[0] > b.x + pad && p[0] < b.x + b.w - pad && p[1] > b.y + pad && p[1] < b.y + b.h - pad;
    const near = (p: number[], b: Box, d: number) => p[0] > b.x - d && p[0] < b.x + b.w + d && p[1] > b.y - d && p[1] < b.y + b.h + d;
    const encloses = (a: Box, b: Box) => a !== b && a.x <= b.x + 1 && a.y <= b.y + 1 && a.x + a.w >= b.x + b.w - 1 && a.y + a.h >= b.y + b.h - 1;
    const result: IbdGeometry = { parts: {}, ports: {}, edges: 0, loose: [], notOrthogonal: [], throughPart: [], throughPort: [], overlappingPorts: [] };
    for (const group of document.querySelectorAll<SVGGElement>('.react-flow__edge')) {
        const path = group.querySelector<SVGPathElement>('.react-flow__edge-path');
        if (!path) continue;
        const length = path.getTotalLength(), matrix = path.getScreenCTM();
        if (length < 2 || !matrix) continue;
        const id = short(group.dataset.id ?? group.getAttribute('data-testid') ?? '');
        const points: number[][] = [];
        for (let i = 0, n = Math.ceil(length / 2); i <= n; i++) {
            const q = path.getPointAtLength(length * i / n), p = new DOMPoint(q.x, q.y).matrixTransform(matrix);
            points.push([p.x, p.y]);
        }
        result.edges++;
        const first = points[0], last = points[points.length - 1];
        const from = ports.find(port => near(first, port, 6)), to = ports.find(port => near(last, port, 6));
        if (!from || !to) result.loose.push(id);
        // Corners are rounded and crossings hop, so allow a little off-axis travel.
        let offAxis = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = Math.abs(points[i][0] - points[i - 1][0]), dy = Math.abs(points[i][1] - points[i - 1][1]);
            if (dx > 0.4 && dy > 0.4) offAxis += Math.hypot(dx, dy);
        }
        if (offAxis > 30) result.notOrthogonal.push(id);
        const allowed = new Set<string>();
        for (const end of [from, to]) {
            const owner = parts.find(part => part.id === end?.owner);
            if (!owner) continue;
            allowed.add(owner.id);
            for (const part of parts) if (encloses(part, owner)) allowed.add(part.id);
        }
        const body = points.filter(p => Math.hypot(p[0] - first[0], p[1] - first[1]) > 14 && Math.hypot(p[0] - last[0], p[1] - last[1]) > 14);
        for (const part of parts) if (!allowed.has(part.id) && body.some(p => inside(p, part, 3))) result.throughPart.push(`${id} through ${short(part.id)}`);
        for (const port of ports) if (port !== from && port !== to && body.some(p => inside(p, port, 2))) result.throughPort.push(`${id} through ${short(port.id)}`);
    }
    for (let i = 0; i < ports.length; i++) for (let j = i + 1; j < ports.length; j++) {
        const a = ports[i], b = ports[j];
        if (a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2) result.overlappingPorts.push(`${short(a.id)}/${short(b.id)}`);
    }
    for (const part of parts) result.parts[part.id] = part;
    for (const port of ports) result.ports[port.id] = port;
    return result;
}
