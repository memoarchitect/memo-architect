package MEMO_Ontology_Arch_Operational {

    part def System {
        attribute name : String;
        attribute systemId : String;
        attribute description : String;
    }

    part def Actor {
        attribute name : String;
        attribute role : String;
    }

    part def EnvironmentContext :> System {
        attribute setting : String;
        attribute regulatoryJurisdiction : String;
    }

    part def UserNeed {
        attribute needId : String;
        attribute statement : String;
        attribute source : String;
    }

    part def IntendedUse {
        attribute useId : String;
        attribute statement : String;
        attribute patientPopulation : String;
        attribute useEnvironment : String;
        attribute indications : String;
        attribute contraindications : String;
    }
}
