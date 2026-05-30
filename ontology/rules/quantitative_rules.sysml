// C5 quantitative rule pack — native KerML constraints (Epic EE-3).
// Numeric cardinality bounds migrated from cardinalityCheck predicate parts to
// native `constraint def` bodies. The aggregate ratio rule (QT-003) is a
// model-level metric, not a single-subject predicate, and is omitted (see note).
package memo::rules::quantitative {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    constraint def hazardMaxControlsRule {
        attribute id = "QT-001";
        attribute appliesTo = "Hazard";
        attribute severity = RuleSeverityKind::info;
        attribute rationaleText = "Excessive controls per hazard suggests the hazard is too broad and should be decomposed.";
        require constraint { mitigates->size() >= 0 and mitigates->size() <= 10 }
    }

    constraint def swComponentMaxInterfacesRule {
        attribute id = "QT-002";
        attribute appliesTo = "SoftwareComponent";
        attribute severity = RuleSeverityKind::info;
        attribute rationaleText = "High interface count indicates excessive coupling; consider decomposition.";
        require constraint { exposes->size() >= 0 and exposes->size() <= 8 }
    }

    // QT-003 (RequirementVerificationRatio, "≥80% of requirements verified") is an
    // aggregate coverage metric over the whole requirement set, not a per-subject
    // predicate, so it has no `require constraint { … }` form. It remains a
    // model-level metric (completeness / coverage tooling), not a native constraint.
    // Do not reintroduce a `predicate="coverageCheck"` part for it.
}
