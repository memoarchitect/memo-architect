import type { MemoElement } from '@memoarchitect/tools/browser';

/**
 * The words in an identifier: `EstablishCommLinks` and `establish_comm_links` both read "Establish comm links", sentence case like a declared label.
 * A run of capitals is an acronym and stays together (`IMSDisplay` reads "IMS display"). A name that already has
 * spaces is somebody's wording and is left alone.
 */
export function spaceOut(identifier: string): string {
    if (!identifier || /\s/.test(identifier)) return identifier;
    const words = identifier
        .replace(/_+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .split(/\s+/)
        .map(word => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()));
    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

type Named = Pick<MemoElement, 'name'> & { attributes?: Record<string, unknown> };

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/**
 * What a row in the explorer calls an element. The label on `@MemoIdentity` is the display name; `attributes.name` is
 * the spelling older models carry it in. An element with neither (a usage inherits from the definition that types it)
 * is shown as its identifier with spaces. The identifier itself is never changed, only how it is shown.
 */
export function explorerDisplayName(element: Named, definition?: Named): string {
    return text(element.attributes?.label) ?? text(element.attributes?.name)
        ?? text(definition?.attributes?.label) ?? text(definition?.attributes?.name)
        ?? spaceOut(element.name);
}
