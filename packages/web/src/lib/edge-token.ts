// ─── A token travelling along a connector ─────────────────────────────────────
//
// Adapted from `travel` in docs/flows/player.html of Act (https://github.com/Rotorsoft/act-root), under this licence:
//
// MIT License
//
// Copyright (c) 2021 Roger Torres
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const SVG = 'http://www.w3.org/2000/svg';
const SHORTEST_MS = 320;
const LONGEST_MS = 1400;
const UNITS_PER_MS = 0.42;

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** How long a token takes over a path of this length. */
export const travelMs = (length: number, speed = 1) => Math.min(LONGEST_MS, Math.max(SHORTEST_MS, length / UNITS_PER_MS)) / speed;

/**
 * Sends a token along an edge drawn on the canvas, and resolves when it arrives or is cancelled. The token is drawn
 * inside the edge's own SVG, so it moves with pan and zoom. An edge that is not on the canvas resolves at once.
 */
export function travelAlongEdge(edgeId: string, speed: number, signal: { cancelled: boolean }): Promise<void> {
    const path = document.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${CSS.escape(edgeId)}"] path.react-flow__edge-path`);
    if (!path || !path.parentNode || prefersReducedMotion()) return Promise.resolve();
    const length = path.getTotalLength();
    const duration = travelMs(length, speed);
    const circle = (r: number, className: string) => {
        const node = document.createElementNS(SVG, 'circle');
        node.setAttribute('r', String(r));
        node.setAttribute('class', className);
        path.parentNode!.appendChild(node);
        return node;
    };
    const halo = circle(11, 'memo-walk-token-halo');
    const dot = circle(5.5, 'memo-walk-token');
    return new Promise(resolve => {
        const startedAt = performance.now();
        const frame = (now: number) => {
            const t = Math.min(1, (now - startedAt) / duration);
            if (signal.cancelled || t >= 1) {
                halo.remove();
                dot.remove();
                resolve();
                return;
            }
            const point = path.getPointAtLength(length * easeInOut(t));
            for (const node of [halo, dot]) {
                node.setAttribute('cx', String(point.x));
                node.setAttribute('cy', String(point.y));
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
}
