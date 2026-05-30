// C3 lifecycle rule pack — Epic EE-3.
// These rules express lifecycle-stage *ordering* (requirements before architecture,
// risk before verification, evidence after verification). Ordering across the whole
// model is not a single-subject boolean predicate, so it has no `require constraint`
// body — and the legacy parts never enforced anything either (they carried
// predicate=requireRelationship with no relationshipType, so they matched nothing).
//
// They are retained here as metadata-only constraint defs (id, subject, rationale)
// so the catalog and traceability stay intact; the constraint loader skips defs that
// have no require/assert body, so they evaluate to nothing — exactly as before.
// The proprietary `predicate="…"` attribute pattern is removed per EE-3.
package memo {
    package rules {
        package lifecycle {
            import memo::base::rules::*;
            import memo::core::enumerations::*;

            constraint def reqBeforeArchRule {
                attribute id = "LC-001";
                attribute appliesTo = "SoftwareComponent";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "IEC 62304 requires requirements to precede architecture decomposition.";
                // Lifecycle ordering — model-level, no single-subject predicate.
            }

            constraint def riskBeforeVerificationRule {
                attribute id = "LC-002";
                attribute appliesTo = "VerificationCase";
                attribute severity = RuleSeverityKind::warning;
                attribute rationaleText = "Risk controls drive verification scope per ISO 14971.";
                // Lifecycle ordering — model-level, no single-subject predicate.
            }

            constraint def evidenceAfterVerificationRule {
                attribute id = "LC-003";
                attribute appliesTo = "Evidence";
                attribute severity = RuleSeverityKind::info;
                attribute rationaleText = "Evidence is produced by executing verification — ordering matters for DHF assembly.";
                // Lifecycle ordering — model-level, no single-subject predicate.
            }
        }
    }
}
