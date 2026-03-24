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
        expect(config).toContain('extends: "@memo/medical-modeling-profile"');
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

        // Exit code 0 because the example has warnings only
        expect(exitCode).toBe(0);
    });

    it('memo validate shows known infusion-pump warnings', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout } = runMayFail('validate', exampleDir);

        expect(stdout).toContain('Warnings (3)');
        expect(stdout).toContain('BV-001');
        expect(stdout).toContain('performInfusion');
    });

    it('memo validate reports layer-level completeness', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout } = runMayFail('validate', exampleDir);

        // Expect per-layer percentages
        expect(stdout).toContain('Purpose & Stakeholders');
        expect(stdout).toContain('Risk Management');
        expect(stdout).toContain('Requirements');
        expect(stdout).toMatch(/\d+%/);
    });

    it('memo validate runs on irrigation-pump example', () => {
        const exampleDir = join(REPO_ROOT, 'examples/irrigation-pump');
        const { stdout, exitCode } = runMayFail('validate', exampleDir);

        expect(stdout).toContain('Project: irrigation-pump');
        expect(stdout).toContain('Overall: 100%');
        expect(stdout).toMatch(/Rules: \d+ evaluated/);
        expect(exitCode).toBe(0);
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

    it('memo ontology export sysand bundles the ontology dependency stack', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const outputDir = join(tmpDir, 'ontology-project');

        run(`ontology export sysand -o ${outputDir}`, exampleDir);

        expect(existsSync(join(outputDir, '.project.json'))).toBe(true);
        expect(existsSync(join(outputDir, '.meta.json'))).toBe(true);
        expect(existsSync(join(outputDir, 'README.md'))).toBe(true);
        expect(existsSync(join(outputDir, 'sysand-lock.toml'))).toBe(true);
        expect(existsSync(join(outputDir, 'docs', 'model-structure.md'))).toBe(true);
        expect(existsSync(join(outputDir, 'docs', 'model-structure.json'))).toBe(true);

        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-core', 'sysml', 'index.sysml'))).toBe(true);
        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-medical', 'sysml', 'index.sysml'))).toBe(true);
        expect(existsSync(join(outputDir, 'packages', 'memo-medical-modeling-profile', 'memo.package.yaml'))).toBe(true);

        const lockContent = readFileSync(join(outputDir, 'sysand-lock.toml'), 'utf-8');
        expect(lockContent).toContain('@memo/ontology-core');
        expect(lockContent).toContain('@memo/ontology-medical');
        expect(lockContent).toContain('@memo/medical-modeling-profile');

        const projectJson = JSON.parse(readFileSync(join(outputDir, '.project.json'), 'utf-8'));
        expect(projectJson.name).toBe('infusion-pump');
        expect(projectJson.publisher).toBe('untitled');
        expect(projectJson.version).toBe('2.0.0');
        // Usage derived from package types: ontology → kinds/relationships, profile → rules/viewpoints/templates
        expect(projectJson.usage.length).toBeGreaterThan(0);
        expect(projectJson.usage).toContain('kinds');
        expect(projectJson.usage).toContain('relationships');

        const metaJson = JSON.parse(readFileSync(join(outputDir, '.meta.json'), 'utf-8'));
        expect(metaJson.index.MEMO_Ontology_Core).toBe('packages/memo-ontology-core/sysml/index.sysml');
        expect(metaJson.index.MEMO_Ontology_Medical).toBe('packages/memo-ontology-medical/sysml/index.sysml');
        // SHA-256 checksums computed for exported files
        const coreChecksum = metaJson.checksum['packages/memo-ontology-core/sysml/index.sysml'];
        expect(coreChecksum.algorithm).toBe('SHA-256');
        expect(coreChecksum.value).toMatch(/^[a-f0-9]{64}$/);

        // Per-package .project.json should be copied
        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-core', '.project.json'))).toBe(true);
        const corePkgJson = JSON.parse(readFileSync(join(outputDir, 'packages', 'memo-ontology-core', '.project.json'), 'utf-8'));
        expect(corePkgJson.name).toBe('@memo/ontology-core');
        expect(corePkgJson.usage).toContain('kinds');
    });

    it('round-trip: exported SysAnd project has loadable registries', async () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const outputDir = join(tmpDir, 'round-trip-export');

        run(`ontology export sysand -o ${outputDir}`, exampleDir);

        // Verify the exported project has the expected structure
        const profileDir = join(outputDir, 'packages', 'memo-medical-modeling-profile');
        expect(existsSync(join(profileDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(profileDir, 'memo.rules.yaml'))).toBe(true);
        expect(existsSync(join(profileDir, 'memo.viewpoints.yaml'))).toBe(true);

        // Verify ontology packages have rendering configs
        const coreDir = join(outputDir, 'packages', 'memo-ontology-core');
        expect(existsSync(join(coreDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(coreDir, 'memo.rendering.yaml'))).toBe(true);
        expect(existsSync(join(coreDir, 'sysml', 'index.sysml'))).toBe(true);

        const medicalDir = join(outputDir, 'packages', 'memo-ontology-medical');
        expect(existsSync(join(medicalDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(medicalDir, 'memo.rendering.yaml'))).toBe(true);

        // Load config from the exported profile package
        const { loadConfig } = await import('@memo/core');
        const exportedConfig = loadConfig(join(profileDir, 'memo.package.yaml'));

        // Verify identity and extends chain preserved
        expect(exportedConfig.projectName).toBe('@memo/medical-modeling-profile');
        expect(exportedConfig.projectType).toBe('profile');
        expect(exportedConfig.extends).toBe('@memo/ontology-medical');

        // Verify rules preserved in export
        expect(exportedConfig.closureRules.length).toBeGreaterThanOrEqual(100);
        const ruleIds = exportedConfig.closureRules.map(r => r.id);
        expect(ruleIds).toContain('CR-MED-001');

        // Verify viewpoints preserved in export
        expect(exportedConfig.viewpoints).toBeDefined();
        expect(exportedConfig.viewpoints!.length).toBeGreaterThanOrEqual(10);
        const vpIds = exportedConfig.viewpoints!.map(v => v.id);
        expect(vpIds).toContain('risk-overview');
        expect(vpIds).toContain('software-view');

        // Verify exported ontology-core config loads correctly
        const coreConfig = loadConfig(join(coreDir, 'memo.package.yaml'));
        expect(coreConfig.projectName).toBe('@memo/ontology-core');
        expect(coreConfig.projectType).toBe('ontology');
        expect(coreConfig.cosmaLayers!.length).toBeGreaterThanOrEqual(10);

        // Verify lock file has all packages
        const lockContent = readFileSync(join(outputDir, 'sysand-lock.toml'), 'utf-8');
        expect(lockContent).toContain('@memo/ontology-core');
        expect(lockContent).toContain('@memo/ontology-medical');
        expect(lockContent).toContain('@memo/medical-modeling-profile');

        // Verify checksums are consistent (re-read a file and hash it)
        const metaJson = JSON.parse(readFileSync(join(outputDir, '.meta.json'), 'utf-8'));
        const indexSysmlPath = 'packages/memo-ontology-core/sysml/index.sysml';
        const { createHash } = await import('node:crypto');
        const actualContent = readFileSync(join(outputDir, indexSysmlPath));
        const expectedHash = createHash('sha256').update(actualContent).digest('hex');
        expect(metaJson.checksum[indexSysmlPath].value).toBe(expectedHash);
    });
});

describe('E2E: custom model validation', () => {
    let projectDir: string;

    beforeAll(() => {
        // Create a test project inside the monorepo so config resolution finds @memo/medical-modeling-profile
        projectDir = join(REPO_ROOT, '.test-custom-device-' + process.pid);
        rmSync(projectDir, { recursive: true, force: true });
        mkdirSync(projectDir, { recursive: true });
        mkdirSync(join(projectDir, 'model'), { recursive: true });

        // Write a minimal config that extends @memo/medical-modeling-profile
        writeFileSync(join(projectDir, 'memo.config.yaml'), `
projectName: custom-device
projectType: device
extends: "@memo/medical-modeling-profile"
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
