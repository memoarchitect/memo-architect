package MEMO_Ontology_Process_Common {

    // Base types extended by all standard-specific process definitions.
    // v12 Tab 2: C-034..C-036.

    part def ProcessActivity {
        attribute activityId : String;
        attribute name : String;
        attribute standard : String;
        attribute clause : String;
        attribute mandatory : Boolean;
        attribute safetyClassTailoring : String;
    }

    part def WorkProduct {
        attribute workProductId : String;
        attribute title : String;
        attribute standard : String;
        attribute clause : String;
        attribute version : String;
        attribute status : String;
        attribute location : String;
    }

    part def DesignReview :> WorkProduct {
        attribute reviewPhase : String;
        attribute reviewDate : String;
        attribute outcome : String;
        attribute chair : String;
    }
}
