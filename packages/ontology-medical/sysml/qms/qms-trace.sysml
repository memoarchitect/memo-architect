package MEMO_Ontology_Medical_QMS {

    part def QMSRecord {
        attribute recordId : String;
        attribute title : String;
    }

    part def Standard {
        attribute name : String;
        attribute version : String;
    }

    part def RegulatoryRequirement {
        attribute name : String;
        attribute standardRef : String;
        attribute clause : String;
    }

    part def DesignHistoryRecord :> QMSRecord { }

    part def ChangeRecord :> QMSRecord { }

    part def ReleaseBaseline :> QMSRecord {
        attribute version : String;
    }

    part def ComplianceEvidence :> QMSRecord {
        attribute artifactType : String;
    }
}
