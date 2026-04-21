package MEMO_Ontology_Arch_Axioms {

    // ─── Disjointness ────────────────────────────────────────────────────────
    // Architectural layers are disjoint: a Hazard is not a Function, a
    // SoftwareComponent is not a HardwareComponent, etc. Expressed as
    // @disjoint annotations consumed by the OWL exporter.

    // @disjoint(MEMO_Ontology_Arch_Operational::System, MEMO_Ontology_Arch_Safety::Hazard)
    // @disjoint(MEMO_Ontology_Arch_Functional::Function, MEMO_Ontology_Arch_Hardware::HardwareComponent)
    // @disjoint(MEMO_Ontology_Arch_Software::SoftwareComponent, MEMO_Ontology_Arch_Hardware::HardwareComponent)
    // @disjoint(MEMO_Ontology_Arch_Safety::Hazard, MEMO_Ontology_Arch_Security::ThreatScenario)
    // @disjoint(MEMO_Ontology_Arch_Privacy::DataCategory, MEMO_Ontology_Arch_Security::Asset)
    // @disjoint(MEMO_Ontology_Arch_Verification::Requirement, MEMO_Ontology_Arch_Verification::Evidence)

    // ─── Cardinality Restrictions ────────────────────────────────────────────
    // Every Risk must identify at least one Hazard (ISO 14971 §4.2).
    // Every Mitigation must trace to at least one Risk.
    // Every VerificationCase must produce at least one Evidence.
    // Every SoftwareComponent with isSOUP=true must have a safetyClass set.

    // @restriction(MEMO_Ontology_Arch_Safety::Risk, IdentifiesRisk, min=1)
    // @restriction(MEMO_Ontology_Arch_Safety::Mitigation, Mitigates, min=1)
    // @restriction(MEMO_Ontology_Arch_Verification::VerificationCase, ProducesEvidence, min=1)

    // ─── SWRL Rules ──────────────────────────────────────────────────────────
    // RPN before mitigation = severity * probability (ordinal product).
    // @swrl initialRPN(?r) = ordinal(?r.initialSeverity) * ordinal(?r.initialProbability)

    // RPN after mitigation = residualSeverity * residualProbability.
    // @swrl residualRPN(?r) = ordinal(?r.residualSeverity) * ordinal(?r.residualProbability)

    // ResidualRisk acceptability: ALARP when 2 ≤ residualRPN ≤ 8, else Acceptable.
    // @swrl acceptability(?r, Unacceptable) :- residualRPN(?r, ?rpn), greaterThan(?rpn, 8)
    // @swrl acceptability(?r, ALARP)        :- residualRPN(?r, ?rpn), greaterThan(?rpn, 1), lessThanOrEqual(?rpn, 8)
    // @swrl acceptability(?r, Acceptable)   :- residualRPN(?r, ?rpn), lessThanOrEqual(?rpn, 1)

    // ─── SHACL Shapes ────────────────────────────────────────────────────────
    // Acyclicity: FaultTreeNode graph must be a DAG (no cycles).
    // @shacl FaultTreeAcyclicShape: sh:path ContributesTo; sh:flags acyclic

    // Schedulability: every ExecutionThread.wcet ≤ ExecutionThread.period.
    // @shacl SchedulabilityShape: sh:path wcet; sh:lessThan period

    // Hardware bounds: HardwareBoard.ipxxRating must match /^IP[0-6X][0-9KX]$/.
    // @shacl HardwareBoardIPShape: sh:path ipxxRating; sh:pattern "^IP[0-6X][0-9KX]$"

    // ResidualRisk closure gate (release gate): no Risk.acceptability = Unacceptable.
    // @shacl ReleaseGateShape: sh:path acceptability; sh:not [sh:hasValue Unacceptable]

    // Privacy processing must declare legalBasis.
    // @shacl ProcessingActivityLegalBasisShape: sh:path legalBasis; sh:minCount 1

    // Security control must have controlType set.
    // @shacl ControlTypeShape: sh:path controlType; sh:minCount 1

    // Requirement must have verificationMethod set.
    // @shacl RequirementVerificationShape: sh:path verificationMethod; sh:minCount 1
}
