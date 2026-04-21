package MEMO_Ontology_Process_ISO27001_27701 {

    // ISO 27001:2022 (ISMS) + ISO 27701:2019 (PIMS extension).
    // Covers security and privacy management processes for medical devices
    // that process personal data (EU MDR Art. 110, HIPAA, GDPR).

    part def InformationSecurityPolicy :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute policyId : String;
        attribute scope : String;
        attribute riskAppetite : String;
    }

    part def RiskTreatmentPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute planId : String;
        attribute treatmentOptions : String;
        attribute residualRiskAccepted : Boolean;
    }

    part def StatementOfApplicability :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute soaVersion : String;
        attribute controlsApplicable : Integer;
        attribute controlsExcluded : Integer;
    }

    part def DataProtectionImpactAssessment :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute dpiaId : String;
        attribute necessity : String;
        attribute proportionality : String;
        attribute residualRisk : String;
        attribute dpoConsulted : Boolean;
    }

    part def PrivacyNotice :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute noticeId : String;
        attribute dataSubjectCategories : String;
        attribute purposes : String;
        attribute retentionPeriods : String;
        attribute rights : String;
    }

    part def DataBreachRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute breachId : String;
        attribute discoveryDate : String;
        attribute affectedRecords : Integer;
        attribute notificationDeadline : String;
        attribute notified : Boolean;
    }

    connection def AssessesPrivacyImpact {
        end dpia : DataProtectionImpactAssessment [1];
        end processingActivity[1];
    }

    connection def TreatsRisk {
        end plan : RiskTreatmentPlan [1];
        end threat[1];
    }
}
