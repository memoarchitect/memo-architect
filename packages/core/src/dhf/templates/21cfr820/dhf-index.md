---
id: dhf-index
title: Design History File Index
standard: 21 CFR Part 820
clauses: ["820.30(j)", "ISO 13485:2016 §4.2.4"]
required_for: ["FDA_510k", "FDA_PMA", "CE", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Design History File (DHF) Index serves as the master index for all design and development records for **{{project.product}}** per 21 CFR 820.30(j).

---

## 2. Device Summary

| Field | Value |
| --- | --- |
| Device Name | {{project.product}} |
| Company | {{project.company}} |
| Device Type | {{project.device_type}} |
| Development Phase | {{project.phase}} |
| Version | {{project.version}} |

---

## 3. DHF Documents

### Risk Management

| Document | Standard | Status |
| --- | --- | --- |
| Risk Management Plan | ISO 14971:2019 §4.4 | |
| Hazard Analysis Report | ISO 14971:2019 §5-7 | |
| FMEA | IEC 60812:2018 | |
| Risk Management Report | ISO 14971:2019 §9 | |

### Design Controls

| Document | Standard | Status |
| --- | --- | --- |
| User Needs | 21 CFR 820.30(c) | |
| Design Input Plan | 21 CFR 820.30(c) | |
| Design Output Plan | 21 CFR 820.30(d) | |
| V&V Plan | 21 CFR 820.30(f-g) | |
| V&V Report | 21 CFR 820.30(f-g) | |
| Design Transfer Plan | 21 CFR 820.30(h) | |

### Software Documentation

| Document | Standard | Status |
| --- | --- | --- |
| Software Development Plan | IEC 62304 §5.1 | |
| Software Requirements Specification | IEC 62304 §5.2 | |
| Software Architecture Description | IEC 62304 §5.3 | |
| SOUP List | IEC 62304 §8.1.2 | |
| Software Traceability Matrix | IEC 62304 §5.7.5 | |

### Usability Engineering

| Document | Standard | Status |
| --- | --- | --- |
| Usability Engineering Plan | IEC 62366-1 §4 | |
| Use-Related Risk Analysis | IEC 62366-1 §5 | |
| Summative Evaluation Report | IEC 62366-1 §5.9 | |

---

## 4. Model Summary

```memo-query
kind: [Requirement, Requirement]
display: count
label: Total requirements
```

```memo-query
kind: Hazard
display: count
label: Total hazards
```

```memo-query
kind: [TestCase, VerificationActivity]
display: count
label: Total test cases
```

---

## 5. All Model Elements

{{glossary}}

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
