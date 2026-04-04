---
id: postmarket-surveillance
title: Post-Market Cybersecurity Surveillance Plan
standard: FDA Cybersecurity Guidance 2023
clauses: ["5"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

---

## 1. Purpose

Defines ongoing cybersecurity surveillance for **{{project.product}}** in the post-market phase per FDA's 2023 guidance.

---

## 2. Surveillance Sources

- NVD / CVE database monitoring for SOUP vulnerabilities
- ICS-CERT / FDA MedSun cybersecurity alerts
- Vulnerability reports from customers and researchers
- Threat intelligence feeds

---

## 3. SOUP Monitoring

```memo-query
kind: SOUPComponent
display: table
columns: name, doc
sort: name
empty: "No SOUP components to monitor."
```

---

## 4. Response Timelines

| Severity | CVSS Score | Response Target |
| --- | --- | --- |
| Critical | 9.0–10.0 | 30 days |
| High | 7.0–8.9 | 60 days |
| Medium | 4.0–6.9 | 90 days |
| Low | < 4.0 | Next release |

---

## 5. Patch and Update Process

_[TODO: Describe how security patches are tested, validated, and released]_

---

{{include:shared/snippets/revision-history-table.md}}
