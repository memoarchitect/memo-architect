---
id: design-output
title: Design Output Plan
standard: 21 CFR Part 820
clauses: ["820.30(d)"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

Defines design outputs for **{{project.product}}** per 21 CFR 820.30(d). Design outputs are the results of the design process, forming the basis for manufacturing.

---

## 2. Design Outputs

### 2.1 Hardware Design Outputs

```memo-query
kind: [Component, Subsystem, DesignOutput]
where: layer == "physical"
display: table
columns: name, kind, layer, doc
sort: name
empty: "No hardware design outputs defined."
```

### 2.2 Software Design Outputs

```memo-query
kind: [SoftwareItem, SoftwareUnit, DesignOutput]
where: layer == "software"
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software design outputs defined."
```

### 2.3 All Design Outputs

```memo-query
kind: DesignOutput
display: table
columns: name, layer, doc
sort: name
empty: "No DesignOutput elements defined. Add DesignOutput elements."
```

---

## 3. Design Output → Input Traceability

_[TODO: Demonstrate that each design output meets a design input requirement]_

---

## 4. Essential Design Output Documents

| Document | Description | Status |
| --- | --- | --- |
| Engineering drawings | Physical design specifications | |
| Software architecture | Software design specifications | |
| Manufacturing specs | Production procedures | |
| Labeling | Device labels and IFU | |

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
