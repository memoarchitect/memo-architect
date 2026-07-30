// ─── Authoring helpers ───────────────────────────────────────────────────────
//
// Turning what the user drew into something SysML can hold. Both derivations are
// pure so they can be unit-tested without a canvas or a server: the persistor
// writes `<construct> <id> : <Kind> { ... }`, so a new element needs a valid,
// unused SysML identifier and the *usage* form of its kind's construct.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A SysML identifier for an element the user just named, unique within `taken`.
 *
 * The persistor emits the id as the usage name, so it has to be a legal SysML
 * identifier — a typed name like "Air-In-Line Sensor #2" cannot be used as-is.
 * The convention across the model's own sources is lowerCamelCase
 * (`gpcaDeviceSensors`, `portOpCmdIn`), so that is what this produces.
 *
 * A name that reduces to nothing (punctuation only, or empty) falls back to
 * `element`, and a leading digit is prefixed, because SysML identifiers may not
 * begin with one.
 */
export function sysmlIdentifier(name: string, taken: Iterable<string> = []): string {
    const words = name
        .replace(/[^A-Za-z0-9]+/g, ' ')
        // Split camelCase and PascalCase runs so "AirInLine" survives as words.
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    let base = words
        .map((word, index) => index === 0
            ? word.charAt(0).toLowerCase() + word.slice(1)
            : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

    if (!base) base = 'element';
    if (/^[0-9]/.test(base)) base = `n${base}`;

    const used = new Set(taken);
    if (!used.has(base)) return base;
    // A duplicate name is an ordinary thing to draw twice; suffix rather than
    // refuse, so the canvas never rejects a shape for being a second of a kind.
    let suffix = 2;
    while (used.has(`${base}${suffix}`)) suffix++;
    return `${base}${suffix}`;
}

/**
 * The usage construct for a kind whose ontology entry names a definition
 * construct — `part def` → `part`, `port def` → `port`, `action usage` →
 * `action`. Dropping a shape creates a usage, never a definition.
 */
export function usageConstruct(defConstruct: string | undefined): string {
    if (!defConstruct) return 'part';
    const head = defConstruct.replace(/\s+(def|usage)$/, '').trim();
    return head || 'part';
}
