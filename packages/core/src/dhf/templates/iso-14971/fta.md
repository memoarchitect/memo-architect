---
id: fta
title: Fault Tree Analysis
standard: ISO 14971:2019
clauses: ["5", "6"]
required_for: ["CE"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Fault Tree Analysis (FTA) complements the FMEA by providing a top-down analysis of failure modes that could lead to identified harms for **{{project.product}}**.

---

## 2. Top Events (Harms)

```memo-query
kind: Harm
display: table
columns: name, doc, layer
sort: name
empty: "No harm elements defined. Add Harm elements to the model."
```

---

## 3. Contributing Failure Modes

```memo-query
kind: [Hazard, HazardousSituation]
display: grouped
group_by: layer
columns: name, kind, doc
sort: name
empty: "No hazards or hazardous situations defined."
```

---

## 4. Fault Tree Diagrams

{{diagram:fta-diagram}}

_[TODO: Attach or reference FTA diagram files]_

---

## 5. Cut Sets and Recommendations

_[TODO: List minimal cut sets and associated risk reduction recommendations]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
