---
id: rmr
title: Risk Management Report
standard: ISO 14971:2019
clauses: ["9"]
required_for: ["CE", "FDA_510k", "FDA_PMA", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Risk Management Report (RMR) summarizes the results of all risk management activities performed for **{{project.product}}** in accordance with ISO 14971:2019 §9.

---

## 2. Summary Statistics

```memo-query
kind: Hazard
display: count
label: Total hazards identified
```

```memo-query
kind: RiskControl
display: count
label: Risk controls implemented
```

```memo-query
kind: HazardousSituation
display: count
label: Hazardous situations analyzed
```

---

## 3. Risk Management Plan Compliance

<!-- [GUIDANCE] Confirm that the risk management plan was executed as documented. -->

_[TODO: Confirm that all activities in the Risk Management Plan were completed]_

| Activity | Status | Reference |
| --- | --- | --- |
| Hazard identification | | HAR |
| Risk estimation | | HAR |
| Risk evaluation | | HAR |
| Risk control implementation | | Design records |
| Residual risk evaluation | | HAR |
| Overall residual risk | | This document |
| Post-production monitoring | | Post-Market Surveillance Plan |

---

## 4. Overall Residual Risk Evaluation

### 4.1 Remaining Hazards

```memo-query
kind: Hazard
display: table
columns: name, layer, doc
sort: name
empty: "All identified hazards have been evaluated."
```

### 4.2 Overall Residual Risk Conclusion

<!-- [GUIDANCE] Conclude whether the overall residual risk is acceptable relative to the medical benefits of the device. -->

_[TODO: State the overall residual risk conclusion with justification]_

---

## 5. Benefit-Risk Statement

_[TODO: State clearly that the benefits of the device outweigh the residual risks for the intended use]_

---

## 6. Post-Production Information Collection

Post-production information collection activities are documented in the Post-Market Surveillance Plan.

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
