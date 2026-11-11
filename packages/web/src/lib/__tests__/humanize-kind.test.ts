import { describe, expect, it } from 'vitest';
import { humanizeKind } from '../humanize-kind';

describe('humanizeKind', () => {
    it('reads a camel-case kind as words', () => {
        expect(humanizeKind('SoftwareRequirement')).toBe('Software requirement');
        expect(humanizeKind('Hazard')).toBe('Hazard');
    });
    it('splits an acronym from the word after it', () => {
        expect(humanizeKind('UIElement')).toBe('Ui element');
    });
});
