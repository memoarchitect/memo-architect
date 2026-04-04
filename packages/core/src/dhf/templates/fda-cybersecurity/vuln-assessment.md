---
id: vuln-assessment
title: Vulnerability Assessment and Penetration Testing Report
standard: FDA Cybersecurity Guidance 2023
clauses: ["3.4"]
required_for: ["FDA_510k", "FDA_PMA"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

Documents cybersecurity vulnerability assessment and testing for **{{project.product}}** per FDA's 2023 cybersecurity guidance.

---

## 2. Scope of Assessment

```memo-query
kind: [SoftwareSystem, SoftwareItem, Interface]
display: table
columns: name, kind, layer
sort: name
empty: "No software assets defined."
```

---

## 3. SOUP/Third-Party Component Vulnerabilities

```memo-query
kind: SOUPComponent
display: table
columns: name, doc
sort: name
empty: "No SOUP components defined."
```

---

## 4. Vulnerability Findings

| CVE / Finding | Component | Severity (CVSS) | Status | Mitigation |
| --- | --- | --- | --- | --- |
| | | | | |

---

## 5. Penetration Test Results

_[TODO: Summarize penetration testing scope, methodology, and findings]_

---

## 6. Residual Vulnerabilities

_[TODO: Document any accepted residual vulnerabilities with justification]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}
