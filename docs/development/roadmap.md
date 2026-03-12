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
- [x] 120 tests passing

---

## In Progress / Next Up

### Phase 3 — Polish & Features

- [ ] **CoSMA layer toggle UI** — Layer DTOs are sent to the client but no toggle UI lets you show/hide individual layers
- [ ] **Sidebar viewpoint-aware filtering** — ModelExplorer doesn't filter by viewpoint yet (only the diagram does)
- [ ] **File watcher integration test** — The watcher is wired but untested with actual live edits
- [ ] **Diagram node custom components** — Currently uses styled divs; should have proper node components with icons and kind badges
- [ ] **Edge labels and tooltips** — Relationship edges show type labels but no hover tooltips with details
- [ ] **Element detail panel** — Click an element in the diagram to see full attributes, relationships, and violations

### Phase 4 — Build & Export

- [ ] **`memo build` command** — Export model as JSON report
- [ ] **HTML report generation** — Static HTML report with embedded diagram for sharing
- [ ] **`.kpar` packaging** — Package model as SysAnd-compatible archive (script exists in `@memo/ontology`)
- [ ] **PDF export** — Generate compliance documentation PDF
- [ ] **CI integration** — `memo validate` returns exit code 1 on errors; wire into GitHub Actions

### Phase 5 — Advanced Features

- [ ] **Workflow wizard** — Guided step-by-step workflows (placeholder exists at `packages/web/src/workflows/`)
- [ ] **Ontology editor** — Visual editor for kinds and relationships (placeholder at `packages/web/src/ontology-editor/`)
- [ ] **Multi-file navigation** — Click-through from diagram to source `.sysml` file and line
- [ ] **Diff view** — Show what changed between rebuilds
- [ ] **Collaboration** — Multi-user editing with conflict resolution
- [ ] **VS Code extension** — Language server with autocomplete, go-to-definition, diagnostics

### Phase 6 — Ecosystem

- [ ] **Additional domain packages** — Automotive (ISO 26262), aerospace (DO-178C)
- [ ] **Plugin system** — Custom rule types, visualizations, exporters
- [ ] **Cloud deployment** — Hosted version with user accounts and project storage
- [ ] **Import from EA/Cameo** — Migration tools from Enterprise Architect or Cameo

---

## Known Issues

| Issue | Priority | Notes |
|---|---|---|
| Web bundle size (1.7 MB) | Low | Consider code splitting for ReactFlow/ELK |
| No CLI tests | Medium | `@memo/cli` has `--passWithNoTests` placeholder |
| No web component tests | Medium | `@memo/web` has no test infrastructure yet |
| Hardcoded layer colors in layout.ts | Low | Should read from `cosmaLayers` in the DTO |
