# Validation and Closure

Validation runs in two stages:

1. **Compile (stage 1).** The project's compiler—OpenSysML or SysIDE—checks
   that the source is valid SysML v2 and that every name resolves. If it reports
   errors, stage 2 does not run.
2. **Rules (stage 2).** MEMO's closure, coverage, cross-layer, lifecycle and
   quantitative rules check that the connected model meets its methodology's
   expectations: every hazard controlled, every requirement verified, and so on.

## Run validation

```bash
memo validate .
```

For CI:

```bash
memo validate . --format junit --output validation.xml
```

## Interpret a finding

For each finding:

1. open the affected element;
2. read the rule's engineering intent;
3. inspect incoming and outgoing typed relationships;
4. decide whether information is missing, mistyped, misdirected, or outside
   scope;
5. correct the source and rerun validation.

Examples of useful questions:

- Does every safety-relevant requirement have a verification case?
- Does every modeled hazard have a justified control path?
- Does every function have an explicit responsible element?
- Does each verification case produce reviewable evidence?
- Are software items deployed and their SOUP dependencies identified?

## Use the workbench

The **Problems** bar at the bottom lists findings; select one to go to the
affected element. Combine it with requirement, risk and verification views, or
a [traceability matrix](../modeling/views/grid.md) filtered to missing links,
to understand the gap in context.

**☰ › Settings › Model › Rules** lists the rules by layer, each with its
obligation (required, recommended or best practice), and lets a methodology
owner switch groups or individual rules on and off. `memo-architect new rule`
writes a rule of the project's own, previewed against the model first.

## Do not game completeness

A higher score is useful only when every new relationship is true. If a rule
does not apply, capture a governed scope decision or justified exception
according to your project process rather than creating a false trace.

## External portability checks

The compiler's own diagnostics (stage 1) are the portability check: a model
that compiles under OpenSysML or SysIDE is standard SysML v2. `memo pack` can
delegate packaging to SysAnd and produce a KPAR archive. These checks complement
MEMO's rules; they do not replace them.
