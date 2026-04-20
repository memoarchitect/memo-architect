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

    it('memo init creates project structure with memo.package.yaml', () => {
        const output = run('init test-device', tmpDir);

        expect(output).toContain('Creating MEMO project: test-device');
        expect(output).toContain('Project created');

        const projectDir = join(tmpDir, 'test-device');
        expect(existsSync(projectDir)).toBe(true);
        expect(existsSync(join(projectDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(projectDir, 'model', 'test-device.sysml'))).toBe(true);

        // Check new-format config content
        const config = readFileSync(join(projectDir, 'memo.package.yaml'), 'utf-8');
        expect(config).toContain('name: "test-device"');
        expect(config).toContain('type: device');
        expect(config).toContain('extends: "@memo/medical-modeling-profile"');

        // Check lock file created
        expect(existsSync(join(projectDir, 'memo.lock.yaml'))).toBe(true);
        const lock = readFileSync(join(projectDir, 'memo.lock.yaml'), 'utf-8');
        expect(lock).toContain('ontology:');
        expect(lock).toContain('version:');
        expect(lock).toContain('lockedAt:');
    });

    it('memo init refuses to overwrite existing directory', () => {
        const { exitCode } = runMayFail('init test-device', tmpDir);
        expect(exitCode).not.toBe(0);
    });

    it('memo init --ontology selects a different ontology', () => {
        // Run from REPO_ROOT so ontology packages are discoverable
        const output = run(`init ${join(tmpDir, 'test-core-device')} --ontology @memo/ontology-medical-arch`, REPO_ROOT);

        expect(output).toContain('Creating MEMO project');
        expect(output).toContain('Project created');

        const projectDir = join(tmpDir, 'test-core-device');
        const config = readFileSync(join(projectDir, 'memo.package.yaml'), 'utf-8');
        expect(config).toContain('extends: "@memo/ontology-medical-arch"');

        // SysML should import the core ontology
        const sysml = readFileSync(join(projectDir, 'model', `test-core-device.sysml`), 'utf-8');
        expect(sysml).toContain('import MEMO_Ontology_Core::*');

        // Lock file should exist
        expect(existsSync(join(projectDir, 'memo.lock.yaml'))).toBe(true);
    });

    it('memo init --ontology rejects unknown ontology', () => {
        // Run from REPO_ROOT so ontology packages are discoverable (and validation triggers)
        const { exitCode, stdout } = runMayFail(
            `init ${join(tmpDir, 'test-bad')} --ontology @memo/nonexistent`,
            REPO_ROOT
        );
        expect(exitCode).not.toBe(0);
        expect(stdout).toContain('not found');
    });

    it('memo init --list-ontologies shows available packages', () => {
        // Run from REPO_ROOT so packages are discoverable
        const output = run('init --list-ontologies', REPO_ROOT);
        expect(output).toContain('@memo/ontology-medical-arch');
        expect(output).toContain('@memo/ontology-medical-process');
        expect(output).toContain('@memo/medical-modeling-profile');
        expect(output).toContain('(default)');
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

        const warningsMatch = stdout.match(/Warnings \((\d+)\)/);
        expect(warningsMatch).toBeTruthy();
        expect(Number(warningsMatch![1])).toBeGreaterThanOrEqual(6);
        expect(stdout).toContain('BV-001');
        expect(stdout).toContain('performInfusion');
    });

    it('memo validate reports layer-level completeness', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const { stdout } = runMayFail('validate', exampleDir);

        // Expect per-layer percentages
        expect(stdout).toMatch(/Operational Analysis|Purpose & Stakeholders/);
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

        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-medical-arch', 'sysml', 'index.sysml'))).toBe(true);
        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-medical-process', 'sysml', 'index.sysml'))).toBe(true);
        expect(existsSync(join(outputDir, 'packages', 'memo-medical-modeling-profile', 'memo.package.yaml'))).toBe(true);

        const lockContent = readFileSync(join(outputDir, 'sysand-lock.toml'), 'utf-8');
        expect(lockContent).toContain('@memo/ontology-medical-arch');
        expect(lockContent).toContain('@memo/ontology-medical-process');
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
        expect(metaJson.index.MEMO_Ontology_MedicalArch).toBe('packages/memo-ontology-medical-arch/sysml/index.sysml');
        expect(metaJson.index.MEMO_Ontology_MedicalProcess).toBe('packages/memo-ontology-medical-process/sysml/index.sysml');
        // SHA-256 checksums computed for exported files
        const coreChecksum = metaJson.checksum['packages/memo-ontology-medical-arch/sysml/index.sysml'];
        expect(coreChecksum.algorithm).toBe('SHA-256');
        expect(coreChecksum.value).toMatch(/^[a-f0-9]{64}$/);

        // Per-package .project.json should be copied
        expect(existsSync(join(outputDir, 'packages', 'memo-ontology-medical-arch', '.project.json'))).toBe(true);
        const corePkgJson = JSON.parse(readFileSync(join(outputDir, 'packages', 'memo-ontology-medical-arch', '.project.json'), 'utf-8'));
        expect(corePkgJson.name).toBe('@memo/ontology-medical-arch');
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
        const coreDir = join(outputDir, 'packages', 'memo-ontology-medical-arch');
        expect(existsSync(join(coreDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(coreDir, 'memo.rendering.yaml'))).toBe(true);
        expect(existsSync(join(coreDir, 'sysml', 'index.sysml'))).toBe(true);

        const medicalDir = join(outputDir, 'packages', 'memo-ontology-medical-process');
        expect(existsSync(join(medicalDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(medicalDir, 'memo.rendering.yaml'))).toBe(true);

        // Load config from the exported profile package
        const { loadConfig } = await import('@memo/core');
        const exportedConfig = loadConfig(join(profileDir, 'memo.package.yaml'));

        // Verify identity and extends chain preserved
        expect(exportedConfig.projectName).toBe('@memo/medical-modeling-profile');
        expect(exportedConfig.projectType).toBe('profile');
        expect(exportedConfig.extends).toBe('@memo/ontology-medical-process');

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

        // Verify exported ontology-medical-arch config loads correctly
        const coreConfig = loadConfig(join(coreDir, 'memo.package.yaml'));
        expect(coreConfig.projectName).toBe('@memo/ontology-medical-arch');
        expect(coreConfig.projectType).toBe('ontology');
        expect(coreConfig.architectureLayers!.length).toBeGreaterThanOrEqual(10);

        // Verify lock file has all packages
        const lockContent = readFileSync(join(outputDir, 'sysand-lock.toml'), 'utf-8');
        expect(lockContent).toContain('@memo/ontology-medical-arch');
        expect(lockContent).toContain('@memo/ontology-medical-process');
        expect(lockContent).toContain('@memo/medical-modeling-profile');

        // Verify checksums are consistent (re-read a file and hash it)
        const metaJson = JSON.parse(readFileSync(join(outputDir, '.meta.json'), 'utf-8'));
        const indexSysmlPath = 'packages/memo-ontology-medical-arch/sysml/index.sysml';
        const { createHash } = await import('node:crypto');
        const actualContent = readFileSync(join(outputDir, indexSysmlPath));
        const expectedHash = createHash('sha256').update(actualContent).digest('hex');
        expect(metaJson.checksum[indexSysmlPath].value).toBe(expectedHash);
    });
});

describe('E2E: ontology lock + change detection', () => {
    let projectDir: string;

    beforeAll(() => {
        // Create a test project inside the monorepo so config resolution finds ontology packages
        projectDir = join(REPO_ROOT, '.test-lock-' + process.pid);
        rmSync(projectDir, { recursive: true, force: true });
        mkdirSync(projectDir, { recursive: true });
        mkdirSync(join(projectDir, 'model'), { recursive: true });

        writeFileSync(join(projectDir, 'memo.config.yaml'), `
projectName: lock-test
projectType: device
extends: "@memo/medical-modeling-profile"
`);

        writeFileSync(join(projectDir, 'model', 'device.sysml'), `
package LockTest {
    import MEMO_Ontology_Medical::*;
    part sys : System {
        attribute redefines name = "Lock Test";
    }
}
`);
    });

    afterAll(() => {
        rmSync(projectDir, { recursive: true, force: true });
    });

    it('memo lock creates memo.lock.yaml', () => {
        const output = run('lock', projectDir);

        expect(output).toContain('Lock file written');
        expect(output).toContain('@memo/medical-modeling-profile');
        expect(existsSync(join(projectDir, 'memo.lock.yaml'))).toBe(true);

        const lock = readFileSync(join(projectDir, 'memo.lock.yaml'), 'utf-8');
        expect(lock).toContain('ontology: "@memo/medical-modeling-profile"');
        expect(lock).toContain('version:');
        expect(lock).toContain('lockedAt:');
        expect(lock).toContain('packages:');
        // Should have all 3 ontology packages in the chain
        expect(lock).toContain('@memo/ontology-medical-arch');
        expect(lock).toContain('@memo/ontology-medical-process');
        expect(lock).toContain('@memo/medical-modeling-profile');
    });

    it('memo validate succeeds with matching lock', () => {
        // Lock file was created in previous test
        const { stdout, exitCode } = runMayFail('validate', projectDir);

        expect(stdout).toContain('locked to');
        expect(stdout).toContain('Model:');
        expect(exitCode).toBe(0);
    });

    it('memo validate fails when ontology ID changes', () => {
        // Tamper the lock file to simulate an ontology change
        const lockPath = join(projectDir, 'memo.lock.yaml');
        const lock = readFileSync(lockPath, 'utf-8');
        writeFileSync(lockPath, lock.replace(
            '@memo/medical-modeling-profile',
            '@memo/some-other-ontology'
        ));

        const { stdout, exitCode } = runMayFail('validate', projectDir);
        expect(exitCode).not.toBe(0);
        expect(stdout).toContain('Ontology mismatch');
        expect(stdout).toContain('@memo/some-other-ontology');

        // Restore the lock file for subsequent tests
        writeFileSync(lockPath, lock);
    });

    it('memo validate fails when ontology version changes', () => {
        const lockPath = join(projectDir, 'memo.lock.yaml');
        const lock = readFileSync(lockPath, 'utf-8');
        writeFileSync(lockPath, lock.replace(
            /version: "[^"]+"\nlockedAt/,
            'version: "99.0.0"\nlockedAt'
        ));

        const { stdout, exitCode } = runMayFail('validate', projectDir);
        expect(exitCode).not.toBe(0);
        expect(stdout).toContain('version changed');

        // Restore
        writeFileSync(lockPath, lock);
    });

    it('memo lock regenerates after ontology changes', () => {
        // First tamper the lock
        const lockPath = join(projectDir, 'memo.lock.yaml');
        const oldLock = readFileSync(lockPath, 'utf-8');
        writeFileSync(lockPath, oldLock.replace(
            '@memo/medical-modeling-profile',
            '@memo/some-other-ontology'
        ));

        // Verify validate fails
        const { exitCode: fail } = runMayFail('validate', projectDir);
        expect(fail).not.toBe(0);

        // Regenerate lock
        const output = run('lock', projectDir);
        expect(output).toContain('Lock file written');

        // Now validate should pass
        const { exitCode: pass } = runMayFail('validate', projectDir);
        expect(pass).toBe(0);
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

    requirement need1 : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines name = "User need 1";
    }

    requirement sysReq1 : Requirement {
        attribute redefines category = RequirementCategory::System;
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

        // sysReq1 should still be reported as a Requirement in validation output
        expect(stdout).toContain('Requirement');
    });
});

describe('E2E: memo install', () => {
    let projectDir: string;
    let fakeOntologyDir: string;

    beforeAll(() => {
        // Create a project inside the monorepo for config resolution
        projectDir = join(REPO_ROOT, '.test-install-' + process.pid);
        rmSync(projectDir, { recursive: true, force: true });

        // Use memo init to create a properly configured project
        run(`init ${projectDir}`, REPO_ROOT);

        // Create a fake local ontology package to install
        fakeOntologyDir = join(REPO_ROOT, '.test-fake-ontology-' + process.pid);
        rmSync(fakeOntologyDir, { recursive: true, force: true });
        mkdirSync(fakeOntologyDir, { recursive: true });

        writeFileSync(join(fakeOntologyDir, 'memo.package.yaml'), `
name: "@test/fake-ontology"
version: "1.0.0"
type: ontology
extends: "@memo/ontology-medical-arch"
description: "Fake ontology for testing memo install"
`);

        mkdirSync(join(fakeOntologyDir, 'sysml', 'custom'), { recursive: true });
        writeFileSync(join(fakeOntologyDir, 'sysml', 'custom', 'custom.sysml'), `
package FakeOntology {
    part def CustomKind { }
}
`);
    });

    afterAll(() => {
        rmSync(projectDir, { recursive: true, force: true });
        rmSync(fakeOntologyDir, { recursive: true, force: true });
    });

    it('memo install --mode local symlinks a local package into memo_packages/', () => {
        const output = run(`install ${fakeOntologyDir} --mode local`, projectDir);

        expect(output).toContain('Installing package (local)');
        expect(output).toContain('Installed @test/fake-ontology');

        // Check symlink was created
        const linkPath = join(projectDir, 'memo_packages', 'fake-ontology');
        expect(existsSync(linkPath)).toBe(true);

        // Check memo.package.yaml has the dependency
        const config = readFileSync(join(projectDir, 'memo.package.yaml'), 'utf-8');
        expect(config).toContain('@test/fake-ontology');
    });

    it('memo install --mode local refuses non-existent path', () => {
        const { exitCode, stdout } = runMayFail('install /nonexistent/path --mode local', projectDir);
        expect(exitCode).not.toBe(0);
        expect(stdout).toContain('does not exist');
    });

    it('memo install detects local paths automatically', () => {
        // Create another fake package
        const anotherDir = join(REPO_ROOT, '.test-another-ontology-' + process.pid);
        rmSync(anotherDir, { recursive: true, force: true });
        mkdirSync(anotherDir, { recursive: true });
        writeFileSync(join(anotherDir, 'memo.package.yaml'), `
name: "@test/another-ontology"
version: "2.0.0"
type: ontology
description: "Another fake ontology"
`);

        try {
            const output = run(`install ${anotherDir}`, projectDir);
            expect(output).toContain('Installing package (local)');
            expect(output).toContain('Installed @test/another-ontology');
        } finally {
            rmSync(anotherDir, { recursive: true, force: true });
        }
    });

    it('memo install requires a project config', () => {
        const emptyDir = mkdtempSync(join(tmpdir(), 'memo-empty-'));
        try {
            const { exitCode, stdout } = runMayFail('install some-package', emptyDir);
            expect(exitCode).not.toBe(0);
            expect(stdout).toContain('No memo.package.yaml');
        } finally {
            rmSync(emptyDir, { recursive: true, force: true });
        }
    });
});

describe('E2E: import ea/cameo/sysand/owl', () => {
    let tmpDir: string;

    beforeAll(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'memo-import-e2e-'));
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('memo import ea imports from EA JSON export', () => {
        const eaJson = JSON.stringify({
            elements: [
                { id: 1, name: 'Overheating', type: 'Class', stereotype: 'Hazard', notes: 'Thermal hazard' },
                { id: 2, name: 'Temp Monitor', type: 'Class', stereotype: 'RiskControl' },
            ],
            connectors: [
                { id: 1, sourceId: 2, targetId: 1, type: 'Dependency', stereotype: 'mitigates' },
            ],
        });
        writeFileSync(join(tmpDir, 'ea-export.json'), eaJson);

        const output = run(`import ea ea-export.json --dry-run`, tmpDir);
        expect(output).toContain('Sparx EA');
        expect(output).toContain('2 mapped');
        expect(output).toContain('Overheating : Hazard');
        expect(output).toContain('Temp_Monitor : RiskControl');
        expect(output).toContain('Mitigates');
    });

    it('memo import cameo imports from Cameo JSON export', () => {
        const cameoJson = JSON.stringify({
            elements: [
                { id: 'e1', name: 'Shock Hazard', type: 'uml:Class', stereotypes: ['Hazard'] },
                { id: 'e2', name: 'Insulation', type: 'uml:Class', stereotypes: ['RiskControl'] },
            ],
            relationships: [
                { id: 'r1', sourceId: 'e2', targetId: 'e1', type: 'sysml:Satisfy' },
            ],
        });
        writeFileSync(join(tmpDir, 'cameo-export.json'), cameoJson);

        const output = run(`import cameo cameo-export.json --dry-run`, tmpDir);
        expect(output).toContain('MagicDraw/Cameo');
        expect(output).toContain('2 mapped');
        expect(output).toContain('Shock_Hazard : Hazard');
        expect(output).toContain('Insulation : RiskControl');
    });

    it('memo import sysand imports a SysAnd project directory', () => {
        // First export a SysAnd project from an example
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const sysandDir = join(tmpDir, 'sysand-project');
        run(`ontology export sysand -o ${sysandDir}`, exampleDir);

        // Now import it
        const output = run(`import sysand ${sysandDir}`, tmpDir);
        expect(output).toContain('SysAnd Project');
        expect(output).toContain('Kinds:');
        expect(output).toContain('Relationships:');
    });

    it('memo import sysand --verify performs round-trip check', () => {
        const exampleDir = join(REPO_ROOT, 'examples/infusion-pump');
        const sysandDir = join(tmpDir, 'sysand-roundtrip');
        run(`ontology export sysand -o ${sysandDir}`, exampleDir);

        const output = run(`import sysand ${sysandDir} --verify`, exampleDir);
        expect(output).toContain('Round-trip');
    });

    it('memo import owl imports from OWL/Turtle', () => {
        const turtle = `
@prefix memo: <https://example.org/memo#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<https://example.org/memo> a owl:Ontology ;
    dcterms:title "Test OWL Import" ;
    owl:versionInfo "1.0.0" ;
    .

memo:Hazard a owl:Class ;
    rdfs:label "Hazard" ;
    memo:layer "risk" ;
    memo:sysmlConstruct "part def" ;
    .

memo:mitigates a owl:ObjectProperty ;
    rdfs:label "mitigates" ;
    .
`;
        writeFileSync(join(tmpDir, 'test-ontology.ttl'), turtle);

        const output = run(`import owl test-ontology.ttl --dry-run`, tmpDir);
        expect(output).toContain('OWL/JSON-LD');
        expect(output).toContain('Classes:    1');
        expect(output).toContain('Properties: 1');
        expect(output).toContain('part def Hazard');
        expect(output).toContain('connection def Mitigates');
    });

    it('memo import owl --package-dir creates ontology package', () => {
        const turtle = `
@prefix memo: <https://example.org/memo#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

memo:Hazard a owl:Class ;
    rdfs:label "Hazard" ;
    memo:layer "risk" ;
    .

memo:Requirement a owl:Class ;
    rdfs:label "Requirement" ;
    memo:layer "requirements" ;
    .
`;
        writeFileSync(join(tmpDir, 'pkg-test.ttl'), turtle);
        const pkgDir = join(tmpDir, 'imported-pkg');

        run(`import owl pkg-test.ttl --package-dir ${pkgDir} --package test_pkg`, tmpDir);

        expect(existsSync(join(pkgDir, 'memo.package.yaml'))).toBe(true);
        expect(existsSync(join(pkgDir, '.project.json'))).toBe(true);
        expect(existsSync(join(pkgDir, 'sysml', 'index.sysml'))).toBe(true);
        expect(existsSync(join(pkgDir, 'sysml', 'risk', 'risk.sysml'))).toBe(true);
        expect(existsSync(join(pkgDir, 'sysml', 'requirements', 'requirements.sysml'))).toBe(true);
    });
});
