# Phase 4A: CSV Import/Export + SysML Generation — COMPLETED

## What Was Built

### 1. `packages/core/src/serializer/csv-io.ts` — CSV Import/Export
- **Element CSV format**: `id,name,kind,construct,doc,[attr1],[attr2],...`
  - `kind` validated against config, `construct` auto-derived, `layer` auto-derived
  - Dynamic columns become SysML attributes
  - Default attributes from kind definition merged (CSV values take precedence)
- **Relationship CSV format**: `sourceId,targetId,type,sourceEnd,targetEnd`
  - `type` validated against config relationship types
  - Element ID validation against existing model (optional)
- **Functions**: `parseElementsCsv`, `parseRelationshipsCsv`, `exportElementsCsv`, `exportRelationshipsCsv`, `generateElementTemplate`, `generateRelationshipTemplate`

### 2. `packages/core/src/serializer/sysml-generator.ts` — SysML Text Generator
- `generateUsage(element)` → SysML usage block
- `generateConnection(rel)` → SysML connection line
- `generateFile(elements, relationships, packageName)` → complete `.sysml` file

### 3. `packages/cli/src/commands/import.ts` — CLI Import Commands
- `memo import csv <file>` — Import elements, generate .sysml
- `memo import csv-rel <file>` — Import relationships, validate against model
- `memo import template elements` — Generate ontology-aware element template CSV
- `memo import template relationships` — Generate relationship template CSV
- Options: `--output`, `--package`, `--dry-run`

### 4. Protocol Messages (messages.ts)
- `CsvImportMessage` (client→server) for WebSocket-based import
- `ImportResultMessage` (server→client) for import results

### 5. Tests — 22 new tests in `csv-io.test.ts`

---

# Phase 4A Remaining: 2-Way Sync (NOT YET STARTED)

## Files Still Needed
1. `packages/core/src/serializer/source-map.ts` — AST source location mapper
2. `packages/core/src/serializer/text-patcher.ts` — In-place SysML text patching
3. File watcher pause/resume
4. Dev server element:update + relationship:add handler wiring

---

# Next Phases (from roadmap)
- Phase 4: Cross-file import resolution, library keyword, multi-file splitting
- Phase 5: Behavior viewpoint, functional flow, DSM analysis
- Phase 6: Build, export, advanced features
- Phase 7: LLM integration
