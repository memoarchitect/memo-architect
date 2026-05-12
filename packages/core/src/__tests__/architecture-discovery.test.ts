import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLayers } from '../model/ontology-loader.js';

// W1.06.01 C-1: layer discovery supports flat and nested architecture layouts.

describe('buildLayers — architecture sublayer discovery', () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'memo-arch-discovery-'));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    function writeKindFile(rel: string, kindName: string) {
        const full = join(root, rel);
        mkdirSync(full.substring(0, full.lastIndexOf('/')), { recursive: true });
        writeFileSync(full, `part def ${kindName};\n`, 'utf-8');
    }

    it('loads kinds from flat architecture/<file>.sysml layout', () => {
        writeKindFile('architecture/flat_kind.sysml', 'FlatKind');
        const layers = buildLayers(root);
        const arch = layers.find(l => l.id === 'architecture');
        expect(arch).toBeDefined();
        expect(arch!.kinds.map(k => k.name)).toContain('FlatKind');
    });

    it('loads kinds from nested architecture/<sublayer>/<file>.sysml layout', () => {
        writeKindFile('architecture/electrical/nested_kind.sysml', 'NestedKind');
        const layers = buildLayers(root);
        const arch = layers.find(l => l.id === 'architecture');
        expect(arch).toBeDefined();
        expect(arch!.kinds.map(k => k.name)).toContain('NestedKind');
    });

    it('loads both flat and nested files together under architecture/', () => {
        writeKindFile('architecture/flat_kind.sysml', 'FlatKind');
        writeKindFile('architecture/electrical/nested_kind.sysml', 'NestedKind');
        writeKindFile('architecture/mechanical/another_kind.sysml', 'AnotherKind');
        const layers = buildLayers(root);
        const arch = layers.find(l => l.id === 'architecture');
        expect(arch).toBeDefined();
        const names = arch!.kinds.map(k => k.name).sort();
        expect(names).toEqual(['AnotherKind', 'FlatKind', 'NestedKind']);
    });
});
