---
id: sdp
title: Software Development Plan
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.1"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose and Scope

This Software Development Plan (SDP) defines the processes, activities, and tasks for the development of software for **{{project.product}}**. This plan is maintained per IEC 62304:2006 §5.1.

---

## 2. Software Classification

<!-- [GUIDANCE] Classify software per IEC 62304 §4.3: Class A (no injury), Class B (non-serious injury), Class C (death or serious injury). -->

| Software Item | Classification | Justification |
| --- | --- | --- |
| {{project.product}} Software System | Class B | |

```memo-query
kind: [SoftwareSystem, SoftwareItem]
display: table
columns: name, kind, layer, doc
sort: name
empty: "No software items defined. Add SoftwareSystem or SoftwareItem elements."
```

---

## 3. Development Standards and Procedures

| Activity | Standard | Reference Procedure |
| --- | --- | --- |
| Requirements | IEC 62304 §5.2 | SRS |
| Architecture | IEC 62304 §5.3 | SAD |
| Detailed Design | IEC 62304 §5.4 | SDS |
| Implementation | IEC 62304 §5.5 | Coding standard |
| Integration | IEC 62304 §5.6 | Integration Test Plan |
| System Testing | IEC 62304 §5.7 | System Test Plan |
| Release | IEC 62304 §5.8 | Release procedure |

---

## 4. Software Safety Activities

### 4.1 Software Items of Unknown Provenance (SOUP)

```memo-query
kind: SOUPComponent
display: table
columns: name, doc, layer
sort: name
empty: "No SOUP components defined."
```

### 4.2 Software-Related Hazards

```memo-query
kind: Hazard
where: layer == "software"
display: table
columns: name, doc, layer
sort: name
empty: "No software-related hazards defined."
```

---

## 5. Configuration Management

_[TODO: Describe version control, branching strategy, and release process]_

---

## 6. Problem Resolution

_[TODO: Describe defect tracking and resolution process]_

---

## 7. Development Environment

_[TODO: List development tools, compilers, IDEs, and their versions]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
