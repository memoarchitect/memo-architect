---
id: vv-report
title: Verification and Validation Report
standard: 21 CFR Part 820
clauses: ["820.30(f)", "820.30(g)"]
required_for: ["FDA_510k", "FDA_PMA", "CE"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This V&V Report documents the results of all verification and validation activities for **{{project.product}}**.

---

## 2. Summary

```memo-query
kind: TestCase
display: count
label: Total test cases
```

```memo-query
kind: [VerificationActivity, ValidationActivity]
display: count
label: V&V activities
```

---

## 3. Verification Results

### 3.1 Test Results by Requirement

```memo-query
kind: [TestCase, VerificationActivity]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No verification activities defined."
```

---

## 4. Validation Results

```memo-query
kind: ValidationActivity
display: table
columns: name, layer, doc
sort: name
empty: "No validation activities defined."
```

---

## 5. Known Anomalies and Deviations

_[TODO: List any unresolved anomalies and provide justification for acceptance]_

---

## 6. V&V Conclusion

_[TODO: State whether the device meets all design inputs and is fit for intended use]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
