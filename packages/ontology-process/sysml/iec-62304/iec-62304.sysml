package MEMO_Ontology_Process_IEC62304 {

    // IEC 62304:2006+A1:2015 — Medical device software lifecycle processes.
    // Classes that extend ontology-arch software kinds (SoftwareComponent,
    // SoftwareModule) stay here as process-layer specializations.

    enum def SoftwareSafetyClass {
        enum A;
        enum B;
        enum C;
    }

    part def SoftwareItem :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
        attribute itemId : String;
    }

    part def SoftwareUnit :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
        attribute unitId : String;
    }

    part def SOUPItem :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute soupId : String;
        attribute soupVersion : String;
        attribute supplier : String;
        attribute anomalyListReviewed : Boolean;
    }

    part def SoftwareDevelopmentPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute targetSafetyClass : SoftwareSafetyClass;
        attribute lifecycleModel : String;
    }

    part def SoftwareRequirementsSpec :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareArchitectureDocument :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareUnitTestRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
        attribute unitRef : String;
    }

    part def SoftwareIntegrationTestRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareSystemTestRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute safetyClass : SoftwareSafetyClass;
    }

    part def SoftwareProblemReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute reportId : String;
        attribute severity : SoftwareSafetyClass;
        attribute status : String;
    }

    part def ChangeImpactAssessment :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute assessmentId : String;
        attribute safetyImpact : Boolean;
        attribute safetyClassChange : Boolean;
    }

    part def SOUPEvaluation :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute soupRef : String;
        attribute publishedAnomalyListDate : String;
    }

    connection def GovernsActivity {
        end plan : SoftwareDevelopmentPlan [1];
        end activity : MEMO_Ontology_Process_Common::ProcessActivity [1];
    }

    connection def ProducesWorkProduct {
        end activity : MEMO_Ontology_Process_Common::ProcessActivity [1];
        end workProduct : MEMO_Ontology_Process_Common::WorkProduct [1];
    }
}
