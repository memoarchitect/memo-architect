---
id: sw-traceability
title: Software Traceability Matrix
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.1.1", "5.7.5"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Software Traceability Matrix demonstrates bidirectional traceability from system requirements through software requirements, design, implementation, and test for **{{project.product}}**.

---

## 2. Traceability Summary

```memo-query
kind: Requirement
display: count
label: System requirements
```

```memo-query
kind: Requirement
display: count
label: Software requirements
```

```memo-query
kind: TestCase
display: count
label: Test cases
```

---

## 3. System → Software Requirements

```memo-query
kind: Requirement
display: table
columns: name, layer, doc
sort: name
empty: "No system requirements defined."
```

---

## 4. Software Requirements

```memo-query
kind: Requirement
display: table
columns: name, layer, doc
sort: name
empty: "No software requirements defined."
```

---

## 5. Software Requirements → Design Elements

```memo-query
kind: [SoftwareItem, SoftwareUnit]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software design elements defined."
```

---

## 6. Test Cases

```memo-query
kind: TestCase
display: table
columns: name, layer, doc
sort: name
empty: "No test cases defined. Add TestCase elements."
```

---

## 7. Untraced Requirements

_[TODO: List any software requirements without corresponding test cases]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
