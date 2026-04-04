---
id: detailed-design
title: Software Detailed Design
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.4"]
required_for: ["CE", "FDA_510k"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This document provides detailed design specifications for **{{project.product}}** software per IEC 62304:2006 §5.4, sufficient to implement and test each software unit.

---

## 2. Software Units

```memo-query
kind: SoftwareUnit
display: table
columns: name, layer, doc
sort: name
empty: "No SoftwareUnit elements defined."
```

---

## 3. Unit Specifications

### 3.1 Algorithms and Data Structures

_[TODO: Describe key algorithms, data structures, and design patterns]_

### 3.2 State Machines

{{diagram:state-machine}}

_[TODO: Document state machine diagrams for stateful components]_

### 3.3 Interface Specifications

```memo-query
kind: Interface
display: table
columns: name, layer, doc
sort: name
empty: "No Interface elements defined."
```

---

## 4. Design Verification Criteria

_[TODO: List criteria that verify this design meets software requirements]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
