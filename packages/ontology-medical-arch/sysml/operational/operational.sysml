package MEMO_Ontology_MedicalArch_Operational {

    part def OperationalActor {
        attribute name : String;
        attribute role : String;
    }

    part def OperationalEntity {
        attribute name : String;
        attribute category : String;
    }

    part def OperationalEnvironment :> OperationalEntity {
        attribute setting : String;
    }

    part def Resource :> OperationalEntity { }

    action def OperationalActivity {
        attribute name : String;
        attribute level : String;
    }

    action def Operation :> OperationalActivity { }

    action def Procedure :> Operation {
        attribute objective : String;
    }
}
