package MEMO_Ontology_MedicalProcess_QMS_Records {

    // ─── ISO 13485 §4 — Quality Management System Records ────────────────────
    // Base for any document produced or maintained by the QMS.
    part def QMSRecord {
        attribute recordId : String;
        attribute title : String;
        attribute version : String;
        attribute status : String;          // Draft | Approved | Obsolete
        attribute owner : String;
    }

    // A repeatable QMS activity governed by a procedure (§4.2.4).
    action def QMSProcess {
        attribute name : String;
        attribute clause : String;          // e.g. "ISO13485:7.3"
    }

    // A written procedure defining how a QMS process is executed (§4.2.4).
    part def QMSProcedure :> QMSRecord {
        attribute appliesTo : String;
    }

    // Referenced quality or regulatory standard.
    part def Standard {
        attribute name : String;
        attribute version : String;
    }

    // ─── §4.2.5 — Compliance Evidence ────────────────────────────────────────
    // Any artefact that demonstrates conformance to a requirement or standard.
    part def ComplianceEvidence :> QMSRecord {
        attribute evidenceType : String;    // e.g. "test report", "audit record"
        attribute standard : String;
    }

    // A specific mandatory requirement from a standard or regulation.
    requirement def RegulatoryRequirement :> Requirement {
        attribute standard : String;        // e.g. "ISO 13485:2016 §7.3.2"
        attribute clause : String;
    }

    // ─── Regulatory Submissions ───────────────────────────────────────────────
    part def CEMark :> ComplianceEvidence {
        attribute notifiedBody : String;
        attribute annexRoute : String;      // e.g. "Annex II", "Annex IX"
    }

    part def FDAClearance :> ComplianceEvidence {
        attribute submissionNumber : String;
        attribute decisionType : String;    // "510(k)" | "De Novo" | "PMA"
    }

    // Design history record index (FDA 21 CFR 820.30(j)).
    // P1 exception — named regulatory artefact, whitelisted in .p1-exceptions.yaml.
    part def DesignHistoryRecord :> QMSRecord { }

    // Controlled change record linked to released baselines.
    part def ChangeRecord :> QMSRecord {
        attribute changeType : String;      // "design" | "process" | "document"
        attribute changeReason : String;
    }

    // Named release baseline for controlled configuration snapshots.
    part def ReleaseBaseline :> QMSRecord {
        attribute baselineVersion : String;
    }

    // ─── QMS Relationships ────────────────────────────────────────────────────
    connection def Evidences {
        end evidence : ComplianceEvidence [1];
        end subject [1];
    }

    connection def Documents {
        end record : QMSRecord [1];
        end subject [1];
    }

    connection def AppliesStandardRequirement {
        end standardRequirement : RegulatoryRequirement [1];
        end subject [1];
    }
}
