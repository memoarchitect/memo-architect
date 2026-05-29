// Closure consistency rules — migrated from YAML per Epic N-2.
// Each rule corresponds to a ClosureRule that was previously defined in
// memo.rules.yaml or config closureRules arrays.
package memo::rules::closure {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    // ─── Risk Layer Rules ────────────────────────────────────────────────

    part hazardMitigationRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-001";
        attribute name = "HazardMustHaveMitigation";
        attribute description = "Every Hazard must have at least one mitigates relationship";
        attribute appliesTo = "Hazard";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "ISO 14971 requires each identified hazard to have risk control measures.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "mitigates";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "any";
        attribute relatedKinds = "";
    }

    part hazardSeverityRule : AttributeConsistencyRule {
        attribute id = "CR-MED-002";
        attribute name = "HazardMustHaveSeverity";
        attribute description = "Every Hazard must have a severity attribute";
        attribute appliesTo = "Hazard";
        attribute predicate = RulePredicateKind::requireAttribute;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Hazard severity is required for risk estimation per ISO 14971.";
        attribute category = RuleCategoryKind::closure;
        attribute targetAttribute = "severity";
    }

    part riskControlVerificationRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-003";
        attribute name = "RiskControlMustHaveVerification";
        attribute description = "Every RiskControl must trace to at least one VerificationCase";
        attribute appliesTo = "RiskControl";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Risk controls shall be verified per ISO 14971 clause 7.4.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "verifies";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "incoming";
        attribute relatedKinds = "VerificationCase";
    }

    part riskBeforeMatrixRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-004";
        attribute name = "RiskBeforeMustLinkMatrix";
        attribute description = "Every RiskBeforeMitigation must reference a RiskMatrix";
        attribute appliesTo = "RiskBeforeMitigation";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Pre-mitigation risk must be assessed against a risk acceptability matrix.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "assessedAgainst";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "RiskMatrix";
    }

    // ─── Requirements Layer Rules ────────────────────────────────────────

    part sysReqTraceRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-010";
        attribute name = "SystemReqMustTraceToNeed";
        attribute description = "Every SystemRequirement must trace to at least one StakeholderNeed";
        attribute appliesTo = "SystemRequirement";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Requirements shall be traceable to stakeholder needs per ISO 13485.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "traceTo";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "StakeholderNeed";
    }

    part swReqTraceRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-011";
        attribute name = "SoftwareReqMustTraceToSysReq";
        attribute description = "Every SoftwareRequirement must trace to a SystemRequirement";
        attribute appliesTo = "SoftwareRequirement";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Software requirements derive from system requirements per IEC 62304.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "traceTo";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "SystemRequirement";
    }

    part reqIdUniqueRule : AttributeConsistencyRule {
        attribute id = "CR-MED-012";
        attribute name = "RequirementIdMustBeUnique";
        attribute description = "Requirement id attribute must be unique across all requirements";
        attribute appliesTo = "Requirement";
        attribute predicate = RulePredicateKind::uniqueAttribute;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Unique identifiers required for traceability.";
        attribute category = RuleCategoryKind::closure;
        attribute targetAttribute = "id";
    }

    // ─── Architecture Layer Rules ────────────────────────────────────────

    part swComponentSafetyClassRule : AttributeConsistencyRule {
        attribute id = "CR-MED-020";
        attribute name = "SoftwareComponentMustHaveSafetyClass";
        attribute description = "Every SoftwareComponent must have safetyClassification attribute";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::requireAttribute;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 62304 requires safety classification for all software items.";
        attribute category = RuleCategoryKind::closure;
        attribute targetAttribute = "safetyClassification";
    }

    part swComponentReqRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-021";
        attribute name = "SoftwareComponentMustSatisfyReq";
        attribute description = "Every SoftwareComponent must satisfy at least one SoftwareRequirement";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Software items shall be linked to their requirements per IEC 62304.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "satisfies";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "SoftwareRequirement";
    }

    part logicalFunctionAllocationRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-022";
        attribute name = "LogicalFunctionMustBeAllocated";
        attribute description = "Every LogicalFunction must be allocated to a SoftwareComponent or HardwareAssembly";
        attribute appliesTo = "LogicalFunction";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Functions should be allocated to implementation elements.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "allocatedTo";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "SoftwareComponent,HardwareAssembly";
    }

    // ─── Verification Layer Rules ────────────────────────────────────────

    part verificationCaseMethodRule : AttributeConsistencyRule {
        attribute id = "CR-MED-030";
        attribute name = "VerificationCaseMustHaveMethod";
        attribute description = "Every VerificationCase must specify a verification method";
        attribute appliesTo = "VerificationCase";
        attribute predicate = RulePredicateKind::requireAttribute;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Verification method (test, analysis, inspection, demonstration) required per IEC 62304.";
        attribute category = RuleCategoryKind::closure;
        attribute targetAttribute = "verificationMethod";
    }

    part verificationCaseTargetRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-031";
        attribute name = "VerificationCaseMustHaveTarget";
        attribute description = "Every VerificationCase must verify at least one requirement or risk control";
        attribute appliesTo = "VerificationCase";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Verification cases must be linked to verifiable items.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "verifies";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "";
    }

    part evidenceProductionRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-032";
        attribute name = "VerificationCaseMustProduceEvidence";
        attribute description = "Every VerificationCase should produce evidence";
        attribute appliesTo = "VerificationCase";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Verification results should be documented as evidence records.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "produces";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "Evidence";
    }

    // ─── Cybersecurity Layer Rules ───────────────────────────────────────

    part threatMitigationRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-040";
        attribute name = "ThreatMustHaveMitigation";
        attribute description = "Every Threat must have at least one CyberMitigation";
        attribute appliesTo = "Threat";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "FDA cybersecurity guidance requires threat mitigation.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "mitigatedBy";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "CyberMitigation";
    }

    part assetThreatLinkRule : RelationshipConsistencyRule {
        attribute id = "CR-MED-041";
        attribute name = "AssetMustLinkToThreat";
        attribute description = "Every CybersecurityAsset must link to at least one Threat";
        attribute appliesTo = "CybersecurityAsset";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Assets should have threat analysis per FDA cybersecurity guidance.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "threatenedBy";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "incoming";
        attribute relatedKinds = "Threat";
    }

    // ─── Interface Rules ─────────────────────────────────────────────────

    part logicalInterfaceDirectionRule : AttributeConsistencyRule {
        attribute id = "CR-MED-050";
        attribute name = "LogicalInterfaceMustHaveDirection";
        attribute description = "Every LogicalInterface must specify direction";
        attribute appliesTo = "LogicalInterface";
        attribute predicate = RulePredicateKind::requireAttribute;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "Interface direction required for integration analysis.";
        attribute category = RuleCategoryKind::closure;
        attribute targetAttribute = "direction";
    }

    // ─── Conditional Rules ───────────────────────────────────────────────

    part safetyClassCVerificationRule : ConditionalConsistencyRule {
        attribute id = "CR-MED-101";
        attribute name = "ClassCSoftwareMustHaveFormalVerification";
        attribute description = "Class C software components must have formal verification";
        attribute appliesTo = "SoftwareComponent";
        attribute predicate = RulePredicateKind::conditionalRequireRelationship;
        attribute strength = RuleStrengthKind::required;
        attribute severity = RuleSeverityKind::error;
        attribute rationaleText = "IEC 62304 requires rigorous verification for Class C software.";
        attribute category = RuleCategoryKind::closure;
        attribute relationshipType = "verifiedBy";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "incoming";
        attribute relatedKinds = "VerificationCase";
        attribute conditionAttribute = "safetyClassification";
        attribute conditionOperator = "eq";
        attribute conditionValues = "C";
    }
}
