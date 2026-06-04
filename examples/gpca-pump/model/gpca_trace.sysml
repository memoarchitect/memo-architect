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
                connection : DerivesFrom connect sourceDriver ::> needSafeTherapy to targetRequirement ::> reqSingleMode;
                connection : DerivesFrom connect sourceDriver ::> riskBefore to targetRequirement ::> reqLockout;
                connection : DerivesFrom connect sourceDriver ::> riskBefore to targetRequirement ::> reqAlarmStopsInfusion;
                connection : SatisfiedBy connect requirement ::> reqSingleMode to satisfyingElement ::> tlm;
                connection : SatisfiedBy connect requirement ::> reqLockout to satisfyingElement ::> infusionMgr;
                connection : SatisfiedBy connect requirement ::> reqAlarmStopsInfusion to satisfyingElement ::> alarm;
                connection : AllocatedTo connect function ::> fnMonitorAlarm to allocatedElement ::> alarm;
                connection : AllocatedTo connect function ::> fnManageInfusion to allocatedElement ::> infusionMgr;
                connection : RealizesInterface connect logicalInterface ::> sensorInputInterface to physicalInterface ::> hwSoftwareBus;
                connection : VerifiedBy connect verificationTarget ::> reqSingleMode to verificationCase ::> vcModeRange;
                connection : VerifiedBy connect verificationTarget ::> reqLockout to verificationCase ::> vcLockout;
                connection : VerifiedBy connect verificationTarget ::> lockoutControl to verificationCase ::> vcLockout;
                connection : VerifiedBy connect verificationTarget ::> propAlarmStopsSameStep to verificationCase ::> vcSameStepAlarm;
                connection : VerifiedBy connect verificationTarget ::> guaranteeExclusiveMode to verificationCase ::> vcModeRange;
                connection : VerifiedBy connect verificationTarget ::> guaranteeLockoutPreventsBolus to verificationCase ::> vcLockout;
                connection : VerifiedBy connect verificationTarget ::> temporalNoInvalidTransition to verificationCase ::> vcTemporalModeSafety;
                connection : ProducesEvidence connect producer ::> vcLockout to producedEvidence ::> evidenceLockout;
                connection : IncludedIn connect sourceElement ::> evidenceLockout to targetView ::> rmfView;
                connection : Precedes connect predecessor ::> alarm to successor ::> infusionMgr;
                connection : TracesRisk connect sourceRiskElement ::> overdoseHazard to targetRiskElement ::> seqFrequentBolus;
                connection : TracesRisk connect sourceRiskElement ::> seqFrequentBolus to targetRiskElement ::> hsExcessInfusion;
                connection : TracesRisk connect sourceRiskElement ::> hsExcessInfusion to targetRiskElement ::> harmRespiratoryDepression;
                connection : TracesRisk connect sourceRiskElement ::> harmRespiratoryDepression to targetRiskElement ::> riskBefore;
                connection : AssessedAgainst connect risk ::> riskBefore to riskMatrix ::> riskMatrix;
                connection : TracesRisk connect sourceRiskElement ::> lockoutControl to targetRiskElement ::> riskAfter;
                connection : AssessedAgainst connect risk ::> riskAfter to riskMatrix ::> riskMatrix;
                connection : TracesRisk connect sourceRiskElement ::> residualEval to targetRiskElement ::> riskAfter;
                // Risk control measure mitigating the overdose hazard (ISO 14971 clause 7.1).
                connection : MitigatesHazard connect riskControl ::> lockoutControl to mitigatedHazard ::> overdoseHazard;
                // Class-C software item verification (IEC 62304 §5.7).
                connection : VerifiedBy connect verificationTarget ::> tlm to verificationCase ::> vcModeRange;
                connection : VerifiedBy connect verificationTarget ::> alarm to verificationCase ::> vcSameStepAlarm;
                connection : VerifiedBy connect verificationTarget ::> infusionMgr to verificationCase ::> vcLockout;
                // Verification cases produce evidence records (IEC 62304 §5.7.5).
                connection : ProducesEvidence connect producer ::> vcModeRange to producedEvidence ::> evidenceModeRange;
                connection : ProducesEvidence connect producer ::> vcSameStepAlarm to producedEvidence ::> evidenceSameStepAlarm;
                connection : ProducesEvidence connect producer ::> vcTemporalModeSafety to producedEvidence ::> evidenceTemporalModeSafety;
            }
        }
    }
}
