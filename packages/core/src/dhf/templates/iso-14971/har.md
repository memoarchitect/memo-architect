---
id: har
title: Hazard Analysis Report
standard: ISO 14971:2019
clauses: ["5", "6", "7"]
required_for: ["CE", "FDA_510k", "FDA_PMA", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Hazard Analysis Report documents the systematic identification of hazards, hazardous situations, and harms associated with **{{project.product}}**, along with the associated risk estimation and risk control measures.

---

## 2. Hazard Summary

```memo-query
kind: Hazard
display: count
label: Total hazards identified
```

```memo-query
kind: HazardousSituation
display: count
label: Hazardous situations
```

```memo-query
kind: RiskControl
display: count
label: Risk control measures
```

---

## 3. Hazard Identification

All foreseeable hazards arising from the device, its intended use, and reasonably foreseeable misuse are listed below.

### 3.1 Energy Hazards

```memo-query
kind: Hazard
where: doc contains "energy"
display: table
columns: name, doc, layer
sort: name
empty: "No energy hazards identified."
```

### 3.2 Biological and Chemical Hazards

```memo-query
kind: Hazard
where: doc contains "biolog"
display: table
columns: name, doc, layer
empty: "No biological/chemical hazards identified."
```

### 3.3 Operational Hazards

```memo-query
kind: Hazard
display: grouped
group_by: layer
columns: name, doc
sort: name
empty: "No hazards defined. Add Hazard elements to model/risk/*.sysml."
```

---

## 4. Hazardous Situations

```memo-query
kind: HazardousSituation
display: table
columns: name, doc, layer
sort: name
empty: "No hazardous situations defined. Add HazardousSituation elements."
```

---

## 5. Risk Estimation

<!-- [GUIDANCE] For each hazardous situation, estimate probability of occurrence and severity of harm per ISO 14971:2019 §5. -->

```memo-query
kind: Harm
display: table
columns: name, doc, layer
sort: name
empty: "No harm elements defined. Add Harm elements linked to HazardousSituation."
```

---

## 6. Risk Control Measures

### 6.1 Inherent Safety by Design

```memo-query
kind: RiskControl
where: doc contains "design"
display: table
columns: name, doc, layer
empty: "No inherent safety controls."
```

### 6.2 Protective Measures

```memo-query
kind: RiskControl
display: table
columns: name, doc, layer
sort: name
empty: "No risk controls defined. Add RiskControl elements."
```

### 6.3 Information for Safety

_[TODO: List all warnings, cautions, and contraindications in labeling]_

---

## 7. Residual Risk Evaluation

```memo-query
kind: Hazard
display: table
columns: name, layer, doc
sort: name
empty: "All hazards have been evaluated."
```

---

## 8. Benefit-Risk Analysis

<!-- [GUIDANCE] Per ISO 14971:2019 §8, if residual risks remain after all control measures, the overall residual risk must be judged acceptable relative to medical benefits. -->

_[TODO: Document benefit-risk justification if any residual risks remain]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
