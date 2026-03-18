// ─── Risk Management Layer ──────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates multi-file model splitting convention:
//   - One package per file
//   - Package name matches domain layer
//   - Import the parent model package for cross-references
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Risk {
    import MEMO_Ontology::*;

    // Hazards (ISO 14971)
    requirement hazOverInfusion : Hazard {
        attribute redefines title = "Over-Infusion";
        attribute redefines severity = "Catastrophic";
        attribute redefines probability = "Occasional";
        attribute redefines hazardId = "HAZ-001";
        doc /* Patient receives medication at a rate significantly above the prescribed dose. */
    }

    requirement hazUnderInfusion : Hazard {
        attribute redefines title = "Under-Infusion";
        attribute redefines severity = "Serious";
        attribute redefines probability = "Occasional";
        attribute redefines hazardId = "HAZ-002";
        doc /* Patient receives medication at a rate significantly below the prescribed dose. */
    }

    requirement hazFreeFlow : Hazard {
        attribute redefines title = "Free-Flow";
        attribute redefines severity = "Catastrophic";
        attribute redefines probability = "Remote";
        attribute redefines hazardId = "HAZ-003";
        doc /* Uncontrolled gravity-driven medication delivery when pump mechanism fails or tubing disconnects. */
    }

    // Hazardous Situations
    requirement hsFreeFlowSituation : HazardousSituation {
        attribute redefines title = "Free-Flow During Infusion";
        attribute redefines description = "IV tubing disconnected while medication is flowing";
    }

    // Harms
    requirement harmOverdose : Harm {
        attribute redefines title = "Medication Overdose";
        attribute redefines description = "Patient overdose requiring medical intervention";
    }

    // Risk Controls
    requirement rcFlowRateLimiter : RiskControl {
        attribute redefines title = "Flow Rate Limiter";
        attribute redefines controlType = "Design";
    }

    requirement rcAntiFreeFlow : RiskControl {
        attribute redefines title = "Anti-Free-Flow Mechanism";
        attribute redefines controlType = "Design";
    }

    requirement rcOcclusionAlarm : RiskControl {
        attribute redefines title = "Occlusion Detection Alarm";
        attribute redefines controlType = "Protective";
    }

    // Risk Assessment
    requirement riskOverInfusion : Risk {
        attribute redefines title = "Over-infusion risk assessment";
        attribute redefines riskLevel = "High";
        attribute redefines residualRisk = "Acceptable";
    }

    // Risk relationships (mitigations)
    connection : Mitigates connect control ::> rcFlowRateLimiter to hazard ::> hazOverInfusion;
    connection : Mitigates connect control ::> rcAntiFreeFlow to hazard ::> hazFreeFlow;
    connection : Mitigates connect control ::> rcOcclusionAlarm to hazard ::> hazUnderInfusion;

    // Risk chain relationships
    connection : TraceTo connect source ::> hsFreeFlowSituation to target ::> hazFreeFlow;
    connection : TraceTo connect source ::> harmOverdose to target ::> hazOverInfusion;
    connection : Identifies connect source ::> riskOverInfusion to target ::> hazOverInfusion;
}
