package MEMO_Ontology_Medical_SoftwareLifecycle {

    enum def SoftwareSafetyClass {
        enum A;
        enum B;
        enum C;
    }

    part def SoftwareSystem {
        attribute name : String;
    }

    part def SoftwareItem {
        attribute name : String;
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareUnit {
        attribute name : String;
    }

    part def SOUPItem {
        attribute name : String;
        attribute supplier : String;
    }

    part def SoftwareAnomaly {
        attribute anomalyId : String;
        attribute title : String;
    }

    action def SoftwareLifecycleProcess {
        attribute name : String;
    }

    action def SoftwareLifecycleActivity {
        attribute name : String;
    }

    action def SoftwareDevelopmentProcess :> SoftwareLifecycleProcess { }

    action def SoftwareMaintenanceProcess :> SoftwareLifecycleProcess { }

    action def SoftwareRiskManagementProcess :> SoftwareLifecycleProcess { }

    action def SoftwareRequirementsAnalysisActivity :> SoftwareLifecycleActivity { }

    action def SoftwareArchitecturalDesignActivity :> SoftwareLifecycleActivity { }

    action def SoftwareDetailedDesignActivity :> SoftwareLifecycleActivity { }

    action def SoftwareUnitImplementationActivity :> SoftwareLifecycleActivity { }

    action def SoftwareVerificationActivity :> SoftwareLifecycleActivity { }

    action def ProblemResolutionActivity :> SoftwareLifecycleActivity { }

    part def SoftwareWorkProduct {
        attribute title : String;
    }

    part def MaintenanceRelease :> SoftwareWorkProduct {
        attribute version : String;
    }

    part def SoftwareRequirementsArtifact :> SoftwareWorkProduct { }

    part def SoftwareDevelopmentPlan :> SoftwareWorkProduct { }

    part def SoftwareArchitectureArtifact :> SoftwareWorkProduct { }

    part def SoftwareDetailedDesign :> SoftwareWorkProduct { }

    part def SOUPEvaluation :> SoftwareWorkProduct { }

    part def SoftwareProblemReport :> SoftwareWorkProduct {
        attribute reportId : String;
        attribute title : String;
    }

    part def ChangeImpactAssessment :> SoftwareWorkProduct {
        attribute assessmentId : String;
        attribute title : String;
    }
}
