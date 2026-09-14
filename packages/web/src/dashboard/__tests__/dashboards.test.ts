import { describe, it, expect } from 'vitest';
import type { DashboardDTO } from '@memoarchitect/tools/browser';
import {
    BUILTIN_HOME_MARKDOWN, HOME_DASHBOARD_ID, dashboardIdFromTitle, resolveDashboard, uniqueDashboardId,
} from '../dashboards';

const dto = (over: Partial<DashboardDTO>): DashboardDTO => ({
    id: 'x', scope: 'shared', title: 'X', content: '# X', path: 'dashboards/x.md', updatedAt: 0, ...over,
});

describe('resolveDashboard', () => {
    it('falls back to the built-in page for home only', () => {
        expect(resolveDashboard([], HOME_DASHBOARD_ID)).toMatchObject({ scope: 'builtin', content: BUILTIN_HOME_MARKDOWN });
        expect(resolveDashboard([], 'other')).toBeNull();
    });

    it('lets the user copy shadow shared, and records what it hides', () => {
        const shared = dto({ id: 'home', scope: 'shared', content: 'team' });
        const user = dto({ id: 'home', scope: 'user', content: 'mine', path: 'dashboards/user/home.md' });
        const resolved = resolveDashboard([shared, user], 'home');
        expect(resolved).toMatchObject({ scope: 'user', content: 'mine' });
        expect(resolved?.shadows).toBe(shared);
        expect(resolveDashboard([shared], 'home')).toMatchObject({ scope: 'shared', content: 'team' });
    });

    it('never falls through a pinned scope', () => {
        const user = dto({ id: 'arch', scope: 'user' });
        expect(resolveDashboard([user], 'arch', 'shared')).toBeNull();
        expect(resolveDashboard([], HOME_DASHBOARD_ID, 'shared')).toBeNull();
        expect(resolveDashboard([user], 'arch', 'user')?.scope).toBe('user');
    });
});

describe('dashboard ids', () => {
    it('slugs a title to a file-safe id', () => {
        expect(dashboardIdFromTitle('Pump Architecture — Overview')).toBe('pump-architecture-overview');
        expect(dashboardIdFromTitle('Café ✓')).toBe('cafe');
        expect(dashboardIdFromTitle('!!!')).toBe('dashboard');
    });

    it('suffixes only within the target scope', () => {
        const list = [dto({ id: 'arch', scope: 'shared' }), dto({ id: 'arch-2', scope: 'shared' })];
        expect(uniqueDashboardId(list, 'arch', 'shared')).toBe('arch-3');
        expect(uniqueDashboardId(list, 'arch', 'user')).toBe('arch');
    });
});
