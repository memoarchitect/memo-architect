package InfusionPump_Compliance {
    import MEMO_Ontology_Medical::*;
    import InfusionPump_Requirements::*;
    import InfusionPump_Risk::*;
    import InfusionPump_Architecture::*;

    requirement uiReqAlarmAcknowledgement : UserInterfaceRequirement {
        attribute redefines title = "Alarm acknowledgement shall require explicit user confirmation";
    }

    requirement useErrAlarmSilenced : UseError {
        attribute redefines title = "Clinician silences alarm without resolving occlusion";
    }

    action alarmAckScenario : HazardRelatedUseScenario {
        attribute redefines name = "Alarm acknowledgement during occlusion";
    }

    requirement pofControlledInfusion : PrimaryOperatingFunction {
        attribute redefines title = "Deliver prescribed infusion within clinically acceptable limits";
    }

    requirement epControlledDelivery : EssentialPerformance {
        attribute redefines title = "Maintain controlled infusion delivery and annunciation";
    }

    action sfMaintainControlledDelivery : SafetyFunction {
        attribute redefines name = "Maintain controlled delivery under fault conditions";
    }

    part usabilitySpecAlarmWorkflow : UsabilitySpecification {
        attribute redefines title = "Alarm acknowledgement usability specification";
    }

    part usabilityValAlarmWorkflow : UsabilityValidation {
        attribute redefines title = "Alarm acknowledgement summative validation";
    }

    part swSystemPumpController : SoftwareSystem {
        attribute redefines name = "Infusion Pump Control System";
    }

    part swItemTherapyController : SoftwareItem {
        attribute redefines name = "Therapy Control Item";
        attribute redefines safetyClass = SoftwareSafetyClass::C;
    }

    part swItemAlarmSupervisor : SoftwareItem {
        attribute redefines name = "Alarm Supervisor Item";
        attribute redefines safetyClass = SoftwareSafetyClass::B;
    }

    part soupRtos : SOUPItem {
        attribute redefines name = "Embedded RTOS";
        attribute redefines supplier = "Third-party supplier";
    }

    part swPlanPumpController : SoftwareDevelopmentPlan {
        attribute redefines title = "Pump controller software development plan";
    }

    part swArchPumpController : SoftwareArchitectureArtifact {
        attribute redefines title = "Pump controller software architecture";
    }

    part swDesignAlarmHandling : SoftwareDetailedDesign {
        attribute redefines title = "Alarm handling detailed design";
    }

    part soupEvalRtos : SOUPEvaluation {
        attribute redefines title = "Embedded RTOS SOUP evaluation";
    }

    part anomalyAlarmDelay : SoftwareAnomaly {
        attribute redefines anomalyId = "ANOM-001";
        attribute redefines title = "Alarm acknowledgement latency regression";
    }

    part problemAlarmDelay : SoftwareProblemReport {
        attribute redefines reportId = "PR-001";
        attribute redefines title = "Alarm latency problem report";
    }

    part changeAlarmDelay : ChangeImpactAssessment {
        attribute redefines assessmentId = "CIA-001";
        attribute redefines title = "Alarm acknowledgement fix impact assessment";
    }

    part dhfSoftwareTrace : DesignHistoryRecord {
        attribute redefines recordId = "DHF-001";
        attribute redefines title = "Software and usability trace package";
    }

    part evidenceUsabilitySummary : ComplianceEvidence {
        attribute redefines recordId = "EV-001";
        attribute redefines title = "Summative usability evidence";
        attribute redefines artifactType = "Usability Test Report";
    }

    part releaseBaseline10 : ReleaseBaseline {
        attribute redefines recordId = "REL-001";
        attribute redefines title = "Release baseline 1.0";
        attribute redefines version = "1.0.0";
    }

    part testAlarmUiWorkflow : Test {
        attribute redefines testId = "TC-UI-001";
        attribute redefines name = "Alarm acknowledgement workflow test";
    }

    part testSoftwareFlowControl : Test {
        attribute redefines testId = "TC-SW-001";
        attribute redefines name = "Software flow control verification";
    }

    part testAntiFreeFlowContainment : Test {
        attribute redefines testId = "TC-MECH-001";
        attribute redefines name = "Anti-free-flow containment test";
    }

    connection : AddressesUseError connect uiRequirement ::> uiReqAlarmAcknowledgement to useError ::> useErrAlarmSilenced;
    connection : TraceTo connect source ::> useErrAlarmSilenced to target ::> hazUnderInfusion;
    connection : TraceTo connect source ::> alarmAckScenario to target ::> useErrAlarmSilenced;
    connection : TraceTo connect source ::> pofControlledInfusion to target ::> srFlowAccuracy;
    connection : TraceTo connect source ::> epControlledDelivery to target ::> pofControlledInfusion;
    connection : Preserves connect function ::> sfMaintainControlledDelivery to performance ::> epControlledDelivery;
    connection : TraceTo connect source ::> sfMaintainControlledDelivery to target ::> rcFlowRateLimiter;
    connection : TraceTo connect source ::> uiReqAlarmAcknowledgement to target ::> srAlarmAudibility;
    connection : TraceTo connect source ::> swItemTherapyController to target ::> srFlowAccuracy;
    connection : TraceTo connect source ::> swItemAlarmSupervisor to target ::> srAlarmAudibility;
    connection : Causes connect hazard ::> hazFreeFlow to situation ::> hsFreeFlowSituation;
    connection : LeadsTo connect situation ::> hsFreeFlowSituation to harm ::> harmOverdose;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> uiReqAlarmAcknowledgement;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> usabilityValAlarmWorkflow;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> srAlarmAudibility;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> srFlowAccuracy;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> swrAlarmManagement;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> rcFlowRateLimiter;
    connection : Verify connect verifiedBy ::> testAntiFreeFlowContainment to verifies ::> rcAntiFreeFlow;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swPlanPumpController;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swArchPumpController;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swDesignAlarmHandling;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> soupRtos;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> anomalyAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> problemAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> changeAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> releaseBaseline10;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> usabilityValAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> uiReqAlarmAcknowledgement;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swSystemPumpController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemTherapyController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemAlarmSupervisor;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> soupEvalRtos;
    connection : AllocateTo connect function ::> sfDisplayStatus to structure ::> alarmSubsystem;
}
