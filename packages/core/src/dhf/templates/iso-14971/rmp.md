---
id: rmp
title: Risk Management Plan
standard: ISO 14971:2019
clauses: ["4.4"]
required_for: ["CE", "FDA_510k", "FDA_PMA", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose and Scope

This Risk Management Plan (RMP) defines the risk management activities for **{{project.product}}** developed by **{{project.company}}**. This plan is maintained throughout the product lifecycle in accordance with ISO 14971:2019.

### 1.1 Intended Use

<!-- [GUIDANCE] Describe the intended use of the device, intended users, and intended use environment. -->

_[TODO: Describe intended use, intended users, and intended use environment]_

### 1.2 Scope of Risk Management

This plan applies to all phases of the product lifecycle: design, development, manufacture, post-market surveillance, and eventual decommission.

---

## 2. Regulatory Context

| Requirement | Reference |
| --- | --- |
| Risk Management Process | ISO 14971:2019 §4.1 |
| Risk Management Plan | ISO 14971:2019 §4.4 |
| Risk Estimation | ISO 14971:2019 §5 |
| Risk Evaluation | ISO 14971:2019 §6 |
| Risk Control | ISO 14971:2019 §7 |
| Overall Residual Risk | ISO 14971:2019 §8 |
| Risk Management Review | ISO 14971:2019 §9 |
| Post-production | ISO 14971:2019 §10 |

---

## 3. Risk Management Team

<!-- [GUIDANCE] List all personnel involved in risk management activities. -->

| Role | Name | Responsibilities |
| --- | --- | --- |
| Risk Management Lead | | Overall RM coordination |
| Clinical Representative | | Clinical risk input |
| Software Engineer | | Software FMEA and SOUP risk |
| Regulatory Affairs | | Standards compliance |
| Quality Engineer | | Process compliance |

---

## 4. Risk Acceptability Criteria

### 4.1 Severity Levels

```memo-query
kind: RiskAcceptabilityCriteria
display: table
columns: name, doc, layer
empty: "No risk acceptability criteria defined. Add RiskAcceptabilityCriteria elements to the model."
```

### 4.2 Risk Policy

<!-- [GUIDANCE] Define the risk policy: ALARP, broadly acceptable, or unacceptable regions. -->

_[TODO: Define risk acceptability matrix — probability vs. severity]_

Residual risk is acceptable when:
- All individual risks are reduced to ALARP or broadly acceptable level
- Overall residual risk is acceptable per §8 of ISO 14971:2019
- Unmitigated hazards:

```memo-query
kind: Hazard
where: layer == "risk"
display: count
label: Total hazards in model
```

---

## 5. Risk Management Activities

### 5.1 Hazard Identification

All hazard identification activities are documented in the Hazard Analysis Report (HAR).

```memo-query
kind: Hazard
display: table
columns: name, layer, doc
sort: name
empty: "No hazards defined. Add Hazard elements to model/risk/*.sysml."
```

### 5.2 Risk Estimation and Evaluation

Risk estimation is performed for each hazardous situation per ISO 14971:2019 §5–6.

```memo-query
kind: HazardousSituation
display: table
columns: name, layer, doc
sort: name
empty: "No hazardous situations defined."
```

### 5.3 Risk Control Measures

```memo-query
kind: RiskControl
display: table
columns: name, layer, doc
sort: name
empty: "No risk controls defined."
```

### 5.4 Residual Risk Evaluation

Unmitigated hazards (hazards without associated risk controls):

```memo-query
kind: Hazard
display: table
columns: name, doc
empty: "All hazards have associated risk controls."
```

---

## 6. Risk Management Documentation

| Document | Purpose | Reference |
| --- | --- | --- |
| Hazard Analysis Report (HAR) | Hazard identification and estimation | HAR |
| FMEA | Failure mode analysis | FMEA |
| Risk Benefit Analysis | Benefit-risk justification | N/A |
| Risk Management Report | Overall residual risk summary | N/A |

---

## 7. Plan Maintenance

This plan shall be reviewed:
- At each major design change
- Following post-market surveillance findings
- Prior to each design review gate
- At least annually during active development

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
