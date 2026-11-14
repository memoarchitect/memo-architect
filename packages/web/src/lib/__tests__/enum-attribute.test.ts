import { describe, expect, it } from 'vitest';
import { enumChoices } from '../enum-attribute';

const enumerations = [{ name: 'UIElementFormKind', literals: ['panel', 'button', 'decoration'] }];

describe('enumChoices', () => {
    it('offers every literal of the enum a value names, fully qualified', () => {
        expect(enumChoices('UIElementFormKind::panel', enumerations))
            .toEqual(['UIElementFormKind::panel', 'UIElementFormKind::button', 'UIElementFormKind::decoration']);
    });

    it('leaves a value that is not a literal of a known enum to free text', () => {
        expect(enumChoices('Region UIE-315', enumerations)).toBeNull();
        expect(enumChoices('OtherKind::panel', enumerations)).toBeNull();
        expect(enumChoices('UIElementFormKind::panel', undefined)).toBeNull();
    });
});
