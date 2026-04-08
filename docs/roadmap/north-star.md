# MEMO North Star

## Purpose

This document defines the product, adoption, and execution strategy for making MEMO the default free tool for medical device MBSE, architecture modeling, traceability, and DHF generation.

It is intentionally separate from the auto-generated phase files in `docs/roadmap/`. Those files track GitLab issues. This document defines the long-range product direction and the standard for evaluating roadmap choices.

## North Star

MEMO becomes the fastest path from "we have an idea for a medical device" to:

- a credible system model
- traceable requirements, risks, architecture, and verification
- review-ready artifacts for design reviews and DHF workflows
- a project structure that can scale from founder-led concept work to regulated development

The tool should become:

- the default starting point for medical-device startups with no existing process
- the easiest migration destination for teams living in Excel, Lucidchart, Miro, requirements matrices, and ad hoc documents
- the free and opinionated MBSE tool that people recommend because it gets them from chaos to a reviewable engineering baseline fast

## Product Thesis

The winning product is not "a general SysML tool for medical devices."

The winning product is:

- a medical-device development operating system
- with SysML as the durable backbone
- but with import-first, workflow-first, and review-first UX
- so teams can start from whatever they already have and grow into better systems engineering instead of being forced to become MBSE experts on day one

MEMO should do for medical device architecture what tools like C4, LikeC4, and EventCatalog did for adjacent spaces:

- reduce ceremony
- use text and code where that helps
- generate high-quality views automatically
- create opinionated defaults
- make outputs easy to share
- make adoption easier than non-adoption

## Who We Serve

### 1. Idea-stage startup

Profile:

- 1-5 people
- no quality system yet
- no systems engineer
- no DHF structure
- maybe a product brief, a few sketches, and a pitch deck

What they need:

- a guided path from concept to first system model
- domain language that makes sense without SysML fluency
- starter templates for intended use, user needs, high-level hazards, architecture, and first verification outline
- attractive outputs they can show to advisors, design partners, and investors

What wins them:

- `memo init` gives them a real project, not an empty shell
- the UI teaches the next step
- the first useful result appears in minutes
- the tool makes them feel more organized, not more regulated

### 2. Early startup with fragmented artifacts

Profile:

- 5-25 people
- some requirements and hazards in Excel
- architecture in Lucidchart or Miro
- verification tracked in spreadsheets or docs
- design inputs and notes spread across folders

What they need:

- import and reconciliation, not re-entry
- a simple canonical data model
- a way to connect requirements, architecture, risk, and tests without major process disruption
- progressive rigor

What wins them:

- bulk import from CSV/XLSX exports
- mapping assistants
- deduplication and merge support
- generated diagrams and traceability views that are immediately better than their current artifacts

### 3. Mature startup or growth-stage company

Profile:

- 25-150 people
- more specialized roles
- mixed tooling
- some compliance maturity
- stronger need for baselines, review packets, and repeatability

What they need:

- trustworthy change tracking
- controlled DHF outputs
- role-based workflows
- import from incumbent tools and preservation of provenance
- collaboration patterns that work with Git and regulated review

What wins them:

- review-ready exports
- stable project conventions
- model diff and baselines
- evidence-ready traceability
- predictable outputs for auditors, partners, and internal reviews

## Core Market Position

MEMO should position itself as:

> The free, opinionated, model-as-code workbench for medical device architecture, traceability, and DHF-ready documentation.

Not as:

- a generic SysML platform
- a replacement for every PLM/ALM/QMS system
- a cloud-first enterprise suite
- a tool for ontology enthusiasts first

The product should feel like:

- "GitHub for your device model"
- "LikeC4, but for medical device development and traceability"
- "The easiest way to turn messy startup artifacts into a credible engineering baseline"

## Strategic Principles

### 1. Import first, model second

Most target users will not start with clean SysML. They will start with spreadsheets, diagrams, notes, and matrices.

Every roadmap decision should ask:

- can a messy team get in without rewriting everything?
- can they preserve provenance?
- can they improve their system incrementally?

### 2. Reviewable outputs beat modeling purity

If the product generates excellent:

- diagrams
- traceability views
- risk views
- design review packets
- DHF artifacts

then teams will tolerate learning the model.

If the model is elegant but the outputs are not immediately useful, adoption will stall.

### 3. Opinionated workflows beat blank flexibility

Early users do not want a toolkit. They want a path.

MEMO should ship strong defaults for:

- project structure
- starter model content
- common device archetypes
- review views
- design controls
- usability engineering
- software architecture
- risk management

### 4. Progressive rigor

The product must support a ladder:

1. idea capture
2. structured concept model
3. traceability baseline
4. design review package
5. DHF evidence backbone
6. repeatable regulated development

Users should never need to jump directly to full formalism.

### 5. Free must also mean easy to pull in

Free alone is not enough.

The tool must be:

- installable with minimal setup
- easy to evaluate without commitment
- safe to try on existing artifacts
- useful before organizational buy-in

## Current Product Strengths

Based on the current repo, MEMO already has strong foundations:

- a broad medical ontology and closure-rule system
- web workbench modes for diagrams, ontology, scenarios, diff, DHF, and analysis
- CLI workflows for validation, build, import, export, DHF, and ontology operations
- reference models and tutorials
- a text-native, Git-friendly architecture

This is enough to build a category-defining product.

The main gap is not raw capability. The main gap is product packaging around adoption, trust, and user journey.

## Current Product Risks

### 1. Too tool-centric

The product surface reads like a collection of capabilities instead of a guided medical-device workflow.

### 2. Too much ontology/UI depth before golden-path adoption

Ontology cleanup and visual ontology work matter, but startups adopt based on speed to useful output, not taxonomy elegance.

### 3. Inconsistent product contract

The repo currently shows signs of shifting config and roadmap conventions. That damages trust, especially for regulated users.

### 4. Limited migration bridge

There is import work underway, but the product still needs a much stronger bridge from Excel, Lucidchart, Miro, requirements matrices, and incumbent processes.

### 5. Virality is underdesigned

The product can generate useful outputs, but the roadmap does not yet strongly design around sharing, demonstration, or community pull.

## What "Viral" Means Here

Virality for MEMO is not social virality. It is workflow virality.

A user should adopt MEMO because someone sent them one of these:

- a clean architecture site
- a review packet
- a traceability matrix
- a risk chain view
- a project starter kit
- a public example project

The receiver should think:

- "I want my device project to look like that."
- "This is cleaner than our current documents."
- "I can start without buying anything."

## Growth Flywheel

### Loop 1: Starter-to-share loop

1. user initializes a project
2. MEMO generates attractive starter views and docs
3. user shares static site or exports
4. stakeholders ask how it was made
5. new teams adopt MEMO

### Loop 2: Import-to-order loop

1. team imports spreadsheets and diagrams
2. MEMO turns them into a structured model
3. team sees gap analysis and review outputs
4. they move more of their process into MEMO
5. MEMO becomes the system backbone

### Loop 3: Template-community loop

1. users create archetype templates and examples
2. community shares starter kits and packages
3. new users onboard faster
4. MEMO gains category authority

## Product Strategy Pillars

## Pillar 0: Model-generated diagrams and scenarios are the product

Goal:
Make auto-generated architecture diagrams and scenario walkthroughs visually competitive with hand-drawn Lucidchart/Miro boards.

Why this is foundational:
The entire value proposition is "you write the model once, MEMO generates every view." If the generated diagrams look worse than what someone draws in 10 minutes in Lucidchart, the thesis fails. Diagrams and scenarios are not features — they are the proof that model-based is better.

Must-have capabilities:

- auto-layout that produces clean, readable architecture diagrams by default
- scenario walkthroughs that show the model doing something (not just static structure)
- professional styling: consistent colors, proper spacing, readable labels
- diagrams that are suitable for design reviews, advisor decks, and investor presentations
- user-created diagrams with SysML editing for teams that want to go deeper

This pillar gates every viral loop. The static site is the container; the diagrams are the content.

Roadmap alignment:

- Phase D (Diagrams & Views) promoted to `P1`
- Phase F (Model & Scenarios) promoted to `P1`
- #139 Professional diagram quality (Phase N3)

## Pillar A: Golden path for first-time users

Goal:
Make the first 30 minutes exceptional for teams with no MBSE background.

Must-have capabilities:

- one-command project bootstrap
- choose device archetype and regulatory posture at init time
- guided onboarding in the UI
- first architecture, first hazard set, first requirements set, first review views
- immediate static site export

Roadmap additions:

- `P0` First-run project wizard
- `P0` starter model packs by device archetype
- `P1` guided "next best action" assistant in the workbench
- `P1` one-click generation of baseline review artifacts

## Pillar B: Import and migration backbone

Goal:
Make MEMO the easiest place to consolidate fragmented engineering artifacts.

Inputs to support well:

- CSV
- Excel exports
- requirements matrices
- hazards/FMEA spreadsheets
- verification spreadsheets
- architecture inventories
- Lucidchart and Miro exports where feasible
- Visio/draw.io/Lucid imports via intermediate formats when practical

Workflow requirements:

- column mapping assistant
- kind and relationship mapping presets
- dry-run preview
- duplicate detection
- conflict resolution
- provenance links back to source artifacts
- re-import with diff instead of full replacement

Roadmap additions:

- `P0` import provenance model
- `P1` import mapping UI
- `P1` re-import and merge workflow
- `P1` source-to-model trace views
- `P2` diagram import decomposition pipeline for Lucid/Miro-style assets

## Pillar C: Review-first modeling

Goal:
Make MEMO useful even if the team never becomes "advanced MBSE users."

The key outputs must be better than the current alternatives:

- system architecture views
- risk traceability
- requirements traceability
- usability engineering flows
- software architecture views
- verification coverage
- review packets
- DHF exports

Roadmap additions:

- `P0` curated executive/design-review dashboards
- `P1` role-specific review modes
- `P1` static review site with comment-ready sections
- `P1` print/export quality improvements for architecture and traceability

## Pillar D: Medical-device-native workflows

Goal:
Make the tool feel like it understands device development, not just modeling.

Critical first-class workflows:

- intended use / indications / user profiles
- user needs to system requirements to software requirements
- hazard to hazardous situation to harm to control to verification
- usability engineering per IEC 62366
- software lifecycle per IEC 62304
- cybersecurity evidence paths
- DHF structure and baselines

Roadmap additions:

- `P0` usability engineering cockpit
- `P1` software safety classification workflow
- `P1` design-control milestone views
- `P1` evidence linking and baseline freeze

## Pillar E: Trust, consistency, and regulated readiness

Goal:
Make users trust MEMO as a durable system backbone.

Needed improvements:

- one canonical project/config format
- one current terminology set
- one stable roadmap location
- one stable product contract
- baseline and diff semantics that are simple and explicit
- predictable exports

Roadmap additions:

- `P0` product contract stabilization epic
- `P0` documentation consistency sweep
- `P1` baseline, approval, and release workflow
- `P1` audit trail for imported and edited artifacts

## Pillar F: Distribution and community

Goal:
Turn MEMO from "interesting repo" into "default recommendation."

Distribution channels:

- open-source examples
- startup-friendly quickstarts
- high-quality screenshots and generated sites
- template packs
- public tutorials
- architecture and DHF showcases
- import recipes for common spreadsheet formats

Roadmap additions:

- `P0` public starter gallery
- `P1` example site generator with shareable URLs for static hosting
- `P1` template/package registry
- `P2` "MEMO cookbook" for common startup situations

## Proposed Product Architecture Direction

The architecture should support three concentric value layers:

### Layer 1: Canonical model core

This remains the durable source of truth:

- model
- ontology
- rules
- traceability
- baselines
- evidence links

### Layer 2: Workflow services

This is where adoption value increases:

- import mappers
- remediation engine
- DHF compiler
- diff/baseline engine
- review packet builder
- template resolution

### Layer 3: Experience surfaces

These should be workflow-oriented:

- startup workspace
- systems workspace
- software workspace
- risk workspace
- usability workspace
- quality/regulatory workspace
- reviewer portal

This is the biggest experience shift MEMO should make: move from feature surfaces to role and workflow surfaces.

## Reconciled Roadmap

The roadmap combines adoption-outcome phases (N-series) with existing implementation phases (letter-series). Existing phases are preserved and reprioritized; new N-phases fill strategic gaps.

### Execution order

```
A → N0 → N1 + B → D/F/N3 (parallel) → N2/J → C/E → N4 → G/N5/K → H/I
```

### Phase A: Critical Bug Fixes — P0 (existing, unchanged)

Fix issues making the app look broken. Must ship before anything else.

### Phase N0: Product Contract Stabilization — P0 (new)

Issues: #125 #126 #127 #128

Scope:

- canonical project format ADR (resolve config naming drift)
- terminology consistency sweep across repo
- single canonical quickstart path
- stabilize roadmap references (north-star as strategic anchor)

Why first: trust is prerequisite to adoption.

### Phase N1: Golden Path — First-Time User Experience — P0 (new)

Issues: #129 #130 #131 #132 + existing #45 #43 #36 #40

Scope:

- startup wizard with device archetype selection
- starter model packs per archetype (SaMD, connected, infusion-like, monitoring)
- what-to-do-next panel in web UI
- first-review dashboard
- onboarding tour, dashboard home view, workflow wizard

Success: a new user reaches a useful model and review view in under 15 minutes.

### Phase B: UX Foundation — P1 (existing, unchanged)

Navigation, layout, interaction fundamentals. Enables N1.

### Phase D: Diagrams & Views — P1 (existing, promoted from P2)

Auto-view folders, user-created diagrams, SysML editing. Model-generated diagrams are the core value proposition — they prove model-based architecture is better than hand-drawn diagrams.

### Phase F: Model & Scenarios — P1 (existing, promoted from P2)

Issues: #73 #79

Scenarios editor and model diff. Scenario walkthroughs make architecture reviewable by showing the model doing something. Essential for design reviews.

### Phase N3: Review Outputs & Shareable Exports — P1 (new)

Issues: #137 #138 #139 #140 + existing #34 #10 #11 #16 #17

Scope:

- one-command static architecture site (memo export site)
- review packet builder (design review, risk review, architecture review)
- professional diagram quality — visually competitive with Lucidchart/Miro
- export theme overhaul for professional quality
- traceability matrix, FMEA table views

D + F + N3 run in parallel. Together they deliver the "model-based is better" proof point and the viral loop.

### Phase N2: Import & Migration Backbone — P1 (new, expands Phase J)

Issues: #133 #134 #135 #136 + Phase J issues #88 #122 #123 #124

Scope:

- import provenance model (source → element traceability)
- column-mapping assistant UI for CSV/Excel
- re-import with diff (update, don't replace)
- named import recipes for common artifact types
- UI-based element and relationship creation
- bulk CSV import

Success: a team can migrate core Excel assets in one day without manual re-entry.

### Phase J: Import — P1 (existing, promoted from P2)

CLI import formats (AADL, CSV, EA, Cameo). Now a dependency of N2.

### Phase 1: Ontology Cleanup — P1 (existing, demoted from P0)

Valuable but not adoption-blocking. Do incrementally as needed.

### Phase C: Visual Ontology Viewer — P2 (existing, demoted from P1)

Useful but not adoption-critical. The North Star warns against over-indexing on ontology before golden-path adoption.

### Phase E: DHF Improvements — P2 (existing, unchanged)

Markdown-first DHF authoring workbench. Expands under N3 review backbone.

### Phase N4: Medical Workbenches — P2 (new)

Issues: #141 #142 #143 #144 + existing #41

Scope:

- usability engineering cockpit (IEC 62366)
- risk workbench (full ISO 14971 chain)
- software lifecycle workbench (IEC 62304)
- evidence linking and baseline freeze

Success: subject-matter experts work in MEMO without thinking in generic SysML terms.

### Phase G: Examples — P3 (existing, unchanged)

GPCA as reference model. Merges into N5 distribution work.

### Phase N5: Viral Distribution & Community — P3 (new)

Issues: #145 #146

Scope:

- public starter gallery
- MEMO Cookbook for common device programs
- template/package registry (future)
- polished GPCA as showcase project

Success: shared outputs and examples become the main acquisition channel.

### Phase K: Docs & Manuals — P3 (existing, unchanged)

Quickstart portion accelerated into N0.

### Phases H, I: Cloud & Domain Packages — Deferred (existing, unchanged)

Not until single-team workflows are excellent.

## Detailed Execution Plan

## Horizon 0: Next 30 days (Phases A, N0, start N1)

Priority:
Fix trust, entry friction, and start the golden path.

Actions:

- finish remaining Phase A bug fixes
- stabilize documentation and config naming (N0: #125 #126 #127 #128)
- tighten `memo init` output into a high-value startup baseline
- begin startup wizard and archetype starter kits (N1: #129 #130)
- adopt this north-star as the strategic anchor

Deliverables:

- North Star document (done)
- Product Contract ADR (#125)
- Canonical quickstart path (#127)
- Startup wizard prototype (#129)

## Horizon 1: 30-90 days (Phases N1, B, D, F, N3)

Priority:
Make first adoption materially easier. Prove model-based is better than Lucidchart.

Actions:

- complete golden path: what-to-do-next panel, first-review dashboard, onboarding tour (N1: #131 #132 #43)
- UX foundation work (Phase B)
- professional diagram quality — auto-layouts that look clean by default (N3: #139)
- scenario walkthroughs that show the model doing something (Phase F: #73)
- one-command static architecture site (N3: #137)
- review packet builder (N3: #138)
- add import mapping assistant for CSV-first migration (N2: #134)

Success metrics:

- time-to-first-useful-output under 15 minutes
- generated diagrams visually competitive with hand-drawn alternatives
- new user can create a shareable review artifact on day 1

## Horizon 2: 3-6 months (Phases N2, J, C, E, N4)

Priority:
Make MEMO clearly better than spreadsheets and ad hoc documents.

Actions:

- import provenance and re-import workflows (N2: #133 #135)
- named import recipes (N2: #136)
- UI-based element/relationship creation (J: #122 #123)
- traceability review dashboards and FMEA views (N3: #10 #11 #16 #17)
- usability engineering workbench (N4: #141)
- risk workbench (N4: #142)
- design review packet generation and baseline flows
- ontology cleanup as needed (Phase 1)

Success metrics:

- 80 percent of core startup use cases handled without direct SysML authoring
- review packet generation from imported or mixed-source models
- teams can operate MEMO as the working system backbone for at least one release cycle

## Horizon 3: 6-12 months (Phases N5, G, K)

Priority:
Make MEMO the category reference point.

Actions:

- public starter gallery (N5: #145)
- MEMO Cookbook (N5: #146)
- polished GPCA as showcase example (Phase G)
- template/package registry
- documentation site and manuals (Phase K)
- stronger collaboration-lite features

Success metrics:

- community examples become a top acquisition channel
- outside consultants recommend MEMO as default starting architecture stack
- investors, advisors, and incubators can review exported MEMO artifacts without learning the tool

## Viral Product Features To Prioritize

These features disproportionately improve adoption and recommendation:

- auto-generated architecture and scenario diagrams that are visually competitive with hand-drawn Lucidchart/Miro boards — from one command, from the model
- scenario walkthroughs that show the system doing something — the "aha" moment for reviewers
- beautiful static architecture site from one command
- clean traceability and risk views suitable for decks and reviews
- starter projects that look professional immediately
- public GPCA-quality example projects
- copyable patterns for common devices
- import recipes named after user reality:
  - "Excel requirements import"
  - "Hazard spreadsheet import"
  - "Miro architecture migration"
  - "Lucidchart architecture inventory import"

## Metrics That Matter

Do not measure success only by total features or ontology breadth.

Track:

- time to first useful output
- time to import first existing artifact
- time to first traceability view
- time to first review packet
- number of shared static exports generated
- number of starter projects created
- number of successful imports by source type
- repeat usage across 30 and 90 days
- number of external example/template contributions

## Anti-Goals

MEMO should not drift into these traps:

- trying to replace full QMS/PLM/ALM suites too early
- prioritizing cloud/multi-user before single-team workflows are excellent
- expanding ontology breadth faster than user comprehension
- requiring deep SysML knowledge to get value
- producing visually weak outputs that cannot compete with slides and diagrams made in generic tools

## Roadmap Additions — Implemented

The following milestones and issues have been created in GitLab:

### New milestones

| Milestone | Priority | Key Issues |
|-----------|----------|------------|
| Phase N0: Product Contract Stabilization | P0 | #125 #126 #127 #128 |
| Phase N1: Golden Path — First-Time User Experience | P0 | #129 #130 #131 #132 + #45 #43 #36 #40 |
| Phase N2: Import & Migration Backbone | P1 | #133 #134 #135 #136 + #124 |
| Phase N3: Review Outputs & Shareable Exports | P1 | #137 #138 #139 #140 + #34 #10 #11 #16 #17 |
| Phase N4: Medical Workbenches | P2 | #141 #142 #143 #144 + #41 |
| Phase N5: Viral Distribution & Community | P3 | #145 #146 |

### Existing phase changes

| Phase | Change |
|-------|--------|
| D (Diagrams & Views) | Promoted P2 → **P1** — diagrams are the core value proposition |
| F (Model & Scenarios) | Promoted P2 → **P1** — scenarios prove the model works |
| J (Import) | Promoted P2 → **P1** — import is adoption-critical |
| 1 (Ontology Cleanup) | Demoted P0 → **P1** — valuable but not adoption-blocking |
| C (Visual Ontology Viewer) | Demoted P1 → **P2** — not adoption-critical |

### Existing issues reassigned

- #45, #43, #36, #40 → Phase N1 (Golden Path)
- #124 → Phase N2 (Import & Migration)
- #34, #10, #11, #16, #17 → Phase N3 (Review Outputs)
- #41 → Phase N4 (Medical Workbenches)
- #122, #123 → promoted to priority::critical

## Final Standard

The standard for roadmap prioritization should be:

> Does this make MEMO the easiest free way for a medical-device team to go from idea or messy artifacts to a credible, reviewable, traceable engineering baseline?

If the answer is not clearly yes, it should not displace work that does.
