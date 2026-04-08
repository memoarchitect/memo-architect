package MEMO_Extension_Medical_QMS_Relationships {

    connection def Evidences {
        end evidence : ComplianceEvidence [1];
        end subject[1];
    }

    connection def Documents {
        end record : QMSRecord [1];
        end subject[1];
    }

    connection def AppliesStandardRequirement {
        end standardRequirement : RegulatoryRequirement [1];
        end subject[1];
    }
}
