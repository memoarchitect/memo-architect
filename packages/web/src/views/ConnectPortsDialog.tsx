// ─── Connect two parts ───────────────────────────────────────────────────────
//
// An interconnection view draws a connector between two ports, and draws a
// port only once something is connected to it. So connecting is one command:
// choose the other part, choose a port on each side or name a new one, then
// choose the relationship. Nothing is written until the last step is confirmed
// in the relationship picker, except a port the user asked to create.

import { useMemo, useState } from 'react';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { COLOR, FONT } from '../styles/tokens';

/** One end of the connection: an existing port, or the name of a port to declare on the part. */
export type PortChoice = { portId: string } | { newPortName: string };

export interface ConnectPortsRequest {
    from: PortChoice;
    toPartId: string;
    to: PortChoice;
}

interface ConnectPortsDialogProps {
    /** The part the command was given on. */
    part: MemoElement;
    /** The other parts on the diagram. */
    parts: MemoElement[];
    /** A part's own ports, connected or not. */
    portsOf: (partId: string) => MemoElement[];
    onConnect: (request: ConnectPortsRequest) => void;
    onCancel: () => void;
}

const NEW = '\u0000new';

function PortField({ label, ports, value, name, onValue, onName }: {
    label: string; ports: MemoElement[]; value: string; name: string;
    onValue: (value: string) => void; onName: (name: string) => void;
}) {
    const field = { padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary, boxSizing: 'border-box' as const, width: '100%', background: COLOR.surface };
    return (
        <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>{label}</span>
            <select aria-label={label} value={value} onChange={event => onValue(event.target.value)} style={field}>
                {ports.map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
                <option value={NEW}>New port…</option>
            </select>
            {value === NEW && (
                <input aria-label={`${label}: new port name`} placeholder="Name of the new port" value={name}
                    onChange={event => onName(event.target.value)} style={field} />
            )}
        </label>
    );
}

export function ConnectPortsDialog({ part, parts, portsOf, onConnect, onCancel }: ConnectPortsDialogProps) {
    const fromPorts = useMemo(() => portsOf(part.id), [part.id, portsOf]);
    const [toPartId, setToPartId] = useState(parts[0]?.id ?? '');
    const toPorts = useMemo(() => (toPartId ? portsOf(toPartId) : []), [toPartId, portsOf]);
    const [from, setFrom] = useState(fromPorts[0]?.id ?? NEW);
    const [to, setTo] = useState(toPorts[0]?.id ?? NEW);
    const [fromName, setFromName] = useState('');
    const [toName, setToName] = useState('');
    // The port list follows the chosen part; a choice that is not on the new part falls back to its first port.
    const toValue = to === NEW || toPorts.some(port => port.id === to) ? to : toPorts[0]?.id ?? NEW;
    const choice = (value: string, name: string): PortChoice | undefined =>
        value === NEW ? (name.trim() ? { newPortName: name.trim() } : undefined) : { portId: value };
    const fromChoice = choice(from, fromName), toChoice = choice(toValue, toName);
    const ready = Boolean(toPartId && fromChoice && toChoice);
    const field = { padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary, boxSizing: 'border-box' as const, width: '100%', background: COLOR.surface };

    return (
        <div role="dialog" aria-modal="true" aria-label={`Connect ${part.name}`}
            onKeyDown={event => { if (event.key === 'Escape') onCancel(); }}
            onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <form
                onSubmit={event => {
                    event.preventDefault();
                    if (ready) onConnect({ from: fromChoice!, toPartId, to: toChoice! });
                }}
                style={{ width: '440px', maxWidth: '92vw', display: 'grid', gap: '12px', padding: '18px 20px', borderRadius: '12px',
                    background: COLOR.surface, border: `1px solid ${COLOR.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', color: COLOR.primary }}>
                <div style={{ fontWeight: 700, fontSize: FONT.lg }}>Connect {part.name}</div>
                <div style={{ fontSize: FONT.sm, color: COLOR.muted, lineHeight: 1.45 }}>
                    Choose the port on each side, then the relationship. It is written to the model's SysML.
                </div>
                <PortField label={`Port on ${part.name}`} ports={fromPorts} value={from} name={fromName} onValue={setFrom} onName={setFromName} />
                <label style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>Connect to</span>
                    <select aria-label="Connect to" autoFocus value={toPartId} onChange={event => setToPartId(event.target.value)} style={field}>
                        {parts.map(other => <option key={other.id} value={other.id}>{other.name}</option>)}
                    </select>
                </label>
                {toPartId && (
                    <PortField label={`Port on ${parts.find(other => other.id === toPartId)?.name ?? 'the other part'}`}
                        ports={toPorts} value={toValue} name={toName} onValue={setTo} onName={setToName} />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onCancel} style={{ padding: '7px 14px', borderRadius: '7px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, cursor: 'pointer', fontSize: FONT.sm }}>Cancel</button>
                    <button type="submit" disabled={!ready}
                        style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: FONT.sm, fontWeight: 600, cursor: ready ? 'pointer' : 'default', background: COLOR.accent, color: '#fff', opacity: ready ? 1 : 0.5 }}>
                        Choose relationship…
                    </button>
                </div>
            </form>
        </div>
    );
}
