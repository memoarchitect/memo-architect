# CLI Reference

The `memo` CLI provides three commands for working with MEMO projects.

## `memo dev`

Start the development server with live model reload.

```bash
memo dev [options]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `-p, --port <port>` | `3000` | Server port |
| `--no-open` | — | Don't auto-open browser |

**What it does:**

1. Finds `memo.config.yaml` in the current directory (walks up if needed)
2. Resolves the config inheritance chain (`extends`)
3. Recursively finds all `.sysml` files
4. Parses, builds the semantic model, validates, computes completeness
5. Starts HTTP server with the web app and WebSocket
6. Watches for `.sysml` and `memo.config.yaml` changes
7. On change: rebuilds and broadcasts updates via WebSocket

**Example:**

```bash
memo dev --port 8080 --no-open
```

---

## `memo validate`

Validate the model against closure rules and display completeness.

```bash
memo validate [dir]
```

**Arguments:**

| Argument | Default | Description |
|---|---|---|
| `dir` | `.` | Project directory to validate |

**Output includes:**

- Element and relationship counts
- Violations grouped by severity (error, warning, info)
- Per-layer completeness bar charts
- Overall completeness percentage
- Exit code 1 if any errors found (useful for CI)

**Example:**

```bash
memo validate ./examples/infusion-pump
```

---

## `memo init`

Scaffold a new MEMO project.

```bash
memo init <name> [options]
```

**Arguments:**

| Argument | Description |
|---|---|
| `name` | Project directory name |

**Options:**

| Flag | Default | Description |
|---|---|---|
| `-t, --template <template>` | `medical` | Domain template to use |

**Creates:**

```
<name>/
  memo.config.yaml          # Config extending @memo/medical-modeling-profile
  model/
    <name>.sysml            # Starter file with System, Requirement, Hazard
```

**Example:**

```bash
memo init ventilator --template medical
cd ventilator
memo dev
```
