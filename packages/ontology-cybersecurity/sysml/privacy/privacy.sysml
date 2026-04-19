package MEMO_Ontology_Privacy {

    // ─── Personal Data Governance (GDPR / MDR Article 61 / HIPAA) ────────────
    // Privacy is a security concern — personal health data confidentiality,
    // integrity, and availability must be addressed alongside cybersecurity.

    // Classification of personal data processed by the device or its backend.
    part def PersonalDataCategory {
        attribute categoryName : String;    // e.g. "PHI", "PII", "biometric"
        attribute sensitivityLevel : String; // Low | Medium | High | Special
        attribute gdprCategory : String;    // e.g. "health data (Art.9)"
    }

    part def ProtectedHealthInformation :> PersonalDataCategory { }

    // A specific processing operation on personal data (GDPR Art. 30 record).
    action def DataProcessingActivity :> OperationalActivity {
        attribute activityName : String;
        attribute purpose : String;
        attribute legalBasis : String;      // Consent | Contract | LegitimateInterest | LegalObligation
        attribute dataCategories : String;
        attribute recipients : String;
        attribute retentionPeriod : String;
    }

    // A formal request from a data subject exercising GDPR rights.
    part def DataSubjectRequest {
        attribute requestId : String;
        attribute requestType : String;     // Access | Erasure | Portability | Rectification | Objection
        attribute responseDeadline : String;
    }

    // The Privacy Impact Assessment / Data Protection Impact Assessment (DPIA).
    part def PrivacyImpactAssessment :> QMSRecord {
        attribute dpiaRequired : Boolean;
        attribute riskLevel : String;
        attribute mitigationSummary : String;
    }

    // Privacy notice / consent artefact delivered to data subjects.
    part def PrivacyNotice :> QMSRecord {
        attribute noticeVersion : String;
        attribute language : String;
    }

    // Policy that specifies how long different data categories are retained.
    part def DataRetentionPolicy :> QMSRecord {
        attribute appliesTo : String;       // data category or system
        attribute retentionPeriod : String;
        attribute deletionMethod : String;
    }

    // Record of a personal data breach as required by GDPR Art. 33/34.
    part def DataBreachRecord :> QMSRecord {
        attribute breachId : String;
        attribute breachDate : String;
        attribute affectedRecords : Integer;
        attribute notifiedAuthority : Boolean;
        attribute notifiedDataSubjects : Boolean;
    }

    // ─── Privacy Relationships ────────────────────────────────────────────────
    connection def ClassifiesData {
        end classification : PersonalDataCategory [1];
        end subject [1];
    }

    connection def ProcessesData {
        end activity : DataProcessingActivity [1];
        end subject [1];
    }

    connection def ProvidesPrivacyNotice {
        end subject [1];
        end notice : PrivacyNotice [1];
    }

    connection def AssessesPrivacyImpact {
        end assessment : PrivacyImpactAssessment [1];
        end subject [1];
    }

    connection def RespondsToDataSubjectRequest {
        end request : DataSubjectRequest [1];
        end subject [1];
    }
}
