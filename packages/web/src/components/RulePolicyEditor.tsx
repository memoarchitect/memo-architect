import { useEffect, useMemo, useState } from 'react';
import { layersWithRules, rulesSelectedBy, standardsWithRules } from '@memoarchitect/tools/browser';
import { useModelStore } from '../store/model-store';
import { methodologySource, writeRulePolicy } from '../store/ws-client';
import { COLOR, FONT } from '../styles/tokens';

/**
 * Tailor a rule: disable it, override its severity, or replace it.
 *
 * The structured counterpart to the raw source editor beside it. This one knows
 * what the effective rule set is, so it can show what a rule's disposition
 * currently is and refuse an impossible decision before the user commits to it
 * — an invariant is not offered as disableable rather than being rejected after
 * the fact.
 *
 * It composes no SysML. The decision goes to Tools, which renders the
 * `RulePolicy` and writes it through the precondition-checked path. That is
 * what "through the command boundary" means: a rule tailored here and a rule
 * tailored in a text editor produce the same construct in the same file.
 *
 * Section 10.4: this governs a rule's IDENTITY and DISPOSITION. It is not
 * evidence that the model was validated.
 */
export interface PolicyPreset {
    /** Bumped for each request, so asking for the same target twice still applies. */
    key: number;
    selector: 'rule' | 'category';
    value: string;
    disposition: 'enabled' | 'disabled';
}

export function RulePolicyEditor({ ruleType: chosen, preset }: { ruleType?: string; preset?: PolicyPreset } = {}) {
    const rules = useModelStore(state => state.effectiveRules);
    const diagnostics = useModelStore(state => state.ruleDiagnostics);
    const methodology = useModelStore(state => state.methodology);
    const clauses = useModelStore(state => state.ruleClauses);

    const targets = useMemo(() => [...new Set(
        (methodology?.folders ?? []).flatMap(folder => folder.sourceFiles),
    )].sort(), [methodology]);

    // One policy selects what it governs one way: a rule, every rule of a standard,
    // or every rule on a layer (the discipline of the rule's subject kind).
    const [selector, setSelector] = useState<'rule' | 'standard' | 'category'>('rule');
    const [standard, setStandard] = useState('');
    const [category, setCategory] = useState('');
    const standards = useMemo(() => standardsWithRules(rules, clauses), [rules, clauses]);
    const layers = useMemo(() => layersWithRules(rules), [rules]);
    const [ruleType, setRuleType] = useState(chosen ?? '');
    // The rule list above can pick the rule to tailor.
    useEffect(() => { if (chosen) { setRuleType(chosen); setSelector('rule'); } }, [chosen]);
    const [disposition, setDisposition] = useState<'enabled' | 'disabled' | 'replaced'>('disabled');
    useEffect(() => {
        if (!preset) return;
        setSelector(preset.selector);
        if (preset.selector === 'rule') setRuleType(preset.value); else setCategory(preset.value);
        setDisposition(preset.disposition);
        setMessage('');
    }, [preset?.key]);
    const [severity, setSeverity] = useState('');
    const [replacement, setReplacement] = useState('');
    const [rationale, setRationale] = useState('');
    const [authority, setAuthority] = useState('');
    const [approval, setApproval] = useState('');
    const [sourceFile, setSourceFile] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const selected = selector === 'rule' ? rules.find((rule: any) => rule.sourceRuleType === ruleType) : undefined;
    const isInvariant = selected?.tailoring === 'invariant';
    const reached = selector === 'standard' ? rulesSelectedBy(rules, { targetStandard: standard })
        : selector === 'category' ? rulesSelectedBy(rules, { targetCategory: category }) : [];
    const keepRunning = reached.filter((rule: any) => rule.tailoring === 'invariant');
    const bulk = selector !== 'rule';
    const hasTarget = selector === 'rule' ? Boolean(ruleType) : selector === 'standard' ? Boolean(standard) : Boolean(category);
    // Mirrors the server's refusals so the button is disabled for the same
    // reasons the write would be rejected. The server check is the real one;
    // this only avoids a pointless round trip.
    const blocked =
        !hasTarget || !sourceFile
        || (bulk && reached.length === 0)
        || (bulk && disposition === 'replaced')
        || (bulk && disposition === 'disabled' && keepRunning.length === reached.length)
        || (isInvariant && disposition !== 'enabled')
        || (disposition !== 'enabled' && !rationale.trim())
        || (disposition === 'replaced' && !replacement.trim());

    const submit = async () => {
        setBusy(true);
        setMessage('');
        try {
            const loaded = await methodologySource('load', sourceFile);
            if (!loaded.success || !loaded.revision) {
                setMessage(loaded.error ?? 'Could not read the methodology source.');
                return;
            }
            const result = await writeRulePolicy({
                ...(selector === 'rule' ? { targetRuleType: ruleType }
                    : selector === 'standard' ? { targetStandard: standard } : { targetCategory: category }),
                disposition,
                severityOverride: severity ? severity as 'error' | 'warning' | 'info' : undefined,
                replacementRuleType: disposition === 'replaced' ? replacement.trim() : undefined,
                rationaleText: rationale.trim(),
                authority: authority.trim() || undefined,
                approvalReference: approval.trim() || undefined,
                sourceFile,
                baseRevision: loaded.revision,
            });
            setMessage(result.success
                ? 'Policy written. The reusable semantic runtime is restarting.'
                : (result.error ?? 'The policy was rejected; nothing was written.'));
            if (result.success) { setRationale(''); setApproval(''); }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    if (rules.length === 0) return null;
    const field: React.CSSProperties = { width: 'calc(100% - 24px)', margin: '0 12px 6px', fontSize: FONT.xs };

    return (
        <section style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            <div className="px-3 py-2 font-semibold" style={{ fontSize: FONT.xs, color: COLOR.primary }}>
                Rule Tailoring
                <span style={{ fontWeight: 400, color: COLOR.muted }}> — {rules.length} rules in the effective set</span>
            </div>

            <select aria-label="Selects" value={selector} style={field}
                onChange={event => {
                    setSelector(event.target.value as typeof selector);
                    if (event.target.value !== 'rule' && disposition === 'replaced') setDisposition('disabled');
                }}>
                <option value="rule">One rule</option>
                <option value="standard">Every rule of a standard</option>
                <option value="category">Every rule on a layer</option>
            </select>

            {selector === 'rule' && (
                <select aria-label="Rule" value={ruleType} style={field}
                    onChange={event => setRuleType(event.target.value)}>
                    <option value="">Select a rule…</option>
                    {rules.map((rule: any) => (
                        <option key={rule.sourceRuleType} value={rule.sourceRuleType}>
                            {rule.sourceRuleId} — {rule.sourceRuleType}
                            {rule.tailoring === 'invariant' ? ' (invariant)' : ''}
                            {rule.disposition !== 'enabled' ? ` [${rule.disposition}]` : ''}
                        </option>
                    ))}
                </select>
            )}
            {selector === 'standard' && (
                <select aria-label="Standard" value={standard} style={field}
                    onChange={event => setStandard(event.target.value)}>
                    <option value="">Select a standard…</option>
                    {standards.map(entry => <option key={entry.standardName} value={entry.standardName}>{entry.standard}</option>)}
                </select>
            )}
            {selector === 'category' && (
                <select aria-label="Layer" value={category} style={field}
                    onChange={event => setCategory(event.target.value)}>
                    <option value="">Select a layer…</option>
                    {layers.map(layer => <option key={layer} value={layer}>{layer}</option>)}
                </select>
            )}
            {bulk && hasTarget && (
                <div className="px-3 pb-1" role="status" style={{ fontSize: 11, color: COLOR.muted }}>
                    Reaches {reached.length} rule{reached.length === 1 ? '' : 's'}
                    {keepRunning.length > 0 && ` · ${keepRunning.length} invariant keep${keepRunning.length === 1 ? 's' : ''} running`}
                    {reached.length > 0 && `: ${reached.map((rule: any) => rule.sourceRuleId).join(', ')}`}
                </div>
            )}

            {selected && (
                <div className="px-3 pb-1" style={{ fontSize: 11, color: COLOR.muted }}>
                    Currently {selected.disposition} at {selected.effectiveSeverity}
                    {selected.effectiveSeverity !== selected.declaredSeverity
                        && ` (declared ${selected.declaredSeverity})`}
                    {selected.policyChain?.length > 0 && ` · ${selected.policyChain.length} policy in chain`}
                </div>
            )}

            {isInvariant && (
                <div className="px-3 pb-2" role="status" style={{ fontSize: 11, color: '#B45309' }}>
                    This rule is an invariant. It cannot be disabled or replaced by a methodology;
                    changing it requires an ontology release.
                </div>
            )}

            <select aria-label="Disposition" value={disposition} style={field}
                onChange={event => setDisposition(event.target.value as typeof disposition)}>
                <option value="disabled">Disable</option>
                {!bulk && <option value="replaced">Replace</option>}
                <option value="enabled">Enable (severity override only)</option>
            </select>

            <select aria-label="Severity override" value={severity} style={field}
                onChange={event => setSeverity(event.target.value)}>
                <option value="">No severity override</option>
                <option value="error">error</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
            </select>

            {disposition === 'replaced' && (
                <input aria-label="Replacement rule" value={replacement} style={field}
                    placeholder="Replacement constraint def name"
                    onChange={event => setReplacement(event.target.value)} />
            )}

            <textarea aria-label="Rationale" value={rationale}
                placeholder="Rationale — required to disable or replace a rule"
                style={{ ...field, height: 54, fontFamily: 'inherit' }}
                onChange={event => setRationale(event.target.value)} />
            <input aria-label="Authority" value={authority} style={field} placeholder="Authority (optional)"
                onChange={event => setAuthority(event.target.value)} />
            <input aria-label="Approval reference" value={approval} style={field}
                placeholder="Approval reference (optional)"
                onChange={event => setApproval(event.target.value)} />

            <select aria-label="Target methodology file" value={sourceFile} style={field}
                onChange={event => setSourceFile(event.target.value)}>
                <option value="">Write the policy into…</option>
                {targets.map(file => <option key={file} value={file}>{file}</option>)}
            </select>

            <div className="flex gap-2 px-3 py-2">
                <button disabled={blocked || busy} onClick={() => void submit()}>
                    {busy ? 'Writing…' : 'Write policy'}
                </button>
            </div>

            {message && (
                <div className="px-3 pb-2" role="status" style={{ fontSize: 11, color: '#B45309' }}>{message}</div>
            )}
            {diagnostics.length > 0 && (
                <div className="px-3 pb-2" style={{ fontSize: 11, color: '#B91C1C' }}>
                    {diagnostics.map((diagnostic: any, index: number) => (
                        <div key={index}>[{diagnostic.code}] {diagnostic.message}</div>
                    ))}
                </div>
            )}
        </section>
    );
}
