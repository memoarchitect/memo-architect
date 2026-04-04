---
id: fmea
title: Failure Mode and Effects Analysis
standard: IEC 60812:2018
clauses: ["5", "6", "7"]
required_for: ["CE", "FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose and Scope

This FMEA documents failure modes for **{{project.product}}** components, their effects, severity, and mitigations. Combines hardware, software, and system-level failure analysis.

---

## 2. Component Inventory

```memo-query
kind: [Component, Subsystem, SoftwareItem]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No components defined. Add Component, Subsystem, or SoftwareItem elements."
```

---

## 3. FMEA Worksheet

### 3.1 Hardware Failures

```memo-query
kind: Component
display: table
columns: name, layer, doc
sort: name
empty: "No hardware components defined."
```

### 3.2 Software Failures

```memo-query
kind: [SoftwareItem, SoftwareUnit]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software items defined."
```

### 3.3 Interface Failures

```memo-query
kind: Interface
display: table
columns: name, layer, doc
sort: name
empty: "No interfaces defined."
```

---

## 4. Risk Controls for FMEA Items

```memo-query
kind: RiskControl
display: table
columns: name, layer, doc
sort: name
empty: "No risk controls defined."
```

---

## 5. Unmitigated Failures

_[TODO: List any failure modes without risk controls and justify residual risk]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
