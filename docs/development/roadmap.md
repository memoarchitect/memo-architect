# Roadmap

## Completed

### Phase 1 — Foundation

- [x] Langium SysML v2 parser with full grammar
- [x] Ontology with 60+ entity types, 16 relationship types
- [x] Ontology viewer (standalone HTML)
- [x] Medical domain config (70 kinds, 15 rules, 7 viewpoints, 10 CoSMA layers)
- [x] Semantic model layer (`MemoModel`, `MemoModelDTO`)
- [x] Model builder (AST to semantic model)
- [x] Parser utilities
- [x] Configuration system with YAML loading and `extends` inheritance
- [x] 5 Architecture Decision Records (ADRs)

### Phase 2 — CLI & Web App

- [x] Closure rule validation engine (`evaluateClosureRules`)
- [x] Completeness tracking per CoSMA layer
- [x] WebSocket protocol for live updates
- [x] `memo validate` command with formatted output
- [x] `memo dev` command with HTTP + WebSocket server
- [x] `memo init` command for project scaffolding
- [x] File watcher (Chokidar) with debounced rebuild
- [x] React 18 web app with Vite 6
- [x] Interactive diagram (ReactFlow + ELK.js layout)
- [x] Sidebar with searchable model explorer
- [x] Completeness bar visualization
- [x] Gap bar (violation display)
- [x] Viewpoint filtering (end-to-end: config → CLI → WebSocket → diagram)
- [x] Config resolver for `@memo/ontology` extends chain
- [x] 69 tests passing (60 core + 9 CLI E2E)

---

## In Progress / Next Up

### Phase 3 — Polish & Core Features

- [ ] **CoSMA layer toggle UI** — Layer DTOs are sent to the client but no toggle UI lets you show/hide individual layers
- [ ] **Sidebar viewpoint-aware filtering** — ModelExplorer doesn't filter by viewpoint yet (only the diagram does)
- [ ] **Diagram node custom components** — Currently uses styled divs; should have proper node components with icons and kind badges
- [ ] **Edge labels and tooltips** — Relationship edges show type labels but no hover tooltips with details
- [ ] **Element detail panel** — Click an element in the diagram to see full attributes, relationships, and violations

### Phase 4 — Behavior Viewpoint & Functional Flow Analysis

#### 4a. Functional Flow Diagram
- [ ] **`FunctionalFlow` relationship type** — Source function → target function, with flow type (information/energy/matter)
- [ ] **`OperationalFlow` relationship type** — User activity ↔ system function flows
- [ ] **Behavior Viewpoint** — New viewpoint showing `UserActivity`, `SystemFunction`, `ComponentFunction`, `Scenario` with flow relationships
- [ ] **Directed graph rendering** — Left-to-right sequential flow with swim lanes for user vs. system
- [ ] **Flow annotations** — Data/signal labels on edges

#### 4b. Functional Breakdown Structure (FBS)
- [ ] **`decomposedBy` relationship type** — Parent function → child function decomposition
- [ ] **FBS tree diagram** — Hierarchical decomposition view of system functions
- [ ] **View toggle** — Switch between FBS tree view and functional flow view within the Behavior Viewpoint

#### 4c. DSM Analysis
- [ ] **DSM matrix computation** — Build N×N matrix from `FunctionalFlow` relationships (rows/columns = functions, cells = dependencies)
- [ ] **Interactive DSM view** — Color-coded matrix in the web app with hover details
- [ ] **Clustering algorithm** — Component-based DSM partitioning to suggest function groupings → logical subsystem candidates
- [ ] **Allocation overlay** — Show which functions are allocated to which subsystem; highlight unallocated functions and cross-subsystem flows

#### 4d. Functional ↔ Logical Consistency
- [ ] **Closure rule**: "Every SystemFunction must have at least one FunctionalFlow" (warning)
- [ ] **Closure rule**: "Every AllocateTo target must be a Subsystem or LogicalComponent"
- [ ] **Consistency analysis**: Cross-subsystem functional flows must have corresponding logical interfaces (per Samares pattern)
- [ ] **Consistency visualization** — Overlay functional flows on logical architecture, highlighting missing logical interfaces

### Phase 5 — Build, Export & Advanced Features

- [ ] **`memo build` command** — Static HTML report with embedded diagram for sharing
- [ ] **`.kpar` packaging** — Package model as SysAnd-compatible archive (script exists in `@memo/ontology`)
- [ ] **PDF export** — Generate compliance documentation PDF
- [ ] **Workflow wizard** — Guided step-by-step workflows (placeholder at `packages/web/src/workflows/`)
- [ ] **Ontology editor** — Visual editor for kinds and relationships (placeholder at `packages/web/src/ontology-editor/`)
- [ ] **Multi-file navigation** — Click-through from diagram to source `.sysml` file and line
- [ ] **Diff view** — Show what changed between rebuilds
- [ ] **VS Code extension** — Language server with autocomplete, go-to-definition, diagnostics

### Phase 6 — LLM Integration

- [ ] **Model Q&A** — Ask natural language questions about the model ("Which hazards have no risk control?", "Show me all unverified requirements")
- [ ] **Completeness assistant** — LLM suggests missing elements, relationships, or attributes based on closure rule violations
- [ ] **Model generation** — Generate SysML v2 elements from natural language descriptions ("Add a hazard for battery overheating")
- [ ] **Impact analysis** — "If I change this requirement, what tests and risk controls are affected?"
- [ ] **Report drafting** — LLM generates regulatory narratives from model data (e.g., ISO 14971 risk report sections)

### Phase 7 — Ecosystem

- [ ] **Additional domain packages** — Automotive (ISO 26262), aerospace (DO-178C)
- [ ] **Plugin system** — Custom rule types, visualizations, exporters
- [ ] **Import from EA/Cameo** — Migration tools from Enterprise Architect or Cameo

### Phase 8 — CI & Cloud

- [ ] **CI integration** — `memo validate` returns exit code 1 on errors; wire into GitHub Actions
- [ ] **Cloud deployment** — Hosted version with user accounts and project storage
- [ ] **Collaboration** — Multi-user editing with conflict resolution

---

## Known Issues

| Issue | Priority | Notes |
|---|---|---|
| Web bundle size (1.7 MB) | Low | Consider code splitting for ReactFlow/ELK |
| No web component tests | Medium | `@memo/web` has no test infrastructure yet |
| Hardcoded layer colors in layout.ts | Low | Should read from `cosmaLayers` in the DTO |
