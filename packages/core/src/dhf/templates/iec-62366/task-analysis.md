---
id: task-analysis
title: Task Analysis
standard: IEC 62366-1:2015+AMD1:2020
clauses: ["5.4"]
required_for: ["CE", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

Documents task analysis for **{{project.product}}** per IEC 62366-1:2015 §5.4, identifying tasks that could cause hazardous situations if performed incorrectly.

---

## 2. User Tasks

```memo-query
kind: UserActivity
display: table
columns: name, layer, doc
sort: name
empty: "No UserActivity elements defined."
```

---

## 3. Critical Tasks

_[TODO: Identify which tasks are critical (could lead to hazardous situation if performed incorrectly)]_

| Task | Critical | Hazardous Situation if Error | Mitigation |
| --- | --- | --- | --- |
| | | | |

---

## 4. Task Flow Analysis

{{diagram:task-flow}}

_[TODO: Document sequential and parallel task flows with decision points]_

---

{{include:shared/snippets/revision-history-table.md}}
