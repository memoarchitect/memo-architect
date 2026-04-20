// ─── Requirements Layer ─────────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates cross-file imports: this file imports from the risk package.
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Requirements {
    import MEMO_Ontology_MedicalProcess::*;
    import InfusionPump_Risk::*;

    // User Needs
    requirement unAccurateDelivery : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Accurate Medication Delivery";
    }

    requirement unAlarmAudibility : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Alarm Audibility In Clinical Use";
    }

    // System Requirements
    requirement srFlowAccuracy : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Flow Rate Accuracy";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Ensure medication is delivered within ±5% of programmed rate";
    }

    requirement srAlarmAudibility : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Alarm Audibility";
        attribute redefines priority = "High";
        attribute redefines rationale = "Clinical environment noise levels require 70dB minimum";
    }

    // Software Requirements
    requirement swrAlarmManagement : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines title = "Alarm Management";
        attribute redefines priority = "Critical";
        attribute redefines safetyClassification = "C";
    }

    // Stable semantics: requirements derive downward and implement risk controls.
    connection : Derives connect source ::> unAccurateDelivery to derived ::> srFlowAccuracy;
    connection : Derives connect source ::> unAlarmAudibility to derived ::> srAlarmAudibility;
    connection : ImplementsRiskControl connect implementer ::> srFlowAccuracy to control ::> rcFlowRateLimiter;
    connection : ImplementsRiskControl connect implementer ::> srAlarmAudibility to control ::> rcOcclusionAlarm;
    connection : Derives connect source ::> srAlarmAudibility to derived ::> swrAlarmManagement;
}
