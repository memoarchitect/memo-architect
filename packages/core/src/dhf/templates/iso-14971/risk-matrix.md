---
id: risk-matrix
title: Risk Matrix
standard: ISO 14971:2019
clauses: ["5", "6"]
required_for: ["CE", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

---

## Risk Matrix

This matrix shows the distribution of identified hazards across severity and probability levels.

```memo-query
kind: Hazard
display: matrix
row_kind: kind
col_kind: layer
empty: "No hazards defined."
```

### Hazard Coverage by Layer

```memo-query
kind: [Hazard, HazardousSituation, Harm]
display: grouped
group_by: layer
columns: name, kind, doc
empty: "No risk elements defined."
```

---

## Risk Control Coverage

```memo-query
kind: RiskControl
display: table
columns: name, layer, doc
sort: name
empty: "No risk controls defined."
```

---

{{include:shared/snippets/revision-history-table.md}}
