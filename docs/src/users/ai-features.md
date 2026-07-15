# Intelligence & AI Features

MEMO is built for the next generation of systems engineering, incorporating Large Language Models (LLMs) as first-class citizens. You can use these features to accelerate modeling, ask complex questions, and automate regulatory drafting.

![AI Interface](../images/screenshots/ai-interface.png)
*AI Command Palette (Cmd+K) used for querying and generating SysML.*

## 1. Natural Language Modeling (`generate`)

The `memo generate` command allows you to define complex system structures and requirements using plain English.

### How it works
MEMO provides the LLM with your current model's **Ontology** (the available kinds and relationships). The AI then translates your natural language description into valid SysML v2 syntax that fits your specific project profile.

### Examples
**Using the CLI:**
```bash
# Generate a software architecture slice
memo generate "Create a software item called 'AlarmsModule' and allocate it to the microcontroller."

# Generate a requirement set
memo generate "Create 5 stakeholder needs for a portable ventilator, focusing on battery and portability."
```

**Using the UI:**
1. Press `Cmd+K`.
2. Type `/generate` followed by your description.
3. Review the generated SysML in the preview panel and click **Commit** to add it to your model.

---

## 2. Model Q&A (`ask`)

Traditional MBSE tools make it hard to answer simple questions like "What is the traceability status of this hazard?". MEMO's `ask` feature solves this using a context-aware RAG (Retrieval-Augmented Generation) engine.

### Common Queries
- "Which hazards are still missing mitigation controls?"
- "What is the deepest trace from the 'Power' subsystem?"
- "Show me all requirements from the IEC 62304 standard."
- "What are the common failure modes for the 'PumpMechanism'?"

### Usage
- **CLI:** `memo ask "<your question>"`
- **UI:** Press `Cmd+K` and type `/ask` followed by your question.

---

## 3. DHF Drafting Assistant

Regulatory drafting is one of the most time-consuming parts of medical device development. The `dhf draft` tool uses your model data to write professional-grade boilerplate for your technical files.

### Feature
- **Context-Aware Sections:** The AI reads your hazard analysis, functional requirements, and architecture to draft entire sections of the Risk Management Plan (RMP), Fault Tree rationale, or Software Design Specification.
- **Standards-Aligned:** Templates are tuned for ISO 14971, IEC 62304, and IEC 60601 compliance.

### Usage
```bash
# Draft a specific section in the HAR
memo dhf draft --target har --section "Risk Acceptability"
```
*Note: AI-generated content is always marked as "Draft" and requires professional review and sign-off.*
