package MEMO_Ontology_Cybersecurity {

    // ─── IEC 81001-5-1 / FDA Cybersecurity Guidance ──────────────────────────

    // A valuable asset that must be protected from threats.
    part def CyberAsset {
        attribute name : String;
        attribute assetType : String;       // PHI | key | firmware | interface | data store
        attribute assetValue : String;      // High | Medium | Low
    }

    // A structured threat modelling artefact (STRIDE / TARA per ISO 21434).
    part def ThreatModel {
        attribute title : String;
        attribute methodology : String;     // STRIDE | TARA | PASTA | LINDDUN
    }

    // A specific identified threat scenario.
    requirement def ThreatScenario {
        attribute threatId : String;
        attribute title : String;
        attribute stride : String;          // Spoofing | Tampering | Repudiation | InfoDisc | DoS | EoP
        attribute likelihood : String;
    }

    // A software vulnerability (CVE, CWE reference).
    requirement def Vulnerability {
        attribute vulnerabilityId : String; // CVE-YYYY-NNNNN
        attribute title : String;
        attribute cvssScore : String;
        attribute cweRef : String;
    }

    // A security control that mitigates one or more threats (derives from risk control).
    requirement def SecurityControl :> RiskControl { }

    // Software Bill of Materials artefact — now a standalone part, not tied to
    // SoftwareWorkProduct (which lives in ontology-iec62304).
    part def SBOMArtifact {
        attribute sbomId : String;
        attribute format : String;          // SPDX | CycloneDX
        attribute generatedDate : String;
        attribute componentCount : Integer;
    }

    // Capability enabling authenticated, integrity-checked software updates.
    part def SecureUpdateCapability {
        attribute name : String;
        attribute signatureAlgorithm : String;
        attribute rollbackProtection : Boolean;
    }

    // Penetration test report.
    part def PenetrationTestReport {
        attribute reportId : String;
        attribute scope : String;
        attribute criticalFindings : Integer;
    }

    // ─── Cybersecurity Relationships ──────────────────────────────────────────
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
        end subject [1];
    }

    connection def SupportsSecureUpdate {
        end capability : SecureUpdateCapability [1];
        end subject [1];
    }
}
