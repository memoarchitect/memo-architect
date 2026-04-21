package MEMO_Ontology_Arch_Verification {

    part def Requirement {
        attribute reqId : String;
        attribute statement : String;
        attribute rationale : String;
        attribute source : String;
        attribute verificationMethod : String;
        attribute priority : String;
    }

    part def VerificationCase {
        attribute caseId : String;
        attribute title : String;
        attribute method : String;
        attribute status : String;
        attribute result : String;
    }

    part def Evidence {
        attribute evidenceId : String;
        attribute title : String;
        attribute artifactType : String;
        attribute version : String;
        attribute location : String;
    }

    part def SecurityRequirement :> Requirement {
        attribute strideCategory : String;
        attribute controlObjective : String;
    }

    part def PrivacyRequirement :> Requirement {
        attribute gdprArticle : String;
        attribute privacyPrinciple : String;
    }
}
