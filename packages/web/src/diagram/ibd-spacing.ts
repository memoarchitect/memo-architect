// Adding or removing space between IBD parts, and between the ports on a part's
// walls. Positions are local to the parent, as in React Flow. Nothing here ever
// makes two siblings overlap: spacing keeps every part's order, and a part that
// grows pushes the siblings to its right and below by the amount it grew.

export type SpacingSide = 'left' | 'right' | 'top' | 'bottom';
export interface SpacingPort { id: string; x: number; y: number; side: SpacingSide; size: number; nested?: boolean }
export interface SpacingPart {
    id: string; parentId?: string; x: number; y: number; width: number; height: number;
    ports?: SpacingPort[];
}

/** Gap kept between parts, and between ports, however much space is removed. */
export const MIN_PART_GAP = 16;
export const MIN_PORT_GAP = 4;
/** Room a container keeps around its contents when it grows to fit them. */
const CONTAINER_PADDING = 16;
/** Corner margin a port keeps from the end of its wall. */
const WALL_MARGIN = 4;

const clone = (parts: readonly SpacingPart[]) => parts.map(part => ({ ...part, ports: part.ports?.map(port => ({ ...port })) }));

/**
 * Spread the parts in each of `groups` (parent ids; undefined is the board) by
 * `step` along each axis per gap, or bring them closer for a negative step.
 * Each part moves by `step` times the number of siblings wholly to its left
 * (and above), so every gap between neighbours changes by the same amount.
 */
export function spaceParts(parts: readonly SpacingPart[], groups: ReadonlySet<string | undefined>, step: number): SpacingPart[] {
    const result = clone(parts);
    const byId = new Map(result.map(part => [part.id, part]));
    const depth = (id: string | undefined): number => { let d = 0; for (let p = id && byId.get(id); p; p = p.parentId ? byId.get(p.parentId) : undefined) d++; return d; };
    // Deepest groups first, so a container has its final size before its own
    // siblings are spaced around it.
    for (const group of [...groups].sort((a, b) => depth(b) - depth(a))) {
        const members = result.filter(part => part.parentId === group);
        if (members.length > 1) for (const axis of ['x', 'y'] as const) spaceAxis(members, axis, step);
        if (group !== undefined) fitContainer(result, group);
    }
    return result;
}

function spaceAxis(members: SpacingPart[], axis: 'x' | 'y', step: number) {
    const extent = axis === 'x' ? 'width' : 'height';
    const end = (part: SpacingPart) => part[axis] + part[extent];
    const rank = new Map(members.map(part => [part.id, members.filter(other => end(other) <= part[axis] + 1e-6).length]));
    let amount = step;
    if (step < 0) {
        // Never close a gap below the minimum: a pair `rank` steps apart closes
        // by that many steps.
        for (const a of members) for (const b of members) {
            const ranks = rank.get(b.id)! - rank.get(a.id)!;
            if (ranks > 0 && end(a) <= b[axis] + 1e-6) amount = Math.max(amount, -(b[axis] - end(a) - MIN_PART_GAP) / ranks);
        }
        amount = Math.min(0, amount);
    }
    for (const part of members) part[axis] += amount * rank.get(part.id)!;
}

/** Grow a container to hold its contents, then push its siblings clear and fit its own parent. */
function fitContainer(parts: SpacingPart[], id: string) {
    const container = parts.find(part => part.id === id);
    if (!container) return;
    const children = parts.filter(part => part.parentId === id);
    if (!children.length) return;
    const width = Math.max(container.width, ...children.map(child => child.x + child.width + CONTAINER_PADDING));
    const height = Math.max(container.height, ...children.map(child => child.y + child.height + CONTAINER_PADDING));
    growPart(parts, container, width, height);
}

/** Resize `part` to at least this size, keeping its top-left, and move what it would now cover. */
export function growPart(parts: SpacingPart[], part: SpacingPart, width: number, height: number) {
    const dw = Math.max(0, width - part.width), dh = Math.max(0, height - part.height);
    if (!dw && !dh) return;
    const right = part.x + part.width, bottom = part.y + part.height;
    for (const sibling of parts) {
        if (sibling === part || sibling.parentId !== part.parentId) continue;
        if (sibling.x >= right - 1e-6) sibling.x += dw;
        if (sibling.y >= bottom - 1e-6) sibling.y += dh;
    }
    part.width += dw; part.height += dh;
    for (const port of part.ports ?? []) {
        if (port.side === 'right') port.x += dw;
        if (port.side === 'bottom') port.y += dh;
    }
    if (part.parentId) fitContainer(parts, part.parentId);
}

/**
 * Change every gap between neighbouring ports on the walls of `owners` by
 * `step` (never below MIN_PORT_GAP). The first port on a wall stays put; a
 * wall that runs out of room grows its part.
 */
export function spacePorts(parts: readonly SpacingPart[], owners: ReadonlySet<string>, step: number): SpacingPart[] {
    const result = clone(parts);
    for (const part of result) {
        if (!owners.has(part.id) || !part.ports?.length) continue;
        let needWidth = part.width, needHeight = part.height;
        for (const side of ['left', 'right', 'top', 'bottom'] as const) {
            const along = side === 'left' || side === 'right' ? 'y' : 'x';
            const wall = part.ports.filter(port => port.side === side && !port.nested).sort((a, b) => a[along] - b[along]);
            for (let i = 1; i < wall.length; i++) {
                const previous = wall[i - 1], gap = wall[i][along] - (previous[along] + previous.size);
                const target = previous[along] + previous.size + Math.max(MIN_PORT_GAP, gap + step);
                const shift = target - wall[i][along];
                // Ports keep their order: a later port moves at least as far as this one.
                for (let j = i; j < wall.length; j++) wall[j][along] += shift;
            }
            const last = wall[wall.length - 1];
            if (!last) continue;
            const need = last[along] + last.size + WALL_MARGIN;
            if (along === 'y') needHeight = Math.max(needHeight, need); else needWidth = Math.max(needWidth, need);
        }
        growPart(result, part, needWidth, needHeight);
    }
    return result;
}
