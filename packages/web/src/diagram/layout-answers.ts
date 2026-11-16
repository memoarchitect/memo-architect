// ─── Layout answers are kept, not recomputed ────────────────────────────────
//
// Arranging the children of a part and routing a set of connectors are pure
// steps: the same boxes, ports and connectors give the same drawing. Both are
// slow on a large board, and a diagram is opened far more often than it is
// changed. So the answer to each step is kept under the input that produced
// it. Opening a diagram whose inputs are unchanged reads every answer back and
// computes nothing; a change to one part recomputes that part's arrangement
// and leaves the answers for the others in place.
//
// Answers live in memory and, in the browser, in local storage, so a reload
// does not pay for them again. A stored answer belongs to the build that made
// it: a new build may arrange or route differently, so it starts empty.

declare const __LAYOUT_BUILD__: string | undefined;

const BUILD = typeof __LAYOUT_BUILD__ === 'string' ? __LAYOUT_BUILD__ : undefined;
const PREFIX = 'memo.layout-answers.';
const BUILD_KEY = `${PREFIX}build`;
/** Answers kept in memory; the least recently used goes first. */
const MEMORY_LIMIT = 400;
/** Characters of answers kept in local storage, well inside a browser's quota. */
const STORED_LIMIT = 2_000_000;

const memory = new Map<string, string>();

type Encoded = { $map: Array<[unknown, unknown]> };

const encode = (value: unknown): string => JSON.stringify(value, (_key, item) =>
    item instanceof Map ? { $map: [...item] } satisfies Encoded
        : item instanceof Set ? { $set: [...item] }
            : item);

const decode = (text: string): unknown => JSON.parse(text, (_key, item) =>
    item && typeof item === 'object' && Array.isArray((item as Encoded).$map) ? new Map((item as Encoded).$map)
        : item && typeof item === 'object' && Array.isArray((item as { $set?: unknown[] }).$set) ? new Set((item as { $set: unknown[] }).$set)
            : item);

/** 53-bit string hash (cyrb53). Two seeds give a key no two inputs are expected to share. */
function hash(text: string, seed: number): string {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ code, 2654435761);
        h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const keyOf = (step: string, input: unknown): string => {
    const text = encode(input);
    return `${step}.${hash(text, 1)}${hash(text, 2)}.${text.length.toString(36)}`;
};

/** Local storage, or undefined where there is none or this build is not identified (tests, a private window). */
function storage(): Storage | undefined {
    if (!BUILD) return undefined;
    try {
        const store = globalThis.localStorage;
        if (!store) return undefined;
        if (store.getItem(BUILD_KEY) !== BUILD) {
            forget(store);
            store.setItem(BUILD_KEY, BUILD);
        }
        return store;
    } catch {
        return undefined;
    }
}

function storedKeys(store: Storage): string[] {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key?.startsWith(PREFIX) && key !== BUILD_KEY) keys.push(key);
    }
    return keys;
}

function forget(store: Storage): void {
    for (const key of storedKeys(store)) store.removeItem(key);
}

function read(key: string): string | undefined {
    const held = memory.get(key);
    if (held !== undefined) {
        memory.delete(key);
        memory.set(key, held);
        return held;
    }
    try {
        const stored = storage()?.getItem(PREFIX + key) ?? undefined;
        if (stored !== undefined) remember(key, stored);
        return stored;
    } catch {
        return undefined;
    }
}

function remember(key: string, text: string): void {
    memory.delete(key);
    memory.set(key, text);
    while (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value!);
}

function write(key: string, text: string): void {
    remember(key, text);
    const store = storage();
    if (!store) return;
    try {
        const keys = storedKeys(store);
        const used = keys.reduce((sum, stored) => sum + (store.getItem(stored)?.length ?? 0), 0);
        // Full: start over rather than track which answer is oldest. The open diagram refills what it needs.
        if (used + text.length > STORED_LIMIT) forget(store);
        if (text.length <= STORED_LIMIT) store.setItem(PREFIX + key, text);
    } catch {
        try { forget(store); } catch { /* storage is unavailable; memory still holds the answer */ }
    }
}

export interface AnswerOptions {
    /**
     * Called before an answer that is not held is computed, and awaited where
     * the step can wait. A caller shows its progress surface here, so a diagram
     * that is read back entirely never shows one.
     */
    beforeComputing?: () => void | Promise<void>;
}

/** The held answer to `step` for `input`, or the one `compute` gives, which is then held. */
export function answerOf<T>(step: string, input: unknown, compute: () => T, options?: AnswerOptions): T {
    const key = keyOf(step, input);
    const held = read(key);
    if (held !== undefined) return decode(held) as T;
    void options?.beforeComputing?.();
    // What is returned is what a later read gives back, so the first drawing and every reopening are the same.
    const text = encode(compute());
    write(key, text);
    return decode(text) as T;
}

/** `answerOf` for a step that is asynchronous, or that should let the page paint before it starts. */
export async function answerOfAsync<T>(
    step: string, input: unknown, compute: () => T | Promise<T>, options?: AnswerOptions,
): Promise<T> {
    const key = keyOf(step, input);
    const held = read(key);
    if (held !== undefined) return decode(held) as T;
    await options?.beforeComputing?.();
    const text = encode(await compute());
    write(key, text);
    return decode(text) as T;
}

/** The held answer to `step` for `input`, or undefined when it has not been computed. */
export function heldAnswer<T>(step: string, input: unknown): T | undefined {
    const held = read(keyOf(step, input));
    return held === undefined ? undefined : decode(held) as T;
}

/** Holds an answer that was computed elsewhere, such as in a worker, and gives back what a later read will. */
export function holdAnswer<T>(step: string, input: unknown, answer: T): T {
    const text = encode(answer);
    write(keyOf(step, input), text);
    return decode(text) as T;
}

/** Drops every held answer. For tests, and for a caller that wants a diagram computed afresh. */
export function forgetLayoutAnswers(): void {
    memory.clear();
    try {
        const store = storage();
        if (store) forget(store);
    } catch { /* nothing stored to drop */ }
}
