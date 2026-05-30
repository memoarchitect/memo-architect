package memo {
    package examples {
        package gpca {
            package trace {
                private import memo::core::relationships::*;
                private import memo::examples::gpca::requirements::*;
                private import memo::examples::gpca::architecture::*;
                private import memo::examples::gpca::behavior_subsystems::*;
                private import memo::examples::gpca::behavior_modes::*;
                private import memo::examples::gpca::interfaces::*;
                private import memo::examples::gpca::risk::*;
                private import memo::examples::gpca::verification::*;
                private import memo::examples::gpca::document_views::*;
                private import memo::examples::gpca::formal_behavior::*;
                part linkNeedToModeReq : RequirementSourceLink { attribute id = "LINK-001"; attribute name = "NeedToSingleModeRequirement"; attribute linkStatus = LinkStatusKind::active; attribute sourceRole = "stakeholder need"; part sourceDriver = needSafeTherapy; part targetRequirement = reqSingleMode; }
                part linkRiskToLockoutReq : RequirementSourceLink { attribute id = "LINK-002"; attribute name = "RiskToLockoutRequirement"; attribute linkStatus = LinkStatusKind::active; attribute sourceRole = "risk driver"; part sourceDriver = riskBefore; part targetRequirement = reqLockout; }
                part linkRiskToAlarmReq : RequirementSourceLink { attribute id = "LINK-026"; attribute name = "RiskToAlarmRequirement"; attribute linkStatus = LinkStatusKind::active; attribute sourceRole = "risk driver"; part sourceDriver = riskBefore; part targetRequirement = reqAlarmStopsInfusion; }
                part linkReqToTLM : RequirementSatisfactionLink { attribute id = "LINK-003"; attribute name = "ModeRequirementToTLM"; attribute linkStatus = LinkStatusKind::active; part requirement = reqSingleMode; part satisfyingElement = tlm; }
                part linkReqToIM : RequirementSatisfactionLink { attribute id = "LINK-004"; attribute name = "LockoutRequirementToInfusionManager"; attribute linkStatus = LinkStatusKind::active; part requirement = reqLockout; part satisfyingElement = infusionMgr; }
                part linkAlarmReqToAlarm : RequirementSatisfactionLink { attribute id = "LINK-005"; attribute name = "AlarmPauseRequirementToAlarm"; attribute linkStatus = LinkStatusKind::active; part requirement = reqAlarmStopsInfusion; part satisfyingElement = alarm; }
                part linkFnToAlarm : FunctionAllocationLink { attribute id = "LINK-006"; attribute name = "MonitorExceptionalConditionsToAlarm"; attribute linkStatus = LinkStatusKind::active; part function = fnMonitorAlarm; part allocatedElement = alarm; }
                part linkFnToIM : FunctionAllocationLink { attribute id = "LINK-007"; attribute name = "ManageInfusionToInfusionManager"; attribute linkStatus = LinkStatusKind::active; part function = fnManageInfusion; part allocatedElement = infusionMgr; }
                part linkLogicalToPhysical : InterfaceRealizationLink { attribute id = "LINK-008"; attribute name = "SensorInterfaceRealization"; attribute linkStatus = LinkStatusKind::active; part logicalInterface = sensorInputInterface; part physicalInterface = hwSoftwareBus; }
                part linkVerifyMode : VerificationLink { attribute id = "LINK-009"; attribute name = "VerifyModeRequirement"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = reqSingleMode; part verificationCase = vcModeRange; }
                part linkVerifyLockoutReq : VerificationLink { attribute id = "LINK-010"; attribute name = "VerifyLockoutRequirement"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = reqLockout; part verificationCase = vcLockout; }
                part linkVerifyLockoutControl : VerificationLink { attribute id = "LINK-011"; attribute name = "VerifyLockoutControl"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = lockoutControl; part verificationCase = vcLockout; }
                part linkVerifySameStep : VerificationLink { attribute id = "LINK-012"; attribute name = "VerifySameStepAlarmProperty"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = propAlarmStopsSameStep; part verificationCase = vcSameStepAlarm; }
                part linkVerifyFormalGuarantee1 : VerificationLink { attribute id = "LINK-016"; attribute name = "VerifyExclusiveModeGuarantee"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = guaranteeExclusiveMode; part verificationCase = vcModeRange; }
                part linkVerifyFormalGuarantee2 : VerificationLink { attribute id = "LINK-017"; attribute name = "VerifyLockoutGuarantee"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = guaranteeLockoutPreventsBolus; part verificationCase = vcLockout; }
                part linkVerifyFormalGuarantee3 : VerificationLink { attribute id = "LINK-018"; attribute name = "VerifyTemporalModeSafety"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = temporalNoInvalidTransition; part verificationCase = vcTemporalModeSafety; }
                part linkEvidenceProduction : EvidenceProductionLink { attribute id = "LINK-013"; attribute name = "LockoutVerificationProducesEvidence"; attribute linkStatus = LinkStatusKind::active; part producer = vcLockout; part producedEvidence = evidenceLockout; }
                part linkEvidenceToRMF : DocumentInclusionLink { attribute id = "LINK-014"; attribute name = "EvidenceIncludedInRMF"; attribute linkStatus = LinkStatusKind::active; part sourceElement = evidenceLockout; part targetView = rmfView; }
                part orderAlarmBeforeIM : ExecutionOrderLink { attribute id = "LINK-015"; attribute name = "AlarmPrecedesInfusionManager"; attribute linkStatus = LinkStatusKind::active; attribute sameStepRequired = true; attribute precedenceRationale = "Alarm output must be available to infusion manager in same execution step so infusion stops immediately."; part predecessor = alarm; part successor = infusionMgr; }
                part linkHazardToSequence : RiskTraceLink { attribute id = "RLINK-001"; attribute name = "HazardToSequence"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "initiates"; part sourceRiskElement = overdoseHazard; part targetRiskElement = seqFrequentBolus; }
                part linkSequenceToSituation : RiskTraceLink { attribute id = "RLINK-002"; attribute name = "SequenceToSituation"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "leadsTo"; part sourceRiskElement = seqFrequentBolus; part targetRiskElement = hsExcessInfusion; }
                part linkSituationToHarm : RiskTraceLink { attribute id = "RLINK-003"; attribute name = "SituationToHarm"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "canCause"; part sourceRiskElement = hsExcessInfusion; part targetRiskElement = harmRespiratoryDepression; }
                part linkHarmToBeforeRisk : RiskTraceLink { attribute id = "RLINK-004"; attribute name = "HarmToBeforeRisk"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "characterizes"; part sourceRiskElement = harmRespiratoryDepression; part targetRiskElement = riskBefore; }
                part linkBeforeToMatrix : RiskTraceLink { attribute id = "RLINK-005"; attribute name = "BeforeRiskAssessedAgainstMatrix"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "assessedAgainst"; part sourceRiskElement = riskBefore; part targetRiskElement = riskMatrix; }
                part linkControlToAfter : RiskTraceLink { attribute id = "RLINK-006"; attribute name = "ControlResultsInAfterRisk"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "resultsIn"; part sourceRiskElement = lockoutControl; part targetRiskElement = riskAfter; }
                part linkAfterToMatrix : RiskTraceLink { attribute id = "RLINK-007"; attribute name = "AfterRiskAssessedAgainstMatrix"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "assessedAgainst"; part sourceRiskElement = riskAfter; part targetRiskElement = riskMatrix; }
                part linkResidualAggregation : RiskTraceLink { attribute id = "RLINK-008"; attribute name = "ResidualAggregated"; attribute linkStatus = LinkStatusKind::active; attribute riskRole = "aggregates"; part sourceRiskElement = residualEval; part targetRiskElement = riskAfter; }
                // Risk control measure mitigating the overdose hazard (ISO 14971 clause 7.1).
                part linkControlMitigatesHazard : HazardMitigationLink { attribute id = "LINK-019"; attribute name = "LockoutMitigatesOverdose"; attribute linkStatus = LinkStatusKind::active; part riskControl = lockoutControl; part mitigatedHazard = overdoseHazard; }
                // Class-C software item verification (IEC 62304 §5.7).
                part linkVerifyTlm : VerificationLink { attribute id = "LINK-020"; attribute name = "VerifyTopLevelMode"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = tlm; part verificationCase = vcModeRange; }
                part linkVerifyAlarm : VerificationLink { attribute id = "LINK-021"; attribute name = "VerifyAlarm"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = alarm; part verificationCase = vcSameStepAlarm; }
                part linkVerifyInfusionMgr : VerificationLink { attribute id = "LINK-022"; attribute name = "VerifyInfusionManager"; attribute linkStatus = LinkStatusKind::active; part verificationTarget = infusionMgr; part verificationCase = vcLockout; }
                // Verification cases produce evidence records (IEC 62304 §5.7.5).
                part linkEvidenceModeRange : EvidenceProductionLink { attribute id = "LINK-023"; attribute name = "ModeRangeProducesEvidence"; attribute linkStatus = LinkStatusKind::active; part producer = vcModeRange; part producedEvidence = evidenceModeRange; }
                part linkEvidenceSameStep : EvidenceProductionLink { attribute id = "LINK-024"; attribute name = "SameStepAlarmProducesEvidence"; attribute linkStatus = LinkStatusKind::active; part producer = vcSameStepAlarm; part producedEvidence = evidenceSameStepAlarm; }
                part linkEvidenceTemporal : EvidenceProductionLink { attribute id = "LINK-025"; attribute name = "TemporalModeSafetyProducesEvidence"; attribute linkStatus = LinkStatusKind::active; part producer = vcTemporalModeSafety; part producedEvidence = evidenceTemporalModeSafety; }
            }
        }
    }
}
