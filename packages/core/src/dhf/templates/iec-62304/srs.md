---
id: srs
title: Software Requirements Specification
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.2"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Software Requirements Specification (SRS) defines the software requirements for **{{project.product}}** in accordance with IEC 62304:2006 §5.2.

---

## 2. Requirements Summary

```memo-query
kind: Requirement
display: count
label: Total software requirements
```

```memo-query
kind: Requirement
display: count
label: System requirements
```

---

## 3. Functional Requirements

```memo-query
kind: Requirement
where: doc contains "shall"
display: table
columns: name, layer, doc
sort: name
empty: "No functional software requirements defined."
```

### All Software Requirements

```memo-query
kind: Requirement
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software requirements defined. Add Requirement elements to model/requirements/*.sysml."
```

---

## 4. System Requirements (Allocated to Software)

```memo-query
kind: Requirement
display: table
columns: name, layer, doc
sort: name
empty: "No system requirements defined."
```

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

_[TODO: Define performance requirements (response time, throughput, memory)]_

### 5.2 Safety Requirements

```memo-query
kind: Hazard
where: layer == "software"
display: table
columns: name, doc
sort: name
empty: "No software safety requirements derived from hazard analysis."
```

### 5.3 Security Requirements

```memo-query
kind: [SecurityControl, ThreatModel]
display: table
columns: name, layer, doc
empty: "No security requirements defined."
```

---

## 6. SOUP Requirements

```memo-query
kind: SOUPComponent
display: table
columns: name, doc
sort: name
empty: "No SOUP components identified."
```

---

## 7. Requirements Traceability

```memo-query
kind: Requirement
display: table
columns: name, layer
sort: name
empty: "No software requirements to trace."
```

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
