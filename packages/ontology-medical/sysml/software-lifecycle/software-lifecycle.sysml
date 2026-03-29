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

    part def SoftwareWorkProduct {
        attribute title : String;
    }

    part def SoftwareDevelopmentPlan :> SoftwareWorkProduct { }

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
