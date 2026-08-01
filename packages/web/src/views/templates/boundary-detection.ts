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

const contains = (outer: Rect, inner: Rect, margin = 0.006) =>
    inner.x >= outer.x - margin && inner.y >= outer.y - margin
    && inner.x + inner.width <= outer.x + outer.width + margin
    && inner.y + inner.height <= outer.y + outer.height + margin;

/** Lightweight, deterministic edge-component detector for UI boundary proposals. */
export function detectBoundaryRegions(buffer: PixelBuffer): DetectedBoundary[] {
    const { data, width, height } = buffer;
    if (width < 8 || height < 8 || data.length < width * height * 4) return [];
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
        const p = i * 4;
        gray[i] = Math.round(data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114);
    }
    const edge = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const dx = Math.abs(gray[i + 1] - gray[i - 1]);
            const dy = Math.abs(gray[i + width] - gray[i - width]);
            if (dx + dy >= 42) {
                for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) edge[i + oy * width + ox] = 1;
            }
        }
    }

    const visited = new Uint8Array(width * height);
    const candidates: Array<{ rect: Rect; confidence: number }> = [];
    const stack: number[] = [];
    for (let seed = 0; seed < edge.length; seed++) {
        if (!edge[seed] || visited[seed]) continue;
        visited[seed] = 1;
        stack.push(seed);
        let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
        while (stack.length) {
            const current = stack.pop()!;
            const x = current % width;
            const y = Math.floor(current / width);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
                if (!ox && !oy) continue;
                const nx = x + ox, ny = y + oy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const next = ny * width + nx;
                if (edge[next] && !visited[next]) { visited[next] = 1; stack.push(next); }
            }
        }
        const pixelWidth = maxX - minX + 1;
        const pixelHeight = maxY - minY + 1;
        const normalized: Rect = { x: minX / width, y: minY / height, width: pixelWidth / width, height: pixelHeight / height };
        const area = normalized.width * normalized.height;
        if (normalized.width < 0.07 || normalized.height < 0.035 || area < 0.004 || area > 0.93) continue;
        const perimeter = Math.max(1, 2 * pixelWidth + 2 * pixelHeight);
        const confidence = Math.max(0.45, Math.min(0.96, count / perimeter));
        candidates.push({ rect: normalized, confidence });
    }

    // Keep distinct boxes, preferring the stronger edge component when nearly identical.
    const kept: Array<{ rect: Rect; confidence: number }> = [];
    for (const candidate of candidates.sort((a, b) => b.confidence - a.confidence || b.rect.width * b.rect.height - a.rect.width * a.rect.height)) {
        const duplicate = kept.some(existing => {
            const dx = Math.abs(existing.rect.x - candidate.rect.x);
            const dy = Math.abs(existing.rect.y - candidate.rect.y);
            const dw = Math.abs(existing.rect.width - candidate.rect.width);
            const dh = Math.abs(existing.rect.height - candidate.rect.height);
            return dx + dy + dw + dh < 0.035;
        });
        if (!duplicate) kept.push(candidate);
        if (kept.length >= 24) break;
    }

    const ordered = kept.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
    return ordered.map((candidate, index) => {
        let parentIndex: number | undefined;
        let parentArea = Infinity;
        for (let i = 0; i < ordered.length; i++) {
            if (i === index || !contains(ordered[i].rect, candidate.rect)) continue;
            const area = ordered[i].rect.width * ordered[i].rect.height;
            const ownArea = candidate.rect.width * candidate.rect.height;
            if (area > ownArea * 1.08 && area < parentArea) { parentIndex = i; parentArea = area; }
        }
        return { bounds: candidate.rect, confidence: candidate.confidence, parentIndex };
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
