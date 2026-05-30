package memo {
    package examples {
        package gpca {
            package requirements {
                private import memo::architecture::requirements::*;
                requirement needSafeTherapy : StakeholderNeed {
                    attribute id = "NEED-001"; attribute name = "SafePatientControlledTherapy";
                    attribute statement = "The device shall support safe patient controlled analgesic infusion therapy.";
                    attribute priority = "high";
                }
                requirement reqSingleMode : SystemRequirement {
                    attribute id = "REQ-001"; attribute name = "SingleModeOnly";
                    attribute statement = "The system shall always be in only one mode: OFF, IDLE, PAUSED, BASAL, SQUARE BOLUS, or PATIENT BOLUS.";
                    attribute sourceKind = RequirementSourceKind::stakeholderNeed;
                    attribute concernKind = ConcernKind::safety;
                    attribute status = RequirementStatusKind::approved;
                    attribute acceptanceCriteria = "Mode output is always one valid exclusive value.";
                    attribute subjectDescription = "GPCA software";
                    attribute actorDescription = "clinician and patient";
                    attribute assumptionSummary = "valid system startup sequence";
                    attribute guaranteeSummary = "exclusive valid mode";
                }
                requirement reqLockout : SoftwareRequirement {
                    attribute id = "REQ-025"; attribute name = "IgnoreFrequentBolusRequest";
                    attribute statement = "The system shall ignore patient bolus requests that violate lockout or max bolus conditions.";
                    attribute sourceKind = RequirementSourceKind::risk;
                    attribute concernKind = ConcernKind::safety;
                    attribute safetyClass = SafetyClassKind::C;
                    attribute status = RequirementStatusKind::approved;
                    attribute acceptanceCriteria = "No patient bolus is initiated when lockout or max bolus conditions are active.";
                    attribute subjectDescription = "Infusion Manager";
                    attribute actorDescription = "patient";
                    attribute assumptionSummary = "bolus signal valid";
                    attribute guaranteeSummary = "invalid bolus requests ignored";
                }
                requirement reqAlarmStopsInfusion : SoftwareRequirement {
                    attribute id = "REQ-019"; attribute name = "AlarmStopsInfusion";
                    attribute statement = "The system shall transition to PAUSED mode on over-infusion and other defined alarm conditions.";
                    attribute sourceKind = RequirementSourceKind::risk;
                    attribute concernKind = ConcernKind::safety;
                    attribute safetyClass = SafetyClassKind::C;
                    attribute status = RequirementStatusKind::approved;
                    attribute acceptanceCriteria = "ACTIVE mode transitions to PAUSED when alarm conditions occur.";
                    attribute subjectDescription = "Alarm and Infusion Manager";
                    attribute actorDescription = "clinician";
                    attribute assumptionSummary = "alarm inputs sampled";
                    attribute guaranteeSummary = "pause on critical alarm";
                }
            }
        }
    }
}
