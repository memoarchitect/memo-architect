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

    it('returns no proposal for invalid or tiny image buffers', () => {
        expect(detectBoundaryRegions({ data: new Uint8ClampedArray(), width: 0, height: 0 })).toEqual([]);
        expect(detectBoundaryRegions({ data: new Uint8ClampedArray(7 * 7 * 4), width: 7, height: 7 })).toEqual([]);
    });
});
