package MEMO_Ontology_Medical_DesignControl {

    requirement def IntendedUse {
        attribute title : String;
    }

    requirement def IndicationForUse {
        attribute title : String;
    }

    part def UserProfile {
        attribute name : String;
        attribute role : String;
    }

    part def UseEnvironment {
        attribute name : String;
        attribute setting : String;
    }

    requirement def DesignInput {
        attribute inputId : String;
        attribute title : String;
    }

    part def DesignOutput {
        attribute outputId : String;
        attribute title : String;
    }

    part def DesignReview {
        attribute reviewId : String;
        attribute title : String;
    }
}
