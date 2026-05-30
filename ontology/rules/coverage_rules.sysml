// C2 coverage rule packs per regulatory standard — Epic EE-3.
//
// Coverage rules assert model-level *existence* ("the model must contain at least
// one X for standard S"). Existence over the whole model is not a single-subject
// boolean predicate, so it has no `require constraint { … }` body. The legacy
// `predicate="coverageCheck"` parts were likewise never evaluated by the rule engine
// (toClosureRule returned undefined for coverageCheck), so they produced no
// violations — parity is preserved by keeping these as metadata-only constraint defs.
//
// Each rule retains its standard / clause / coverageTarget metadata so the coverage
// catalog and DHF traceability stay intact; the constraint loader skips defs with no
// require/assert body, so none of these fire. Model-level coverage is reported by the
// completeness tooling, not the per-subject constraint evaluator. The proprietary
// `predicate="…"` attribute pattern is removed per EE-3.
package memo {
    package rules {
        package coverage {
            import memo::base::rules::*;
            import memo::core::enumerations::*;

            // ─── ISO 14971: Risk Management ──────────────────────────────────────

            constraint def iso14971HazardCoverage {
                attribute id = "COV-14971-001";
                attribute appliesTo = "Hazard";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "ISO 14971 clause 5.4 requires hazard identification.";
                attribute standard = "ISO 14971";
                attribute clause = "5.4";
                attribute coverageTarget = "Hazard";
            }

            constraint def iso14971RiskMatrixCoverage {
                attribute id = "COV-14971-002";
                attribute appliesTo = "RiskMatrix";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "ISO 14971 clause 5.5 requires risk estimation and evaluation criteria.";
                attribute standard = "ISO 14971";
                attribute clause = "5.5";
                attribute coverageTarget = "RiskMatrix";
            }

            constraint def iso14971ResidualRiskCoverage {
                attribute id = "COV-14971-003";
                attribute appliesTo = "OverallResidualRiskEvaluation";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "ISO 14971 clause 8 requires overall residual risk evaluation.";
                attribute standard = "ISO 14971";
                attribute clause = "8";
                attribute coverageTarget = "OverallResidualRiskEvaluation";
            }

            // ─── IEC 62304: Software Lifecycle ───────────────────────────────────

            constraint def iec62304SwArchCoverage {
                attribute id = "COV-62304-001";
                attribute appliesTo = "SoftwareComponent";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "IEC 62304 clause 5.3 requires software architecture.";
                attribute standard = "IEC 62304";
                attribute clause = "5.3";
                attribute coverageTarget = "SoftwareComponent";
            }

            constraint def iec62304SwReqCoverage {
                attribute id = "COV-62304-002";
                attribute appliesTo = "SoftwareRequirement";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "IEC 62304 clause 5.2 requires software requirements specification.";
                attribute standard = "IEC 62304";
                attribute clause = "5.2";
                attribute coverageTarget = "SoftwareRequirement";
            }

            // ─── FDA 21 CFR 820: Quality System ──────────────────────────────────

            constraint def fda820DesignInputCoverage {
                attribute id = "COV-820-001";
                attribute appliesTo = "SystemRequirement";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "21 CFR 820.30(c) requires design inputs including requirements.";
                attribute standard = "FDA 21 CFR 820";
                attribute clause = "820.30(c)";
                attribute coverageTarget = "SystemRequirement";
            }

            constraint def fda820DesignVerificationCoverage {
                attribute id = "COV-820-002";
                attribute appliesTo = "VerificationCase";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "21 CFR 820.30(f) requires design verification.";
                attribute standard = "FDA 21 CFR 820";
                attribute clause = "820.30(f)";
                attribute coverageTarget = "VerificationCase";
            }

            // ─── ISO 13485: Quality Management ───────────────────────────────────

            constraint def iso13485StakeholderNeedCoverage {
                attribute id = "COV-13485-001";
                attribute appliesTo = "StakeholderNeed";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "ISO 13485 clause 7.2 requires determination of customer requirements.";
                attribute standard = "ISO 13485";
                attribute clause = "7.2";
                attribute coverageTarget = "StakeholderNeed";
            }

            // ─── ISO 14155: Clinical Investigations ──────────────────────────────

            constraint def iso14155UseContextCoverage {
                attribute id = "COV-14155-001";
                attribute appliesTo = "UseContext";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "ISO 14155 requires definition of clinical investigation context.";
                attribute standard = "ISO 14155";
                attribute clause = "6";
                attribute coverageTarget = "UseContext";
            }

            // ─── FDA Cybersecurity Guidance ──────────────────────────────────────

            constraint def fdaCyberThreatCoverage {
                attribute id = "COV-CYBER-001";
                attribute appliesTo = "Threat";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires threat modeling.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.A";
                attribute coverageTarget = "Threat";
            }

            constraint def fdaCyberAssetCoverage {
                attribute id = "COV-CYBER-002";
                attribute appliesTo = "CybersecurityAsset";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires asset identification.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.A";
                attribute coverageTarget = "CybersecurityAsset";
            }

            constraint def fdaCyberVulnerabilityCoverage {
                attribute id = "COV-CYBER-003";
                attribute appliesTo = "Vulnerability";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires vulnerability analysis.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.B";
                attribute coverageTarget = "Vulnerability";
            }

            constraint def fdaCyberTrustBoundaryCoverage {
                attribute id = "COV-CYBER-004";
                attribute appliesTo = "TrustBoundary";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires trust boundary identification.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.A";
                attribute coverageTarget = "TrustBoundary";
            }

            constraint def fdaCyberThreatScenarioCoverage {
                attribute id = "COV-CYBER-005";
                attribute appliesTo = "ThreatScenario";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires threat scenario analysis.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.A";
                attribute coverageTarget = "ThreatScenario";
            }

            constraint def fdaCyberMitigationCoverage {
                attribute id = "COV-CYBER-006";
                attribute appliesTo = "CyberMitigation";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires risk mitigation.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.C";
                attribute coverageTarget = "CyberMitigation";
            }

            constraint def fdaCyberRiskCoverage {
                attribute id = "COV-CYBER-007";
                attribute appliesTo = "CyberRisk";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires cyber risk assessment.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.B";
                attribute coverageTarget = "CyberRisk";
            }

            constraint def fdaCyberHazardCoverage {
                attribute id = "COV-CYBER-008";
                attribute appliesTo = "CyberHazard";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires cyber-safety hazard mapping.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.B";
                attribute coverageTarget = "CyberHazard";
            }

            constraint def fdaCyberSecurityReqCoverage {
                attribute id = "COV-CYBER-009";
                attribute appliesTo = "SecurityRequirement";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "FDA cybersecurity guidance requires security requirements derivation.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.C";
                attribute coverageTarget = "SecurityRequirement";
            }

            constraint def fdaCyberVerificationCoverage {
                attribute id = "COV-CYBER-010";
                attribute appliesTo = "VerificationCase";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "FDA cybersecurity guidance requires security testing and verification.";
                attribute standard = "FDA Cybersecurity";
                attribute clause = "V.D";
                attribute coverageTarget = "VerificationCase";
            }

            // ─── IEC 62366: Usability Engineering ────────────────────────────────

            constraint def iec62366ActorCoverage {
                attribute id = "COV-62366-001";
                attribute appliesTo = "Actor";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "IEC 62366 clause 5.1 requires user profile specification.";
                attribute standard = "IEC 62366";
                attribute clause = "5.1";
                attribute coverageTarget = "Actor";
            }

            // ─── IEC 60601-1: General Safety ─────────────────────────────────────

            constraint def iec60601HarmCoverage {
                attribute id = "COV-60601-001";
                attribute appliesTo = "Harm";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "IEC 60601-1 clause 4.2 requires identification of hazards and harms.";
                attribute standard = "IEC 60601-1";
                attribute clause = "4.2";
                attribute coverageTarget = "Harm";
            }

            // ─── IEC 82304-1: Health Software ────────────────────────────────────

            constraint def iec82304SwSystemCoverage {
                attribute id = "COV-82304-001";
                attribute appliesTo = "SoftwareSystem";
                attribute severity = RuleSeverityKind::error;
                attribute rationaleText = "IEC 82304-1 requires health software product definition.";
                attribute standard = "IEC 82304-1";
                attribute clause = "6.1";
                attribute coverageTarget = "SoftwareSystem";
            }
        }
    }
}
