---
id: user-needs
title: User Needs Document
standard: 21 CFR Part 820
clauses: ["820.30(c)"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This document captures user needs for **{{project.product}}** per 21 CFR 820.30(c) Design Input requirements. User needs represent the intended purpose of the device as stated by customers and intended users.

---

## 2. Intended Users

_[TODO: Describe all intended user groups with their roles, training levels, and environments]_

---

## 3. User Needs

```memo-query
kind: [StakeholderNeed, UserNeed]
display: table
columns: name, layer, doc
sort: name
empty: "No user need elements defined. Add StakeholderNeed or UserNeed elements."
```

---

## 4. Use Cases

```memo-query
kind: UseCase
display: table
columns: name, layer, doc
sort: name
empty: "No use cases defined."
```

---

## 5. Customer Requirements

_[TODO: List customer-stated requirements as input to the design process]_

---

## 6. Regulatory Requirements

| Standard | Applicability | Notes |
| --- | --- | --- |
| 21 CFR Part 820 | Quality System Regulation | |
| IEC 62304 | Software lifecycle | If Class B/C SW |
| ISO 14971 | Risk management | |

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
