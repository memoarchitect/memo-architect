# AI Coding Tools (MCP)

MEMO ships a **Model Context Protocol** server. Claude Code, Cursor and VS Code use it to
query your model while they edit your `.sysml` files.

This matters because a coding agent editing SysML by hand is working blind. It cannot
see which kinds your ontology defines, which relationship types are legal, or what the
validator will say about its change. With the MCP server it can look all of that up, and
check its own work afterwards.

---

## Setup

A model created with `memo-architect init` is already connected to all three tools, read-only.
Open the project in the tool and it finds the `memo` server.

To change that, open **Settings › Jupyter and AI tools** in Architect. Under **AI coding tools** each tool
has a switch:

| Tool | File the switch writes |
|---|---|
| Claude Code | `.mcp.json` |
| Cursor | `.cursor/mcp.json`, plus the rules file `.cursor/rules/memo.mdc` |
| VS Code | `.vscode/mcp.json` |

A switch adds or removes only the `memo` entry; any other servers in the file are left alone.
**Check**, next to a connected tool, runs that tool's entry exactly as the tool would and reports
the Architect version it runs and its tools. The first check may take a minute while `npx`
downloads Architect. If it reports an Architect older than the approval step, whose edit tool
writes straight to the model, update Architect in the project before letting tools propose edits.
The entries name no path on your machine, so the files can be committed and work for everyone
on the team. Restart the tool after changing a switch.

The same switches are available from a terminal, for scripts:

```bash
memo-architect mcp init
```

!!! note "No API key needed"
    The MCP server does not call an LLM; your coding tool does. It only reads your model and
    answers the tool's questions, so none of the provider configuration on the
    [Intelligence & AI](ai-features.md) page applies here.

---

## Tools the server exposes

| Tool | What it does |
|---|---|
| `memo_project_summary` | Element and relationship counts, per-layer completeness, error and warning totals |
| `memo_ontology` | Every legal element kind with its SysML construct and layer, and every legal relationship type |
| `memo_search_elements` | Find elements by name/id substring, kind, or layer |
| `memo_get_element` | One element in full: attributes, docs, source file, every relationship, its violations |
| `memo_trace` | Follow relationship chains from an element to a given depth: downstream (edges out of it), upstream (edges into it, such as what verifies it) or both |
| `memo_validate` | Run the project's effective rule set, the one `memo validate` and Architect run, and return the violations; narrow it to one element to see what it still lacks, or to one rule |
| `memo_allocation` | What is allocated to an element and what it is allocated to |
| `memo_interfaces` | The interfaces and flows of a part and its ports, with the element at the other end |
| `memo_guide` | Where the model stands against its method, layer by layer: each step's objective, criteria, the kinds it uses and produces, and what is still open |
| `memo_change_impact` | What your uncommitted change reaches, measured from a git ref: changed and reached elements, broken interface contracts, releases and method steps it reopens |
| `memo_systems` | The systems and systems of systems the model declares |
| `memo_select_system` | Scope every later answer in the session to one system |

Every element in an answer carries a `link` that opens it in Architect: the Architect running on
the project, wherever it is, or `http://localhost:3000` when none is running.

The Model Assistant in Architect uses the same tools, so the tool and the assistant answer a
question the same way. The two that change outcomes most are `memo_ontology`, which stops
the agent inventing kinds your project does not define, and `memo_validate`, which lets it
check its own edit rather than declaring success.

---

## Letting a tool propose edits

By default a tool can only read the model; it changes SysML through your editor, where you
review the diff like any other code change.

Turn on **Let AI tools propose edits** in **Settings › Jupyter and AI tools** and the connected tools
also get the Model Assistant's proposal tools:

| Tool | Proposes |
|---|---|
| `propose_create_element` | A new element of a kind the ontology defines |
| `propose_update_element` | A change to an element's name, attributes or documentation |
| `propose_create_relationship` | A relationship, checked against the ontology's end kinds |
| `propose_delete_relationship` | Removing a relationship |

**A proposal never changes the model.** It waits under **AI Tools › Pending changes** in
Architect, with the tool that proposed it and when, until you apply or discard it. Applying
goes through the same checks as an edit you make by hand. The waiting proposals are kept in
`memo.ai-proposals.json` in the project, which is kept out of git.

---

## Running the server by hand

Useful when debugging a tool that will not connect:

```bash
memo-architect mcp
```

The server speaks JSON-RPC on stdout and logs to stderr, so a bare run looks like it has
hung: it is waiting for a client. Press `Ctrl+D` to end it.

| Option | Default | Description |
|---|---|---|
| `--project <dir>` | the model the current directory is in | Project to serve |
| `--write` | off | Offer the proposal tools |

---

## The Cursor rules file

`.cursor/rules/memo.mdc` applies whenever Cursor works on a `.sysml` file. It carries the
same guidance the server gives every tool when it connects: check the ontology before
editing, use exact element ids, treat terms drawn from a standard as regulated vocabulary,
and run `memo_validate` afterwards.

Connecting Cursor again rewrites it, so keep team conventions in a rules file of your own.

---

## Troubleshooting

**The server does not appear in the tool.** Restart the tool after changing a switch; it
reads its MCP file at startup.

**"No MEMO project found."** The tool started the server outside the model. Open the
model's folder in the tool, the one holding `memo.package.yaml`.

**Answers look stale.** The server reloads when the model's files, its settings or its
ontology change, checked per request. If an answer looks wrong, confirm the agent is not
quoting an earlier reply from its own context rather than calling the tool again.
