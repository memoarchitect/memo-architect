package IrrigationPump_Requirements {
    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;
    import IrrigationPump_Risk::*;

    requirement unStableFieldPressure : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-IRR-001";
        attribute redefines title = "Stable Surgical Field Distension";
    }

    requirement unReservoirAlert : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-IRR-002";
        attribute redefines title = "Reservoir Depletion Alert";
    }

    requirement unSterileSetup : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-IRR-003";
        attribute redefines title = "Sterile Priming Guidance";
    }

    requirement srPressureRegulation : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-IRR-001";
        attribute redefines title = "Irrigation Pressure Regulation";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Maintain target distension pressure throughout arthroscopic irrigation";
    }

    requirement srReservoirLowAlarm : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-IRR-002";
        attribute redefines title = "Reservoir Low Alarm";
        attribute redefines priority = "High";
        attribute redefines rationale = "Warn the clinician before reservoir depletion interrupts irrigation";
    }

    requirement srPrimeInterlock : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-IRR-003";
        attribute redefines title = "Prime Completion Interlock";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Prevent irrigation delivery until the disposable cassette and tubing are fully primed";
    }

    requirement srAlarmAudibility : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-IRR-004";
        attribute redefines title = "Alarm Audibility";
        attribute redefines priority = "High";
        attribute redefines rationale = "Ensure depletion and pressure alarms are perceivable in the operating room";
    }

    requirement swrPressureControlLoop : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-IRR-001";
        attribute redefines title = "Pressure Control Loop";
        attribute safetyClass = "C";
    }

    requirement swrReservoirEstimation : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-IRR-002";
        attribute redefines title = "Reservoir Estimation";
        attribute safetyClass = "B";
    }

    requirement swrAlarmCoordinator : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-IRR-003";
        attribute redefines title = "Alarm Coordination";
        attribute safetyClass = "B";
    }

    connection : Derives connect source ::> unStableFieldPressure to derived ::> srPressureRegulation;
    connection : Derives connect source ::> unReservoirAlert to derived ::> srReservoirLowAlarm;
    connection : Derives connect source ::> unReservoirAlert to derived ::> srAlarmAudibility;
    connection : Derives connect source ::> unSterileSetup to derived ::> srPrimeInterlock;

    connection : Derives connect source ::> srPressureRegulation to derived ::> swrPressureControlLoop;
    connection : Derives connect source ::> srReservoirLowAlarm to derived ::> swrReservoirEstimation;
    connection : Derives connect source ::> srAlarmAudibility to derived ::> swrAlarmCoordinator;

    connection : TraceTo connect source ::> srPressureRegulation to target ::> rcPressureLimiter;
    connection : TraceTo connect source ::> srPrimeInterlock to target ::> rcPrimeCompletionInterlock;
    connection : TraceTo connect source ::> srReservoirLowAlarm to target ::> rcReservoirLowAlarm;
    connection : TraceTo connect source ::> srAlarmAudibility to target ::> rcReservoirLowAlarm;
}
