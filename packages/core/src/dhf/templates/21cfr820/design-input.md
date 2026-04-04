---
id: design-input
title: Design Input Plan
standard: 21 CFR Part 820
clauses: ["820.30(c)"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

Defines design inputs for **{{project.product}}** per 21 CFR 820.30(c). Design inputs are the physical and performance requirements to which the device design must conform.

---

## 2. Design Input Requirements

### 2.1 Performance Requirements

```memo-query
kind: SystemRequirement
display: table
columns: name, layer, doc
sort: name
empty: "No system requirements defined."
```

### 2.2 Design Inputs from User Needs

```memo-query
kind: [DesignInput, StakeholderNeed]
display: table
columns: name, layer, doc
sort: name
empty: "No design inputs defined. Add DesignInput elements."
```

---

## 3. Regulatory and Standards Requirements

| Standard | Requirement | Input Reference |
| --- | --- | --- |
| 21 CFR 820.30 | Design controls | |
| ISO 14971 | Risk management requirements | |
| IEC 62304 | Software development | |

---

## 4. Design Input Review

_[TODO: Document the design input review process and sign-off]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
