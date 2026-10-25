// ─── memo-architect config ───────────────────────────────────────────────────
//
// Settings are Architect's, not MEMO Tools'. These commands write the user's own
// settings file or, with --project, the project's checked-in one, through the
// code Architect's Compiler control calls.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userSettingsPath } from '@memoarchitect/tools';
import { ConfigSettingError, configGetCommand, configSetCommand, configUnsetCommand } from '../commands/config.js';

describe('memo-architect config', () => {
    let dir: string;
    let project: string;
    let out: string[];
    const envBefore = { ...process.env };
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'memo-architect-config-'));
        project = join(dir, 'project');
        mkdirSync(project);
        writeFileSync(join(project, 'memo.package.yaml'), '# the project\nname: pump\ntoolchain:\n  packager: internal\n');
        process.env.MEMO_CONFIG_DIR = join(dir, 'user');
        delete process.env.MEMO_TOOLCHAIN_COMPILER;
        out = [];
        vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { out.push(args.join(' ')); });
    });
    afterEach(() => {
        vi.restoreAllMocks();
        process.env = { ...envBefore };
        rmSync(dir, { recursive: true, force: true });
    });

    it('sets your own compiler in your settings file, not the project', () => {
        configSetCommand('compiler', 'syside');
        expect(readFileSync(userSettingsPath(), 'utf8')).toContain('compiler: syside');
        expect(readFileSync(join(project, 'memo.package.yaml'), 'utf8')).not.toContain('compiler');
    });

    it('with --project, names the compiler in the project\'s file and keeps its comments and keys', () => {
        configSetCommand('compiler', 'opensysml', { root: project });
        const text = readFileSync(join(project, 'memo.package.yaml'), 'utf8');
        expect(text).toContain('# the project');
        expect(text).toContain('packager: internal');
        expect(text).toContain('compiler: opensysml');
        expect(existsSync(userSettingsPath())).toBe(false);
        expect(out.join('\n')).toContain('commit it');
    });

    it('shows the layer that decided: the project\'s over yours', () => {
        configSetCommand('compiler', 'opensysml', { root: project });
        configSetCommand('compiler', 'syside');
        out.length = 0;
        configGetCommand('compiler', { projectRoot: project });
        expect(out.join('\n')).toMatch(/opensysml\s+\(project; overrides user settings: syside\)/);
    });

    it('lists the choice of compiler only, unless asked for the low-level overrides', () => {
        configGetCommand(undefined, { projectRoot: project });
        expect(out.join('\n')).toContain('toolchain.compiler');
        expect(out.join('\n')).not.toContain('opensysml.binary');
        out.length = 0;
        configGetCommand(undefined, { all: true, projectRoot: project });
        expect(out.join('\n')).toContain('opensysml.binary');
    });

    it('removes what it set', () => {
        configSetCommand('compiler', 'syside');
        configUnsetCommand('compiler');
        expect(readFileSync(userSettingsPath(), 'utf8')).not.toContain('compiler');
        configSetCommand('compiler', 'syside', { root: project });
        configUnsetCommand('compiler', { root: project });
        expect(readFileSync(join(project, 'memo.package.yaml'), 'utf8')).not.toContain('compiler');
    });

    it('refuses a compiler nobody provides, a project-only setting for yourself, and a machine path for the project', () => {
        expect(() => configSetCommand('compiler', 'nope')).toThrow(/syside, opensysml/);
        expect(() => configSetCommand('packager', 'internal')).toThrow(ConfigSettingError);
        expect(() => configSetCommand('syside.python', '/usr/bin/python3', { root: project })).toThrow(/one machine/);
        expect(existsSync(userSettingsPath())).toBe(false);
    });
});
