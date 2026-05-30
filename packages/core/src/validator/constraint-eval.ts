// ─── Native Constraint Evaluator (SPIKE — Epic EE ⊕-0) ─────────────────────────
//
// Proves the keystone thesis: MEMO can evaluate SysML v2 / KerML-style constraint
// EXPRESSIONS directly against the built MemoModel, instead of interpreting the
// proprietary ClosureRule enum (validator/rule-engine.ts) or the predicate-attribute
// pseudo-rules produced by RuleRegistry (validator/rule-registry.ts).
//
// SCOPE OF THIS SPIKE
//   - A tiny hand-written recursive-descent parser + evaluator for a KerML EXPRESSION
//     SUBSET: relationship navigation, collection ops (size/notEmpty/isEmpty),
//     comparison, boolean and/or/not, integer + boolean literals.
//   - Quantification ("for every element of kind K, expr holds") is the outer loop
//     in evaluateNativeConstraint — the SysML requirement/constraint `subject`.
//
// WHAT THIS SPIKE DELIBERATELY DEFERS (sized as Epic EE stories — see issue):
//   - EE-1 GRAMMAR: this parser is a stand-in. Production parses native
//     `constraint def` / `requirement def { ... }` bodies in the Langium grammar
//     (packages/core/src/grammar/memo-sysml.langium currently has NO expression rule).
//     The `relType` bare-identifier surface here is a placeholder for KerML feature
//     chains (`allocations->notEmpty()`), NOT a new DSL to keep.
//   - EE-2: attribute predicates, ->forAll/->exists with sub-expressions, arithmetic.
//   - EE-3: migrate ClosureRule + RuleRegistry rules to native constraint bodies.
//
// Navigation semantics (matches ClosureRule direction default 'any'):
//   a bare identifier `r` resolves to the set of elements related to the subject by
//   a relationship whose type === r (lowercased), in EITHER direction — i.e. outgoing
//   targets ∪ incoming sources. This mirrors getRelevantRelationships() in rule-engine.ts.
// ──────────────────────────────────────────────────────────────────────────────

import type { MemoModel, MemoElement } from '../model/semantic.js';
import type { Violation } from './types.js';
import type { ConstraintExpr } from '../language/generated/ast.js';

/** A constraint authored as a KerML-subset boolean expression over a subject element. */
export interface NativeConstraint {
    /** Stable rule id, e.g. "EE-ALLOC-001". */
    id: string;
    /** Human-readable description (surfaced in the violation). */
    description: string;
    /** The element kind this constraint quantifies over (the SysML `subject`). */
    appliesToKind: string;
    /** KerML-subset boolean expression; the subject element is implicit. */
    expression: string;
    /** Severity when the expression is false for a subject. */
    severity: 'error' | 'warning' | 'info';
}

/** Evaluate one native constraint against every element of its subject kind. */
export function evaluateNativeConstraint(constraint: NativeConstraint, model: MemoModel): Violation[] {
    const ast = parseExpression(constraint.expression);
    const subjects = model.elementsByKind.get(constraint.appliesToKind) ?? [];
    const violations: Violation[] = [];

    for (const element of subjects) {
        const ok = toBool(evalNode(ast, element, model));
        if (!ok) {
            violations.push({
                ruleId: constraint.id,
                description: constraint.description,
                severity: constraint.severity,
                elementId: element.id,
                elementKind: element.kind,
                elementName: element.name,
                layer: element.layer,
            });
        }
    }
    return violations;
}

// ─── AST ────────────────────────────────────────────────────────────────────

type Node =
    | { kind: 'bool'; value: boolean }
    | { kind: 'int'; value: number }
    | { kind: 'nav'; relType: string }
    | { kind: 'method'; target: Node; name: 'size' | 'notEmpty' | 'isEmpty' }
    | { kind: 'cmp'; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; left: Node; right: Node }
    | { kind: 'and'; left: Node; right: Node }
    | { kind: 'or'; left: Node; right: Node }
    | { kind: 'not'; operand: Node };

type Value = boolean | number | MemoElement[];

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token = { t: string; v?: string };

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    const re = /\s*(->|==|!=|>=|<=|[<>()]|[A-Za-z_][A-Za-z0-9_]*|\d+)/y;
    let m: RegExpExecArray | null;
    let pos = 0;
    while (pos < src.length) {
        re.lastIndex = pos;
        m = re.exec(src);
        if (!m) throw new Error(`Constraint parse error near: "${src.slice(pos)}"`);
        pos = re.lastIndex;
        const raw = m[1];
        if (/^\d+$/.test(raw)) tokens.push({ t: 'int', v: raw });
        else if (/^[A-Za-z_]/.test(raw)) tokens.push({ t: 'ident', v: raw });
        else tokens.push({ t: raw });
    }
    tokens.push({ t: 'eof' });
    return tokens;
}

// ─── Parser (precedence: or < and < not < cmp < method < primary) ─────────────

function parseExpression(src: string): Node {
    const tokens = tokenize(src);
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];
    const expect = (t: string) => {
        if (peek().t !== t) throw new Error(`Expected '${t}', got '${peek().t}'`);
        return next();
    };

    const KEYWORDS = new Set(['and', 'or', 'not', 'true', 'false']);

    function parseOr(): Node {
        let left = parseAnd();
        while (peek().t === 'ident' && peek().v === 'or') { next(); left = { kind: 'or', left, right: parseAnd() }; }
        return left;
    }
    function parseAnd(): Node {
        let left = parseNot();
        while (peek().t === 'ident' && peek().v === 'and') { next(); left = { kind: 'and', left, right: parseNot() }; }
        return left;
    }
    function parseNot(): Node {
        if (peek().t === 'ident' && peek().v === 'not') { next(); return { kind: 'not', operand: parseNot() }; }
        return parseCmp();
    }
    function parseCmp(): Node {
        const left = parseMethod();
        const op = peek().t;
        if (op === '==' || op === '!=' || op === '>=' || op === '<=' || op === '>' || op === '<') {
            next();
            return { kind: 'cmp', op, left, right: parseMethod() };
        }
        return left;
    }
    function parseMethod(): Node {
        let node = parsePrimary();
        while (peek().t === '->') {
            next();
            const name = expect('ident').v!;
            expect('(');
            expect(')');
            if (name !== 'size' && name !== 'notEmpty' && name !== 'isEmpty') {
                throw new Error(`Unsupported collection op '->${name}()' in spike subset`);
            }
            node = { kind: 'method', target: node, name };
        }
        return node;
    }
    function parsePrimary(): Node {
        const tok = peek();
        if (tok.t === '(') { next(); const e = parseOr(); expect(')'); return e; }
        if (tok.t === 'int') { next(); return { kind: 'int', value: parseInt(tok.v!, 10) }; }
        if (tok.t === 'ident') {
            if (tok.v === 'true' || tok.v === 'false') { next(); return { kind: 'bool', value: tok.v === 'true' }; }
            if (KEYWORDS.has(tok.v!)) throw new Error(`Unexpected keyword '${tok.v}'`);
            next();
            return { kind: 'nav', relType: tok.v!.toLowerCase() };
        }
        throw new Error(`Unexpected token '${tok.t}'`);
    }

    const ast = parseOr();
    if (peek().t !== 'eof') throw new Error(`Trailing tokens after expression: '${peek().t}'`);
    return ast;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

function evalNode(node: Node, subject: MemoElement, model: MemoModel): Value {
    switch (node.kind) {
        case 'bool': return node.value;
        case 'int': return node.value;
        case 'nav': return navigate(subject, node.relType, model);
        case 'method': {
            const target = evalNode(node.target, subject, model);
            const coll = asCollection(target);
            if (node.name === 'size') return coll.length;
            if (node.name === 'notEmpty') return coll.length > 0;
            return coll.length === 0; // isEmpty
        }
        case 'cmp': {
            const l = toNumber(evalNode(node.left, subject, model));
            const r = toNumber(evalNode(node.right, subject, model));
            switch (node.op) {
                case '==': return l === r;
                case '!=': return l !== r;
                case '>=': return l >= r;
                case '<=': return l <= r;
                case '>': return l > r;
                case '<': return l < r;
            }
        }
        // eslint-disable-next-line no-fallthrough
        case 'and': return toBool(evalNode(node.left, subject, model)) && toBool(evalNode(node.right, subject, model));
        case 'or': return toBool(evalNode(node.left, subject, model)) || toBool(evalNode(node.right, subject, model));
        case 'not': return !toBool(evalNode(node.operand, subject, model));
    }
}

/** Elements related to `subject` by a relationship of `relType`, in either direction. */
function navigate(subject: MemoElement, relType: string, model: MemoModel): MemoElement[] {
    const out: MemoElement[] = [];
    for (const rel of model.outgoing.get(subject.id) ?? []) {
        if (rel.type === relType) {
            const e = model.elements.get(rel.targetId);
            if (e) out.push(e);
        }
    }
    for (const rel of model.incoming.get(subject.id) ?? []) {
        if (rel.type === relType) {
            const e = model.elements.get(rel.sourceId);
            if (e) out.push(e);
        }
    }
    return out;
}

function asCollection(v: Value): MemoElement[] {
    if (Array.isArray(v)) return v;
    throw new Error('Collection operation applied to non-collection value');
}
function toBool(v: Value): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return v.length > 0; // a bare collection is truthy iff non-empty
}
function toNumber(v: Value): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v.length; // a bare collection compares by size
}

// ─── Langium AST → evaluator AST (EE-1) ───────────────────────────────────────
//
// EE-1 moved expression PARSING into the Langium grammar (memo-sysml.langium,
// ConstraintExpr rule family). The grammar accepts the full ADR-1-18 subset; the
// evaluator below realizes the EE-0 evaluable core. Grammar-legal forms whose
// evaluation is deferred to EE-2 (forAll/exists/select, arithmetic, string
// comparison, multi-segment feature chains) are rejected here with a clear
// diagnostic rather than silently mis-evaluated. See ADR-1-18.

const COMPARISON_OPS = new Set(['==', '!=', '>=', '<=', '>', '<']);
const COLLECTION_OPS_EVALUABLE = new Set(['size', 'notEmpty', 'isEmpty']);
const COLLECTION_OPS_DEFERRED = new Set(['forAll', 'exists', 'select']);

/** Map a Langium-parsed constraint expression to the evaluator AST. */
export function langiumExprToNode(expr: ConstraintExpr): Node {
    switch (expr.$type) {
        case 'LiteralExpr': {
            if (expr.intValue !== undefined) return { kind: 'int', value: parseInt(expr.intValue, 10) };
            if (expr.boolValue !== undefined) return { kind: 'bool', value: expr.boolValue === 'true' };
            // strValue is grammar-legal but the evaluator has no string semantics yet.
            throw new Error('String literals in constraints are deferred to EE-2');
        }
        case 'FeatureChain': {
            if (expr.segments.length === 1) return { kind: 'nav', relType: expr.segments[0].toLowerCase() };
            throw new Error(
                `Multi-segment feature chain '${expr.segments.join('.')}' is deferred to EE-2`
            );
        }
        case 'CollectionOp': {
            if (COLLECTION_OPS_EVALUABLE.has(expr.op)) {
                if (expr.argument) throw new Error(`'->${expr.op}()' takes no argument`);
                return {
                    kind: 'method',
                    target: langiumExprToNode(expr.target),
                    name: expr.op as 'size' | 'notEmpty' | 'isEmpty',
                };
            }
            if (COLLECTION_OPS_DEFERRED.has(expr.op)) {
                throw new Error(`Collection op '->${expr.op}()' is deferred to EE-2`);
            }
            throw new Error(`Unsupported collection op '->${expr.op}()' (not in ADR-1-18 subset)`);
        }
        case 'UnaryExpr':
            return { kind: 'not', operand: langiumExprToNode(expr.operand) };
        case 'BinaryExpr': {
            if (expr.op === 'and') return { kind: 'and', left: langiumExprToNode(expr.left), right: langiumExprToNode(expr.right) };
            if (expr.op === 'or') return { kind: 'or', left: langiumExprToNode(expr.left), right: langiumExprToNode(expr.right) };
            if (COMPARISON_OPS.has(expr.op)) {
                return {
                    kind: 'cmp',
                    op: expr.op as '==' | '!=' | '>=' | '<=' | '>' | '<',
                    left: langiumExprToNode(expr.left),
                    right: langiumExprToNode(expr.right),
                };
            }
            // arithmetic + - * /
            throw new Error(`Arithmetic operator '${expr.op}' is deferred to EE-2`);
        }
    }
}
