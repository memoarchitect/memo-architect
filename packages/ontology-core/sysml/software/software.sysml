package MEMO_Ontology_Core_Software {

    part def Software {
        attribute name : String;
        attribute version : String;
        attribute supplier : String;
        attribute safetyClassification : String;
    }

    part def SoftwareComponent :> Software { }

    part def Firmware :> Software { }
}
