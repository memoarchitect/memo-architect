// ─── A layout step is computed once for an input ────────────────────────────
//
// `answerOf` holds the answer of a pure layout step under the input that gave
// it. These tests hold it to that: the same input reads the answer back without
// computing, a different input computes, and the caller is told before a
// computation and only then.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { answerOf, answerOfAsync, forgetLayoutAnswers } from '../layout-answers';

beforeEach(() => forgetLayoutAnswers());

describe('layout answers', () => {
    it('computes an input once and reads the answer back afterwards', () => {
        const compute = vi.fn(() => ({ route: [{ x: 0, y: 0 }, { x: 40, y: 0 }] }));
        const first = answerOf('route', { boxes: [1, 2] }, compute);
        const second = answerOf('route', { boxes: [1, 2] }, compute);
        expect(compute).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
    });

    it('computes again when the input differs, and keeps steps apart', () => {
        const compute = vi.fn(() => 1);
        answerOf('route', { boxes: [1, 2] }, compute);
        answerOf('route', { boxes: [1, 3] }, compute);
        answerOf('arrange', { boxes: [1, 2] }, compute);
        expect(compute).toHaveBeenCalledTimes(3);
    });

    it('gives back maps as maps, on the first answer and on every later one', () => {
        const compute = () => ({ routes: new Map([['link', [{ x: 1, y: 2 }]]]) });
        const input = { fixed: new Map([['other', [{ x: 0, y: 0 }]]]) };
        for (const answer of [answerOf('route', input, compute), answerOf('route', input, compute)]) {
            expect(answer.routes).toBeInstanceOf(Map);
            expect(answer.routes.get('link')).toEqual([{ x: 1, y: 2 }]);
        }
    });

    it('hands out a copy, so changing one answer leaves the held one alone', () => {
        const compute = () => new Map([['link', [{ x: 1, y: 2 }]]]);
        answerOf('route', 'board', compute).set('link', []);
        expect(answerOf('route', 'board', compute).get('link')).toEqual([{ x: 1, y: 2 }]);
    });

    it('tells the caller before computing, and not when the answer is held', async () => {
        const beforeComputing = vi.fn();
        await answerOfAsync('arrange', 'board', async () => 1, { beforeComputing });
        await answerOfAsync('arrange', 'board', async () => 1, { beforeComputing });
        expect(beforeComputing).toHaveBeenCalledTimes(1);
    });
});
