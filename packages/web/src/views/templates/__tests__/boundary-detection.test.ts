import { describe, expect, it } from 'vitest';
import { detectBoundaryRegions } from '../boundary-detection';

function image(width: number, height: number, value = 245) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let pixel = 0; pixel < width * height; pixel++) {
        const offset = pixel * 4;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
    }
    return { data, width, height };
}

function outline(
    buffer: ReturnType<typeof image>,
    x: number, y: number, width: number, height: number,
    value = 20,
) {
    const paint = (px: number, py: number) => {
        const offset = (py * buffer.width + px) * 4;
        buffer.data[offset] = value;
        buffer.data[offset + 1] = value;
        buffer.data[offset + 2] = value;
    };
    for (let offset = 0; offset < width; offset++) {
        paint(x + offset, y);
        paint(x + offset, y + height - 1);
    }
    for (let offset = 0; offset < height; offset++) {
        paint(x, y + offset);
        paint(x + width - 1, y + offset);
    }
}

function fill(
    buffer: ReturnType<typeof image>,
    x: number, y: number, width: number, height: number,
    rgb: [number, number, number],
) {
    for (let oy = 0; oy < height; oy++) {
        for (let ox = 0; ox < width; ox++) {
            const offset = ((y + oy) * buffer.width + (x + ox)) * 4;
            buffer.data[offset] = rgb[0];
            buffer.data[offset + 1] = rgb[1];
            buffer.data[offset + 2] = rgb[2];
        }
    }
}

describe('detectBoundaryRegions', () => {
    it('proposes nested rectangular UI boundaries and records their parent', () => {
        const buffer = image(160, 120);
        outline(buffer, 8, 8, 144, 104);
        outline(buffer, 28, 28, 72, 48);

        const regions = detectBoundaryRegions(buffer);

        expect(regions.length).toBeGreaterThanOrEqual(2);
        const nested = regions.find(region => region.parentIndex !== undefined);
        expect(nested).toBeDefined();
        expect(regions[nested!.parentIndex!].bounds.width).toBeGreaterThan(nested!.bounds.width);
        expect(nested!.confidence).toBeGreaterThanOrEqual(0.45);
    });

    it('ignores isolated edge noise that cannot form a useful region', () => {
        const buffer = image(80, 60);
        const offset = (30 * buffer.width + 40) * 4;
        buffer.data[offset] = buffer.data[offset + 1] = buffer.data[offset + 2] = 0;

        expect(detectBoundaryRegions(buffer)).toEqual([]);
    });

    // A UI is full of flat colour regions that differ in hue at nearly equal
    // brightness — a blue button on a blue panel. Thresholding luminance walks
    // straight past them, so the gradient is taken per channel.
    it('finds a region that differs from its background in colour but not brightness', () => {
        const buffer = image(120, 90, 0);
        fill(buffer, 0, 0, 120, 90, [100, 100, 100]);
        // Luminance 100 vs 111 — under any useful luminance threshold — while
        // the blue channel differs by 100.
        fill(buffer, 30, 25, 60, 40, [100, 100, 200]);

        const regions = detectBoundaryRegions(buffer);

        expect(regions.length).toBeGreaterThanOrEqual(1);
        const match = regions.find(region =>
            Math.abs(region.bounds.x - 30 / 120) < 0.05 && Math.abs(region.bounds.y - 25 / 90) < 0.05);
        expect(match).toBeDefined();
    });

    // Bounds are measured on the undilated edge mask. Measuring on the dilated
    // one grew every box by the size of the structuring element — a margin of
    // background on every side, which on the coarse pass is eight pixels wide.
    // What remains is the single pixel a central difference reads outside a
    // hard step edge, which is deliberately not corrected (see the source).
    it('bounds a region to within a pixel of its content', () => {
        const buffer = image(160, 120);
        fill(buffer, 40, 30, 60, 40, [20, 20, 20]);

        const [region] = detectBoundaryRegions(buffer);

        expect(region).toBeDefined();
        // Compared in pixels: at most one of margin per side, not the eight the
        // dilated measurement used to add.
        expect(Math.round(region.bounds.x * 160)).toBeGreaterThanOrEqual(39);
        expect(Math.round(region.bounds.y * 120)).toBeGreaterThanOrEqual(29);
        expect(Math.round(region.bounds.width * 160)).toBeLessThanOrEqual(62);
        expect(Math.round(region.bounds.height * 120)).toBeLessThanOrEqual(42);
    });

    it('returns no proposal for invalid or tiny image buffers', () => {
        expect(detectBoundaryRegions({ data: new Uint8ClampedArray(), width: 0, height: 0 })).toEqual([]);
        expect(detectBoundaryRegions({ data: new Uint8ClampedArray(7 * 7 * 4), width: 7, height: 7 })).toEqual([]);
    });
});
