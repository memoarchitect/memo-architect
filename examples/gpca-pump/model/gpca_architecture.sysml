package memo {
    package examples {
        package gpca {
            package architecture {
                private import memo::architecture::hardware_structure::*;
                private import memo::architecture::software_structure::*;
                part gpcaDeviceSensors : HardwareAssembly { attribute id = "HW-001"; attribute name = "GPCA_HW_Sensors"; attribute responsibility = "Map inputs to software-visible signals."; attribute safetyRole = "input acquisition"; }
                part gpcaActuators : HardwareAssembly { attribute id = "HW-002"; attribute name = "GPCA_HW_Actuators"; attribute responsibility = "Expose software outputs to physical outputs."; attribute safetyRole = "actuation and operator output"; }
                part tlm : SoftwareComponent { attribute id = "SW-001"; attribute name = "Top_Level_Mode"; attribute responsibility = "Ensure system ON/OFF behavior and startup/shutdown checks."; attribute safetyClass = SafetyClassKind::C; attribute complexity = ComplexityKind::medium; attribute periodMs = 20.0; attribute deadlineMs = 20.0; attribute wcetMs = 2.0; attribute schedulingPolicy = SchedulingPolicyKind::fixedPriorityPreemptive; }
                part alarm : SoftwareComponent { attribute id = "SW-003"; attribute name = "Alarm"; attribute responsibility = "Monitor and notify exceptional conditions."; attribute safetyClass = SafetyClassKind::C; attribute complexity = ComplexityKind::high; attribute periodMs = 20.0; attribute deadlineMs = 20.0; attribute wcetMs = 3.0; attribute schedulingPolicy = SchedulingPolicyKind::fixedPriorityPreemptive; }
                part infusionMgr : SoftwareComponent { attribute id = "SW-005"; attribute name = "Infusion_Manager"; attribute responsibility = "Handle drug infusion commands and therapy parameters."; attribute safetyClass = SafetyClassKind::C; attribute complexity = ComplexityKind::high; attribute periodMs = 20.0; attribute deadlineMs = 20.0; attribute wcetMs = 4.0; attribute schedulingPolicy = SchedulingPolicyKind::fixedPriorityPreemptive; }
            }
        }
    }
}
