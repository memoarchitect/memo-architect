---
id: transfer-plan
title: Design Transfer Plan
standard: 21 CFR Part 820
clauses: ["820.30(h)"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

---

## 1. Purpose

Defines design transfer activities for **{{project.product}}** per 21 CFR 820.30(h), ensuring device design is correctly translated to production specifications.

---

## 2. Transfer Checklist

| Activity | Responsible | Completion Date | Status |
| --- | --- | --- | --- |
| Engineering drawings released to production | | | |
| Software build process documented | | | |
| Production procedures validated | | | |
| Test equipment calibrated | | | |
| Production personnel trained | | | |
| First article inspection completed | | | |

---

## 3. Production Specifications

```memo-query
kind: DesignOutput
display: table
columns: name, layer, doc
sort: name
empty: "No design outputs defined."
```

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
