// C4 cross-layer rule pack — native KerML constraints (Epic EE-3).
// Traceability between architecture layers, migrated from ConsistencyRule
// predicate-attribute parts to native `constraint def` bodies.
package memo {
    package rules {
        package crosslayer {
            import memo::base::rules::*;
            import memo::core::enumerations::*;

            constraint def riskToReqTraceRule {
                attribute id = "XL-001";
                attribute appliesTo = "Hazard";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "Risk-requirement traceability required for regulatory submissions.";
                require constraint { traceTo->size() >= 1 }
            }

            constraint def reqToArchTraceRule {
                attribute id = "XL-002";
                attribute appliesTo = "SystemRequirement";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "Requirements-to-architecture traceability per IEC 62304.";
                require constraint { satisfiedBy->size() >= 1 }
            }

            // XL-003 had minCount=0 (advisory only), so the native form is vacuously true
            // (size >= 0). Retained for metadata/rationale parity; flags nothing.
            constraint def cyberToSafetyTraceRule {
                attribute id = "XL-003";
                attribute appliesTo = "CyberHazard";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "FDA cybersecurity guidance requires linking cybersecurity to patient safety.";
                require constraint { impactsSafety->size() >= 0 }
            }
        }
    }
}
