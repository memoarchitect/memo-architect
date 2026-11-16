// @vitest-environment jsdom
// ─── Connecting two parts names a port on each side ─────────────────────────
//
// The dialog hands back which port each end uses: one the part already has,
// connected or not, or the name of one to declare. It gives nothing back until
// both ends are decided.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { ConnectPortsDialog } from '../ConnectPortsDialog';

const element = (id: string, name: string, construct: 'part' | 'port', owner?: string): MemoElement => ({
    id, name, kind: construct === 'part' ? 'LogicalComponent' : 'DataPort', construct,
    layer: 'logical', file: 'test.sysml', attributes: {}, ...(owner ? { owner } : {}),
} as MemoElement);

const pump = element('pump', 'Pump', 'part');
const valve = element('valve', 'Valve', 'part');
const tank = element('tank', 'Tank', 'part');
const ports = [element('pump::outlet', 'outlet', 'port', 'pump'), element('valve::inlet', 'inlet', 'port', 'valve')];
const portsOf = (partId: string) => ports.filter(port => port.owner === partId);

let root: Root;
let container: HTMLElement;
beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

const byLabel = <T extends HTMLElement>(label: string) => container.querySelector(`[aria-label="${label}"]`) as T;
const submit = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Choose relationship…') as HTMLButtonElement;
/** Sets a field the way a user's edit does, so React sees the change. */
function change(field: HTMLSelectElement | HTMLInputElement, value: string) {
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    act(() => {
        Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
        field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

function open() {
    const onConnect = vi.fn();
    act(() => root.render(<ConnectPortsDialog part={pump} parts={[valve, tank]} portsOf={portsOf} onConnect={onConnect} onCancel={() => {}} />));
    return onConnect;
}

describe('connecting two parts', () => {
    it('offers the ports each part already has and connects the ones chosen', () => {
        const onConnect = open();
        act(() => submit().click());
        expect(onConnect).toHaveBeenCalledWith({ from: { portId: 'pump::outlet' }, toPartId: 'valve', to: { portId: 'valve::inlet' } });
    });

    it('asks for a name when the other part has no port, and waits until one is typed', () => {
        const onConnect = open();
        change(byLabel<HTMLSelectElement>('Connect to'), 'tank');
        expect(submit().disabled).toBe(true);
        change(byLabel<HTMLInputElement>('Port on Tank: new port name'), 'Fill inlet');
        expect(submit().disabled).toBe(false);
        act(() => submit().click());
        expect(onConnect).toHaveBeenCalledWith({ from: { portId: 'pump::outlet' }, toPartId: 'tank', to: { newPortName: 'Fill inlet' } });
    });
});
