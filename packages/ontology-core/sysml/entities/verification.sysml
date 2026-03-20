package MEMO_Ontology_Core_Verification {

    part def Test {
        attribute name : String;
        attribute testId : String;
    }

    part def VerificationCase {
        attribute name : String;
    }

    part def ValidationCase {
        attribute name : String;
    }

    part def Evidence {
        attribute name : String;
        attribute artifactType : String;
    }
}
