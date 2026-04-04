---
id: soup
title: SOUP List (Software of Unknown Provenance)
standard: IEC 62304:2006+AMD1:2015
clauses: ["8.1.2"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This document lists all Software of Unknown Provenance (SOUP) components used in **{{project.product}}** per IEC 62304:2006 §8.1.2. SOUP includes off-the-shelf software, open-source libraries, and third-party components that were not developed under a quality management system.

---

## 2. SOUP Inventory

```memo-query
kind: SOUPComponent
display: table
columns: name, layer, doc
sort: name
empty: "No SOUP components defined. Add SOUPComponent elements to the model."
```

---

## 3. SOUP Risk Assessment

For each SOUP component, the potential impact on device safety must be evaluated.

```memo-query
kind: SOUPComponent
display: table
columns: name, doc
sort: name
empty: "No SOUP components to evaluate."
```

### 3.1 Known Anomalies

_[TODO: For each SOUP component, list known anomalies and assess impact on safety]_

---

## 4. SOUP Maintenance

### 4.1 Update Monitoring

_[TODO: Describe the process for monitoring SOUP components for security patches and updates]_

### 4.2 Version Pinning

_[TODO: Describe how SOUP versions are pinned in configuration management]_

---

## 5. SBOM Integration

_[TODO: Reference Software Bill of Materials (SBOM) for FDA cybersecurity requirements]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
