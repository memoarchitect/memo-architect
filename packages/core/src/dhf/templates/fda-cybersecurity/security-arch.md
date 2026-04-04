---
id: security-arch
title: Cybersecurity Architecture Description
standard: FDA Cybersecurity Guidance 2023
clauses: ["3.3"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

Describes the cybersecurity architecture for **{{project.product}}** per FDA's 2023 guidance and IEC 81001-5-1:2021.

---

## 2. Security Architecture

{{diagram:security-architecture}}

---

## 3. Trusted Zones and Communication Paths

```memo-query
kind: Interface
display: table
columns: name, layer, doc
sort: name
empty: "No interfaces defined."
```

---

## 4. Security Controls

```memo-query
kind: SecurityControl
display: table
columns: name, layer, doc
sort: name
empty: "No security controls defined."
```

---

## 5. Cybersecurity Design Principles Applied

_[TODO: Document which NIST CSF or IEC 81001-5-1 principles are applied]_

| Principle | Implementation | Reference |
| --- | --- | --- |
| Least privilege | | |
| Defense in depth | | |
| Fail secure | | |
| Cryptographic controls | | |
| Secure boot | | |

---

## 6. Security Testing

_[TODO: Describe penetration testing, vulnerability scanning, and security code review]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
