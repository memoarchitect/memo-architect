/** A kind as people read it: `SoftwareRequirement` is "Software requirement". */
export function humanizeKind(kind: string): string {
    const words = kind
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();
    return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
