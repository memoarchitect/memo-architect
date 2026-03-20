package MEMO_Ontology_Core_Software {

    part def Software {
        attribute name : String;
        attribute version : String;
        attribute supplier : String;
    }

    part def SoftwareComponent :> Software { }

    part def SoftwareModule :> Software { }

    part def Firmware :> Software { }

    part def OperatingSystem :> Software { }
}
