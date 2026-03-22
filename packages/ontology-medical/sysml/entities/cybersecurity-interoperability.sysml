package MEMO_Ontology_Medical_Cybersecurity {

    requirement def CybersecurityRequirement :> TechnicalRequirement {
        attribute title : String;
    }

    requirement def AuthenticationRequirement :> CybersecurityRequirement { }

    requirement def AuthorizationRequirement :> CybersecurityRequirement { }

    requirement def AuditLogRequirement :> CybersecurityRequirement { }

    part def CyberAsset {
        attribute name : String;
        attribute assetType : String;
    }

    part def ThreatModel :> FailureAnalysis {
        attribute title : String;
    }

    requirement def ThreatScenario {
        attribute threatId : String;
        attribute title : String;
    }

    requirement def Vulnerability {
        attribute vulnerabilityId : String;
        attribute title : String;
    }

    requirement def SecurityControl :> RiskControl { }

    part def SBOMArtifact :> SoftwareWorkProduct { }

    part def SecureUpdateCapability {
        attribute name : String;
    }

    part def ClinicalCodeSystemReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def ClinicalValueSetReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def ClinicalConceptMapReference {
        attribute canonicalUri : String;
        attribute version : String;
        attribute title : String;
    }

    part def TerminologyBinding {
        attribute bindingId : String;
        attribute bindingStrength : String;
    }
}
