// ─── Architecture Layer ─────────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates cross-file imports across multiple packages.
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Architecture {
    import MEMO_Ontology::*;
    import InfusionPump_Requirements::*;

    // Logical Architecture (subsystems)
    part pumpMechanism : Component {
        attribute redefines name = "Pump Mechanism";
        attribute redefines description = "Peristaltic pump for controlled fluid delivery";
    }

    part controlBoard : Component {
        attribute redefines name = "Control Board";
        attribute redefines description = "Main processor and control electronics";
    }

    part alarmSubsystem : Component {
        attribute redefines name = "Alarm Subsystem";
        attribute redefines description = "Audio and visual alert system";
    }

    // Allocation: component satisfies requirement
    connection : Satisfy connect component ::> pumpMechanism to requirement ::> srFlowAccuracy;
    connection : Satisfy connect component ::> alarmSubsystem to requirement ::> srAlarmAudibility;
}
