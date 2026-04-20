package MEMO_Ontology_MedicalProcess_Safety {

    requirement def SafetyGoal {
        attribute title : String;
    }

    requirement def EssentialPerformance {
        attribute title : String;
        attribute performanceKind : String; // §4.5.10 — "primary" | "auxiliary" | "protective"
    }

    requirement def BasicSafety {
        attribute title : String;
    }

    // Named by IEC 60601-1 §4.3 — surfaces as the primary essential performance.
    requirement def PrimaryOperatingFunction :> EssentialPerformance {
        attribute primaryFunctionId : String;
    }

    requirement def EssentialPerformanceLossCondition {
        attribute title : String;
    }

    action def SafetyFunction {
        attribute safetyRole : String;      // "protect" | "mitigate" | "alert"
    }

    part def ProtectiveMeasure {
        attribute measureType : String;     // "inherent" | "protective" | "informational"
    }

    // §4.5.10 — collateral/particular standard requirements add their IEC 60601
    // chapter reference explicitly rather than relying on subclass identity.
    part def CollateralStandardRequirement :> RegulatoryRequirement {
        attribute collateralRef : String;   // e.g. "IEC 60601-1-8"
    }

    part def ParticularStandardRequirement :> RegulatoryRequirement {
        attribute particularRef : String;   // e.g. "IEC 60601-2-24"
    }
}
