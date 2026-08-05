import { describe, expect, it } from 'vitest';
import { filterOptions, type TypeFilterOption } from '../TypeFilterSelect';
import { elementFilterOptions } from '../element-options';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';

// ─── Axis picking ───────────────────────────────────────────────────────────
//
// The picker exists because an axis list can run to hundreds of elements. What
// has to hold is that typing *narrows*: every word the user adds cuts the list
// further, and never widens it. The render cap is applied to this result, so
// "select all matches" means everything below, not the painted part.

const OPTIONS: TypeFilterOption[] = [
    { value: 'fnDrive', label: 'DriveActuator', group: 'SystemFunction', keywords: 'NDS-FN-003' },
    { value: 'fnMeasure', label: 'MeasureDeliveredVolume', group: 'SystemFunction', keywords: 'NDS-FN-004' },
    { value: 'lcPump', label: 'PumpMechanism', group: 'LogicalComponent', keywords: 'NDS-LC-001' },
    { value: 'lcSafety', label: 'PumpSafetyChannel', group: 'LogicalComponent', keywords: 'NDS-LC-006' },
    { value: 'lcWatchdog', label: 'WatchdogChannel', group: 'LogicalComponent', keywords: 'NDS-LC-007' },
];

const labels = (options: TypeFilterOption[]) => options.map(option => option.label);

describe('filterOptions', () => {
    it('offers everything when nothing has been typed', () => {
        expect(filterOptions(OPTIONS, '')).toHaveLength(OPTIONS.length);
        expect(filterOptions(OPTIONS, '   ')).toHaveLength(OPTIONS.length);
    });

    it('narrows further with every word, never wider', () => {
        const one = filterOptions(OPTIONS, 'pump');
        const two = filterOptions(OPTIONS, 'pump safety');
        expect(labels(one)).toEqual(['PumpMechanism', 'PumpSafetyChannel']);
        expect(labels(two)).toEqual(['PumpSafetyChannel']);
        expect(two.length).toBeLessThanOrEqual(one.length);
    });

    it('does not care what order the words come in', () => {
        expect(filterOptions(OPTIONS, 'safety pump')).toEqual(filterOptions(OPTIONS, 'pump safety'));
    });

    it('matches hidden keywords, so an id finds an element by name', () => {
        expect(labels(filterOptions(OPTIONS, 'NDS-FN-004'))).toEqual(['MeasureDeliveredVolume']);
    });

    it('matches the group, so a kind name filters the list', () => {
        expect(filterOptions(OPTIONS, 'logicalcomponent')).toHaveLength(3);
    });

    it('offers a prefix match before a mere containment', () => {
        // "channel" ends PumpSafetyChannel but starts nothing, while
        // WatchdogChannel is likewise a containment — both rank after any
        // prefix hit, which "watchdog" is.
        expect(labels(filterOptions(OPTIONS, 'watchdog'))).toEqual(['WatchdogChannel']);
        expect(labels(filterOptions(OPTIONS, 'channel'))).toEqual(['PumpSafetyChannel', 'WatchdogChannel']);
    });

    it('is case-insensitive', () => {
        expect(filterOptions(OPTIONS, 'PUMP')).toEqual(filterOptions(OPTIONS, 'pump'));
    });

    it('returns nothing rather than everything when no option matches', () => {
        expect(filterOptions(OPTIONS, 'nosuchthing')).toEqual([]);
    });
});

describe('elementFilterOptions', () => {
    const element = (id: string, name: string, kind: string, layer: string, shortId?: string) => ({
        id, name, kind, layer, construct: 'part',
        file: 'model.sysml', attributes: {}, shortId,
    });

    const model = {
        errors: [],
        relationships: [],
        elements: {
            a: element('a', 'Beta', 'Function', 'functional', 'FN-2'),
            b: element('b', 'Alpha', 'Function', 'functional', 'FN-1'),
            c: element('c', 'Gamma', 'Component', 'logical'),
        },
    } as unknown as MemoModelDTO;

    it('groups by kind and sorts by name inside it', () => {
        const options = elementFilterOptions(model, {});
        expect(options.map(option => option.label)).toEqual(['Gamma', 'Alpha', 'Beta']);
        expect(options[0].group).toBe('Component');
    });

    it('offers only what the axis scope already allows', () => {
        expect(elementFilterOptions(model, { kind: 'Function' }).map(option => option.value)).toEqual(['b', 'a']);
        expect(elementFilterOptions(model, { layer: 'logical' }).map(option => option.value)).toEqual(['c']);
    });

    it('makes the short id searchable without showing it as the name', () => {
        const alpha = elementFilterOptions(model, { kind: 'Function' })[0];
        expect(alpha.label).toBe('Alpha');
        expect(filterOptions(elementFilterOptions(model, {}), 'FN-1')).toEqual([alpha]);
    });

    it('has nothing to offer without a model', () => {
        expect(elementFilterOptions(null, {})).toEqual([]);
    });
});
