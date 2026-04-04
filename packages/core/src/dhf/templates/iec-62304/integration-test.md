---
id: integration-test
title: Software Integration Test Plan
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.6"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Integration Test Plan defines the approach for integration testing of **{{project.product}}** software per IEC 62304:2006 §5.6.

---

## 2. Software Items Under Test

```memo-query
kind: [SoftwareItem, SoftwareUnit]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software items defined."
```

---

## 3. Integration Test Cases

```memo-query
kind: TestCase
where: layer == "verification"
display: table
columns: name, layer, doc
sort: name
empty: "No integration test cases defined. Add TestCase elements."
```

---

## 4. Integration Sequence

_[TODO: Define the order in which software items are integrated and tested]_

---

## 5. Pass/Fail Criteria

_[TODO: Define objective pass/fail criteria for integration tests]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
