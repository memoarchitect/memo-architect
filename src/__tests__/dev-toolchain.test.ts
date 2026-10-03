import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { architectDevToolchainOptions } from '../commands/dev-toolchain.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'architect-toolchain-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('the compiler an Architect session validates with', () => {
    it('is SysIDE when nothing chose one', () => {
        expect(architectDevToolchainOptions({}, dir)).toEqual({ 'toolchain.validator': 'syside' });
    });

    it('is the one the project chose: OpenSysML, with no SysIDE', () => {
        writeFileSync(join(dir, 'memo.tools.yaml'), 'toolchain:\n  compiler: opensysml\n');
        expect(architectDevToolchainOptions({}, dir)).toEqual({});
    });

    it('is the validator the project chose', () => {
        writeFileSync(join(dir, 'memo.tools.yaml'), 'toolchain:\n  validator: internal\n');
        expect(architectDevToolchainOptions({}, dir)).toEqual({});
    });

    it('is the one a flag chose, compiler or validator', () => {
        expect(architectDevToolchainOptions({ 'toolchain.compiler': 'opensysml' }, dir))
            .toEqual({ 'toolchain.compiler': 'opensysml' });
        expect(architectDevToolchainOptions({ 'toolchain.validator': 'internal' }, dir))
            .toEqual({ 'toolchain.validator': 'internal' });
    });
});
