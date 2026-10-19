import { describe, expect, it } from 'vitest';
import { groupWorkspaces } from '../workspace-scope';

const option = (root: string, scope: 'system' | 'sos' = 'system') => ({ root, name: root, scope });

describe('groupWorkspaces', () => {
    it('groups by who builds the system, from the origin the model states', () => {
        const origin: Record<string, string> = { a: 'SystemOriginKind::internal', b: 'SystemOriginKind::external', c: 'external' };
        const groups = groupWorkspaces([option('s', 'sos'), option('a'), option('b'), option('c'), option('d')], root => origin[root]);
        expect(groups.map(group => [group.label, group.options.map(o => o.root)])).toEqual([
            ['System of systems', ['s']],
            ['Systems we build (internal)', ['a']],
            ['Systems built by others (external)', ['b', 'c']],
            ['Origin not stated', ['d']],
        ]);
    });
    it('omits a group with nothing in it', () => {
        expect(groupWorkspaces([option('a')], () => 'internal').map(group => group.label)).toEqual(['Systems we build (internal)']);
    });
});
