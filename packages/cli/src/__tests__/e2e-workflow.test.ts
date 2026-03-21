// ─── E2E CLI Workflow Tests ───────────────────────────────────────────────────
//
// Tests the full workflow: init → parse → validate → completeness → export
// Uses a temp directory so tests are isolated from the real filesystem.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(__dirname, '../../lib/bin/memo.js');
const REPO_ROOT = join(__dirname, '../../../..');

function run(cmd: string, cwd: string): string {
    return execSync(`node ${CLI_PATH} ${cmd}`, {
        cwd,
        encoding: 'utf-8',
        timeout: 30_000,
        env: { ...process.env, NO_COLOR: '1' },
    });
}

function runMayFail(cmd: string, cwd: string): { stdout: string; exitCode: number } {
    try {
        const stdout = execSync(`node ${CLI_PATH} ${cmd}`, {
            cwd,
            encoding: 'utf-8',
            timeout: 30_000,
            env: { ...process.env, NO_COLOR: '1' },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { stdout, exitCode: 0 };
    } catch (err: any) {
        // execSync throws on non-zero exit; stdout is still available
        return { stdout: (err.stdout || '') + (err.stderr || ''), exitCode: err.status || 1 };
    }
}

describe('E2E: memo init → validate → export', () => {
    let tmpDir: string;

    beforeAll(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'memo-e2e-'));
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('memo init creates project structure', () => {
        const output = run('init test-device', tmpDir);

        expect(output).toContain('Creating MEMO project: test-device');
        expect(output).toContain('Project created');

        const projectDir = join(tmpDir, 'test-device');
        expect(existsSync(projectDir)).toBe(true);
        expect(existsSync(join(projectDir, 'memo.config.yaml'))).toBe(true);
        expect(existsSync(join(projectDir, 'model', 'test-device.sysml'))).toBe(true);

        // Check config content
        const config = readFileSync(join(projectDir, 'memo.config.yaml'), 'utf-8');
        expect(config).toContain('projectName: test-device');
        expect(config).toContain('projectType: device');
        expect(config).toContain('extends: "@memo/medical"');
    });

    it('memo init refuses to overwrite existing directory', () => {
        const { exitCode } = runMayFail('init test-device', tmpDir);
        expect(exitCode).not.toBe(0);
    });

    it('memo validate runs on infusion-pump example', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout, exitCode } = runMayFail('validate', exampleDir);

        // Should find elements and relationships
        expect(stdout).toContain('Model:');
        expect(stdout).toMatch(/\d+ elements/);
        expect(stdout).toMatch(/\d+ relationships/);

        // Should show completeness
        expect(stdout).toContain('Completeness by Layer');
        expect(stdout).toContain('Overall:');

        // Exit code 1 because there are errors (expected)
        expect(exitCode).toBe(1);
    });

    it('memo validate shows specific violations', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout } = runMayFail('validate', exampleDir);

        // Check for known violations
        expect(stdout).toContain('CR-MED-');
        expect(stdout).toContain('Errors');
        expect(stdout).toContain('Hazard');
    });

    it('memo validate reports layer-level completeness', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout } = runMayFail('validate', exampleDir);

        // Expect per-layer percentages
        expect(stdout).toContain('Business Analysis');
        expect(stdout).toContain('Risk Management');
        expect(stdout).toContain('Requirements');
        expect(stdout).toMatch(/\d+%/);
    });

    it('memo export json produces valid JSON', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const outputPath = join(tmpDir, 'export.json');

        run(`export json -o ${outputPath}`, exampleDir);

        expect(existsSync(outputPath)).toBe(true);
        const content = readFileSync(outputPath, 'utf-8');
        const data = JSON.parse(content);

        expect(data.projectName).toBe('infusion-pump');
        expect(data.projectType).toBe('device');
        expect(data.model).toBeDefined();
        expect(data.model.elements).toBeDefined();
        expect(data.model.relationships).toBeDefined();
        expect(data.validation).toBeDefined();
        expect(data.completeness).toBeDefined();
        expect(Object.keys(data.model.elements).length).toBeGreaterThan(0);
    });

    it('memo export dot produces valid DOT', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const outputPath = join(tmpDir, 'export.dot');

        run(`export dot -o ${outputPath}`, exampleDir);

        expect(existsSync(outputPath)).toBe(true);
        const content = readFileSync(outputPath, 'utf-8');

        expect(content).toContain('digraph MEMO');
        expect(content).toContain('rankdir=LR');
        expect(content).toMatch(/"[^"]+" -> "[^"]+"/); // edges exist
    });
});

describe('E2E: custom model validation', () => {
    let projectDir: string;

    beforeAll(() => {
        // Create a test project inside the monorepo so config resolution finds @memo/medical
        projectDir = join(REPO_ROOT, '.test-custom-device-' + process.pid);
        rmSync(projectDir, { recursive: true, force: true });
        mkdirSync(projectDir, { recursive: true });
        mkdirSync(join(projectDir, 'model'), { recursive: true });

        // Write a minimal config that extends @memo/medical
        writeFileSync(join(projectDir, 'memo.config.yaml'), `
projectName: custom-device
projectType: device
extends: "@memo/medical"
`);

        // Write a SysML model with elements and a traced relationship
        writeFileSync(join(projectDir, 'model', 'device.sysml'), `
package CustomDevice {
    import MEMO_Ontology_Medical::*;

    part mySystem : System {
        attribute redefines name = "Custom Device";
    }

    requirement need1 : UserNeed {
        attribute redefines name = "User need 1";
    }

    requirement sysReq1 : SystemRequirement {
        attribute redefines name = "System requirement 1";
    }

    connection : TraceTo connect source ::> sysReq1 to target ::> need1;
}
`);
    });

    afterAll(() => {
        rmSync(projectDir, { recursive: true, force: true });
    });

    it('validates a custom model with elements and relationships', () => {
        const { stdout } = runMayFail('validate', projectDir);

        expect(stdout).toContain('Model:');
        expect(stdout).toContain('3 elements');
        expect(stdout).toContain('1 relationships');
        expect(stdout).toContain('Completeness by Layer');
    });

    it('detects missing relationships per closure rules', () => {
        const { stdout } = runMayFail('validate', projectDir);

        // sysReq1 should have a warning about not being satisfied by a LogicalComponent
        expect(stdout).toContain('SystemRequirement');
    });
});
