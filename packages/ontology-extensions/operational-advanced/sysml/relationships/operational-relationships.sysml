package MEMO_Extension_Operational_Relationships {

    connection def HasSubProcedure {
        end procedure : Procedure [1];
        end subProcedure : Procedure [0..*];
    }

    connection def PerformedBy {
        end procedure : Procedure [1];
        end performer : OperationalActor [1];
    }

    connection def PerformedOn {
        end procedure : Procedure [1];
        end subject : OperationalEntity [1];
    }

    connection def OccursIn {
        end procedure : Procedure [1];
        end environment : OperationalEnvironment [1];
    }

    connection def UsesResource {
        end procedure : Procedure [1];
        end resource[1];
    }

    connection def HasEquipment {
        end environment : OperationalEnvironment [1];
        end equipment[0..*];
    }

    connection def HasPersonnel {
        end environment : OperationalEnvironment [1];
        end personnel : OperationalActor [0..*];
    }

    connection def ContainsSubstance {
        end environment : OperationalEnvironment [1];
        end substance : Substance [0..*];
    }
}
