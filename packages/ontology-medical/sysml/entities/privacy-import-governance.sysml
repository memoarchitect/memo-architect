package MEMO_Ontology_Medical_PrivacyGovernance {

    part def PersonalDataCategory {
        attribute name : String;
        attribute sensitivity : String;
    }

    part def SpecialCategoryPersonalData :> PersonalDataCategory { }

    part def ProtectedHealthInformation :> PersonalDataCategory { }

    action def DataProcessingActivity :> OperationalActivity {
        attribute purpose : String;
    }

    part def ProcessingBasis {
        attribute basisId : String;
        attribute title : String;
    }

    part def LawfulBasis :> ProcessingBasis { }

    part def HIPAAPermissionBasis :> ProcessingBasis { }

    part def ConsentRecord :> QMSRecord {
        attribute scope : String;
    }

    part def PrivacyNotice :> QMSRecord {
        attribute noticeScope : String;
    }

    part def DataRetentionPolicy {
        attribute policyId : String;
        attribute retentionPeriod : String;
    }

    part def MinimumNecessaryPolicy {
        attribute policyId : String;
    }

    part def DataControllerRole :> OperationalActor { }

    part def DataProcessorRole :> OperationalActor { }

    part def DeIdentificationMethod {
        attribute methodName : String;
    }

    part def PseudonymizationMethod {
        attribute methodName : String;
    }

    part def PrivacyImpactAssessment :> QMSRecord {
        attribute scope : String;
    }

    part def DataSubjectRequest :> QMSRecord {
        attribute requestId : String;
        attribute requestType : String;
    }

    part def AccessRequest :> DataSubjectRequest { }

    part def ErasureRequest :> DataSubjectRequest { }

    part def RectificationRequest :> DataSubjectRequest { }

    part def TerminologyImportBoundary {
        attribute boundaryId : String;
        attribute scope : String;
    }

    part def ImportedTerminologySubset {
        attribute subsetId : String;
        attribute title : String;
        attribute version : String;
    }

    part def ImportedConceptBinding {
        attribute bindingId : String;
        attribute localConcept : String;
        attribute externalConcept : String;
    }

    part def ImportProvenanceRecord :> ComplianceEvidence {
        attribute sourceUri : String;
        attribute sourceVersion : String;
    }
}
