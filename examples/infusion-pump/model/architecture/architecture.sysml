// ─── Architecture Layer ─────────────────────────────────────────────────────
// Split from monolithic infusion-pump.sysml.
// Demonstrates cross-file imports across multiple packages.
// ────────────────────────────────────────────────────────────────────────────

package InfusionPump_Architecture {
    import MEMO_Ontology_MedicalArch::*;
    import MEMO_Ontology_MedicalProcess::*;
    import InfusionPump_Requirements::*;

    // Logical Architecture (subsystems)
    part pumpMechanism : LogicalComponent {
        attribute redefines name = "Pump Mechanism";
        attribute redefines description = "Peristaltic pump for controlled fluid delivery";
    }

    part controlBoard : LogicalComponent {
        attribute redefines name = "Control Board";
        attribute redefines description = "Main processor and control electronics";
    }

    part alarmSubsystem : LogicalComponent {
        attribute redefines name = "Alarm Subsystem";
        attribute redefines description = "Audio and visual alert system";
    }

    // Allocation: logical component satisfies requirement
    connection : Satisfy connect satisfiedBy ::> pumpMechanism to satisfies ::> srFlowAccuracy;
    connection : Satisfy connect satisfiedBy ::> alarmSubsystem to satisfies ::> srAlarmAudibility;
}
