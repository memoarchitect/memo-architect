import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';

/**
 * Grouping packages — the leaf-level containers a user creates to organise
 * elements that already have an owner.
 *
 * A `package` declared inside a usage body groups without decomposing: the
 * members stay contained by the owner, and the package only labels the
 * grouping. That is what makes it the right container for "these six buttons
 * are the header" — a claim about reading, not about structure.
 *
 * It is addressed by its path of names rather than by an element id, because
 * that is what the writer can find in source: the IR does not ingest a
 * declaration nested in a usage body, so it has no identity to quote.
 */

/** The path of names that addresses one declaration: package, owners, itself. */
export function declarationPath(model: MemoModelDTO | null, element: MemoElement): string {
    const chain: string[] = [];
    const seen = new Set<string>();
    let node: MemoElement | undefined = element;
    while (node && !seen.has(node.id)) {
        seen.add(node.id);
        chain.unshift(node.id);
        node = node.owner ? model?.elements[node.owner] : undefined;
    }
    return [element.package, ...chain].filter(Boolean).join('::');
}

/**
 * Where a grouping package for this element belongs: inside its owner.
 *
 * An element with no owner is declared directly in a namespace package, and a
 * grouping package for it belongs there — a plain package, which is what the
 * explorer's folder-level "New Package" already creates.
 */
export function groupParentPath(model: MemoModelDTO | null, element: MemoElement): string | undefined {
    const owner = element.owner ? model?.elements[element.owner] : undefined;
    return owner ? declarationPath(model, owner) : element.package || undefined;
}

/** The grouping packages already declared beside this element. */
export function siblingGroups(model: MemoModelDTO | null, element: MemoElement): string[] {
    const groups = new Set<string>();
    for (const candidate of Object.values(model?.elements ?? {})) {
        if (candidate.owner !== element.owner) continue;
        const group = candidate.attributes?.['elementPackage'];
        if (group) groups.add(group);
    }
    return [...groups].sort();
}

/**
 * Wait for a package the server has just written to reach the client.
 *
 * A create and the move that follows it are two round trips, and the second
 * one is addressed by a name the client can only have seen in the model the
 * rebuild publishes. Sending it early asks the server about a package its own
 * model does not have yet, which fails with "was not found" for a package that
 * demonstrably exists. A grouping package is not a namespace package, so it
 * arrives as an element rather than in `packages` — both are waited for.
 */
export async function waitForPackage(qualifiedName: string, timeoutMs = 5000): Promise<boolean> {
    const name = qualifiedName.split('::').pop() ?? qualifiedName;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const model = useModelStore.getState().model;
        if (model?.packages?.some(pkg => pkg.qualifiedName === qualifiedName)) return true;
        if (model?.elements[name]) return true;
        await new Promise(resolve => setTimeout(resolve, 120));
    }
    return false;
}
