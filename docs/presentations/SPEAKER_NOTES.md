# meMO Introduction — Speaker Notes (9 min)

---

## Slide 1 — Title (15s)
> "meMO — Medical Device Architecture Modeling as Code for Ontology-Backed Safety Assurance"

- Quick intro: name, role, one line about meMO
- "Ontology, Methodology, Tools, Architect — four layers, adopt what you need"

---

## Slide 2 — About Me (20s)
> 15+ years, 4 devices, surgical robotics and EP

- Don't dwell — credibility is in the devices listed
- "I've spent 15 years building safety-critical medical device software — the problems meMO solves come from that experience"

---

## Slide 3 — Overview / Agenda (10s)
> Six-part structure

- Skim quickly: "After a quick problem statement, I'll walk through ontology, methodology, a GPCA example, and adoption"
- **Don't read the list** — just set expectations

---

## Slide 4 — Part One: Safety evidence drifts (10s)
> Section divider

- "Medical devices became software-intensive. Their safety case drifts as the design evolves."

---

## Slide 5 — Device complexity (25s)
> Connected, configurable, software-defined cyber-physical systems

- **Key point:** "Safety depends on *behavior*, not only requirements text"
- Hit the four callouts fast: behavior, interfaces, teams, change
- "As complexity grows — how do we keep safety assured under change?"

---

## Slide 6 — Fragmented evidence (25s)
> Artifact islands: Requirements, Risk, Verification

- **Key point:** "The links exist but they lack meaning"
- Point to the three architecture gaps:
  - Test linked to requirement, not to behavior
  - Control named, not anchored to design
  - Test passes without exercising the failure path
- "The problem isn't too few documents — it's that the links can't be checked"

---

## Slide 7 — Industry context (15s)
> Aerospace = architecture-led, Automotive = platform-led, Medical = process-led

- "IEC 62304 requires software architecture but doesn't provide a shared model connecting design, risk, cyber, and verification"
- Don't belabor — audience knows this

---

## Slide 8 — The gap (20s)
> Why medical architecture stays weak

- Hit the four red items: controls float, threats apart, tests miss behavior, architecture drifts
- **Punchline:** "Missing: a shared ontology and low-cost architecture model"

---

## Slide 9 — Code-first debt (15s)
> Code-first is fast, until assurance needs architecture

- "Code is necessary — but it shouldn't be the primary architecture artifact"
- "The goal is not less code. It's better assurance *around* the code"

---

## Slide 10 — Shared model (15s)
> What is needed

- "Text-first, diffable, versioned. Architecture backbone. Compiler checks. Viewpoints. Document export."
- "MBSE benefits with code-first adoption"

---

## Slide 11 — Part Two: Introducing meMO (5s)
> Section divider

- "Medical Engineering Modeling Ontology"

---

## Slide 12 — What meMO is (25s)
> Custom domain modeling for medical assurance

- **Three columns:** SysML v2 provides → meMO specializes → engineering result
- "SysML is the language. meMO is the medical-device domain model and assurance rule layer"
- "Design review questions become model queries"

---

## Slide 13 — Semantic layer (15s)
> Typed elements, typed relationships, closure rules

- Hit each briefly: "Well-defined artifacts. Meaningful connections. Logical checks."
- "A semantic layer for regulated medical systems"

---

## Slide 14 — The stack (20s) ⭐
> Four layers — adopt what you need

- Walk top to bottom:
  1. **Ontology** — defines what each element means ✅
  2. **Methodology** — a working structure to start from ✅
  3. **Tools** — parse, validate, generate (WIP)
  4. **Architect** — web app for review (WIP)
- "Today focuses on ontology and methodology"

---

## Slide 15 — Ontology detail (15s)
> Typed medical vocabulary

- List the key types: IntendedUse, Hazard, Harm, RiskControl, Requirement, VerificationCase, Evidence
- "18 architecture layers, Arcadia-inspired, with risk and cybersecurity as peers"

---

## Slide 16 — Methodology detail (15s)
> Starting structure

- "Resolve scope by safety class, pick viewpoints, apply rules, bind to project"
- "Editable and extendable — guides without changing the ontology"

---

## Slide 17 — Tools detail (10s)
> Parse, check, generate

- "Langium-based. `memo dev` gives you live validation. Run `memo validate` in CI."
- Mention WIP status

---

## Slide 18 — Architect detail (10s)
> Web app over the same model

- "Six modes: Catalog, Diagram, Action flow, DSM, Scenario, Ontology"
- "A view onto the source, not a separate copy"
- Mention WIP status

---

## Slide 19 — Part Three: Ontology (5s)
> Section divider — skip fast

---

## Slide 20 — Package shape (20s) ⭐
> Seven working surfaces under memo::

- Walk the colored list quickly:
  - **core** — shared foundation
  - **architecture** — 18 layers, what the device is
  - **methodology** — how to apply it
  - **viewpoints/views** — who sees what
  - **compliance** — regulated outputs
  - **examples::gpca** — reference model

---

## Slide 21 — Ontology hierarchy (10s)
> Keep the mental model small

- "Core → Architecture → Methodology → Extensions → Examples"
- **Rule:** "Extend by packages and profiles; do not expand the core"

---

## Slide 22 — Block map (10s)
> One namespace, nested blocks

- Point to the architecture groupings if needed, otherwise skip fast

---

## Slide 23 — Typed links (20s) ⭐
> Layers connect through typed connections

- "Every relation is a native SysML v2 connection def — name is the verb, ends carry roles"
- Hit a few examples: DerivesFrom, SatisfiedBy, MitigatesHazard, VerifiedBy, ProducesEvidence
- "Traceability stored as data, not spreadsheet — RMF view, V&V matrix, impact analysis all read the same links"

---

## Slide 24 — Part Four: Methodology (5s)
> Section divider — skip fast

---

## Slide 25 — Methodology profiles (15s)
> Apply through methodology profiles

- Walk the 5 steps: resolve scope, pick viewpoints, author rules, bind to project, add domain kinds
- "The core ontology stays unchanged"

---

## Slide 26 — Part Five: GPCA example (5s)
> Section divider

- "Now the reusable types become project instances"

---

## Slide 27 — GPCA intro (15s)
> Generic Patient-Controlled Analgesia pump

- "Public-domain benchmark, Class C software, small enough to inspect end to end"
- Point to the package list on right

---

## Slide 28 — Closed thread overview (15s)
> One GPCA-style closed thread

- Walk the chain: Need → Requirement → Architecture → Behavior → Risk Control → Verification → Evidence → Document View
- "Small enough to follow. Complete enough to prove the semantic backbone."

---

## Slide 29 — Requirements layer (15s)
> Definitions on left, GPCA instances on right

- "StakeholderNeed, Requirement, SoftwareRequirement — typed with sourceKind, safetyClass"
- Point to REQ-025: "carries its source (risk) and safety class as typed attributes you can query"

---

## Slide 30 — Risk layer (15s)
> Hazard, control, residual

- "ISO 14971 chain as typed items"
- Point to overdoseHazard (catastrophic) and lockoutControl (inherent safe design, software)
- "Safety and security are peers"

---

## Slide 31 — Assurance layer (10s)
> Cases, tests, evidence

- "Verification case with acceptance criteria, test artifact, evidence tied to baseline"
- "Rule engine can check that every high-severity control reaches an Evidence node"

---

## Slide 32 — Compile the argument (20s) ⭐
> We compile code. We should compile the safety argument.

- **Show the terminal output:**
  - CR-MED-001: Hazard must have ≥1 risk control
  - CR-MED-003: Risk control must be verified
- "Find gaps *before* design review. Run rules in CI before merge or release."
- "That makes compliance a build step"

---

## Slide 33 — A closed thread (15s)
> All layers connected end to end

- Walk the visual: HZ-001 → REQ-025 → SW-005 → RC-001 → VER-002 → EVD-001
- "Each row of a traceability table becomes an object you can inspect and query"

---

## Slide 34 — Part Six: Adoption (5s)
> Section divider — skip fast

---

## Slide 35 — Adoption hints (15s)
> Adopt as modeling discipline

- Hit the four points fast:
  1. One product slice — model one safety thread
  2. Keep core stable — extend in your package
  3. Methodology before tooling — agree on rules first
  4. Add tools gradually — prove value first

---

## Slide 36 — Takeaway (15s) ⭐
> Create. Compile. Assure.

- "Author the model, compile the checks, keep the safety case assured as the design changes"
- "Typed, architecture-backed, and re-checkable"
- Pause. Let it land.

---

## Timing Budget

| Section | Slides | Time |
|---------|--------|------|
| Title + About | 1–2 | 0:35 |
| Part 1: Problem | 3–10 | 2:15 |
| Part 2: Intro meMO | 11–18 | 1:55 |
| Part 3: Ontology | 19–23 | 1:05 |
| Part 4: Methodology | 24–25 | 0:20 |
| Part 5: GPCA | 26–33 | 1:50 |
| Part 6: Adoption + Close | 34–36 | 0:35 |
| **Total** | **36** | **~8:35** |

Buffer: ~25s for transitions and breath.

## Tips

- ⭐ marks slides to linger on — they carry the argument
- Section dividers (Part 1–6): say one sentence max, advance
- Don't read bullet points — hit the punchline and move
- The terminal on slide 32 is your demo moment — slow down there
- End on "Create. Compile. Assure." — don't add caveats after it
