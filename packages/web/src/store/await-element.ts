import { useModelStore } from './model-store';

const MODEL_ARRIVAL_TIMEOUT_MS = 90_000;

/**
 * Wait for a created element to come back in the rebuilt model.
 *
 * A create inserts an optimistic copy at once. Anything that links to the new element must wait for the server's
 * rebuild, where legality sees the new endpoint. A write recompiles the project before the model is published, so
 * the wait is long. The caller may hold a bare name, and an id is qualified (`pkg::owner::name`), so both are looked for.
 */
export async function awaitSavedElement(id: string, optimistic = useModelStore.getState().model?.elements[id]): Promise<string> {
    const deadline = Date.now() + MODEL_ARRIVAL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const failure = useModelStore.getState().failedCreates[id];
        if (failure) throw new Error(`The element was not saved: ${failure}`);
        const elements = useModelStore.getState().model?.elements ?? {};
        const qualified = Object.keys(elements).find(key => key.endsWith(`::${id}`));
        if (qualified) return qualified;
        const current = elements[id];
        if (current && current !== optimistic) return id;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('The new element was saved, but the rebuilt model did not arrive.');
}
