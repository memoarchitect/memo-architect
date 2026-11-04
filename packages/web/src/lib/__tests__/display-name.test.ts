import { describe, expect, it } from 'vitest';
import { explorerDisplayName, spaceOut } from '../display-name';

describe('display names', () => {
    it('puts spaces between the words of an identifier and keeps an acronym together', () => {
        expect(spaceOut('EstablishCommLinks')).toBe('Establish comm links');
        expect(spaceOut('establish_comm_links')).toBe('Establish comm links');
        expect(spaceOut('IMSDisplay')).toBe('IMS display');
        expect(spaceOut('Already spaced')).toBe('Already spaced');
    });

    it('prefers the declared label, then the definition\'s, then the spaced identifier', () => {
        const el = (name: string, attributes: Record<string, unknown> = {}) => ({ name, attributes });
        expect(explorerDisplayName(el('treatArrhythmia', { label: 'Treat a cardiac arrhythmia' }))).toBe('Treat a cardiac arrhythmia');
        expect(explorerDisplayName(el('mapper'), el('Mapper', { label: 'Mapping operator' }))).toBe('Mapping operator');
        expect(explorerDisplayName(el('performPulmonaryVeinIsolation'))).toBe('Perform pulmonary vein isolation');
    });
});
