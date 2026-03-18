// ─── Requirements Layer ─────────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates cross-file imports: this file imports from the risk package.
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Requirements {
    import MEMO_Ontology::*;
    import InfusionPump_Risk::*;

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

    // Traceability: system req → risk control
    connection : TraceTo connect source ::> srFlowAccuracy to target ::> rcFlowRateLimiter;
    connection : TraceTo connect source ::> srAlarmAudibility to target ::> rcOcclusionAlarm;
    connection : TraceTo connect source ::> swrAlarmManagement to target ::> srAlarmAudibility;
}
