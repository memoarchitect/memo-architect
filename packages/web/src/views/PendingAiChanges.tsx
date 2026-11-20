// ─── Pending changes from AI coding tools ────────────────────────────────────
//
// Claude Code, Cursor or VS Code, connected to the model in Settings › Jupyter and AI tools, propose edits over
// MCP with the Model Assistant's own tools. The proposals wait in memo.ai-proposals.json; this view
// lists them with the chat's review card and applies the chosen ones through the same server path as
// an approved chat proposal. Nothing reaches the SysML source until it is applied here.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import type { ProposedChange, QueuedProposal } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { sendAiProposals } from '../store/ws-client';
import { ProposedChanges } from './ChatPanel';

const REQUEST_TIMEOUT_MS = 120_000;

function describeSource(proposal: QueuedProposal): string {
    const when = new Date(proposal.proposedAt);
    const at = Number.isNaN(when.getTime()) ? '' : ` · ${when.toLocaleString()}`;
    return `Proposed by ${proposal.client ?? 'an AI coding tool'}${at}`;
}

export function PendingAiChanges() {
    const proposals = useModelStore(s => s.aiProposals);
    const registerLlmRequest = useModelStore(s => s.registerLlmRequest);
    const setActiveView = useModelStore(s => s.setActiveView);
    const [approved, setApproved] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [failures, setFailures] = useState<Record<string, string>>({});

    // A proposal that arrives starts selected, as in the chat: the engineer opts out of ones they reject.
    useEffect(() => {
        setApproved(prev => {
            const next = new Set([...prev].filter(id => proposals.some(p => p.id === id)));
            for (const proposal of proposals) if (!seen.has(proposal.id)) { next.add(proposal.id); seen.add(proposal.id); }
            return next;
        });
    }, [proposals]);

    const run = useCallback(async (action: 'apply' | 'discard', ids: string[]) => {
        if (ids.length === 0 || busy) return;
        setBusy(true);
        setNote(null);
        const requestId = `ai-${action}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            const result = await new Promise<{ applied: string[]; failed: Array<{ id: string; error: string }> }>((resolve, reject) => {
                registerLlmRequest(requestId, resolve, reject);
                sendAiProposals(requestId, action, ids);
                setTimeout(() => reject(new Error('The request timed out after 2 minutes.')), REQUEST_TIMEOUT_MS);
            });
            setFailures(Object.fromEntries(result.failed.map(f => [f.id, f.error])));
            if (action === 'discard') setNote(`Discarded ${ids.length}.`);
            else setNote(result.failed.length
                ? `Applied ${result.applied.length}; ${result.failed.length} could not be applied and are still listed.`
                : `Applied ${result.applied.length} change${result.applied.length === 1 ? '' : 's'} to the model source.`);
        } catch (e: any) {
            setNote(e?.message ?? 'The request failed.');
        } finally {
            setBusy(false);
        }
    }, [busy, registerLlmRequest]);

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', background: '#F9FAFB' }}>
            <div style={{ maxWidth: 820 }}>
                <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Changes that Claude Code, Cursor or VS Code proposed while working on this model. They are not in the model
                    until you apply them here. Connect a tool, and choose whether it may propose edits, in{' '}
                    <button onClick={() => setActiveView({ type: 'settings', section: 'integrations' })}
                        style={{ border: 0, padding: 0, background: 'none', color: '#065F46', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
                        Settings › Jupyter and AI tools
                    </button>.
                </p>
                {proposals.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#6B7280', padding: '24px 0' }}>No changes are waiting.</div>
                ) : (
                    <ProposedChanges
                        changes={proposals as ProposedChange[]}
                        approved={approved}
                        onToggle={id => setApproved(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                        })}
                        onApply={() => run('apply', proposals.filter(p => approved.has(p.id)).map(p => p.id))}
                        onDiscard={() => run('discard', proposals.filter(p => approved.has(p.id)).map(p => p.id))}
                        discardLabel="Discard selected"
                        applying={busy}
                        inset={false}
                        sourceOf={change => describeSource(change as QueuedProposal)}
                        failures={failures}
                    />
                )}
                {note && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 12 }}>{note}</div>}
            </div>
        </div>
    );
}

/** Proposals this page has already shown, so one the engineer unticked is not ticked again. */
const seen = new Set<string>();
