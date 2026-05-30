# North Star Plan: Open-Source Medical Device as Code

**Date:** 2026-05-02  
**Working name:** MEMO Architect  
**Thesis:** an open-source, Git-native, SysML v2-centered platform for modeling, documenting, reviewing, analyzing, and tracing medical-device architecture as code.

## 1. Executive Summary

Medical-device teams are being forced into a bad tradeoff. Legacy MBSE tools can express rich architectures but are expensive, specialist-owned, hard to review in normal engineering workflows, and weakly aligned with software-style change control. Requirements and QMS tools can manage regulated artifacts but usually treat architecture as a document attachment rather than an analyzable model. Git-native software teams can move quickly, but their architecture, hazards, verification evidence, cybersecurity arguments, and DHF outputs often live in scattered Markdown, spreadsheets, tickets, diagrams, and PDFs.

The unmet need is a practical middle path: a modeling and documentation platform that is rigorous enough for regulated systems engineering, open enough to interoperate with the SysML v2 ecosystem, and familiar enough for engineers who already work in Git, pull requests, CI, Markdown, and code review.

Medical-device-as-code is compelling because medical devices are increasingly software-defined, connected, AI-assisted, cyber-exposed, and evidence-heavy. Teams need a stable trace from intended use and user needs through system requirements, software requirements, architecture, hazards, controls, verification, validation, SOUP, SBOM, and regulatory evidence. That trace should be machine-checkable and reviewable at every change.

Open source can win if it does not try to be a cheaper clone of Cameo, CATIA Magic, Teamcenter, Jama, or Polarion. The winning wedge is not "full enterprise MBSE on day one." The wedge is:

1. Text-first SysML v2 medical-device model libraries.
2. Git-native review and CI validation.
3. Traceability and regulatory evidence generation from the model.
4. Interoperability with SysON, Syside, Sysand, SysML v2 textual notation, the SysML v2 API, ReqIF, OSLC, Markdown, JSON, CSV, and existing documentation pipelines.

The product should become the default tool for teams that want to start MBSE without buying into tool lock-in. The open-source repo must be useful even without the full web UI: install the CLI, open a GPCA pump reference model, edit `.sysml`, run `memo validate`, see missing trace links, generate a DHF index, and review the change in Git.

## Sources Used For Market Comparison

- SysGit positions itself as "the collaboration layer for complex hardware" using requirements, systems modeling, automation, SysML v2 textual notation, and Git infrastructure: <https://www.sysgit.io/> and <https://www.sysgit.io/features>.
- Dalus positions itself as an AI-driven collaborative systems engineering platform for hardware architecture, requirements, simulation, hazard analysis, test planning, and SysML v2-based modeling: <https://www.dalus.io/> and OMG tool listing <https://www.omg.org/sysml/sysmlv2/sysml-tool/>.
- Syside is a SysML v2 text-first tool suite with VS Code editing, validation, generated diagrams, automation, Python APIs, custom validation rules, and Sysand packaging: <https://docs.sensmetry.com/> and <https://sensmetry.com/syside/>.
- SysON is an Eclipse open-source, web-based SysML v2 modeler with graphical, textual, form, and table editors, with goals around SysML v2 language concepts, REST API, and textual interoperability: <https://mbse-syson.org/>, <https://projects.eclipse.org/projects/modeling.syson>, and <https://doc.mbse-syson.org/syson/main/user-manual/what-is.html>.
- OMG SysML v2 tool list confirms the broader ecosystem: commercial web modelers, Syside/Sysand, SysON, SysGit, Dalus, Cameo/CATIA Magic, SysML v2 API-based viewers, SysML textual tooling, and integration platforms: <https://www.omg.org/sysml/sysmlv2/sysml-tool/>.
- FDA design controls require documented design planning, design input, output, review, verification, validation, transfer, changes, and DHF records for applicable devices: <https://www.fda.gov/medical-devices/premarket-approval-pma/pma-quality-system>.
- IEC 62304 defines medical-device software life-cycle requirements and a common process framework for medical-device software: <https://www.iso.org/standard/38421.html>.
- ISO 14971 defines terminology, principles, and process expectations for medical-device risk management: <https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/07/27/72704.html>.
- ISO 13485 defines medical-device quality-management-system requirements for regulatory purposes: <https://www.iso.org/standard/59752.html>.
- IEC 62366-1 covers usability engineering as it relates to safety: <https://www.iso.org/standard/63179.html>.
- FDA cybersecurity guidance and pages emphasize connected-device cybersecurity risk, section 524B expectations, and premarket documentation recommendations: <https://www.fda.gov/medical-devices/digital-health-center-excellence/cybersecurity> and <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-management-system-considerations-and-content-premarket>.

## 2. Target Users And User Needs

| Persona | Problem | Desired outcome | Current workaround | Severity | Frequency | Open-source adoption driver | Regulated-device relevance | Priority |
|---|---|---|---|---|---|---|---|---|
| Systems engineer | Architecture is split across diagrams, docs, requirements tools, and spreadsheets. | Author a SysML v2 architecture as code with generated views and analyzable relationships. | Cameo diagrams, Visio, PowerPoint, spreadsheets, static PDFs. | Critical | Daily | Text-first modeling, Git reviews, reusable libraries. | Core design input/output and architecture evidence. | P0 |
| Medical device software engineer | Software architecture and safety requirements drift from implementation and CI. | Link software items, interfaces, hazards, SOUP, tests, and SBOMs to requirements. | Markdown, Jira links, manual trace matrices, static SRS/SAD docs. | Critical | Daily | CLI, CI, VS Code, JSON, SBOM import. | IEC 62304 software lifecycle and SOUP evidence. | P0 |
| Quality engineer | DHF evidence is manually assembled and hard to audit. | Generate DHF indexes, trace matrices, review records, and readiness reports from versioned model state. | Document control folders, spreadsheets, manual PDF packages. | Critical | Weekly | Transparent artifacts, no black-box SaaS dependency. | FDA design controls, ISO 13485 records. | P0 |
| Regulatory affairs lead | Architecture evidence is hard to explain and expensive to keep consistent. | Produce reviewable, regulator-facing evidence packages with clear provenance and disclaimers. | Manual submission documents and cross-functional reviews. | High | Monthly | Exportable Markdown/HTML/PDF, audit-friendly Git history. | Design controls, risk management, cybersecurity documentation. | P0 |
| Safety/risk engineer | Hazards, hazardous situations, harms, controls, and verification are detached from architecture. | Maintain a risk graph connected to functions, interfaces, data flows, alarms, software items, and tests. | FMEA spreadsheets, hazard logs, standalone bowties. | Critical | Weekly | Model libraries for ISO 14971-style concepts. | Risk management file, control verification. | P0 |
| V&V engineer | Verification coverage is discovered late and evidence is hard to connect to requirements. | See unverified requirements, planned tests, executed evidence, and impact of model changes. | Test management exports, manual trace tables. | High | Weekly | CI reports, JUnit output, generated matrices. | Verification and validation records. | P0 |
| Startup CTO | Needs credible regulated engineering without a heavy enterprise tool rollout. | Start with templates, examples, CLI checks, GitHub/GitLab workflow, and exportable docs. | Consultants, ad hoc docs, heavyweight tools deferred until audit pressure. | Critical | Weekly | Free core, low setup cost, visible community. | Faster design-control maturity. | P0 |
| Academic/research user | Needs teachable SysML v2 and medical-device examples. | Use open examples, assignments, notebooks, and model analysis scripts. | Toy models, vendor trial licenses, generic MBSE examples. | Medium | Semesterly | Open license, reproducible examples. | Workforce development and research credibility. | P1 |
| Consultant | Needs repeatable client engagement assets without forcing one vendor stack. | Use templates, validation rules, reference models, and export packages across clients. | Internal templates, spreadsheets, tool-specific profiles. | High | Weekly | Extensible libraries and plugin system. | Design control, risk, V&V advisory delivery. | P1 |
| Open-source contributor | Wants meaningful modeling, validation, UI, or adapter work. | Contribute model libraries, importers, checks, examples, and docs without becoming a regulatory expert. | Fragmented MBSE projects with unclear contribution paths. | Medium | Monthly | Clear issues, schemas, tests, governance. | Community-reviewed regulated-domain patterns. | P1 |

## 3. Jobs To Be Done

| Job | Trigger | Successful outcome | MVP expression |
|---|---|---|---|
| Model device architecture as code | A team starts or changes device architecture. | Components, functions, interfaces, flows, constraints, hazards, and requirements are in `.sysml`. | Textual SysML v2 model plus MEMO medical ontology package. |
| Generate documentation from models | A design review, audit, submission, or investor diligence request needs documents. | SRS, SAD, ICD, risk summary, trace matrix, and DHF index are generated from model state. | Markdown generation with stable links and provenance. |
| Maintain requirements-risk-verification traceability | A requirement, hazard, or test changes. | Missing, stale, and suspect links are visible in CLI, CI, and UI. | Trace graph and `memo trace check`. |
| Run architecture consistency checks | A PR modifies model structure. | Invalid ports, missing units, orphan elements, cycles, incomplete controls, and broken references fail CI. | Rule engine with JSON/JUnit output. |
| Analyze safety, interfaces, data flows, and dependencies | A design decision changes risk or software classification. | Impacted hazards, controls, software items, SOUP, tests, and documents are listed. | Graph queries and impact report. |
| Review model changes through Git pull requests | A team wants architecture review to happen like code review. | Diffs are textual, diagrams regenerate, CI comments show model risks. | `.sysml` diffs, generated views, CI templates. |
| Exchange SysML models with other tools | A customer uses SysON, Syside, Cameo, Capella, or another repository. | Core model round-trips through standards without MEMO-only semantics blocking use. | SysML v2 textual import/export and Sysand package. |
| Produce regulatory-ready evidence packages | A milestone requires design-control evidence. | Evidence is organized, traceable, reviewable, and exportable, with no claim of automatic compliance. | DHF descriptor compiler and evidence readiness report. |

## 4. Competitive Analysis

| Dimension | SysGit | Dalus | Syside | SysON | MEMO opportunity |
|---|---|---|---|---|---|
| Open source vs commercial | Commercial platform. | Commercial platform. | Mixed: free editor, commercial Pro tools, open Sysand. | Open source under Eclipse. | Open core medical-device model libraries, CLI, validators, docs, and reference models. |
| Text-first vs graphical-first | Git/text orientation with graphical editing. | Collaborative graphical/ontology-driven platform with AI. | Strong text-first VS Code workflow. | Web graphical-first with textual support. | Text-first core with generated diagrams and optional web UI. |
| Git-native support | Core differentiator: Git storage and PR-like workflows. | Versioning/collaboration, not primarily public Git-native OSS. | Works naturally with files and VS Code; collaboration varies by offering. | Web repository model; Git workflows are not its main wedge. | Git is the persistence model for source projects. |
| SysML v2 compliance | Uses SysML v2 textual notation and modeling. | Built on SysML v2 per public positioning and OMG listing. | Strong SysML v2 textual support and analysis. | Explicitly targets SysML v2 language, REST API, and textual interoperability. | Must pass interop gates against SysON/Syside/Sysand and avoid proprietary core syntax. |
| Interoperability | Git infrastructure and SysML v2 textual notation. | SysML v2-oriented; enterprise integrations likely commercial. | SysML v2 APIs, Python, package manager. | Open standard API and textual exchange goals. | Treat import/export as product surface, not checkbox. |
| Medical-device suitability | Adjacent: complex hardware, government/defense. | Adjacent: aerospace, defense, automotive, robotics, hazard analysis. | Generic systems-as-code; can support medical via custom libraries. | Generic MBSE; can be extended. | Medical-device domain ontology, examples, and evidence generators are the wedge. |
| Requirements management | Strong public emphasis. | Strong public emphasis. | Possible through modeling/automation, not primary standalone RM product. | Supports requirements modeling. | Requirements as model elements plus ReqIF/OSLC adapters, not a full Jama clone. |
| Architecture analysis | Systems engineering automation. | Architecture, simulation, trade studies, hazard analysis. | Python analysis and custom validation rules. | Modeling and visualization, analysis less central. | Medical-specific checks: hazards, controls, SOUP, trust boundaries, readiness scoring. |
| Simulation/automation | Automation-oriented. | Strong simulation/performance positioning. | Automator and Python APIs. | Early modeling environment, simulation not primary. | Start with static analysis and trace impact; defer full simulation. |
| AI support | Automation and AI messaging. | AI-native/copilot positioning. | AI-assisted workflows. | Not primary. | AI optional and explainable; never core truth or compliance claim. |
| Extensibility | Enterprise platform. | Enterprise platform. | Python APIs, DSL support, package manager. | Eclipse/Sirius Web extensibility. | Plugin API for validators, importers, generators, domain libraries. |
| Deployment model | Client executable or IT-managed Kubernetes; data stays in Git. | Cloud-hosted or on-prem enterprise. | Desktop/VS Code plus Python automation. | Web app. | CLI first, local files first, optional web server, self-hostable. |
| Community potential | Commercial adoption, not OSS community-led. | Commercial adoption, not OSS community-led. | Strong developer/user community potential via VS Code and Sysand. | Strong Eclipse community potential. | Medical-device OSS community around examples, rules, and evidence templates. |
| Lock-in risk | Lower than classic MBSE if Git/SysML remain accessible, but platform-specific workflows remain. | Higher commercial platform risk. | Moderate: textual source helps; Pro features may be proprietary. | Low for open-source core; repository formats still matter. | Must design every core artifact to be readable and exportable without MEMO. |

### Broader Ecosystem Patterns

- Web-based graphical modelers are improving but still chasing mature SysML v1 ergonomics. Their strength is stakeholder accessibility; their weakness is code review, composable automation, and source-control-native collaboration.
- VS Code/text-first tools are the fastest path for early SysML v2 adoption because textual notation, LSP validation, and generated views fit existing developer workflows.
- Git-native system-as-code workflows are becoming the collaboration wedge for hardware and MBSE because branching, merging, review, CI, and provenance are familiar.
- Commercial MBSE platforms retain advantages in enterprise deployment, diagram maturity, simulation, training ecosystems, and procurement credibility.
- Eclipse ecosystem tools provide open-source legitimacy and extensibility but can be heavy for startups and software-first teams.
- Requirements and traceability platforms are excellent at records and reviews but are usually not the architectural source of truth.
- Analysis and simulation tools will remain heterogeneous; the realistic strategy is to export structured model slices to them rather than rebuild them.

### Whitespace

The open whitespace is a medical-device-specific, open-source, text-first, Git-native layer on top of SysML v2. SysON is the open graphical modeler. Syside is the text/automation workbench. SysGit is commercial Git-for-hardware. Dalus is commercial AI-native collaborative MBSE. None of them is the open medical-device-as-code repo with reusable ISO 14971/IEC 62304/FDA design-control modeling libraries, CI checks, DHF generation, and reference medical-device examples.

## 5. Product Positioning

- **One-line positioning:** MEMO Architect is an open-source medical-device-as-code platform for modeling architecture, risk, requirements, verification, and DHF evidence in Git using SysML v2.
- **Category name:** Medical Device as Code.
- **Target audience:** regulated hardware/software teams building connected, software-defined, safety-relevant medical devices.
- **Primary promise:** keep architecture, traceability, risk controls, verification evidence, and documentation synchronized through open models, Git review, and CI validation.
- **Why now:** SysML v2 standardizes textual notation and APIs; regulated devices are more software-defined; cybersecurity/SBOM/evidence pressure is rising; engineering teams expect Git-native workflows.
- **Strategic wedge:** start with medical-device SysML v2 libraries, CLI validation, traceability, docs generation, and reference models.
- **Long-term vision:** the open digital engineering substrate for regulated medical devices, with a plugin ecosystem for analysis, evidence, import/export, visualization, and domain packages.
- **Anti-positioning against legacy MBSE tools:** not a diagram vault, not a specialist-only modeling island, not a proprietary repository that traps evidence, and not a compliance theater generator.
- **Open-source community message:** bring regulated systems engineering into normal engineering workflows without surrendering interoperability.

## 6. Architecture Proposal

The current repo roadmap already points in the right direction: SysML-first, CLI-second, UI-last. Preserve that ordering.

```text
                VS Code extension        Web UI
                       |                  |
                       v                  v
                   Language Server     API server
                       |                  |
                       +--------+---------+
                                |
                             CLI core
                                |
       +------------------------+-------------------------+
       |                        |                         |
 SysML parser/loader     Traceability graph       Generator runtime
       |                        |                         |
 Validation engine       Analysis engine          Docs/evidence exporters
       |                        |                         |
       +------------- Git workspace / package cache ------+
                                |
         SysML v2 text, JSON/YAML sidecars, Markdown, evidence files
```

### Components

| Component | Responsibility | Boundary |
|---|---|---|
| SysML v2 core model layer | Load, parse, normalize, index, and emit SysML v2 textual models. | No medical-device policy in the core parser. |
| Medical ontology package | Defines device concepts: intended use, needs, requirements, hazards, controls, SOUP, data flows, evidence. | Published as SysML packages; usable without MEMO UI. |
| Methodology packages | Select scope, aliases, workflows, rule strengths, artifacts, and viewpoint sets. | Tailoring layer, not forked ontology. |
| Git storage model | Store source `.sysml`, manifests, generated docs, evidence references, and baselines in a normal repo. | Git is persistence and review substrate, not hidden database. |
| Model validation engine | Runs syntax, semantic, trace, domain, and style checks. | Emits JSON, SARIF where useful, and JUnit for CI. |
| Traceability graph | Materialized index over SysML relationships and imported artifacts. | Derived data; rebuildable from source. |
| Architecture analysis engine | Graph queries, completeness checks, interface checks, unit checks, dependency analysis, safety impact. | Rule plugins operate on stable model graph APIs. |
| Documentation generator | Generates Markdown/HTML/PDF-ready outputs from document-backed views. | Generated files must declare source model commit and generator version. |
| Regulatory evidence generator | Compiles DHF index, trace matrices, review packages, risk summaries, SOUP/SBOM evidence links. | Must never claim automatic compliance. |
| Plugin system | Loads validators, importers, exporters, generators, renderers, and domain libraries. | Versioned plugin API with capability declarations. |
| CLI | Primary workflow: init, validate, analyze, trace, docs, import, export, package. | Every persistent UI action wraps CLI-equivalent behavior. |
| Web UI | Thin interactive view over model graph, trace, docs, diagrams, and review status. | UI does not own truth. |
| VS Code integration | LSP diagnostics, navigation, snippets, tasks, generated preview links. | Should work with plain files. |
| API server | Serves model graph, diagnostics, generated views, and analysis results to UI/integrations. | Stateless or rebuildable cache; source remains Git. |
| Import/export adapters | SysML text/API, ReqIF, OSLC, CSV, JSON, YAML, Markdown, SBOM, Capella/Cameo bridges where practical. | Adapters must preserve provenance and report lossy transforms. |
| Package/library manager | Sysand-compatible packaging for model libraries and methodology packages. | Avoid MEMO-only package semantics where Sysand can carry the package. |
| CI/CD integration | GitHub Actions, GitLab CI, pre-commit, PR comments, artifacts. | Starts with CLI and machine outputs. |

### Persistence Choices

- `.sysml` is the canonical semantic source for model elements and relationships.
- `memo.config.yaml` is project configuration, methodology pinning, and runtime options.
- `memo.package.yaml` can exist only as a thin transitional manifest; do not duplicate model catalogs there.
- Generated Markdown, HTML, PDF, SVG, JSON, JUnit, SARIF, and trace matrices are derived artifacts.
- Cached graph databases are allowed for speed but must be disposable.
- Evidence files can be referenced by URI/path with hashes and metadata; binary evidence should not become core model syntax.

## 7. Interoperability Strategy

### Principles

1. The user can leave with readable `.sysml`, Markdown, CSV/JSON, and exported evidence.
2. MEMO-specific semantics live in explicit libraries and metadata, not hidden repository state.
3. Imports must preserve source identifiers, timestamps, provenance, and lossy-transform warnings.
4. Exports must support a "standard-only" mode that strips MEMO convenience metadata.
5. Generated docs and diagrams must be reproducible from versioned source.
6. Do not require the web UI, cloud account, or hosted service to access the model.

### Tool And Standard Alignment

| Target | Strategy |
|---|---|
| SysML v2 textual notation | Canonical source format. CI must parse exported packages with independent tooling where possible. |
| OMG SysML v2 API | Provide API-compatible read endpoints for model query and plan write support only after text round-trip is stable. |
| SysON | Validate import of MEMO packages into SysON; use SysON for graphical authoring where teams want open web MBSE. |
| Syside | Support VS Code text workflows, generated diagrams, and analysis interop; avoid conflicting package conventions. |
| SysGit | Position as complementary: MEMO model libraries and medical checks can live in Git workflows, SysGit-like enterprise collaboration can consume the same textual model. |
| Dalus | Export/import SysML v2 textual packages and structured requirements/risk data; do not try to match AI copilot or simulation first. |
| Cameo/CATIA Magic | Support SysML v2 textual/API exchange where available; provide lossy import reports from SysML v1/XMI where practical later. |
| Capella | Bridge architecture concepts through export/import adapters and mapping docs; treat Arcadia as adjacent, not identical to SysML v2. |
| ReqIF | Import/export requirements, identifiers, attributes, status, and trace links with explicit mapping profiles. |
| OSLC | Use for linking requirements, change requests, test cases, and lifecycle artifacts in enterprise tools. |
| GitHub/GitLab | CI templates, PR/MR checks, model diff summaries, artifact uploads, issue links. |
| Markdown/HTML/PDF | Documentation generator primary outputs. PDF is packaging, not source. |
| CSV/JSON/YAML | Bulk import/export, configuration, evidence manifests, analysis reports. |
| SBOM/artifacts | Import CycloneDX/SPDX where useful, connect SOUP/software items to hazards, controls, and V&V evidence. |

## 8. Medical Device Domain Model

The domain model should be a SysML v2 library, not a private database schema. It should map to common regulatory concepts while making a hard disclaimer: MEMO helps structure and check evidence; it does not certify compliance.

| Concept | Model element | Key relationships | Regulatory relevance |
|---|---|---|---|
| Intended use | `IntendedUse` | constrains user needs, validation, clinical claims | FDA design validation, labeling context |
| User needs | `UserNeed` | refined by system requirements, validated by validation activities | FDA design input and validation |
| System requirements | `SystemRequirement` | satisfies needs, allocated to architecture, verified by tests | Design input/output trace |
| Software requirements | `SoftwareRequirement` | derived from system reqs and risk controls, allocated to software items | IEC 62304 software requirements |
| Hazards | `Hazard` | leads to hazardous situations | ISO 14971 risk analysis |
| Hazardous situations | `HazardousSituation` | may result in harms; caused by failures/use errors | ISO 14971 risk estimation |
| Harms | `Harm` | severity, clinical effect | ISO 14971 severity rationale |
| Risk controls | `RiskControl` | mitigates hazard/hazardous situation; verified by tests | ISO 14971 control implementation and effectiveness |
| Verification activities | `VerificationActivity` | verifies requirements, controls, interfaces | FDA design verification |
| Validation activities | `ValidationActivity` | validates user needs/intended use | FDA design validation |
| SOUP dependencies | `SOUPComponent` | used by software item; linked to SBOM, vulnerabilities, risks | IEC 62304 SOUP management |
| Cybersecurity threats | `CyberThreat` | exploits data flow/trust boundary; mitigated by controls | FDA cybersecurity documentation |
| Data flows | `DataFlow` / SysML item flows | crosses interfaces/trust boundaries | Software architecture, cyber, privacy |
| Alarms | `Alarm` | mitigates hazardous situations; has priority, latency, verification | Safety and usability |
| Usability risks | `UseError`, `CriticalTask` | causes hazardous situations; mitigated by UI/control/training | IEC 62366-1 usability engineering |
| Clinical claims | `ClinicalClaim` | supported by validation/evidence | Regulatory submission support |
| Regulatory evidence | `EvidenceArtifact` | supports verification, validation, review, risk decisions | DHF and audit trail |

### Standards Mapping

- **ISO 14971:** hazards, foreseeable sequences of events, hazardous situations, harms, risk estimation, risk evaluation, controls, residual risk, benefit-risk rationale, production/post-production feedback.
- **IEC 62304:** software system/item/unit, software safety classification, software requirements, architecture, detailed design, unit/integration/system verification, SOUP, anomalies, release evidence.
- **IEC 62366-1:** user profiles, use environments, user interface characteristics, critical tasks, use scenarios, use errors, usability validation evidence.
- **ISO 13485:** document control references, quality records, review/approval metadata, process evidence links. MEMO should support records but not implement a full QMS.
- **FDA design controls:** design plan, inputs, outputs, reviews, verification, validation, transfer, changes, DHF index.
- **Cybersecurity documentation:** threat modeling, trust boundaries, security controls, SBOM/SOUP, vulnerability evidence, secure update assumptions.

## 9. Architecture Analysis Capabilities

| Analysis | What it checks | MVP rule |
|---|---|---|
| Missing trace links | Needs without requirements, requirements without verification, controls without verification. | Fail CI for required links under selected methodology. |
| Unverified requirements | Requirements with no planned or executed verification. | Report by requirement type and safety relevance. |
| Orphaned risks | Hazards/hazardous situations with no controls or acceptance rationale. | Fail for P0 medical methodology. |
| Uncovered hazards | Components/functions/interfaces with no associated risk analysis. | Warn initially, fail in strict mode. |
| Interface mismatch | Connected ports with incompatible item types, direction, units, or multiplicity. | Fail. |
| Cyclic dependencies | Architecture or requirement cycles that indicate unclear ownership. | Warn or fail by layer. |
| Inconsistent units | Physical quantities missing ISQ/SI typing or incompatible units. | Fail for controlled interfaces. |
| Unsafe data-flow paths | Safety-critical data crossing untrusted or unverified boundaries. | Warn with path evidence. |
| Trust-boundary checks | External interfaces without threat analysis or security controls. | Fail in cyber-enabled profiles. |
| Software safety classification impact | Change affects Class B/C software item or risk control. | Require impact review marker. |
| Change impact analysis | Lists downstream requirements, risks, tests, docs, SOUP, and evidence affected by a diff. | PR/MR report. |
| Architecture completeness score | Measures required element families and links present. | Score only; do not gamify compliance. |
| Evidence readiness score | Shows missing DHF artifacts, stale generated docs, unapproved reviews. | Score plus concrete missing items. |

## 10. Roadmap

### 0-3 Months: Credible MVP

| Area | Plan |
|---|---|
| Product capabilities | CLI init/validate/trace/docs; GPCA pump reference model; SysML v2 medical ontology subset; generated Markdown docs; trace matrix; basic risk graph. |
| Technical milestones | Parser/loader stable for selected SysML subset; Sysand package build; JSON/JUnit outputs; missing-link checks; unit/interface checks; DHF descriptor prototype. |
| Community milestones | Public README, contribution guide, roadmap, design docs, good first issues, community calls. |
| Documentation/examples | GPCA pump tutorial, "medical device as code in 20 minutes", design-control disclaimer, SysML authoring guide. |
| Integrations | GitHub Actions, GitLab CI, VS Code tasks, Sysand package, SysON/Syside import smoke tests. |
| Risks | Overbuilding UI, weak SysML compliance, too much regulatory scope, examples that feel toy-like. |
| Success metrics | 100 GitHub stars, 10 external issue/discussion participants, 3 external attempts to run examples, CI green on reference model, successful independent package import. |

### 3-6 Months: Early Adopter Release

| Area | Plan |
|---|---|
| Product capabilities | Expanded ontology; methodology packages; evidence generator; change impact reports; generated diagrams; SOUP/SBOM linking; cyber trust-boundary checks. |
| Technical milestones | Stable trace graph API; plugin validator API; ReqIF import/export alpha; CycloneDX/SPDX import; SARIF output; web UI read-only dashboard. |
| Community milestones | Early adopter design partners, academic pilot, first external plugin/library contribution. |
| Documentation/examples | Reference models for infusion pump, connected wearable, SaMD workflow; comparison pages against spreadsheets and legacy MBSE. |
| Integrations | SysON round-trip guide, Syside authoring guide, GitHub/GitLab PR comments, Markdown/PDF publishing. |
| Risks | Domain model becomes opinionated in ways users cannot tailor; import/export quality disappoints. |
| Success metrics | 500 stars, 25 contributors/discussion participants, 5 design partners, 2 external talks/blogs, at least one successful pilot in a startup or research group. |

### 6-12 Months: Community Expansion

| Area | Plan |
|---|---|
| Product capabilities | Web UI for trace/risk/DHF navigation; model diff viewer; configurable rule profiles; richer diagrams; review workflows; OSLC/ReqIF beta. |
| Technical milestones | Versioned plugin API; package registry story; model query API; read-only SysML v2 API compatibility subset; importer framework; performance benchmarks. |
| Community milestones | Governance charter, maintainer ladder, domain working groups, university course material, conference workshops. |
| Documentation/examples | Full medical-device-as-code book/tutorial, "from user need to verification evidence" walkthrough, migration guides. |
| Integrations | Cameo/CATIA Magic export/import experiments, Capella mapping guide, requirements tool connectors. |
| Risks | Enterprise users demand full QMS/RM features; maintainers drown in support; standards churn breaks assumptions. |
| Success metrics | 2,000 stars, 20 recurring contributors, 10 public adopters, 5 plugins/libraries, 3 universities/research labs using examples. |

### 12-24 Months: Ecosystem And Enterprise Readiness

| Area | Plan |
|---|---|
| Product capabilities | Enterprise-ready self-hosted deployment, fine-grained review workflows, signed evidence packages, adapter marketplace, advanced analysis packs. |
| Technical milestones | Scalable graph storage option; stable public APIs; conformance test suite; package signing; multi-repo model composition; long-term support releases. |
| Community milestones | Foundation-style governance or neutral steering group, partner ecosystem, consultant network, annual community workshop. |
| Documentation/examples | Advanced regulatory evidence patterns, cybersecurity reference model, clinical workflow reference model, contributor certification for plugins. |
| Integrations | Mature OSLC, ReqIF, SBOM, GitHub/GitLab, documentation, SysML v2 API, and selected commercial adapter paths. |
| Risks | Commercial support path distorts open-source trust; adapter maintenance becomes expensive; project competes too directly with established platforms. |
| Success metrics | 10,000 stars, 50+ contributors, 25+ public adopters, credible enterprise pilots, recognized presence in MBSE and medical-device communities. |

## 11. Open Source Strategy

- **License:** Apache-2.0 for code and model libraries where possible. Use CC-BY-4.0 for documentation/examples if needed. Avoid copyleft for core if the goal is broad regulated-industry adoption.
- **Governance:** start benevolent-maintainer with public roadmap and RFCs; move to maintainer council once external contributors are active; publish decision records.
- **Contribution model:** clear issue labels, conformance tests, example-model tests, plugin API tests, contributor guide, security policy, code of conduct.
- **Plugin ecosystem:** validators, importers, exporters, renderers, domain libraries, report templates, analysis packs. Plugins declare capabilities and supported model/schema versions.
- **Reference models:** GPCA infusion pump first; then connected wearable, SaMD diagnostic workflow, surgical console subsystem, cybersecurity/SBOM example.
- **Community channels:** GitHub Discussions, Discord or Matrix, monthly office hours, mailing list for regulated users, contributor calls.
- **Documentation strategy:** docs must serve three tracks: "model author", "regulated evidence owner", and "tool/plugin developer".
- **Academic partnerships:** offer course-ready examples, reproducible notebooks, and research challenge datasets.
- **Certification/regulatory disclaimer:** every README, generated evidence package, and template must state that MEMO supports evidence organization and consistency checks but does not certify compliance or replace professional regulatory judgment.
- **Commercial path:** hosted collaboration, enterprise support, validation package assistance, custom adapters, training, and consulting. Keep ontology, CLI validation, core generators, and examples open to preserve trust.

## 12. Go-To-Market Strategy

- **Beachhead users:** medical-device startups with software-heavy products, consultants serving IEC 62304/ISO 14971 programs, university MBSE labs, open-source MBSE practitioners, and regulated teams frustrated by spreadsheet traceability.
- **Core message:** model the medical-device architecture once, review it in Git, and generate traceable evidence from the same source.
- **Demo storyline:** clone repo; open GPCA pump; edit a requirement and interface; run validation; see a missing risk-control verification fail CI; add link; regenerate DHF index and trace matrix; show SysON/Syside interoperability.
- **GitHub README positioning:** first screen should show a concrete CLI session, generated trace matrix screenshot, and GPCA model structure. Avoid vague MBSE promises.
- **Launch examples:** GPCA pump, SOUP/SBOM risk trace, cybersecurity trust boundary, design review package, requirements-to-risk-to-test matrix.
- **Technical blog topics:** "SysML v2 as code for medical devices", "DHF generation without locking your model in a vendor tool", "Risk controls as traceable architecture", "Using GitHub Actions for design-control checks", "SysON + MEMO + Syside workflow".
- **Conference targets:** INCOSE, AAMI, RAPS, MD&M, HLTH technical side events, Open Source Summit, EclipseCon, IEEE systems/software engineering venues, university MBSE workshops.
- **Community partnerships:** Eclipse SysON community, Syside/Sysand ecosystem, OpenMBEE, Capella community, medical-device software consultants, academic systems engineering labs.
- **Comparison pages:** vs spreadsheets, vs document-only QMS, vs legacy MBSE, vs SysON/Syside as complementary tools, vs commercial Git-for-hardware platforms.
- **Adoption metrics:** stars, clones, package downloads, example runs, CI template installs, external contributors, discussion activity, design partners, public reference-model forks.

## 13. Risks And Hard Truths

| Risk | Hard truth | Mitigation |
|---|---|---|
| SysML v2 maturity | The ecosystem is moving and no tool has perfect coverage. | Narrow supported subset, publish conformance matrix, run interop CI, avoid proprietary syntax. |
| Regulatory credibility | Open source does not make a tool acceptable for regulated work by itself. | Strong disclaimers, audit trails, deterministic generators, documentation, professional review workflows. |
| Medical-domain complexity | ISO 14971, IEC 62304, IEC 62366, FDA design controls, cyber, and quality systems are too broad for a naive ontology. | Start with practical slices and expert-reviewed reference models; keep tailoring explicit. |
| Legacy MBSE competition | Cameo/CATIA Magic and enterprise platforms are entrenched. | Do not compete on diagram completeness first; win on Git, openness, trace checks, and medical examples. |
| SysON/Syside overlap | The project could look redundant. | Position as the medical-device domain/evidence layer that interoperates with those tools. |
| Git merge complexity | SysML models can still create hard semantic conflicts. | Text conventions, stable IDs, model diff, semantic validation, package boundaries. |
| AI hype | AI-generated models can create subtle unsafe evidence. | AI must be optional, reviewable, provenance-marked, and never an authority. |
| Evidence generator liability | Users may overtrust readiness scores. | Scores list gaps only; generated output includes limitations and human approval checkpoints. |
| Contributor scarcity | Regulated-domain open-source contributors are rare. | Make non-regulatory contribution paths valuable: parser, diagrams, docs, examples, adapters. |
| Commercialization trust | Selling enterprise features can weaken OSS credibility. | Keep core model libraries, validators, CLI, docs generator, and examples open. Sell hosting/support/adapters. |

## 14. Final Recommendation

### Build First

Build the open SysML v2 medical-device model library, CLI validation engine, traceability graph, GPCA pump reference model, generated Markdown evidence package, and GitHub/GitLab CI templates. That is the credible 90-day product.

Day-one repo contents should include:

- `@memo/sysml-base` helpers.
- `@memo/ontology` medical-device subset.
- `@memo/methodology-default` and `@memo/methodology-gpca`.
- `examples/gpca-pump`.
- `memo init`, `memo validate`, `memo trace`, `memo docs`, `memo package`.
- JSON/JUnit outputs.
- Generated DHF index, trace matrix, SRS/SAD/RMP examples.
- SysON/Syside/Sysand interoperability notes.
- Clear regulatory disclaimer.
- Contribution guide and public roadmap.

### Do Not Build First

Do not build a full graphical MBSE replacement, full requirements management system, full QMS, AI copilot, simulation engine, enterprise permissions model, or proprietary repository. Those will slow the project and blur the wedge.

### Differentiator

The differentiator should be medical-device evidence as code: open SysML v2 libraries plus machine-checkable traces from intended use to architecture, risk controls, verification, validation, SOUP/SBOM, cybersecurity, and DHF documents.

### 90-Day Credibility

Within 90 days, the project is credible if an external engineer can clone it, edit the GPCA pump model in text, run validation in CI, see useful trace/risk failures, generate documents, and import/export enough SysML v2 to prove the model is not trapped.

### 12-Month Popularity

Within 12 months, the project becomes popular if it is the easiest way to learn and apply SysML v2 to a real regulated medical-device architecture, with reference models people cite, CI checks teams copy, and plugins/adapters that make the open ecosystem stronger instead of replacing it.
