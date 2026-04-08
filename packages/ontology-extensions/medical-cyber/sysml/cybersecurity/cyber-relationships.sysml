package MEMO_Extension_Medical_Cyber_Relationships {

    connection def ModelsThreat {
        end model : ThreatModel [1];
        end threat : ThreatScenario [1];
    }

    connection def ThreatensAsset {
        end threat : ThreatScenario [1];
        end asset : CyberAsset [1];
    }

    connection def ExploitsVulnerability {
        end threat : ThreatScenario [1];
        end vulnerability : Vulnerability [1];
    }

    connection def MitigatesThreat {
        end control : SecurityControl [1];
        end threat : ThreatScenario [1];
    }

    connection def SecuresInterface {
        end control : SecurityControl [1];
        end dataInterface : DataInterface [1];
    }

    connection def MaintainsSbom {
        end sbom : SBOMArtifact [1];
        end subject[1];
    }

    connection def SupportsSecureUpdate {
        end capability : SecureUpdateCapability [1];
        end subject[1];
    }
}
