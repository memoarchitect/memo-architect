package IrrigationPump_Requirements {
    import MEMO_Ontology_Medical::*;
    import IrrigationPump_Risk::*;

    requirement unStableFieldPressure : UserNeed {
        attribute redefines reqId = "UN-IRR-001";
        attribute redefines title = "Stable Surgical Field Distension";
    }

    requirement unReservoirAlert : UserNeed {
        attribute redefines reqId = "UN-IRR-002";
        attribute redefines title = "Reservoir Depletion Alert";
    }

    requirement unSterileSetup : UserNeed {
        attribute redefines reqId = "UN-IRR-003";
        attribute redefines title = "Sterile Priming Guidance";
    }

    requirement srPressureRegulation : SystemRequirement {
        attribute redefines reqId = "SYS-IRR-001";
        attribute redefines title = "Irrigation Pressure Regulation";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Maintain target distension pressure throughout arthroscopic irrigation";
    }

    requirement srReservoirLowAlarm : SystemRequirement {
        attribute redefines reqId = "SYS-IRR-002";
        attribute redefines title = "Reservoir Low Alarm";
        attribute redefines priority = "High";
        attribute redefines rationale = "Warn the clinician before reservoir depletion interrupts irrigation";
    }

    requirement srPrimeInterlock : SystemRequirement {
        attribute redefines reqId = "SYS-IRR-003";
        attribute redefines title = "Prime Completion Interlock";
        attribute redefines priority = "Critical";
        attribute redefines rationale = "Prevent irrigation delivery until the disposable cassette and tubing are fully primed";
    }

    requirement srAlarmAudibility : SystemRequirement {
        attribute redefines reqId = "SYS-IRR-004";
        attribute redefines title = "Alarm Audibility";
        attribute redefines priority = "High";
        attribute redefines rationale = "Ensure depletion and pressure alarms are perceivable in the operating room";
    }

    requirement swrPressureControlLoop : SoftwareRequirement {
        attribute redefines reqId = "SW-IRR-001";
        attribute redefines title = "Pressure Control Loop";
        attribute redefines safetyClassification = "C";
    }

    requirement swrReservoirEstimation : SoftwareRequirement {
        attribute redefines reqId = "SW-IRR-002";
        attribute redefines title = "Reservoir Estimation";
        attribute redefines safetyClassification = "B";
    }

    requirement swrAlarmCoordinator : SoftwareRequirement {
        attribute redefines reqId = "SW-IRR-003";
        attribute redefines title = "Alarm Coordination";
        attribute redefines safetyClassification = "B";
    }

    connection : Derives connect source ::> unStableFieldPressure to derived ::> srPressureRegulation;
    connection : Derives connect source ::> unReservoirAlert to derived ::> srReservoirLowAlarm;
    connection : Derives connect source ::> unReservoirAlert to derived ::> srAlarmAudibility;
    connection : Derives connect source ::> unSterileSetup to derived ::> srPrimeInterlock;

    connection : Derives connect source ::> srPressureRegulation to derived ::> swrPressureControlLoop;
    connection : Derives connect source ::> srReservoirLowAlarm to derived ::> swrReservoirEstimation;
    connection : Derives connect source ::> srAlarmAudibility to derived ::> swrAlarmCoordinator;

    connection : ImplementsRiskControl connect implementer ::> srPressureRegulation to control ::> rcPressureLimiter;
    connection : ImplementsRiskControl connect implementer ::> srPrimeInterlock to control ::> rcPrimeCompletionInterlock;
    connection : ImplementsRiskControl connect implementer ::> srReservoirLowAlarm to control ::> rcReservoirLowAlarm;
    connection : ImplementsRiskControl connect implementer ::> srAlarmAudibility to control ::> rcReservoirLowAlarm;
}
