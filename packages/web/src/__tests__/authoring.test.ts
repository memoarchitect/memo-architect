// ─── Authoring helper tests ──────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { sysmlIdentifier, usageConstruct } from '../authoring';

describe('sysmlIdentifier', () => {
    it('produces the lowerCamelCase convention the model sources use', () => {
        expect(sysmlIdentifier('Air In Line Sensor')).toBe('airInLineSensor');
        expect(sysmlIdentifier('GPCA Device')).toBe('gPCADevice');
    });

    it('strips punctuation and collapses whitespace', () => {
        expect(sysmlIdentifier('  Air-In-Line   Sensor #2  ')).toBe('airInLineSensor2');
    });

    it('keeps an already-valid identifier stable', () => {
        expect(sysmlIdentifier('portOpCmdIn')).toBe('portOpCmdIn');
    });

    it('splits PascalCase runs into words', () => {
        expect(sysmlIdentifier('AntiFreeFlowValve')).toBe('antiFreeFlowValve');
    });

    it('never begins with a digit', () => {
        expect(sysmlIdentifier('2nd Sensor')).toBe('n2ndSensor');
    });

    it('falls back for a name with nothing usable in it', () => {
        expect(sysmlIdentifier('!!!')).toBe('element');
        expect(sysmlIdentifier('')).toBe('element');
    });

    it('suffixes rather than colliding with an id already in the model', () => {
        expect(sysmlIdentifier('Flow Sensor', ['flowSensor'])).toBe('flowSensor2');
        expect(sysmlIdentifier('Flow Sensor', ['flowSensor', 'flowSensor2'])).toBe('flowSensor3');
    });

    it('is unaffected by unrelated taken ids', () => {
        expect(sysmlIdentifier('Flow Sensor', ['doorSensor'])).toBe('flowSensor');
    });
});

describe('usageConstruct', () => {
    it('reduces a definition construct to its usage form', () => {
        expect(usageConstruct('part def')).toBe('part');
        expect(usageConstruct('port def')).toBe('port');
        expect(usageConstruct('action def')).toBe('action');
        expect(usageConstruct('connection def')).toBe('connection');
    });

    it('reduces an explicit usage construct too', () => {
        expect(usageConstruct('action usage')).toBe('action');
    });

    it('leaves a bare construct alone', () => {
        expect(usageConstruct('part')).toBe('part');
    });

    it('defaults to part when the kind declares nothing', () => {
        expect(usageConstruct(undefined)).toBe('part');
        expect(usageConstruct('')).toBe('part');
    });
});
