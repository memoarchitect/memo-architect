import { useMemo, useState } from 'react';
import { getRegistries, useModelStore } from '../store/model-store';
import { createRule, previewRule } from '../store/ws-client';
import { COLOR, FONT } from '../styles/tokens';
import { RulePolicyEditor } from './RulePolicyEditor';
import {
    CONDITION_LABEL, DOMAIN_LABEL, EMPTY_FORM, OBLIGATIONS, OBLIGATION_LABEL, domainCounts, formGaps, ruleRows, searchClauses,
    severityForObligation, suggestTypeName, toPayload, traceStatement,
    type ConditionKind, type DomainFilter, type EditorRule, type ObligationFilter, type RuleFormState, type RuleObligation,
} from './rules-editor-model';

/**
 * The rules a project is checked against, what each enforces, and the means to
 * change them.
 *
 * Every rule says why it exists (its domain), how strongly it binds (its
 * obligation: required, recommended or best practice) and which clauses of a
 * standard or guidance it enforces, by a typed `EnforcesClause` trace. A rule
 * may trace to several clauses or to none; none is not a gap. Any rule may be tailored — switched off, downgraded or
 * replaced — on the record. A rule of the user's own is written here too.
 *
 * It composes no SysML. The form names the rule and a condition; Tools builds
 * the expression, checks the rule, shows what it would flag in the model as it
 * stands, and writes it through the same compile-before-commit path as every
 * other authoring write. The write is offered only for the rule that was just
 * previewed, so what is saved is what was seen.
 */
export function RulesEditor() {
    const rules = useModelStore(state => state.effectiveRules) as EditorRule[];
    const clauses = useModelStore(state => state.ruleClauses);
    const projectFiles = useModelStore(state => state.ruleProjectFiles);
    const model = useModelStore(state => state.model);

    const registries = useMemo(() => getRegistries(model), [model]);
    const kindNames = useMemo(() => registries.kinds.map(kind => kind.name).sort(), [registries]);
    const relationNames = useMemo(() => registries.relationships.map(rel => rel.name).sort(), [registries]);

    const [filter, setFilter] = useState<DomainFilter>('all');
    const [search, setSearch] = useState('');
    const [obligation, setObligation] = useState<ObligationFilter>('any');
    const [tailoring, setTailoring] = useState('');
    const [creating, setCreating] = useState(false);

    const counts = useMemo(() => domainCounts(rules), [rules]);
    const rows = useMemo(() => ruleRows(rules, clauses, filter, search, obligation), [rules, clauses, filter, search, obligation]);

    if (rules.length === 0) return null;

    return (
        <section aria-label="Rules" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            <div className="px-3 py-2 font-semibold" style={{ fontSize: FONT.xs, color: COLOR.primary }}>
                Rules
                <span style={{ fontWeight: 400, color: COLOR.muted }}> — what the model is checked against, and why</span>
            </div>

            <div className="flex flex-wrap gap-1 px-3 pb-2" role="group" aria-label="Filter by domain">
                {(['all', 'medicalDevice', 'modelling', 'organisation'] as DomainFilter[]).map(name => (
                    <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}
                        style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                            border: `1px solid ${filter === name ? COLOR.primary : COLOR.border}`,
                            background: filter === name ? COLOR.primary : COLOR.surface,
                            color: filter === name ? COLOR.surface : COLOR.secondary,
                        }}>
                        {name === 'all' ? 'All' : DOMAIN_LABEL[name]} {counts[name]}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-1 px-3 pb-2" role="group" aria-label="Filter by obligation">
                {(['any', ...OBLIGATIONS] as ObligationFilter[]).map(name => (
                    <button key={name} aria-pressed={obligation === name} onClick={() => setObligation(name)}
                        style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                            border: `1px solid ${obligation === name ? COLOR.primary : COLOR.border}`,
                            background: obligation === name ? COLOR.primary : COLOR.surface,
                            color: obligation === name ? COLOR.surface : COLOR.secondary,
                        }}>
                        {name === 'any' ? 'Any obligation' : OBLIGATION_LABEL[name]}
                    </button>
                ))}
            </div>

            <input aria-label="Search rules" value={search} placeholder="Search by id, name, obligation or clause"
                onChange={event => setSearch(event.target.value)}
                style={{ width: 'calc(100% - 24px)', margin: '0 12px 6px', fontSize: FONT.xs }} />

            <ul aria-label="Rule list" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflowY: 'auto' }}>
                {rows.map(row => (
                    <li key={row.type} style={{ padding: '4px 12px', borderTop: `1px solid ${COLOR.borderLight}`, fontSize: FONT.xs }}>
                        <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 600, color: COLOR.primary }}>{row.id}</span>
                            <span style={{ color: COLOR.secondary }}>{row.type}</span>
                            {row.domain !== 'unstated' && row.domain !== 'modelling' && (
                                <span data-testid="domain" style={{ color: row.domain === 'medicalDevice' ? '#7E22CE' : '#1D4ED8' }}>
                                    {DOMAIN_LABEL[row.domain]}
                                </span>
                            )}
                            {row.obligation !== 'unstated' && (
                                <span data-testid="obligation" style={{ color: COLOR.secondary }}>{OBLIGATION_LABEL[row.obligation]}</span>
                            )}
                            <span style={{ color: COLOR.muted }}>{row.severity}</span>
                            {row.state !== 'on' && <span style={{ color: '#B45309' }}>{row.state}</span>}
                            <button style={{ marginLeft: 'auto', fontSize: 11 }} aria-label={`Tailor ${row.id}`}
                                onClick={() => setTailoring(row.type)}>
                                Tailor
                            </button>
                        </div>
                        {row.clauses.map(clause => (
                            <div key={clause.qualifiedName} data-testid="trace" style={{ color: COLOR.muted, paddingLeft: 8 }}>
                                EnforcesClause → {clause.label}
                            </div>
                        ))}
                    </li>
                ))}
                {rows.length === 0 && <li style={{ padding: '4px 12px', color: COLOR.muted, fontSize: FONT.xs }}>No rule matches.</li>}
            </ul>

            <div className="px-3 py-2">
                <button aria-expanded={creating} onClick={() => setCreating(open => !open)}>
                    {creating ? 'Close' : 'New rule'}
                </button>
            </div>

            {creating && (
                <NewRuleForm kindNames={kindNames} relationNames={relationNames} projectFiles={projectFiles} clauses={clauses} />
            )}

            <RulePolicyEditor ruleType={tailoring} />
        </section>
    );
}

// ─── The new-rule form ───────────────────────────────────────────────────────

function NewRuleForm(props: {
    kindNames: string[]; relationNames: string[]; projectFiles: string[];
    clauses: ReturnType<typeof useModelStore.getState>['ruleClauses'];
}) {
    const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
    const [clauseSearch, setClauseSearch] = useState('');
    const [previewed, setPreviewed] = useState<{ key: string; baseRevision: string } | undefined>();
    const [result, setResult] = useState<{ subjects: number; flagged: { elementKind: string; elementName: string; elementId: string }[] } | undefined>();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const update = (patch: Partial<RuleFormState>) => { setForm(current => ({ ...current, ...patch })); setPreviewed(undefined); };
    const payload = toPayload(form);
    const key = JSON.stringify(payload);
    const gaps = formGaps(form);
    const matches = searchClauses(props.clauses, clauseSearch).filter(c => !form.enforces.includes(c.qualifiedName));
    const labelOf = (qualifiedName: string) => {
        const fact = props.clauses.find(c => c.qualifiedName === qualifiedName);
        return fact ? `${fact.standard} §${fact.clauseNumber}` : qualifiedName;
    };

    const preview = async () => {
        if (!payload) return;
        setBusy(true);
        setMessage('');
        try {
            const answer = await previewRule(payload);
            if (!answer.success) {
                setResult(undefined);
                setPreviewed(undefined);
                setMessage(answer.error ?? 'The rule was refused.');
                return;
            }
            setResult({ subjects: answer.subjects ?? 0, flagged: answer.flagged ?? [] });
            setPreviewed(answer.baseRevision ? { key, baseRevision: answer.baseRevision } : undefined);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    const write = async () => {
        if (!payload || !previewed || previewed.key !== key) return;
        setBusy(true);
        setMessage('');
        try {
            const answer = await createRule({ ...payload, baseRevision: previewed.baseRevision });
            if (answer.success) {
                setMessage(`Wrote ${payload.id}. The project is rebuilding.`);
                setForm(EMPTY_FORM);
                setResult(undefined);
                setPreviewed(undefined);
            } else {
                setMessage(answer.conflict
                    ? 'The file changed since the preview; preview again.'
                    : (answer.error ?? 'The rule was refused; nothing was written.'));
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    const field: React.CSSProperties = { width: 'calc(100% - 24px)', margin: '0 12px 6px', fontSize: FONT.xs };

    return (
        <div aria-label="New rule" style={{ borderTop: `1px solid ${COLOR.borderLight}`, paddingTop: 6 }}>
            <input aria-label="Rule id" value={form.id} style={field} placeholder="Id, e.g. ORG-001"
                onChange={event => update({ id: event.target.value })} />
            <input aria-label="Rule name" value={form.typeName} style={field} placeholder="Name, e.g. TwoIndependentControls"
                onChange={event => update({ typeName: event.target.value.replace(/\s+/g, '') })}
                onBlur={() => { if (!form.typeName) update({ typeName: suggestTypeName(form.id.replace(/[-_]/g, ' ')) }); }} />

            <input aria-label="Applies to" list="rule-kinds" value={form.appliesTo} style={field}
                placeholder="Applies to (a kind, or Model)" onChange={event => update({ appliesTo: event.target.value })} />
            <datalist id="rule-kinds">{props.kindNames.map(name => <option key={name} value={name} />)}</datalist>

            <select aria-label="Condition" value={form.conditionKind} style={field}
                onChange={event => update({ conditionKind: event.target.value as ConditionKind })}>
                {(Object.keys(CONDITION_LABEL) as ConditionKind[]).map(kind => (
                    <option key={kind} value={kind}>{CONDITION_LABEL[kind]}</option>
                ))}
            </select>

            {(form.conditionKind === 'atLeast' || form.conditionKind === 'atMost') && (
                <>
                    <input aria-label="Relation" list="rule-relations" value={form.relation} style={field}
                        placeholder="Relation, e.g. mitigates" onChange={event => update({ relation: event.target.value })} />
                    <datalist id="rule-relations">{props.relationNames.map(name => <option key={name} value={name} />)}</datalist>
                    <input aria-label="Count" type="number" min={0} value={form.count} style={field}
                        onChange={event => update({ count: event.target.value })} />
                </>
            )}
            {form.conditionKind === 'attributeSet' && (
                <input aria-label="Attribute" value={form.attribute} style={field} placeholder="Attribute name, e.g. safetyClass"
                    onChange={event => update({ attribute: event.target.value })} />
            )}
            {form.conditionKind === 'expression' && (
                <textarea aria-label="Condition expression" value={form.expression}
                    placeholder="True means the element is fine, e.g. verifiedBy->size() >= 1"
                    style={{ ...field, height: 48, fontFamily: 'monospace' }}
                    onChange={event => update({ expression: event.target.value })} />
            )}

            <select aria-label="Obligation" value={form.obligation} style={field}
                onChange={event => update({ obligation: event.target.value as RuleObligation | '' })}>
                <option value="">Obligation (optional)…</option>
                {OBLIGATIONS.map(name => <option key={name} value={name}>{OBLIGATION_LABEL[name]}</option>)}
            </select>

            <select aria-label="Severity" value={form.severity} style={field}
                onChange={event => update({ severity: event.target.value as RuleFormState['severity'] })}>
                <option value="">Severity: {severityForObligation(form.obligation)} ({form.obligation ? 'from the obligation' : 'default'})</option>
                <option value="error">error</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
            </select>

            <textarea aria-label="Rule rationale" value={form.rationale} placeholder="Why the rule exists"
                style={{ ...field, height: 54, fontFamily: 'inherit' }}
                onChange={event => update({ rationale: event.target.value })} />

            <input aria-label="Find a clause" value={clauseSearch} style={field}
                placeholder="Clause it enforces (optional): search a standard, number or topic"
                onChange={event => setClauseSearch(event.target.value)} />
            {matches.length > 0 && (
                <ul aria-label="Clause matches" style={{ listStyle: 'none', margin: '0 12px 6px', padding: 0, fontSize: 11 }}>
                    {matches.map(clause => (
                        <li key={clause.qualifiedName}>
                            <button onClick={() => { update({ enforces: [...form.enforces, clause.qualifiedName] }); setClauseSearch(''); }}>
                                {clause.standard} §{clause.clauseNumber}{clause.title ? ` — ${clause.title}` : ''}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {form.enforces.length === 0 && (
                <div className="px-3 pb-1" style={{ fontSize: 11, color: COLOR.muted }}>
                    A rule need not trace to a clause. Each clause chosen is written as a typed trace beside the rule.
                </div>
            )}
            {form.enforces.length > 0 && (
                <ul aria-label="Chosen clauses" style={{ listStyle: 'none', margin: '0 12px 6px', padding: 0, fontSize: 11 }}>
                    {form.enforces.map(name => (
                        <li key={name}>
                            <span title={traceStatement(form.typeName, name)}>EnforcesClause → {labelOf(name)}</span>{' '}
                            <button aria-label={`Remove ${labelOf(name)}`}
                                onClick={() => update({ enforces: form.enforces.filter(other => other !== name) })}>×</button>
                        </li>
                    ))}
                </ul>
            )}

            <select aria-label="Write the rule into" value={form.file} style={field}
                onChange={event => update({ file: event.target.value })}>
                <option value="">Write the rule into…</option>
                {props.projectFiles.map(file => <option key={file} value={file}>{file}</option>)}
            </select>
            <div className="px-3 pb-1" style={{ fontSize: 11, color: COLOR.muted }}>
                Choose a file of a package the project already includes: a methodology runs only the rules of the packages it includes.
            </div>

            <div className="flex gap-2 px-3 py-2">
                <button disabled={gaps.length > 0 || busy} onClick={() => void preview()}>
                    {busy ? 'Working…' : 'Preview'}
                </button>
                <button disabled={!previewed || previewed.key !== key || busy} onClick={() => void write()}>
                    Write rule
                </button>
            </div>
            {gaps.length > 0 && (
                <div className="px-3 pb-1" style={{ fontSize: 11, color: COLOR.muted }}>Still needed: {gaps.join(', ')}.</div>
            )}

            {result && (
                <div className="px-3 pb-2" role="status" style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 600 }}>
                        Would flag {result.flagged.length} of {result.subjects} {form.appliesTo || 'elements'}
                    </div>
                    {result.flagged.slice(0, 12).map(element => (
                        <div key={element.elementId} style={{ color: '#B45309' }}>
                            {element.elementKind} {element.elementName || element.elementId}
                        </div>
                    ))}
                    {result.flagged.length > 12 && <div style={{ color: COLOR.muted }}>… and {result.flagged.length - 12} more</div>}
                </div>
            )}
            {message && <div className="px-3 pb-2" role="status" style={{ fontSize: 11, color: '#B45309' }}>{message}</div>}
        </div>
    );
}
