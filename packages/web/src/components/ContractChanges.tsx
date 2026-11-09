// ─── Whether a change breaks anyone ───────────────────────────────────────────
//
// The verdicts `contractChanges` (memo-tools) reaches, as the Model Diff and Impact pages show them: what changed,
// which side has to change for it, and who that is today. A change that could not be judged is listed and counted
// like any other. Nothing here decides a verdict.

import type { ContractChange, ContractReport, ContractVerdict } from '@memoarchitect/tools/browser';
import { COLOR, FONT } from '../styles/tokens';

const VERDICT: Record<ContractVerdict, { label: string; color: string }> = {
    breaking: { label: 'Breaking', color: '#B91C1C' },
    unknown: { label: 'Cannot tell', color: '#B45309' },
    compatible: { label: 'Compatible', color: '#047857' },
};
const ORDER: ContractVerdict[] = ['breaking', 'unknown', 'compatible'];

const side = (change: ContractChange) => change.breaks === 'both' ? 'producers and consumers' : change.breaks;

export function ContractChanges({ report, limits }: { report: ContractReport; limits: string }) {
    if (report.changes.length === 0) return null;
    return (
        <section data-testid="contract-changes" style={{ margin: '10px 0 14px' }}>
            <div style={{ fontSize: FONT.sm, fontWeight: 600, color: COLOR.primary, marginBottom: 4 }}>
                Interface changes: {ORDER.filter(v => report.summary[v] > 0).map(v => `${report.summary[v]} ${VERDICT[v].label.toLowerCase()}`).join(', ')}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {ORDER.flatMap(verdict => report.changes.filter(change => change.verdict === verdict)).map((change, index) => (
                    <li key={`${change.subject.id}-${change.code}-${index}`} style={{ fontSize: FONT.sm, padding: '3px 0' }}>
                        <span style={{ color: VERDICT[change.verdict].color, fontWeight: 600 }}>{VERDICT[change.verdict].label}</span>
                        {' '}<b>{change.subject.name}</b>: {change.reason}
                        {change.breaks && <span style={{ color: COLOR.muted }}>. Needs {side(change)} to change</span>}
                        {change.parties.length > 0 && (
                            <div style={{ fontSize: FONT.xs, color: COLOR.muted }}>
                                Affects {[...new Set(change.parties.map(party => party.name))].join(', ')}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            <p style={{ fontSize: FONT.xs, color: COLOR.muted, margin: '4px 0 0' }}>{limits}</p>
        </section>
    );
}
