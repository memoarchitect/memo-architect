import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { inferVerification } from '../release-verification';

const el = (id: string, kind: string) => ({ id, name: id, kind, layer: 'x', construct: 'part', file: 'f', attributes: {} });
const rel = (id: string, type: string, sourceId: string, targetId: string) => ({ id, type, sourceId, targetId });

const model = {
    elements: Object.fromEntries([el('sys', 'System'), el('r1', 'Requirement'), el('r2', 'Requirement'), el('r3', 'Requirement'), el('t1', 'VerificationCase'), el('t2', 'VerificationCase')].map(e => [e.id, e])),
    relationships: [rel('a', 'verifiedBy', 'r1', 't1'), rel('b', 'verifiedBy', 'r3', 't2'), rel('c', 'verifiedBy', 'r1', 'sys')],
    workspaceMembership: {
        workspaces: [{ root: 'sys', scope: 'system', name: 'S' }], unassigned: [], shared: [], definitionOf: {}, missingSystem: false,
        membership: { sys: ['sys'], r1: ['sys'], r2: ['sys'], t1: ['sys'] },
    },
} as unknown as MemoModelDTO;
const isReq = (k: string) => k === 'Requirement';
const isCase = (k: string) => k === 'VerificationCase';

describe('inferVerification', () => {
    it('takes the cases that verify the requirements in the item\'s workspace, and reports the unverified ones', () => {
        const result = inferVerification(model, 'sys', isReq, isCase);
        expect(result.known).toBe(true);
        expect(result.caseIds).toEqual(['t1']);                 // t2 verifies r3, which is not in the workspace
        expect(result.requirementCount).toBe(2);
        expect(result.uncoveredRequirementIds).toEqual(['r2']);
    });
    it('says it cannot infer for an item that is not a workspace', () => {
        expect(inferVerification(model, 'r1', isReq, isCase).known).toBe(false);
    });
});
