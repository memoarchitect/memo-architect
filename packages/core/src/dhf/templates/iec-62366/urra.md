---
id: urra
title: Use-Related Risk Analysis
standard: IEC 62366-1:2015+AMD1:2020
clauses: ["5"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Use-Related Risk Analysis (URRA) identifies use errors and use-related hazardous situations for **{{project.product}}** per IEC 62366-1:2015 §5.

---

## 2. Use Scenarios

```memo-query
kind: [UseCase, UserActivity]
display: table
columns: name, layer, doc
sort: name
empty: "No use scenarios defined. Add UseCase or UserActivity elements."
```

---

## 3. Use Errors and Abnormal Use

```memo-query
kind: [Hazard, HazardousSituation]
where: layer == "ui"
display: table
columns: name, doc, layer
sort: name
empty: "No use-related hazards defined."
```

---

## 4. Critical Tasks

_[TODO: Identify the critical tasks whose failure could cause a hazardous situation]_

---

## 5. Mitigation Measures

```memo-query
kind: [RiskControl, UsabilityRequirement]
display: table
columns: name, layer, doc
sort: name
empty: "No usability-related risk controls defined."
```

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
