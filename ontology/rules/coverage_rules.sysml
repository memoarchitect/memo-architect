// C2 coverage rule packs per regulatory standard — Epic N-3.
// Each standard has at least one coverage rule ensuring the model
// addresses the standard's key requirements.
package memo::rules::coverage {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    // ─── ISO 14971: Risk Management ──────────────────────────────────────

    part iso14971HazardCoverage : CoverageConsistencyRule {
        attribute id = "COV-14971-001";
        attribute name = "HazardIdentificationCoverage";
        attribute description = "Model must contain at least one Hazard for risk management";
        attribute appliesTo = "Hazard";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "ISO 14971 clause 5.4 requires hazard identification.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "ISO 14971";
        attribute clause = "5.4";
        attribute coverageTarget = "Hazard";
    }

    part iso14971RiskMatrixCoverage : CoverageConsistencyRule {
        attribute id = "COV-14971-002";
        attribute name = "RiskMatrixCoverage";
        attribute description = "Model must contain a RiskMatrix for risk evaluation";
        attribute appliesTo = "RiskMatrix";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "ISO 14971 clause 5.5 requires risk estimation and evaluation criteria.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "ISO 14971";
        attribute clause = "5.5";
        attribute coverageTarget = "RiskMatrix";
    }

    part iso14971ResidualRiskCoverage : CoverageConsistencyRule {
        attribute id = "COV-14971-003";
        attribute name = "ResidualRiskCoverage";
        attribute description = "Model must contain residual risk evaluation";
        attribute appliesTo = "OverallResidualRiskEvaluation";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "ISO 14971 clause 8 requires overall residual risk evaluation.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "ISO 14971";
        attribute clause = "8";
        attribute coverageTarget = "OverallResidualRiskEvaluation";
    }

    // ─── IEC 62304: Software Lifecycle ───────────────────────────────────

    part iec62304SwArchCoverage : CoverageConsistencyRule {
        attribute id = "COV-62304-001";
        attribute name = "SoftwareArchitectureCoverage";
        attribute description = "Model must contain at least one SoftwareComponent";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 62304 clause 5.3 requires software architecture.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "IEC 62304";
        attribute clause = "5.3";
        attribute coverageTarget = "SoftwareComponent";
    }

    part iec62304SwReqCoverage : CoverageConsistencyRule {
        attribute id = "COV-62304-002";
        attribute name = "SoftwareRequirementsCoverage";
        attribute description = "Model must contain software requirements";
        attribute appliesTo = "SoftwareRequirement";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 62304 clause 5.2 requires software requirements specification.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "IEC 62304";
        attribute clause = "5.2";
        attribute coverageTarget = "SoftwareRequirement";
    }

    // ─── FDA 21 CFR 820: Quality System ──────────────────────────────────

    part fda820DesignInputCoverage : CoverageConsistencyRule {
        attribute id = "COV-820-001";
        attribute name = "DesignInputCoverage";
        attribute description = "Model must contain system requirements as design inputs";
        attribute appliesTo = "SystemRequirement";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "21 CFR 820.30(c) requires design inputs including requirements.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "FDA 21 CFR 820";
        attribute clause = "820.30(c)";
        attribute coverageTarget = "SystemRequirement";
    }

    part fda820DesignVerificationCoverage : CoverageConsistencyRule {
        attribute id = "COV-820-002";
        attribute name = "DesignVerificationCoverage";
        attribute description = "Model must contain verification cases for design verification";
        attribute appliesTo = "VerificationCase";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "21 CFR 820.30(f) requires design verification.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "FDA 21 CFR 820";
        attribute clause = "820.30(f)";
        attribute coverageTarget = "VerificationCase";
    }

    // ─── ISO 13485: Quality Management ───────────────────────────────────

    part iso13485StakeholderNeedCoverage : CoverageConsistencyRule {
        attribute id = "COV-13485-001";
        attribute name = "StakeholderNeedCoverage";
        attribute description = "Model must capture stakeholder needs";
        attribute appliesTo = "StakeholderNeed";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "ISO 13485 clause 7.2 requires determination of customer requirements.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "ISO 13485";
        attribute clause = "7.2";
        attribute coverageTarget = "StakeholderNeed";
    }

    // ─── ISO 14155: Clinical Investigations ──────────────────────────────

    part iso14155UseContextCoverage : CoverageConsistencyRule {
        attribute id = "COV-14155-001";
        attribute name = "UseContextCoverage";
        attribute description = "Model must define use context for clinical setting";
        attribute appliesTo = "UseContext";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "ISO 14155 requires definition of clinical investigation context.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "ISO 14155";
        attribute clause = "6";
        attribute coverageTarget = "UseContext";
    }

    // ─── FDA Cybersecurity Guidance ──────────────────────────────────────

    part fdaCyberThreatCoverage : CoverageConsistencyRule {
        attribute id = "COV-CYBER-001";
        attribute name = "ThreatModelCoverage";
        attribute description = "Model must contain threat analysis";
        attribute appliesTo = "Threat";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "FDA cybersecurity guidance requires threat modeling.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "FDA Cybersecurity";
        attribute clause = "V.A";
        attribute coverageTarget = "Threat";
    }

    part fdaCyberAssetCoverage : CoverageConsistencyRule {
        attribute id = "COV-CYBER-002";
        attribute name = "CybersecurityAssetCoverage";
        attribute description = "Model must identify cybersecurity assets";
        attribute appliesTo = "CybersecurityAsset";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "FDA cybersecurity guidance requires asset identification.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "FDA Cybersecurity";
        attribute clause = "V.A";
        attribute coverageTarget = "CybersecurityAsset";
    }

    // ─── IEC 62366: Usability Engineering ────────────────────────────────

    part iec62366ActorCoverage : CoverageConsistencyRule {
        attribute id = "COV-62366-001";
        attribute name = "ActorCoverage";
        attribute description = "Model must define user actors for usability analysis";
        attribute appliesTo = "Actor";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "IEC 62366 clause 5.1 requires user profile specification.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "IEC 62366";
        attribute clause = "5.1";
        attribute coverageTarget = "Actor";
    }

    // ─── IEC 60601-1: General Safety ─────────────────────────────────────

    part iec60601HarmCoverage : CoverageConsistencyRule {
        attribute id = "COV-60601-001";
        attribute name = "HarmIdentificationCoverage";
        attribute description = "Model must identify potential harms";
        attribute appliesTo = "Harm";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 60601-1 clause 4.2 requires identification of hazards and harms.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "IEC 60601-1";
        attribute clause = "4.2";
        attribute coverageTarget = "Harm";
    }

    // ─── IEC 82304-1: Health Software ────────────────────────────────────

    part iec82304SwSystemCoverage : CoverageConsistencyRule {
        attribute id = "COV-82304-001";
        attribute name = "SoftwareSystemCoverage";
        attribute description = "Model must define the software system";
        attribute appliesTo = "SoftwareSystem";
        attribute predicate = RulePredicateKind::coverageCheck;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 82304-1 requires health software product definition.";
        attribute category = RuleCategoryKind::coverage;
        attribute standard = "IEC 82304-1";
        attribute clause = "6.1";
        attribute coverageTarget = "SoftwareSystem";
    }
}
