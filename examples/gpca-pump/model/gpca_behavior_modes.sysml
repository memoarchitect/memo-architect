package memo {
    package examples {
        package gpca {
            package behavior_modes {
                private import memo::architecture::behavior::*;
                part topLevelModeMachine : BehaviorMachine { attribute id = "BM-001"; attribute name = "TopLevelModeMachine"; attribute machineKind = "hierarchical state machine"; attribute executionSemantics = "single-step synchronous"; }
                part modeOFF : ModeState { attribute id = "MODE-000"; attribute name = "OFF"; attribute modeKind = "top"; }
                part modeIDLE : ModeState { attribute id = "MODE-001"; attribute name = "ON.IDLE"; attribute modeKind = "idle"; }
                part modePAUSED : ModeState { attribute id = "MODE-002"; attribute name = "ON.THERAPY.PAUSED"; attribute modeKind = "paused"; }
                part modeBASAL : ModeState { attribute id = "MODE-003"; attribute name = "ON.THERAPY.ACTIVE.BASAL"; attribute modeKind = "active-basal"; }
                part modeSQUARE : ModeState { attribute id = "MODE-004"; attribute name = "ON.THERAPY.ACTIVE.SQUARE_BOLUS"; attribute modeKind = "active-square-bolus"; }
                part modePBOLUS : ModeState { attribute id = "MODE-005"; attribute name = "ON.THERAPY.ACTIVE.PATIENT_BOLUS"; attribute modeKind = "active-patient-bolus"; }
                part propAlarmStopsSameStep : BehaviorProperty { attribute id = "BP-002"; attribute name = "AlarmStopsInfusionSameStep"; attribute propertyKind = BehaviorPropertyKind::safetyProperty; attribute languageKind = PropertyLanguageKind::pseudoFormal; attribute formalExpression = "Alarm output used by infusion manager in same execution step"; }
            }
        }
    }
}
