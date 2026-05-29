// C3 lifecycle rule pack — Epic N-4.
// Rules that enforce lifecycle-stage sequencing and completeness gates.
package memo::rules::lifecycle {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    part reqBeforeArchRule : ConsistencyRule {
        attribute id = "LC-001";
        attribute name = "RequirementsBeforeArchitecture";
        attribute description = "Requirements must exist before architecture elements are created";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "IEC 62304 requires requirements to precede architecture decomposition.";
        attribute category = RuleCategoryKind::lifecycle;
    }

    part riskBeforeVerificationRule : ConsistencyRule {
        attribute id = "LC-002";
        attribute name = "RiskAnalysisBeforeVerification";
        attribute description = "Risk controls must exist before verification cases are defined";
        attribute appliesTo = "VerificationCase";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Risk controls drive verification scope per ISO 14971.";
        attribute category = RuleCategoryKind::lifecycle;
    }

    part evidenceAfterVerificationRule : ConsistencyRule {
        attribute id = "LC-003";
        attribute name = "EvidenceAfterVerification";
        attribute description = "Evidence records should reference completed verification cases";
        attribute appliesTo = "Evidence";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::info;
        attribute rationaleText = "Evidence is produced by executing verification — ordering matters for DHF assembly.";
        attribute category = RuleCategoryKind::lifecycle;
    }
}
