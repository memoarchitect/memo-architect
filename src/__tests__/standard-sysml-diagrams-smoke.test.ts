import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listArchitectExamples } from '../commands/example.js';

const require = createRequire(import.meta.url);

describe('memo-architect --example standard-sysml-diagrams', () => {
    it('ships the runnable action-flow model with its source identities', () => {
        expect(listArchitectExamples()).toContain('standard-sysml-diagrams');
        const ontologyRoot = dirname(require.resolve('@memoarchitect/ontology/package.json'));
        const source = readFileSync(join(ontologyRoot, 'examples/sysml-diagram-samples/model/sysml_v2_activity_example.sysml'), 'utf8');
        expect(source).toContain('FulfillOrder');
        expect(source).toContain('receiveOrder');
        expect(source).toContain('routeOrder');
        expect(source).toContain('readyToNotify');
        expect(source).toContain('CustomerProcess');
        expect(source).toContain('validUserDecision');
        expect(source).toContain('shoppingDecision');
        expect(source).toContain('creditDecision');
    });
});
