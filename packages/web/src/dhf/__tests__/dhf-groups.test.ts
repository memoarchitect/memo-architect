// DHF_GROUPS used to be a hand-written array, and it disagreed with the disk
// in both directions: it offered seven templates that exist as no file (the
// wizard produced blank documents from them) and omitted the iec-60601 ones
// that do exist. These tests pin the property that replaced it — every group
// is a standard directory, and every template it offers is a file that loaded.

import { describe, it, expect } from 'vitest';
import { DHF_GROUPS, groupColorForLabel, prefixFromTitle } from '../dhf-groups';
import { getBuiltInTemplate, listBuiltInTemplates } from '../built-in-templates';

describe('derived DHF groups', () => {
    it('derives at least one group per shipped standard directory', () => {
        const directories = new Set(listBuiltInTemplates().map(t => t.directory));
        expect(directories.size).toBeGreaterThan(0);
        expect(new Set(DHF_GROUPS.map(g => g.id))).toEqual(directories);
    });

    it('offers only templates that actually load', () => {
        const blank: string[] = [];
        for (const group of DHF_GROUPS) {
            for (const t of group.templates) {
                if (getBuiltInTemplate(t.id) === null) blank.push(t.id);
            }
        }
        expect(blank).toEqual([]);
    });

    it('labels a single-standard directory with its designation, edition stripped', () => {
        const software = DHF_GROUPS.find(g => g.id === 'iec-62304');
        expect(software?.label).toBe('IEC 62304');
    });

    it('lets the majority standard label a directory with one outlier', () => {
        // iso-14971/ holds six ISO 14971 documents and an FMEA claiming
        // IEC 60812. One outlier must not rename the group to "Iso 14971".
        expect(DHF_GROUPS.find(g => g.id === 'iso-14971')?.label).toBe('ISO 14971');
    });

    it('labels a mixed-standard directory with the majority designation', () => {
        // system/ holds four documents: standards-traceability and
        // standards-checklist (both ISO 13485:2016), sad (42010) and syrs
        // (IEC 60601-1). ISO 13485 wins 2/4, so the majority algorithm labels
        // the group "ISO 13485" — the directory-name fallback only fires when
        // there is a strict tie.
        const system = DHF_GROUPS.find(g => g.id === 'system');
        expect(system?.label).toBe('ISO 13485');
    });

    it('excludes shared snippets, which claim no standard', () => {
        expect(DHF_GROUPS.map(g => g.id)).not.toContain('shared');
    });

    it('gives every group a title and prefix for each template', () => {
        for (const group of DHF_GROUPS) {
            expect(group.templates.length, group.id).toBeGreaterThan(0);
            for (const t of group.templates) {
                expect(t.title, t.id).toBeTruthy();
                expect(t.prefix, t.id).toBeTruthy();
            }
        }
    });

    it('keeps a group color stable across calls', () => {
        const first = DHF_GROUPS.map(g => g.color);
        expect(DHF_GROUPS.map(g => g.color)).toEqual(first);
        expect(groupColorForLabel('No Such Category')).toBe('#6B7280');
        expect(groupColorForLabel(DHF_GROUPS[0].label)).toBe(DHF_GROUPS[0].color);
    });

    it('derives an id prefix from a title', () => {
        expect(prefixFromTitle('Risk Management Plan')).toBe('RMP');
        expect(prefixFromTitle('Notes')).toBe('NOT');
    });
});
