package MEMO_Extension_Medical_DesignControl {

    requirement def IntendedUse {
        attribute title : String;
    }

    requirement def DesignInput {
        attribute inputId : String;
        attribute title : String;
    }

    requirement def UserInterfaceRequirement :> InterfaceRequirement {
        attribute title : String;
    }

    requirement def UseError :> Requirement {
        attribute title : String;
    }

    part def UseSpecification {
        attribute title : String;
    }

    part def UseErrorAnalysis {
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

    part def UsabilitySpecification {
        attribute title : String;
    }

    part def FormativeEvaluation :> ValidationCase {
        attribute title : String;
    }

    part def SummativeEvaluation :> ValidationCase {
        attribute title : String;
    }
}
