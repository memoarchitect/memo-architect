// @vitest-environment jsdom
//
// ─── Choosing what a traceability matrix traces ──────────────────────────────
//
// A quick trace is the first choice. The row and column pickers are shown only once the user asks to pick them by
// hand (Custom, or Customize on a quick trace); before that they are noise beside the quick trace.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { TraceBuilderBar, type TraceBuilderBarProps } from '../TraceBuilderBar';
import { typesOf } from '../../lib/trace-presets';

let root: Root;
let container: HTMLElement;

const preset = { id: 'system-function-system', label: 'System function → System', rows: typesOf('SystemFunction'), columns: typesOf('System') };
const props = (over: Partial<TraceBuilderBarProps> = {}): TraceBuilderBarProps => ({
    presets: [preset], presetCounts: new Map([[preset.id, { rows: 648, columns: 13 }]]), onPreset: vi.fn(),
    activePresetId: null, onCustomize: vi.fn(), showAxes: false,
    system: undefined, onSystem: vi.fn(),
    rowAxis: { kinds: [], query: '' }, columnAxis: { kinds: [], query: '' }, onRowAxis: vi.fn(), onColumnAxis: vi.fn(),
    rowSelection: { ids: [], counting: false }, columnSelection: { ids: [], counting: false },
    kindOptions: [], linkOptions: [], linkTypes: [], onLinkTypes: vi.fn(),
    canBuild: false, stale: false, built: false, building: false, onBuild: vi.fn(), actions: null,
    ...over,
});
const render = (p: TraceBuilderBarProps) => act(() => root.render(<TraceBuilderBar {...p} />));
const quickTrace = () => container.querySelector<HTMLSelectElement>('select[aria-label="Quick trace"]')!;
const showsPickers = () => /Rows/.test(container.textContent ?? '') && /Columns/.test(container.textContent ?? '');

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe('TraceBuilderBar', () => {
    it('offers the quick traces first, without the row and column pickers', () => {
        render(props());
        expect([...quickTrace().options].map(o => o.textContent)).toEqual(['Choose a trace…', 'Custom: pick rows and columns', preset.label]);
        expect(showsPickers()).toBe(false);
    });

    it('asks for the pickers when Custom is chosen, and shows them once asked', () => {
        const onCustomize = vi.fn();
        render(props({ onCustomize }));
        act(() => {
            quickTrace().value = '__custom__';
            quickTrace().dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(onCustomize).toHaveBeenCalledOnce();
        render(props({ showAxes: true }));
        expect(showsPickers()).toBe(true);
        expect(quickTrace().value).toBe('__custom__');
    });

    it('stands a chosen quick trace for the rows and columns', () => {
        render(props({ activePresetId: preset.id, showAxes: false }));
        expect(container.textContent).toContain(`${preset.label}`);
        expect(container.textContent).toContain('Customize');
        expect(showsPickers()).toBe(false);
    });
});
