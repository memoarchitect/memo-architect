# Analysis Tools

MEMO includes a suite of advanced analysis tools for design verification, dependency management, and risk analysis. These tools are accessible from the top toolbar in the Workbench.

## 1. Design Structure Matrix (DSM)

The DSM tool is used to visualize and analyze dependencies between functional and physical elements in your system.

![DSM Matrix](../images/screenshots/dsm-matrix.png)
*Design Structure Matrix showing functional dependency clusters.*

### How it works
- **N×N Matrix:** Each row and column represents a model element (e.g., Functions or Components).
- **Cells:** A mark in a cell indicates a relationship between the element in the row and the element in the column.
- **Clustering:** MEMO uses a built-in clustering algorithm (Union-Find) to detect connected components. This helps identify high-coupling areas that may require design refinement.

### Usage
1. Click the **DSM** icon in the toolbar.
2. Select the **Kinds** you want to analyze (e.g., `Function`).
3. Select the **Relationship Types** to include (e.g., `flow`).
4. Click **Cluster** to auto-reorder the matrix into logical groupings.

---

## 2. Consistency Analysis

The Consistency Panel provides real-time feedback on logical gaps in your model that simple schema validation cannot catch.

![Consistency Panel](../images/screenshots/consistency-panel.png)
*Consistency Panel showing unallocated functions and missing interface definitions.*

### Key Checks
- **Functional Allocation:** Identification of `Function` elements that are not yet allocated to a `Component`.
- **Interface Needs:** Detection of `DataFlow` relationships that cross `Component` boundaries without a defined `Interface`.
- **Requirement Orphans:** Identification of requirements that do not have a parent (Need) or a child (Design Output).

### Usage
- Click the **Compliance** icon in the toolbar.
- The **Problems** panel at the bottom will display a list of consistency violations.
- Click any violation to navigate to the offending element in the **Model Explorer**.

---

## 3. Risk Analysis Views

MEMO provides specialized views for Failure Modes and Effects Analysis (FEMA) and Fault Tree Analysis (FTA).

### FMEA Mode
The FMEA view presents a tabular interface for failure analysis:
- **Failure Mode Identification:** Links to `FailureMode` kinds in the ontology.
- **Effects & Severity:** Automatically pulls severity and probability from linked `Hazard` and `Harm` elements.
- **Risk Control Verification:** Shows the status of verification evidence for each risk control.

### Fault Tree (FTA) View
The FTA view uses a specialized layout for logic gates:
- **Top Events:** Usually linked to a `HazardousSituation`.
- **Intermediate & Basic Events:** Linked via `FaultTreeGate` (AND/OR) relationships.
- **Auto-Layout:** ELK.js provides a hierarchical tree layout optimized for temporal and logical flow.
