package memo {
    package examples {
        package gpca {
            package formal_behavior {
                private import memo::architecture::behavior::*;
                part topLevelContract : Contract { attribute id = "CTR-001"; attribute name = "TopLevelModeContract"; attribute contractScope = "Top Level Mode"; }
                part infusionManagerContract : Contract { attribute id = "CTR-002"; attribute name = "InfusionManagerContract"; attribute contractScope = "Infusion Manager"; }
                part alarmContract : Contract { attribute id = "CTR-003"; attribute name = "AlarmContract"; attribute contractScope = "Alarm"; }
                part assumeValidPrescriptionSaved : AssumeProperty { attribute id = "AP-001"; attribute name = "ValidPrescriptionSavedBeforeTherapy"; attribute propertyKind = BehaviorPropertyKind::assume; attribute languageKind = PropertyLanguageKind::agreeLike; attribute formalExpression = "assume saved prescription is available before therapy initiation"; }
                part guaranteeExclusiveMode : GuaranteeProperty { attribute id = "GP-001"; attribute name = "ExclusiveModeGuarantee"; attribute propertyKind = BehaviorPropertyKind::guarantee; attribute languageKind = PropertyLanguageKind::agreeLike; attribute formalExpression = "guarantee current_mode is always one of OFF, IDLE, PAUSED, BASAL, SQUARE_BOLUS, PATIENT_BOLUS"; }
                part guaranteeLockoutPreventsBolus : GuaranteeProperty { attribute id = "GP-002"; attribute name = "LockoutGuarantee"; attribute propertyKind = BehaviorPropertyKind::guarantee; attribute languageKind = PropertyLanguageKind::agreeLike; attribute formalExpression = "guarantee if lockout_active then patient_bolus_not_initiated"; }
                part guaranteeAlarmStopsSameStep : GuaranteeProperty { attribute id = "GP-003"; attribute name = "SameStepAlarmStopGuarantee"; attribute propertyKind = BehaviorPropertyKind::guarantee; attribute languageKind = PropertyLanguageKind::agreeLike; attribute formalExpression = "guarantee alarm_output in same step implies infusion_manager inhibits flow in same step"; }
                part temporalNoInvalidTransition : BehaviorProperty { attribute id = "BP-010"; attribute name = "NoInvalidTransition"; attribute propertyKind = BehaviorPropertyKind::temporalProperty; attribute languageKind = PropertyLanguageKind::ltlLike; attribute formalExpression = "G(not invalid_mode_transition)"; }
                part temporalPauseOnCriticalAlarm : BehaviorProperty { attribute id = "BP-011"; attribute name = "PauseOnCriticalAlarm"; attribute propertyKind = BehaviorPropertyKind::safetyProperty; attribute languageKind = PropertyLanguageKind::ltlLike; attribute formalExpression = "G(critical_alarm -> X paused_mode)"; }
            }
        }
    }
}
