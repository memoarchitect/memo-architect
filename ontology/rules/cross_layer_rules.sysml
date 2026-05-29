// C4 cross-layer rule pack — Epic N-4.
// Rules enforcing traceability between architecture layers.
package memo::rules::crosslayer {
    import memo::base::rules::*;
    import memo::core::enumerations::*;

    part riskToReqTraceRule : RelationshipConsistencyRule {
        attribute id = "XL-001";
        attribute name = "HazardMustTraceToRequirement";
        attribute description = "Every Hazard should trace to at least one Requirement";
        attribute appliesTo = "Hazard";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Risk-requirement traceability required for regulatory submissions.";
        attribute category = RuleCategoryKind::crossLayer;
        attribute relationshipType = "traceTo";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "Requirement,SystemRequirement,SoftwareRequirement";
    }

    part reqToArchTraceRule : RelationshipConsistencyRule {
        attribute id = "XL-002";
        attribute name = "SystemReqMustTracToArch";
        attribute description = "Every SystemRequirement should trace to architecture element";
        attribute appliesTo = "SystemRequirement";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "Requirements-to-architecture traceability per IEC 62304.";
        attribute category = RuleCategoryKind::crossLayer;
        attribute relationshipType = "satisfiedBy";
        attribute minCount = "1";
        attribute maxCount = "";
        attribute direction = "incoming";
        attribute relatedKinds = "SoftwareComponent,LogicalComponent,HardwareAssembly";
    }

    part cyberToSafetyTraceRule : RelationshipConsistencyRule {
        attribute id = "XL-003";
        attribute name = "CyberHazardMustTraceToSafetyHazard";
        attribute description = "CyberHazard with safety impact must trace to a safety Hazard";
        attribute appliesTo = "CyberHazard";
        attribute predicate = RulePredicateKind::requireRelationship;
        attribute strength = RuleStrengthKind::recommended;
        attribute severity = RuleSeverityKind::warning;
        attribute rationaleText = "FDA cybersecurity guidance requires linking cybersecurity to patient safety.";
        attribute category = RuleCategoryKind::crossLayer;
        attribute relationshipType = "impactsSafety";
        attribute minCount = "0";
        attribute maxCount = "";
        attribute direction = "outgoing";
        attribute relatedKinds = "Hazard";
    }
}
