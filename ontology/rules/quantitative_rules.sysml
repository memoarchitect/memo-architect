// C5 quantitative rule pack — Epic N-4.
// Rules enforcing numeric thresholds and cardinality bounds.
package memo::rules::quantitative {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    part hazardMaxControlsRule : RelationshipConsistencyRule {
        attribute id = "QT-001";
        attribute name = "HazardMaxRiskControls";
        attribute description = "A Hazard should not have more than 10 risk controls (suggests decomposition needed)";
        attribute appliesTo = "Hazard";
        attribute predicate = RulePredicateKind::cardinalityCheck;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::info;
        attribute rationaleText = "Excessive controls per hazard suggests the hazard is too broad and should be decomposed.";
        attribute category = RuleCategoryKind::quantitative;
        attribute relationshipType = "mitigates";
        attribute minCount = "0";
        attribute maxCount = "10";
        attribute direction = "incoming";
        attribute relatedKinds = "RiskControl";
    }

    part swComponentMaxInterfacesRule : RelationshipConsistencyRule {
        attribute id = "QT-002";
        attribute name = "SoftwareComponentMaxInterfaces";
        attribute description = "A SoftwareComponent should not expose more than 8 interfaces";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::cardinalityCheck;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::info;
        attribute rationaleText = "High interface count indicates excessive coupling; consider decomposition.";
        attribute category = RuleCategoryKind::quantitative;
        attribute relationshipType = "exposes";
        attribute minCount = "0";
        attribute maxCount = "8";
        attribute direction = "outgoing";
        attribute relatedKinds = "LogicalInterface";
    }

    part reqVerificationRatioRule : ConsistencyRule {
        attribute id = "QT-003";
        attribute name = "RequirementVerificationRatio";
        attribute description = "At least 80% of requirements should have verification cases";
        attribute appliesTo = "Requirement";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "High verification coverage is expected for regulatory submissions.";
        attribute category = RuleCategoryKind::quantitative;
    }
}
