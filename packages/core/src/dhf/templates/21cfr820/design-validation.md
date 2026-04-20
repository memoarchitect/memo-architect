---
id: design-validation
title: Design Validation Records
standard: 21 CFR Part 820
clauses: ["820.30(g)"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

---

## 1. Purpose

Documents design validation confirming the device meets user needs and intended use for **{{project.product}}** per 21 CFR 820.30(g).

---

## 2. Validation Plan Reference

_[TODO: Reference V&V Plan]_

---

## 3. Clinical/Bench Validation

```memo-query
kind: ValidationActivity
display: table
columns: name, layer, doc
sort: name
empty: "No validation activities defined."
```

---

## 4. User Need Coverage

```memo-query
kind: [StakeholderNeed, Requirement]
display: table
columns: name, layer, doc
empty: "No user needs defined."
```

---

## 5. Conclusion

_[TODO: State validation conclusion — device meets intended use for intended users]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
