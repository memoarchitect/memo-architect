package MEMO_Ontology_Medical_Relationships {

    connection def Mitigates {
        end control : RiskControl [1];
        end hazard : Hazard [1];
    }

    connection def Causes {
        end hazard : Hazard [1];
        end situation : HazardousSituation [1];
    }

    connection def LeadsTo {
        end situation : HazardousSituation [1];
        end harm : Harm [1];
    }

    connection def Identifies {
        end risk : Risk [1];
        end hazard : Hazard [1];
    }

    connection def Preserves {
        end function : SafetyFunction [1];
        end performance : EssentialPerformance [1];
    }

    connection def AddressesUseError {
        end requirement : UserInterfaceRequirement [1];
        end useError : UseError [1];
    }

    connection def Evidences {
        end evidence : ComplianceEvidence [1];
        end subject[1];
    }

    connection def Documents {
        end record : QMSRecord [1];
        end subject[1];
    }
}
