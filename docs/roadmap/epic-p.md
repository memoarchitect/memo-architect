# Epic P: Four-Tab Web Shell

Wave: 4 (UI thin wrapper)

Priority: P0

Story Types: Implementation

Goal: replace the six-mode shell with a four-tab read-mostly shell where every tab wraps CLI output. UI never edits the model directly — text editor + CLI remains the authoring path.

Depends on: Epic A (methodology IA), Epic O (dispatcher), Epic Q (DHF compiler).

## Stories

### P-1 TopBar + App shell

Session target: 30 minutes or less.

- Add `apps/web/src/shell/{TopBar,App}.tsx` — four-tab nav, project selector, lint badge, gate state.

Acceptance: shell renders with empty tab content.

### P-2 Architecture tab

Session target: 30 minutes or less.

- Wire architecture tab to `memo::ontology::architecture::*` registry data.

Acceptance: tab lists discovered architecture kinds grouped by layer.

### P-3 Diagramming tab

Session target: 30 minutes or less.

- Wire diagramming tab to renderer dispatcher + viewpoint selection.

Acceptance: tab renders one viewpoint via dispatcher.

### P-4 Per-tab WebSocket subscription

Session target: 30 minutes or less.

- Rewrite `apps/web/src/store/ws-client.ts` for per-tab subscription with delta DTOs.

Acceptance: only the active tab subscribes; tab switch updates subscription set.

### P-5 Onboarding + retire six-mode

Session target: 30 minutes or less.

- Onboarding tour pointing at four tabs.
- Delete `ModeSwitcher`, `CatalogExplorer`, clean `App.tsx`.

Acceptance: legacy modes are removed and onboarding works on first run.

## Epic Exit

- UI surface is four tabs, every tab consumes registry/CLI output, no direct model authoring in UI.

## GitLab Source Issues

#251–#255 (S5.1, S5.2, S5.7, S5.9, S5.10)
