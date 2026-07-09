import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createMemoSysMLServices } from '../language/memo-sysml-module.js';
import type { Model } from '../language/generated/ast.js';
import type { MEMOConfig } from '../model/config.js';
import { buildMemoModel } from '../model/builder.js';
import { deriveModelViews } from '../model/view-deriver.js';
import { validateViews } from '../validator/view-validator.js';
import {
    VIEW_KINDS,
    DIAGRAM_TYPE_TO_VIEW_KIND,
    isViewKind,
    normalizeViewKind,
    resolveViewKind,
} from '../model/view-kinds.js';
import type { ParsedDocument } from '../model/parser-utils.js';

const services = createMemoSysMLServices({ ...EmptyFileSystem }).MemoSysML;
const parse = parseHelper<Model>(services);

async function parseDoc(source: string, filePath: string = 'test.sysml'): Promise<ParsedDocument> {
    const doc = await parse(source);
    return { document: doc, filePath };
}

/** Minimal config exposing the ontology view kinds */
const viewConfig: MEMOConfig = {
    projectName: 'test-views',
    projectType: 'device',
    kinds: {
        DiagramView: { label: 'Diagram View', layer: 'viewpoints', sysmlConstruct: 'part def' },
        DocumentView: { label: 'Document View', layer: 'viewpoints', sysmlConstruct: 'part def' },
    },
    relationshipTypes: [],
};

// ─── KK-1: diagramType → view kind mapping ──────────────────────────────────

describe('KK-1: view-kind taxonomy', () => {
    it('defines exactly the 8 spec view kinds', () => {
        expect(VIEW_KINDS).toEqual([
            'general', 'interconnection', 'actionflow', 'statetransition',
            'sequence', 'grid', 'browser', 'geometry',
        ]);
    });

    it('maps every legacy diagramType key to exactly one spec view kind', () => {
        const legacyKeys = [
            'bdd', 'ibd', 'req', 'ucd', 'act', 'afd', 'pkg', 'par', 'risk',
            'stm', 'seq', 'fmea', 'alloc', 'threat-model',
        ];
        for (const key of legacyKeys) {
            const kind = DIAGRAM_TYPE_TO_VIEW_KIND[key];
            expect(kind, `diagramType "${key}" must map to a view kind`).toBeDefined();
            expect(isViewKind(kind)).toBe(true);
        }
    });

    it('normalizes qualified enum references', () => {
        expect(normalizeViewKind('DiagramViewKind::statetransition')).toBe('statetransition');
        expect(normalizeViewKind('general')).toBe('general');
        // DocumentView declares DocumentViewKind values under the same
        // attribute name — those are not spec view kinds
        expect(normalizeViewKind('DocumentViewKind::RMF')).toBeUndefined();
        expect(normalizeViewKind(undefined)).toBeUndefined();
        expect(normalizeViewKind('bogus')).toBeUndefined();
    });

    it('resolves declared viewKind over diagramType, falls back to mapping, then browser', () => {
        expect(resolveViewKind('DiagramViewKind::grid', 'bdd')).toBe('grid');
        expect(resolveViewKind(undefined, 'stm')).toBe('statetransition');
        expect(resolveViewKind(undefined, 'unknown-type')).toBe('general');
        expect(resolveViewKind(undefined, undefined)).toBe('browser');
        expect(resolveViewKind('DocumentViewKind::DHF', undefined)).toBe('browser');
    });
});

// ─── KK-1: derived views carry viewKind ─────────────────────────────────────

describe('KK-1: deriveModelViews view kinds', () => {
    it('every derived view resolves to exactly one spec view kind', async () => {
        const doc = await parseDoc(`
            package TestViews {
                part fmeaView : DiagramView {
                    attribute name = "FMEA View";
                    attribute viewKind = DiagramViewKind::grid;
                    attribute diagramType = "fmea";
                }
                part modeView : DiagramView {
                    attribute name = "Mode View";
                    attribute diagramType = "stm";
                }
                part dhfView : DocumentView {
                    attribute name = "DHF Index";
                    attribute viewKind = DocumentViewKind::DHF;
                }
            }
        `);
        const model = buildMemoModel([doc], viewConfig);
        const { diagrams } = deriveModelViews(model);

        expect(diagrams).toHaveLength(3);
        for (const d of diagrams) {
            expect(d.viewKind, `diagram "${d.name}" must carry a view kind`).toBeDefined();
            expect(isViewKind(d.viewKind!)).toBe(true);
        }
        const byName = new Map(diagrams.map(d => [d.name, d]));
        expect(byName.get('FMEA View')?.viewKind).toBe('grid');
        expect(byName.get('Mode View')?.viewKind).toBe('statetransition');
        expect(byName.get('DHF Index')?.viewKind).toBe('browser');
    });
});

// ─── KK-1 acceptance: every GPCA view resolves to one of the 8 kinds ────────

const GPCA_VIEWS_DIR = resolve(
    __dirname,
    '../../../../vendor/memo-sysmlv2/src/examples/gpca-pump/model/views'
);

/** Config covering the view kinds the GPCA views instantiate */
const gpcaViewConfig: MEMOConfig = {
    projectName: 'gpca-views',
    projectType: 'device',
    kinds: {
        DiagramView: { label: 'Diagram View', layer: 'viewpoints', sysmlConstruct: 'part def' },
        DocumentView: { label: 'Document View', layer: 'viewpoints', sysmlConstruct: 'part def' },
        CybersecurityAssessmentView: { label: 'Cybersecurity Assessment View', layer: 'viewpoints', sysmlConstruct: 'part def' },
        CybersecurityThreatModelView: { label: 'Threat Model View', layer: 'viewpoints', sysmlConstruct: 'part def' },
        UsabilityEngineeringView: { label: 'Usability Engineering View', layer: 'viewpoints', sysmlConstruct: 'part def' },
    },
    relationshipTypes: [],
};

describe('KK-1 acceptance: GPCA views', () => {
    it('all 25 GPCA views resolve to exactly one of the 8 spec view kinds, with no validation warnings', async () => {
        const files = readdirSync(GPCA_VIEWS_DIR).filter(f => f.endsWith('.sysml'));
        expect(files).toHaveLength(25);

        const docs: ParsedDocument[] = [];
        for (const f of files) {
            docs.push(await parseDoc(readFileSync(join(GPCA_VIEWS_DIR, f), 'utf-8'), f));
        }
        const model = buildMemoModel(docs, gpcaViewConfig);
        const { diagrams } = deriveModelViews(model);

        expect(diagrams).toHaveLength(25);
        for (const d of diagrams) {
            expect(d.viewKind, `GPCA view "${d.name}" must resolve to a spec view kind`).toBeDefined();
            expect(isViewKind(d.viewKind!), `"${d.viewKind}" is not a spec view kind`).toBe(true);
        }
        expect(validateViews(model)).toHaveLength(0);

        // Kind distribution locks the KK-1 recategorization: 14 diagram views
        // mapped explicitly + 11 document-backed views resolving to browser
        const counts: Record<string, number> = {};
        for (const d of diagrams) counts[d.viewKind!] = (counts[d.viewKind!] ?? 0) + 1;
        expect(counts).toEqual({
            general: 9,
            interconnection: 1,
            statetransition: 1,
            sequence: 1,
            grid: 2,
            browser: 11,
        });
    });
});

// ─── KK-1: validator flags unmapped diagram types ───────────────────────────

describe('KK-1: view validation', () => {
    it('flags unmapped diagramType with a warning (VW-001)', async () => {
        const doc = await parseDoc(`
            package TestViews {
                part legacyView : DiagramView {
                    attribute name = "Legacy View";
                    attribute diagramType = "flowchart";
                }
            }
        `);
        const model = buildMemoModel([doc], viewConfig);
        const violations = validateViews(model);

        const vw001 = violations.filter(v => v.ruleId === 'VW-001');
        expect(vw001).toHaveLength(1);
        expect(vw001[0].severity).toBe('warning');
        expect(vw001[0].description).toContain('flowchart');
    });

    it('flags off-taxonomy viewKind on diagram views (VW-002)', async () => {
        const doc = await parseDoc(`
            package TestViews {
                part oddView : DiagramView {
                    attribute name = "Odd View";
                    attribute viewKind = DiagramViewKind::freeform;
                    attribute diagramType = "bdd";
                }
            }
        `);
        const model = buildMemoModel([doc], viewConfig);
        const violations = validateViews(model);

        const vw002 = violations.filter(v => v.ruleId === 'VW-002');
        expect(vw002).toHaveLength(1);
        expect(vw002[0].severity).toBe('warning');
    });

    it('accepts all mapped diagram types without warnings', async () => {
        const doc = await parseDoc(`
            package TestViews {
                part okView : DiagramView {
                    attribute name = "OK View";
                    attribute viewKind = DiagramViewKind::interconnection;
                    attribute diagramType = "ibd";
                }
            }
        `);
        const model = buildMemoModel([doc], viewConfig);
        expect(validateViews(model)).toHaveLength(0);
    });
});
