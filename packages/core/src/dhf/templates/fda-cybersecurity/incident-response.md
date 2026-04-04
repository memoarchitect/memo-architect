---
id: incident-response
title: Cybersecurity Incident Response Plan
standard: FDA Cybersecurity Guidance 2023
clauses: ["5.2"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

---

## 1. Purpose

Defines the incident response process for cybersecurity events affecting **{{project.product}}**.

---

## 2. Incident Classification

| Class | Description | Response Time | FDA Reporting |
| --- | --- | --- | --- |
| Class 1 | Exploited vulnerability affecting device safety | 24 hours | Required within 30 days |
| Class 2 | Unpatched but known vulnerability | 72 hours | Likely required |
| Class 3 | Suspected security event | 5 days | Assess case-by-case |

---

## 3. Response Team

| Role | Responsible Party | Contact |
| --- | --- | --- |
| Incident Commander | | |
| Security Lead | | |
| Regulatory Affairs | | |
| Clinical Safety | | |
| Legal/Compliance | | |

---

## 4. Response Procedure

1. Detection and initial assessment
2. Containment of affected devices
3. Impact analysis (patient safety, data)
4. Develop and test patch
5. Deploy and verify patch
6. FDA notification (if required)
7. Customer notification
8. Post-incident review

---

## 5. Coordinated Vulnerability Disclosure

_[TODO: Describe the coordinated disclosure policy for external researchers]_

---

{{include:shared/snippets/revision-history-table.md}}
