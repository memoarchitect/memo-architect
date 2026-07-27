# Intelligence & AI Features

MEMO treats Large Language Models as first-class citizens: you can interrogate the
model in plain English, have SysML drafted for you, generate regulatory boilerplate,
and expose the whole model to an AI coding tool such as Cursor.

Every AI feature obeys the same rule: **the SysML source is the regulated record, so
nothing an LLM suggests reaches a file without you approving it.**

---

## 1. Configuring a provider

Nothing below works until MEMO has an API key. Architect supports Anthropic and any
OpenAI-compatible endpoint (OpenAI itself, Azure OpenAI, or a local server such as
Ollama or vLLM).

### From the workbench

1. Click **DHF** in the top navigation, then **Model Assistant** under **AI Tools** in
   the sidebar. (Both AI tools currently live under the DHF tab; `/ask` and
   `/generate` also work as direct URLs.)
2. Click **⚙ Settings**.
3. Pick a provider, optionally override the model, paste your key, and press **Save**.

The key is written to `~/.memo/credentials.json` with owner-only permissions. That file
lives **outside your project**, so a key entered here can never be committed.

### From the environment

For CI, containers, or shared machines, set the key in the environment instead:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...
```

### From a project `.env`

A `.env` file in the project root is read automatically:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
MEMO_LLM_MODEL=claude-opus-5
```

!!! warning "Keep `.env` out of version control"
    `memo init` adds `.env` to `.gitignore`. If you created the project another way,
    add it yourself before committing.

### Resolution order

When more than one source supplies a key, the first match wins:

| Precedence | Source | Holds secrets? |
|---|---|---|
| 1 | Real environment variables | Yes |
| 2 | Project `.env` | Yes |
| 3 | `.memo/llm.json` (project settings) | **No** — provider, model and base URL only |
| 4 | `~/.memo/credentials.json` (user credentials) | Yes |

`.memo/llm.json` is safe to commit and is where the provider and model live, so a team
can share a model choice while each engineer supplies their own key. An `apiKey` written
into that file by hand is deliberately ignored.

The Settings screen tells you which source the active key came from. When a key arrives
from the environment or a `.env`, the key field is disabled — saving there would have no
effect, because the higher-precedence source would still win.

### Choosing a model

| Setting | Default | Notes |
|---|---|---|
| Anthropic | `claude-opus-5` | Override with `MEMO_LLM_MODEL` or in Settings |
| OpenAI-compatible | `gpt-4o` | Point `OPENAI_BASE_URL` at a local server if you self-host |

---

## 2. Model Assistant

**DHF → AI Tools → Model Assistant** (or go straight to `/ask`)

A multi-turn conversation about your model. Unlike a plain chat window, the assistant has
tools: it can search elements, read one in full, follow traceability chains, and read
validation gaps. It calls them as needed rather than working from a truncated summary, so
it can answer questions about a model far larger than any context window.

### Questions it answers well

- "Which hazards are still missing mitigation controls?"
- "Show the trace from `PressureLimit` to verification."
- "Which layers have the most gaps?"
- "What changed about the alarm subsystem's risk profile?"
- "List every SOUP component and its safety classification."

Conversation history is kept for the session, so follow-ups work: ask a question, then
"and which of those are software?" without restating context. **Clear conversation**
starts fresh.

### Proposing edits

Tick **Suggest edits** and the assistant may also propose model changes. It can propose:

- creating an element
- changing an element's name, attributes, or documentation
- creating a relationship between two elements
- removing a relationship

Proposals appear as a review card beneath the reply, each with the specifics — for an
update, a before → after diff of exactly the fields that change.

!!! info "Proposals are not changes"
    The assistant cannot write to your model. Every proposal is staged. Untick anything
    you disagree with, then press **Apply** to write only what remains. **Discard all**
    throws the batch away.

Proposals are validated against your ontology before you ever see them: a kind or
relationship type your project does not define is rejected, and the assistant is told
which ones are legal so it can correct itself. When you apply, changes go through the
same persistor and legality checks as an edit you make by hand — an LLM-originated change
is held to exactly the same standard.

---

## 3. SysML Generator

**DHF → AI Tools → SysML Generator** (or go straight to `/generate`)

Where the assistant edits an existing model, the generator writes new SysML from a
description. MEMO supplies your ontology — the kinds and relationships your project
actually defines — so the output fits your profile rather than generic SysML v2.

```bash
memo generate "Create a software item called AlarmsModule and allocate it to the microcontroller."
memo generate "Create 5 stakeholder needs for a portable ventilator, focusing on battery and portability."
```

In the workbench, review the generated SysML in the preview panel and commit it if it
looks right.

---

## 4. DHF drafting assistant

Regulatory drafting is among the most time-consuming parts of device development.
`dhf draft` reads your hazard analysis, requirements, and architecture to draft whole
sections of a technical file.

```bash
memo dhf draft --target rmp --section "Risk Acceptability"
```

Templates are tuned for ISO 14971, IEC 62304, and IEC 60601.

!!! warning "Draft means draft"
    AI-generated content is marked as a draft and requires professional review and
    sign-off before it enters a submission.

---

## 5. Using MEMO from Cursor or Claude Code

Architect is not the only way to work with an AI on your model. MEMO ships an MCP server
that exposes the model to any Model Context Protocol client, so Cursor can look up
elements, follow traceability, and check validation while it edits your `.sysml` files.

See **[AI Coding Tools (MCP)](mcp-cursor.md)** for setup.

---

## What each feature costs you

| Feature | Reads the model | Writes to your files |
|---|---|---|
| Model Assistant (questions) | Yes | Never |
| Model Assistant (Suggest edits) | Yes | Only what you approve |
| SysML Generator | Ontology only | Only what you commit |
| DHF draft | Yes | Writes a draft document |
| MCP server (default) | Yes | Never |
| MCP server (`--write`) | Yes | Yes — see the MCP guide |
