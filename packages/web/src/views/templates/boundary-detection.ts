import type { Rect } from './geometry-view';

export interface DetectedBoundary {
    bounds: Rect;
    confidence: number;
    parentIndex?: number;
}

interface PixelBuffer {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

/** One segmentation pass. A screen has two scales; one pass cannot serve both. */
interface PassOptions {
    /** Gradient magnitude, over any single channel, that counts as an edge. */
    threshold: number;
    /** Half-width of the structuring element used to join edges into a component. */
    growX: number;
    /** Half-height of the same element. Kept below `growX` — see `segment`. */
    growY: number;
    minWidth: number;
    minHeight: number;
    minArea: number;
    /** Edge pixels per unit of perimeter, below which a component is noise. */
    minDensity: number;
    /**
     * Absolute count of edge pixels a component must contain.
     *
     * The proportional floors above all scale with the image, so on a small
     * buffer a speck of a few pixels can satisfy every one of them — a single
     * dark pixel produces a 3x3 component whose density is a healthy 0.33.
     * A real control has tens of edge pixels; noise has a handful.
     */
    minEdgePixels: number;
}

/**
 * Resolves controls and text runs. The structuring element is wider than it is
 * tall so glyphs join into words and words into a line, while controls stacked
 * a few pixels apart stay separate.
 */
const FINE: PassOptions = {
    threshold: 26, growX: 3, growY: 1,
    minWidth: 0.02, minHeight: 0.012, minArea: 0.0006, minDensity: 0.22,
    minEdgePixels: 12,
};

/**
 * Resolves panels. The wider element lets a panel's contents join into the
 * panel, which the fine pass deliberately will not do.
 */
const COARSE: PassOptions = {
    threshold: 26, growX: 8, growY: 5,
    minWidth: 0.05, minHeight: 0.03, minArea: 0.004, minDensity: 0.10,
    minEdgePixels: 24,
};

/** A component covering nearly the whole image is the screen, not a region in it. */
const MAX_AREA = 0.9;

/** Boxes within this L1 distance of each other describe the same thing. */
const DUPLICATE_DISTANCE = 0.035;

/** A fill inset inside its own border is the same box when it is this close and nearly as large. */
const INSET_DISTANCE = 0.09;

/** Below this a box is the density floor talking, not a boundary. */
const MIN_CONFIDENCE = 0.5;

const MAX_PROPOSALS = 40;

const contains = (outer: Rect, inner: Rect, margin = 0.006) =>
    inner.x >= outer.x - margin && inner.y >= outer.y - margin
    && inner.x + inner.width <= outer.x + outer.width + margin
    && inner.y + inner.height <= outer.y + outer.height + margin;

const area = (rect: Rect) => rect.width * rect.height;

const l1 = (a: Rect, b: Rect) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    + Math.abs(a.width - b.width) + Math.abs(a.height - b.height);

/**
 * Mark every pixel whose neighbourhood changes colour.
 *
 * The gradient is taken per channel rather than over luminance. A UI is full of
 * flat colour regions that differ in hue at nearly equal brightness — a blue
 * button on a blue panel has almost no luminance edge — and a luminance-only
 * detector walks straight past them.
 */
function findEdges({ data, width, height }: PixelBuffer, threshold: number): Uint8Array {
    const edge = new Uint8Array(width * height);
    const at = (x: number, y: number, channel: number) => data[(y * width + x) * 4 + channel];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gradient = 0;
            for (let channel = 0; channel < 3; channel++) {
                gradient = Math.max(gradient,
                    Math.abs(at(x + 1, y, channel) - at(x - 1, y, channel))
                    + Math.abs(at(x, y + 1, channel) - at(x, y - 1, channel)));
            }
            if (gradient >= threshold) edge[y * width + x] = 1;
        }
    }
    return edge;
}

/** Spread each edge pixel over a (2*growX+1) x (2*growY+1) neighbourhood. */
function dilate(edge: Uint8Array, width: number, height: number, growX: number, growY: number): Uint8Array {
    const grown = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!edge[y * width + x]) continue;
            for (let oy = -growY; oy <= growY; oy++) {
                for (let ox = -growX; ox <= growX; ox++) {
                    const nx = x + ox, ny = y + oy;
                    if (nx >= 0 && ny >= 0 && nx < width && ny < height) grown[ny * width + nx] = 1;
                }
            }
        }
    }
    return grown;
}

/**
 * Connected components of the dilated mask, measured against the UNDILATED one.
 *
 * The two masks answer different questions and must not be the same array.
 * Dilation decides what belongs together; it necessarily reaches past the
 * content it grew from, so a bounding box taken over it carries a margin of
 * background on all four sides. That margin is the white edge around a
 * proposal. Measuring only the pixels that are really edges makes the box hug
 * what is on the screen, and is the whole of why these boxes are tight.
 */
function segment(buffer: PixelBuffer, options: PassOptions): Array<{ bounds: Rect; confidence: number }> {
    const { width, height } = buffer;
    const edge = findEdges(buffer, options.threshold);
    const grown = dilate(edge, width, height, options.growX, options.growY);
    const visited = new Uint8Array(width * height);
    const found: Array<{ bounds: Rect; confidence: number }> = [];
    const stack: number[] = [];

    for (let seed = 0; seed < grown.length; seed++) {
        if (!grown[seed] || visited[seed]) continue;
        visited[seed] = 1;
        stack.push(seed);
        let minX = width, minY = height, maxX = -1, maxY = -1, edgeCount = 0;
        while (stack.length) {
            const current = stack.pop()!;
            const x = current % width;
            const y = Math.floor(current / width);
            if (edge[current]) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                edgeCount++;
            }
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (!ox && !oy) continue;
                    const nx = x + ox, ny = y + oy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    const next = ny * width + nx;
                    if (grown[next] && !visited[next]) { visited[next] = 1; stack.push(next); }
                }
            }
        }
        if (maxX < 0 || edgeCount < options.minEdgePixels) continue;
        // The box is NOT inset here, though a central difference does respond one
        // pixel outside a perfect step edge. Insetting was tried: it fits a
        // synthetic hard-edged rectangle exactly, and on real captures it makes
        // things worse — 25/45 to 24/45, and the Power Off button from IoU 0.957
        // against its authored bounds to 0.907. A real control's border is
        // antialiased over two or three pixels, so the gradient already fires ON
        // the border and the inset eats into the control. Same reason a
        // background-trimming pass was rejected.
        const pixelWidth = maxX - minX + 1;
        const pixelHeight = maxY - minY + 1;
        const bounds: Rect = {
            x: minX / width, y: minY / height,
            width: pixelWidth / width, height: pixelHeight / height,
        };
        if (bounds.width < options.minWidth || bounds.height < options.minHeight) continue;
        const normalizedArea = area(bounds);
        if (normalizedArea < options.minArea || normalizedArea > MAX_AREA) continue;
        const density = edgeCount / Math.max(1, 2 * pixelWidth + 2 * pixelHeight);
        if (density < options.minDensity) continue;
        found.push({ bounds, confidence: Math.max(0.45, Math.min(0.96, density)) });
    }
    return found;
}


/**
 * Flat-colour regions: the panels, bars and buttons of a screen.
 *
 * A card with a hairline border over a near-identical background has almost
 * no gradient, so the edge passes cannot see it, and worse, they join two
 * neighbouring cards into one box. A card is nonetheless a flat fill: grow a
 * region over pixels that stay within a few levels of the seed colour and its
 * bounding box is the panel. The page background is the region that spans the
 * image and is dropped; fills split by a divider rule are rejoined.
 */
const FLAT_TOLERANCE = 6;
const FLAT_MIN_AREA = 0.004;
const FLAT_MIN_FILL = 0.45;

function flatRegions({ data, width, height }: PixelBuffer): Array<{ bounds: Rect; confidence: number }> {
    const total = width * height;
    const visited = new Uint8Array(total);
    const stack: number[] = [];
    const comps: Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number; rgb: number[] }> = [];
    const channel = (index: number, c: number) => data[index * 4 + c];
    for (let seed = 0; seed < total; seed++) {
        if (visited[seed]) continue;
        const rgb = [channel(seed, 0), channel(seed, 1), channel(seed, 2)];
        visited[seed] = 1;
        stack.push(seed);
        const comp = { minX: width, minY: height, maxX: -1, maxY: -1, count: 0, rgb };
        while (stack.length) {
            const current = stack.pop()!;
            const x = current % width, y = (current - x) / width;
            if (x < comp.minX) comp.minX = x;
            if (x > comp.maxX) comp.maxX = x;
            if (y < comp.minY) comp.minY = y;
            if (y > comp.maxY) comp.maxY = y;
            comp.count++;
            const neighbours = [x > 0 ? current - 1 : -1, x < width - 1 ? current + 1 : -1, y > 0 ? current - width : -1, y < height - 1 ? current + width : -1];
            for (const next of neighbours) {
                if (next < 0 || visited[next]) continue;
                if (Math.abs(channel(next, 0) - rgb[0]) > FLAT_TOLERANCE
                    || Math.abs(channel(next, 1) - rgb[1]) > FLAT_TOLERANCE
                    || Math.abs(channel(next, 2) - rgb[2]) > FLAT_TOLERANCE) continue;
                visited[next] = 1;
                stack.push(next);
            }
        }
        if (comp.count >= FLAT_MIN_AREA * total) comps.push(comp);
    }
    const sameFill = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= FLAT_TOLERANCE);
    const rect = (c: typeof comps[number]): Rect => ({
        x: c.minX / width, y: c.minY / height, width: (c.maxX - c.minX + 1) / width, height: (c.maxY - c.minY + 1) / height,
    });
    // The page background spans the image; it is the canvas, not a region on it.
    const sides = (c: typeof comps[number]) => (c.minX === 0 ? 1 : 0) + (c.minY === 0 ? 1 : 0) + (c.maxX === width - 1 ? 1 : 0) + (c.maxY === height - 1 ? 1 : 0);
    const regions = comps.filter(c => !(c.count > 0.35 * total && sides(c) >= 2));
    // Rejoin a fill that a divider rule split, but never swallow a nested control.
    const adjacent = (a: Rect, b: Rect) => {
        const gap = 4 / Math.min(width, height);
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        return !contains(a, b) && !contains(b, a)
            && ((overlapX > 0.5 * Math.min(a.width, b.width) && overlapY > -gap)
                || (overlapY > 0.5 * Math.min(a.height, b.height) && overlapX > -gap));
    };
    const merged: Array<{ bounds: Rect; rgb: number[]; count: number; box: typeof comps[number] }> = [];
    for (const comp of regions) {
        const box = rect(comp);
        const into = merged.find(m => sameFill(m.rgb, comp.rgb) && adjacent(m.bounds, box));
        if (!into) { merged.push({ bounds: box, rgb: comp.rgb, count: comp.count, box: comp }); continue; }
        const x0 = Math.min(into.bounds.x, box.x), y0 = Math.min(into.bounds.y, box.y);
        const x1 = Math.max(into.bounds.x + into.bounds.width, box.x + box.width);
        const y1 = Math.max(into.bounds.y + into.bounds.height, box.y + box.height);
        into.bounds = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
        into.count += comp.count;
    }
    return merged
        .filter(m => m.count >= FLAT_MIN_FILL * m.bounds.width * width * m.bounds.height * height
            && area(m.bounds) >= FLAT_MIN_AREA && area(m.bounds) <= MAX_AREA)
        .map(m => ({ bounds: m.bounds, confidence: 0.9 }));
}

/** A rule or divider is a line, not a region: nobody labels a hairline. */
const isHairline = (rect: Rect) => Math.min(rect.width, rect.height) < 0.03 && Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height) > 12;

/**
 * An edge-pass box that cuts across the panels is two things stuck together,
 * or half of one. It either overlaps a panel without containing or being
 * contained by it, or it spans several sibling panels.
 */
function straddles(candidate: Rect, panels: Rect[]): boolean {
    let spanned = 0;
    for (const panel of panels) {
        if (contains(candidate, panel, 0.012)) {
            if (area(candidate) > area(panel) * 1.3) spanned++;
            continue;
        }
        if (contains(panel, candidate, 0.012)) continue;
        const w = Math.min(candidate.x + candidate.width, panel.x + panel.width) - Math.max(candidate.x, panel.x);
        const h = Math.min(candidate.y + candidate.height, panel.y + panel.height) - Math.max(candidate.y, panel.y);
        if (w > 0 && h > 0 && w * h > 0.15 * Math.min(area(candidate), area(panel))) return true;
    }
    return spanned >= 2;
}

/**
 * Deterministic edge-component detector for UI boundary proposals.
 *
 * Three kinds of evidence, in this order: flat-colour panels (cards, bars, buttons),
 * then the coarse and fine edge passes for text runs and controls. Edge boxes that
 * cut across a panel, hairlines, and boxes below `MIN_CONFIDENCE` are dropped.
 *
 * Measured 2026-10-26 on the ui-screen-regions captures (1024x600): the edge
 * passes alone returned the two cards as ONE box, stretched the header over the
 * cards' tops and returned no standalone card; with the flat-panel pass both
 * cards, the header bar, the drug selector and the Settings bar are each found.
 * The earlier figures for this detector (25 of 45 hand-authored regions on six
 * Affera captures) were taken before the panel pass and `MIN_CONFIDENCE`, and
 * those captures are not in this workspace, so they are NOT re-measured: see the
 * board row "Region detection is measured on two captures only".
 */
export function detectBoundaryRegions(buffer: PixelBuffer): DetectedBoundary[] {
    const { data, width, height } = buffer;
    if (width < 8 || height < 8 || data.length < width * height * 4) return [];

    // Coarse first, so that where a panel and its contents describe the same
    // box, the panel is the one kept.
    const panels = flatRegions(buffer);
    const panelRects = panels.map(panel => panel.bounds).filter(rect => area(rect) >= 0.02);
    const edgeBoxes = [...segment(buffer, COARSE), ...segment(buffer, FINE)]
        .filter(box => box.confidence >= MIN_CONFIDENCE && !isHairline(box.bounds) && !straddles(box.bounds, panelRects));
    const candidates = [...panels.filter(panel => !isHairline(panel.bounds)), ...edgeBoxes];

    const kept: Array<{ bounds: Rect; confidence: number }> = [];
    for (const candidate of candidates.sort((a, b) => area(b.bounds) - area(a.bounds))) {
        // A control's border and its fill are one thing seen twice: the fill sits just inside the border.
        const sameThing = (outer: Rect, inner: Rect) => l1(outer, inner) < DUPLICATE_DISTANCE
            || (l1(outer, inner) < INSET_DISTANCE && contains(outer, inner, 0.006) && area(outer) < area(inner) * 1.4);
        if (kept.some(existing => sameThing(existing.bounds, candidate.bounds))) continue;
        kept.push(candidate);
        if (kept.length >= MAX_PROPOSALS) break;
    }

    // Nest each box under the smallest box that strictly contains it, so the
    // proposals arrive as a tree rather than a flat list.
    return kept.map((candidate, index) => {
        let parentIndex: number | undefined;
        let parentArea = Infinity;
        kept.forEach((other, i) => {
            if (i === index || !contains(other.bounds, candidate.bounds)) return;
            const outerArea = area(other.bounds);
            if (outerArea > area(candidate.bounds) * 1.08 && outerArea < parentArea) {
                parentIndex = i;
                parentArea = outerArea;
            }
        });
        return { bounds: candidate.bounds, confidence: candidate.confidence, parentIndex };
    });
}

export async function detectBoundariesFromImage(imageUri: string): Promise<DetectedBoundary[]> {
    const image = new Image();
    image.decoding = 'async';
    image.src = imageUri;
    await image.decode();
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, 0, 0, width, height);
    return detectBoundaryRegions(context.getImageData(0, 0, width, height));
}
