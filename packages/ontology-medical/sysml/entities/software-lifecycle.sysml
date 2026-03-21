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

    part def MaintenanceRelease {
        attribute version : String;
    }

    part def SoftwareDevelopmentPlan {
        attribute title : String;
    }

    part def SoftwareArchitectureArtifact {
        attribute title : String;
    }

    part def SoftwareDetailedDesign {
        attribute title : String;
    }

    part def SOUPEvaluation {
        attribute title : String;
    }

    part def SoftwareProblemReport {
        attribute reportId : String;
        attribute title : String;
    }

    part def ChangeImpactAssessment {
        attribute assessmentId : String;
        attribute title : String;
    }
}
