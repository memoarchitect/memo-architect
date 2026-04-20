# Runtime Surfaces (Operational Contract)

This document captures the externally visible runtime/control surfaces derived from code and runtime observation.

## CLI Command Surface

Derived from `packages/cli/src/bin/memo.ts`.

### Root Commands

- `memo validate`
- `memo dev`
- `memo init`
- `memo build`
- `memo create-package`
- `memo install`
- `memo lock`
- `memo ask`
- `memo generate`

### Export Commands

- `memo export json`
- `memo export dhf`
- `memo export dot`

### Ontology Commands

- `memo ontology show`
- `memo ontology export owl`
- `memo ontology export xml`
- `memo ontology export sysand`

### Import Commands

- `memo import csv`
- `memo import csv-rel`
- `memo import template`
- `memo import diff`
- `memo import ea`
- `memo import cameo`
- `memo import sysand`
- `memo import owl`

### Plugin Commands

- `memo plugin list`
- `memo plugin create`
- `memo plugin run`

### DHF Commands

- `memo dhf init`
- `memo dhf preview`
- `memo dhf status`
- `memo dhf snapshot`
- `memo dhf diff`
- `memo dhf redline`
- `memo dhf draft`
- `memo dhf review-packet`

## Web ActiveView Surface

Derived from `packages/web/src/store/model-store.ts`.

Active view variants (`21`):

- `welcome`
- `dashboard`
- `diagram`
- `element-detail`
- `actionflow`
- `dsm`
- `traceability`
- `tabular`
- `scenario-editor`
- `model-diff`
- `compliance-wizard`
- `statistics`
- `review-dashboard`
- `workflow-wizard`
- `ontology`
- `ontology-detail`
- `dhf-dashboard`
- `dhf-document`
- `dhf-dashboard-legacy`
- `ask`
- `sysml-generator`

## WebSocket Protocol Surface

Derived from `packages/core/src/protocol/messages.ts` and validated from live startup traffic.

### Server -> Client message families (`15`)

- `model:update`
- `validation:update`
- `completeness:update`
- `error`
- `import:result`
- `diagram:parse:result`
- `ontology:packages`
- `diagram:layout`
- `ontology:install:result`
- `ontology:remove:result`
- `llm:status`
- `llm:ask:result`
- `llm:generate:result`
- `llm:draft:result`
- `llm:suggest:result`

### Client -> Server message families (`17`)

- `request:refresh`
- `element:update`
- `element:create`
- `relationship:add`
- `csv:import`
- `diagram:create`
- `diagram:update`
- `diagram:delete`
- `diagram:parse`
- `ontology:save-selection`
- `ontology:install`
- `ontology:remove`
- `diagram:layout:update`
- `llm:ask`
- `llm:generate`
- `llm:draft`
- `llm:suggest`

### Runtime startup messages observed

From live `memo dev` session and WebSocket connect:

- `model:update`
- `validation:update`
- `completeness:update`
- `ontology:packages`
- `llm:status`

## Notes

1. CLI + WebSocket define the primary operational contract boundary.
2. ActiveView definitions define UI mode boundaries and navigation scope.
3. Message families align with the side-effect surfaces in `packages/cli/src/server/dev-server.ts`.
