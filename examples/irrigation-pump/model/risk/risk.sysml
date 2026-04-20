package IrrigationPump_Risk {
    import MEMO_Ontology_MedicalArch::*;
    import MEMO_Ontology_MedicalProcess::*;

    requirement hazOverpressure : Hazard {
        attribute redefines hazardId = "HAZ-IRR-001";
        attribute redefines title = "Excessive Irrigation Pressure";
    }

    requirement hazAirInLine : Hazard {
        attribute redefines hazardId = "HAZ-IRR-002";
        attribute redefines title = "Air Introduced Into Irrigation Path";
    }

    requirement hazLossOfIrrigation : Hazard {
        attribute redefines hazardId = "HAZ-IRR-003";
        attribute redefines title = "Loss of Irrigation Delivery";
    }

    requirement hsJointOverdistension : HazardousSituation {
        attribute redefines hsId = "HS-IRR-001";
        attribute redefines title = "Joint space is exposed to excessive irrigation pressure";
    }

    requirement hsUnprimedFluidPath : HazardousSituation {
        attribute redefines hsId = "HS-IRR-002";
        attribute redefines title = "Unprimed cassette delivers air into the surgical field";
    }

    requirement hsCollapsedField : HazardousSituation {
        attribute redefines hsId = "HS-IRR-003";
        attribute redefines title = "Reservoir depletion collapses irrigation pressure during the procedure";
    }

    requirement harmTissueExtravasation : Harm {
        attribute redefines harmId = "HARM-IRR-001";
        attribute redefines title = "Tissue extravasation from excessive pressure";
        attribute redefines severity = SeverityLevel::Serious;
    }

    requirement harmAirEmbolicComplication : Harm {
        attribute redefines harmId = "HARM-IRR-002";
        attribute redefines title = "Complication from air introduced into the fluid path";
        attribute redefines severity = SeverityLevel::Critical;
    }

    requirement harmLossOfVisualization : Harm {
        attribute redefines harmId = "HARM-IRR-003";
        attribute redefines title = "Loss of visualization requiring procedure interruption";
        attribute redefines severity = SeverityLevel::Serious;
    }

    requirement riskPressureInjury : Risk {
        attribute redefines riskId = "RISK-IRR-001";
        attribute redefines title = "Pressure-induced injury risk assessment";
        attribute redefines severityPost = SeverityLevel::Serious;
        attribute redefines probabilityPost = ProbabilityLevel::Remote;
    }

    part benefitSustainedVisualization : ClinicalBenefit {
        attribute redefines benefitId = "BEN-IRR-001";
        attribute redefines title = "Sustained arthroscopic visualization with controlled distension";
    }

    part residualRiskEvalPressureControl : ResidualRiskEvaluation {
        attribute redefines evaluationId = "RRE-IRR-001";
        attribute redefines title = "Residual pressure-control risk evaluation";
        attribute redefines acceptability = "Acceptable with implemented controls and verification";
    }

    part overallResidualRiskEvalIrrigation : OverallResidualRiskEvaluation {
        attribute redefines evaluationId = "ORRE-IRR-001";
        attribute redefines title = "Overall residual risk evaluation for irrigation support";
        attribute redefines acceptability = "Acceptable when weighed against clinical benefit";
        attribute redefines conclusion = "Residual pressure and depletion risks are acceptable for intended arthroscopy use when controls remain in place.";
    }

    part benefitRiskAssessmentIrrigation : BenefitRiskAssessment {
        attribute redefines assessmentId = "BRA-IRR-001";
        attribute redefines title = "Irrigation support benefit-risk assessment";
        attribute redefines conclusion = "The residual risks are acceptable relative to the benefit of maintaining visualization and procedure continuity.";
    }

    requirement rcPressureLimiter : RiskControl {
        attribute redefines rcId = "RC-IRR-001";
        attribute redefines title = "Pressure Limiter";
    }

    requirement rcPrimeCompletionInterlock : RiskControl {
        attribute redefines rcId = "RC-IRR-002";
        attribute redefines title = "Prime Completion Interlock";
    }

    requirement rcReservoirLowAlarm : RiskControl {
        attribute redefines rcId = "RC-IRR-003";
        attribute redefines title = "Reservoir Low Alarm";
    }

    requirement dcPressurePlausibilityCheck : RiskControl {
        attribute redefines rcId = "RC-IRR-004";
        attribute redefines title = "Pressure Sensor Plausibility Check";
    }

    part fmeaPressureAndAlarmIntegrity : FailureModesAndEffectsAnalysis {
        attribute redefines title = "Pressure regulation and reservoir alarm FMEA";
    }

    requirement fmPressureSensorDrift : FailureMode {
        attribute redefines failureModeId = "FM-IRR-001";
        attribute redefines title = "Pressure sensor drifts high during irrigation";
    }

    requirement fcPressureTransducerBias : FailureCause {
        attribute redefines causeId = "FC-IRR-001";
        attribute redefines title = "Pressure transducer bias after sterilization cycle";
    }

    requirement feUncontrolledPressureRise : FailureEffect {
        attribute redefines effectId = "FE-IRR-001";
        attribute redefines title = "Control loop drives irrigation pressure above the intended setting";
    }

    requirement fmReservoirScaleDisconnect : FailureMode {
        attribute redefines failureModeId = "FM-IRR-002";
        attribute redefines title = "Reservoir scale disconnects during the procedure";
    }

    requirement fcScaleCableDislodged : FailureCause {
        attribute redefines causeId = "FC-IRR-002";
        attribute redefines title = "Scale cable is dislodged when the pole is repositioned";
    }

    requirement feLateReservoirAlarm : FailureEffect {
        attribute redefines effectId = "FE-IRR-002";
        attribute redefines title = "Reservoir depletion alarm occurs too late for clinician response";
    }

    part ftaReservoirAlarmLoss : FaultTreeAnalysis {
        attribute redefines title = "Late reservoir alarm fault tree";
    }

    requirement teLateReservoirAlarm : TopEvent {
        attribute redefines eventId = "TE-IRR-001";
        attribute redefines title = "Late reservoir alarm during active irrigation";
    }

    requirement ieReservoirStateUndetected : FaultTreeContributor {
        attribute redefines eventId = "IE-IRR-001";
        attribute redefines title = "Reservoir state becomes unavailable to the alarm supervisor";
    }

    requirement beScaleInputUnavailable : FaultTreeContributor {
        attribute redefines eventId = "BE-IRR-001";
        attribute redefines title = "Reservoir scale input is unavailable";
    }

    requirement beVolumeEstimateFrozen : FaultTreeContributor {
        attribute redefines eventId = "BE-IRR-002";
        attribute redefines title = "Reservoir estimate remains frozen at a stale value";
    }

    requirement beAlarmCoordinatorHung : FaultTreeContributor {
        attribute redefines eventId = "BE-IRR-003";
        attribute redefines title = "Alarm coordinator stops updating the low-reservoir state";
    }

    part gateReservoirStateUndetected : FaultTreeGate {
        attribute redefines name = "Reservoir state unavailable OR gate";
        attribute redefines gateType = FaultTreeGateType::Or;
    }

    part gateLateReservoirAlarm : FaultTreeGate {
        attribute redefines name = "Late reservoir alarm OR gate";
        attribute redefines gateType = FaultTreeGateType::Or;
    }

    connection : Mitigates connect control ::> rcPressureLimiter to hazard ::> hazOverpressure;
    connection : Mitigates connect control ::> rcPrimeCompletionInterlock to hazard ::> hazAirInLine;
    connection : Mitigates connect control ::> rcReservoirLowAlarm to hazard ::> hazLossOfIrrigation;
    connection : Mitigates connect control ::> dcPressurePlausibilityCheck to hazard ::> hazOverpressure;

    connection : Causes connect hazard ::> hazOverpressure to situation ::> hsJointOverdistension;
    connection : Causes connect hazard ::> hazAirInLine to situation ::> hsUnprimedFluidPath;
    connection : Causes connect hazard ::> hazLossOfIrrigation to situation ::> hsCollapsedField;

    connection : LeadsTo connect situation ::> hsJointOverdistension to harm ::> harmTissueExtravasation;
    connection : LeadsTo connect situation ::> hsUnprimedFluidPath to harm ::> harmAirEmbolicComplication;
    connection : LeadsTo connect situation ::> hsCollapsedField to harm ::> harmLossOfVisualization;

    connection : Identifies connect risk ::> riskPressureInjury to hazard ::> hazOverpressure;
    connection : AssessesResidualRisk connect evaluation ::> residualRiskEvalPressureControl to subject ::> riskPressureInjury;
    connection : AssessesResidualRisk connect evaluation ::> residualRiskEvalPressureControl to subject ::> hsCollapsedField;
    connection : WeighsAgainstBenefit connect assessment ::> benefitRiskAssessmentIrrigation to benefit ::> benefitSustainedVisualization;
    connection : ConcludesBenefitRisk connect assessment ::> benefitRiskAssessmentIrrigation to subject ::> residualRiskEvalPressureControl;
    connection : ConcludesBenefitRisk connect assessment ::> benefitRiskAssessmentIrrigation to subject ::> overallResidualRiskEvalIrrigation;

    connection : AnalyzesFailureMode connect analysis ::> fmeaPressureAndAlarmIntegrity to failureMode ::> fmPressureSensorDrift;
    connection : AnalyzesFailureMode connect analysis ::> fmeaPressureAndAlarmIntegrity to failureMode ::> fmReservoirScaleDisconnect;
    connection : HasFailureCause connect failureMode ::> fmPressureSensorDrift to cause ::> fcPressureTransducerBias;
    connection : HasFailureCause connect failureMode ::> fmReservoirScaleDisconnect to cause ::> fcScaleCableDislodged;
    connection : ResultsInFailureEffect connect failureMode ::> fmPressureSensorDrift to effect ::> feUncontrolledPressureRise;
    connection : ResultsInFailureEffect connect failureMode ::> fmReservoirScaleDisconnect to effect ::> feLateReservoirAlarm;
    connection : EscalatesToRisk connect effect ::> feUncontrolledPressureRise to subject ::> hazOverpressure;
    connection : EscalatesToRisk connect effect ::> feLateReservoirAlarm to subject ::> hsCollapsedField;
    connection : DetectsFailureMode connect control ::> dcPressurePlausibilityCheck to failureMode ::> fmPressureSensorDrift;
    connection : DetectsFailureMode connect control ::> rcReservoirLowAlarm to failureMode ::> fmReservoirScaleDisconnect;

    connection : DefinesTopEvent connect analysis ::> ftaReservoirAlarmLoss to topEvent ::> teLateReservoirAlarm;
    connection : UsesGate connect event ::> ieReservoirStateUndetected to gate ::> gateReservoirStateUndetected;
    connection : UsesGate connect event ::> teLateReservoirAlarm to gate ::> gateLateReservoirAlarm;
    connection : ContributesToEvent connect contributor ::> beScaleInputUnavailable to event ::> ieReservoirStateUndetected;
    connection : ContributesToEvent connect contributor ::> beVolumeEstimateFrozen to event ::> ieReservoirStateUndetected;
    connection : ContributesToEvent connect contributor ::> ieReservoirStateUndetected to event ::> teLateReservoirAlarm;
    connection : ContributesToEvent connect contributor ::> beAlarmCoordinatorHung to event ::> teLateReservoirAlarm;
    connection : TriggersHazardousSituation connect event ::> teLateReservoirAlarm to situation ::> hsCollapsedField;
}
