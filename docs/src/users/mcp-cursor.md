# AI Coding Tools (MCP)

MEMO ships a **Model Context Protocol** server. Any MCP client — Cursor, Claude Code,
Windsurf — can use it to query your model while it edits your `.sysml` files.

This matters because a coding agent editing SysML by hand is working blind. It cannot
see which kinds your ontology defines, which relationship types are legal, or what the
validator will say about its change. With the MCP server it can look all of that up, and
check its own work afterwards.

---

## Setup

### Cursor

From your project directory:

```bash
memo mcp init
```

That writes two files:

| File | Purpose |
|---|---|
| `.cursor/mcp.json` | Registers the `memo` server with Cursor |
| `.cursor/rules/memo.mdc` | MEMO conventions, applied when Cursor touches a `.sysml` file |

Restart Cursor, then check **Settings → MCP** for a server named `memo`.

If you already have MCP servers configured, `memo mcp init` merges into the existing
`.cursor/mcp.json` rather than replacing it — your other servers are left alone.

To skip the rules file:

```bash
memo mcp init --no-rules
```

### Claude Code

```bash
claude mcp add memo -- npx -y --package=@memoarchitect/tools memo mcp --project /path/to/your/project
```

`memo mcp init` prints this line with your project path already filled in.

### Any other MCP client

The server speaks MCP over stdio. Point your client at:

```bash
npx -y --package=@memoarchitect/tools memo mcp --project /path/to/your/project
```

!!! note "No API key needed"
    The MCP server does not call an LLM — your IDE does. It only reads your model and
    answers the IDE's questions, so none of the provider configuration on the
    [Intelligence & AI](ai-features.md) page applies here.

---

## Tools the server exposes

Read-only by default:

| Tool | What it does |
|---|---|
| `memo_project_summary` | Element and relationship counts, per-layer completeness, error and warning totals |
| `memo_ontology` | Every legal element kind with its SysML construct and layer, and every legal relationship type |
| `memo_search_elements` | Find elements by name/id substring, kind, or layer |
| `memo_get_element` | One element in full: attributes, docs, source file, every relationship, its violations |
| `memo_trace` | Follow the relationship chain out of an element, to a given depth |
| `memo_validate` | Run the closure rules and return every violation |

The two that change outcomes most are `memo_ontology` — which stops the agent inventing
kinds your project does not define — and `memo_validate`, which lets it check its own
edit rather than declaring success.

---

## Read-only vs write

By default the server **cannot modify your model**. The agent reads, and writes SysML
through your editor, where you review the diff as you would any other code change.

To let the agent create elements directly:

```bash
memo mcp init --write
```

That adds one more tool:

| Tool | What it does |
|---|---|
| `memo_create_element` | Create an element and write it to the project SysML source |

It still validates the kind against your ontology and refuses an id that already exists.

!!! warning "Consider whether you want this"
    Read-only is the default deliberately. In read-only mode every change to a regulated
    file arrives as an editor diff you approve. With `--write`, the agent writes
    directly, and your review moves to `git diff`. For a model under design control,
    read-only plus your normal review process is usually the right answer.

Calling a write tool on a read-only server returns a clear error telling the agent to ask
you to restart with `--write`, rather than failing silently.

---

## Running the server by hand

Useful when debugging a client that will not connect:

```bash
memo mcp --project .
```

The server speaks JSON-RPC on stdout and logs to stderr, so a bare run looks like it has
hung — it is waiting for a client. Press `Ctrl+D` to end it.

| Option | Default | Description |
|---|---|---|
| `--project <dir>` | current directory | Project to serve |
| `--write` | off | Enable the model-editing tool |

---

## The Cursor rules file

`.cursor/rules/memo.mdc` applies whenever Cursor works on a `.sysml` file. It tells the
agent to check the ontology before editing, to use exact element ids, to treat terms
drawn from a standard as regulated vocabulary rather than paraphrasing them, and to run
`memo_validate` afterwards.

It is a normal file — edit it to suit your team's conventions. `memo mcp init` overwrites
it, so keep local changes elsewhere or re-apply them after re-running init.

---

## Troubleshooting

**The server does not appear in Cursor.** Restart Cursor after `memo mcp init` —
it reads `.cursor/mcp.json` at startup.

**"No MEMO project found."** The `--project` path must contain the native entrypoint
`model/catalog/project.sysml`. Run `memo mcp init` from the project root so the
generated path is correct.

**Answers look stale.** The server reloads when your `.sysml` files change, checked per
request. If an answer looks wrong, confirm the agent is not quoting an earlier reply
from its own context rather than calling the tool again.
