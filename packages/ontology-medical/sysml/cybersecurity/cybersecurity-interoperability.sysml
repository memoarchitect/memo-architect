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

    part def ThreatModel {
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
}
