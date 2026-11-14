// ─── Choosing an enum attribute's value ──────────────────────────────────────
//
// An enum attribute is written fully qualified (`UIElementFormKind::panel`), so its value names the enum. Offering
// that enum's literals instead of free text keeps an edit from writing a literal the enum does not have, which the
// compiler then refuses as invalid SysML. The literals come from the model's enumerations, never from a list here.

import type { MemoModelDTO } from '@memoarchitect/tools/browser';

const QUALIFIED_LITERAL = /^([A-Za-z_]\w*)::([A-Za-z_]\w*)$/;

/** The values an attribute may take when its current value is a literal of a known enum, each fully qualified. */
export function enumChoices(value: string, enumerations: MemoModelDTO['enumerations']): string[] | null {
    const match = QUALIFIED_LITERAL.exec(value.trim());
    if (!match) return null;
    const enumeration = enumerations?.find(entry => entry.name === match[1]);
    if (!enumeration || enumeration.literals.length === 0) return null;
    return enumeration.literals.map(literal => `${enumeration.name}::${literal}`);
}
