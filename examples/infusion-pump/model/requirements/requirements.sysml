// ─── Requirements Layer ─────────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates cross-file imports: this file imports from the risk package.
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Requirements {
    import MEMO_Ontology_Medical::*;
    import InfusionPump_Risk::*;

    // User Needs
    requirement unAccurateDelivery : UserNeed {
        attribute redefines title = "Accurate Medication Delivery";
    }

    // System Requirements
    requirement srFlowAccuracy : SystemRequirement {
        attribute redefines title = "Flow Rate Accuracy";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Ensure medication is delivered within ±5% of programmed rate";
    }

    requirement srAlarmAudibility : SystemRequirement {
        attribute redefines title = "Alarm Audibility";
        attribute redefines priority = "High";
        attribute redefines rationale = "Clinical environment noise levels require 70dB minimum";
    }

    // Software Requirements
    requirement swrAlarmManagement : SoftwareRequirement {
        attribute redefines title = "Alarm Management";
        attribute redefines priority = "Critical";
        attribute redefines safetyClassification = "C";
    }

    // Stable semantics: requirements derive downward and implement risk controls.
    connection : Derives connect source ::> unAccurateDelivery to derived ::> srFlowAccuracy;
    connection : ImplementsRiskControl connect implementer ::> srFlowAccuracy to control ::> rcFlowRateLimiter;
    connection : ImplementsRiskControl connect implementer ::> srAlarmAudibility to control ::> rcOcclusionAlarm;
    connection : Derives connect source ::> srAlarmAudibility to derived ::> swrAlarmManagement;
}
