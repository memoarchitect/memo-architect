---
id: sad
title: Software Architecture Description
standard: IEC 62304:2006+AMD1:2015
clauses: ["5.3"]
required_for: ["CE", "FDA_510k", "MDR"]
---

{{include:shared/snippets/document-control-header.md}}

{{toc}}

---

## 1. Purpose

This Software Architecture Description (SAD) defines the architecture of **{{project.product}}** software per IEC 62304:2006 §5.3 and ISO/IEC/IEEE 42010:2022.

---

## 2. System Overview

```memo-query
kind: SoftwareSystem
display: table
columns: name, layer, doc
sort: name
empty: "No SoftwareSystem defined."
```

**Total elements:**

```memo-query
kind: [SoftwareSystem, SoftwareItem, SoftwareUnit, SOUPComponent]
display: count
label: Total software elements
```

---

## 3. Software Architecture

{{diagram:software-architecture}}

### 3.1 Software Items

```memo-query
kind: SoftwareItem
display: table
columns: name, layer, doc
sort: name
empty: "No SoftwareItem elements defined."
```

### 3.2 Software Units

```memo-query
kind: SoftwareUnit
display: table
columns: name, layer, doc
sort: name
empty: "No SoftwareUnit elements defined."
```

### 3.3 Interfaces

```memo-query
kind: Interface
display: table
columns: name, layer, doc
sort: name
empty: "No Interface elements defined."
```

---

## 4. SOUP Components

```memo-query
kind: SOUPComponent
display: table
columns: name, doc, layer
sort: name
empty: "No SOUP components identified."
```

---

## 5. Architecture Decisions

_[TODO: Document key architecture decisions and their rationale]_

---

## 6. Software Item Segregation

_[TODO: Describe how safety-critical software items are segregated from non-safety-critical items]_

---

{{include:shared/snippets/revision-history-table.md}}

{{include:shared/snippets/approval-block.md}}

{{include:shared/snippets/references-section.md}}
