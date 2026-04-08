package MEMO_Extension_Medical_Privacy {

    part def PersonalDataCategory {
        attribute name : String;
        attribute sensitivity : String;
    }

    part def ProtectedHealthInformation :> PersonalDataCategory { }

    action def DataProcessingActivity :> OperationalActivity {
        attribute purpose : String;
    }

    part def PrivacyNotice :> QMSRecord {
        attribute noticeScope : String;
    }

    part def PrivacyImpactAssessment :> QMSRecord {
        attribute scope : String;
    }

    part def DataSubjectRequest :> QMSRecord {
        attribute requestId : String;
        attribute requestType : String;
    }
}
