# MEMO Trace Organizer App

Simple local web app to organize, edit, and link:

- User Needs (`UN-*`)
- Software Requirements (`SR-*`)
- Features (`FEAT-*`)
- Verification Tests (`TST-*`)

The app is file-backed and persistent.

## Storage Model

Each element is stored as its own YAML file:

- Directory: `tools/app/data/elements/`
- File pattern: `<ELEMENT_ID>.yaml`

Example: `tools/app/data/elements/SR-CFG-001.yaml`

## Run

From repo root:

```bash
pnpm --filter @memo/trace-app run dev
```

or (no workspace filtering needed):

```bash
pnpm run trace-app:dev
```

Open:

- `http://127.0.0.1:3210`

## Bootstrap Data from Docs (One-Time / Reset)

Regenerate app data from docs requirements tables:

```bash
pnpm --filter @memo/trace-app run bootstrap
```

or:

```bash
pnpm run trace-app:bootstrap
```

This reads:

- `docs/src/developers/requirements/user-needs.md`
- `docs/src/developers/requirements/software-requirements.md`
- `docs/src/developers/requirements/feature-catalog.md`
- `docs/src/developers/requirements/verification-tests.md`

and writes one YAML file per element.

## Sync Docs from App Data (Automatic)

The app data is the persistent source of truth.

Markdown is regenerated automatically:

1. when the server starts
2. after each element create/update/delete operation

Manual fallback is still available:

```bash
pnpm --filter @memo/trace-app run sync-docs
```

or:

```bash
pnpm run trace-app:sync-docs
```

## Core Behavior

- Left pane: tree grouped by `domain -> type`
- Center pane: edit selected element fields
- Link editor: add/remove outgoing links
- Right pane: incoming/selected/outgoing link neighborhood
- Save persists immediately to YAML
- Docs are auto-synced from YAML on startup and save/delete
