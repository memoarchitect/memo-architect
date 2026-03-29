package MEMO_Ontology_Clinical_Interop {

    part def ClinicalCodeSystemReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def ClinicalValueSetReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def ClinicalConceptMapReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def TerminologyBinding {
        attribute bindingId : String;
        attribute bindingStrength : String;
    }
}
