---
id: vv-plan
title: Verification and Validation Plan
standard: 21 CFR Part 820
clauses: ["820.30(f)", "820.30(g)"]
required_for: ["FDA_510k", "FDA_PMA", "CE"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This V&V Plan defines verification and validation activities for **{{project.product}}** per 21 CFR 820.30(f)-(g) and ISO 13485:2016 §7.3.6-7.3.7.

---

## 2. Scope

This plan covers:
- Software verification (per IEC 62304 §5.6-5.7)
- Hardware verification
- System-level validation
- Usability validation (per IEC 62366-1)

---

## 3. Verification Activities

### 3.1 Requirements to Verify

```memo-query
kind: [Requirement, Requirement]
display: table
columns: name, layer, doc
sort: name
empty: "No requirements defined."
```

### 3.2 Verification Test Cases

```memo-query
kind: [TestCase, VerificationActivity]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No verification test cases defined."
```

---

## 4. Validation Activities

```memo-query
kind: ValidationActivity
display: table
columns: name, layer, doc
sort: name
empty: "No validation activities defined."
```

---

## 5. Acceptance Criteria

_[TODO: Define objective acceptance criteria for all V&V activities]_

---

## 6. Test Environment

_[TODO: Describe hardware, software, and clinical test environments]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
