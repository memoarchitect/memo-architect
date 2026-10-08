# Validation and Closure

Validation checks two different concerns:

- whether the source can be parsed and resolved; and
- whether the connected model meets semantic and closure expectations.

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

The problems or consistency area links findings to model elements. Combine it
with requirement, risk, and verification views to understand the gap in
context.

## Do not game completeness

A higher score is useful only when every new relationship is true. If a rule
does not apply, capture a governed scope decision or justified exception
according to your project process rather than creating a false trace.

## External portability checks

If the project selects SysIDE, `memo validate` can run strict external
diagnostics before semantic checks. `memo pack` can delegate packaging to
SysAnd. These checks complement MEMO closure validation; they do not replace it.
