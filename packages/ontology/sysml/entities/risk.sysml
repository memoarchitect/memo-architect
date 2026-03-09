// ============================================================================
// MEMO Ontology — Risk Management Domain
// Per ISO 14971: hazards, harms, and controls are documented,
// traced, and verified — making them requirements, not structures.
// ============================================================================

package MEMO_Ontology_Risk {

    // ═══════════════════════════════════════════════════════════════════════
    // 3. RISK MANAGEMENT — All are requirement defs (traceable claims)
    //    Per ISO 14971: hazards, harms, and controls are documented,
    //    traced, and verified — making them requirements, not structures.
    // ═══════════════════════════════════════════════════════════════════════

    enum def SeverityLevel {
        enum Negligible;
        enum Minor;
        enum Serious;
        enum Critical;
        enum Catastrophic;
    }

    enum def ProbabilityLevel {
        enum Incredible;
        enum Improbable;
        enum Remote;
        enum Occasional;
        enum Probable;
        enum Frequent;
    }

    enum def RiskAcceptance {
        enum Acceptable;
        enum Unacceptable;
        enum NeedsReview;
    }

    requirement def Hazard {
        doc /* A potential source of harm (ISO 14971).
             * Modeled as requirement — traced to functions/use-cases that trigger it,
             * mitigated by RiskControls, linked to HazardousSituations. */
        attribute hazardId : String;
        attribute title : String;
        attribute hazardLevel : String;
    }

    requirement def HazardousSituation {
        doc /* A circumstance exposing a person to a hazard (ISO 14971 §5.5). */
        attribute hsId : String;
        attribute title : String;
        attribute level : String;
    }

    requirement def Harm {
        doc /* Physical injury or damage to health, including death (ISO 14971). */
        attribute harmId : String;
        attribute title : String;
        attribute harmLevel : Integer;
        attribute severity : SeverityLevel;
    }

    requirement def Risk {
        doc /* Combination of probability and severity of harm (ISO 14971 §5.4).
             * Carries pre/post mitigation severity and probability. */
        attribute riskId : String;
        attribute title : String;
        attribute severityPre : SeverityLevel;
        attribute probabilityPre : ProbabilityLevel;
        attribute severityPost : SeverityLevel;
        attribute probabilityPost : ProbabilityLevel;
        attribute riskLevel : String;
        attribute riskAcceptance : RiskAcceptance;
        attribute causeSequenceOfEvents : String;
        attribute associatedHarm : String;
        attribute benefitsOutweighRisk : Boolean;
        attribute cannotReduceFurther : Boolean;
    }

    requirement def RiskControl {
        doc /* A measure to reduce risk — design, protective, or informational.
             * Modeled as requirement because it must be verified and traced. */
        attribute rcId : String;
        attribute title : String;
        attribute mitigationLevel : Integer;
    }

    requirement def SafetyGoal {
        doc /* A top-level safety goal derived from hazard analysis. */
        attribute title : String;
    }
}
