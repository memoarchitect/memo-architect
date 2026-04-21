package MEMO_Ontology_Process_ISO13485 {

    // ISO 13485:2016 — Quality Management Systems for medical devices.
    // Covers design control (§7.3), CAPA (§8.5), document control (§4.2),
    // supplier control (§7.4), management review (§5.6).

    // ─── §4.2 Document Control ───────────────────────────────────────────────

    part def QMSRecord :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute documentNumber : String;
        attribute revision : String;
        attribute approvalDate : String;
        attribute approvedBy : String;
    }

    part def QMSProcedure :> QMSRecord {
        attribute scope : String;
        attribute owner : String;
    }

    // ─── §5.6 Management Review ──────────────────────────────────────────────

    part def ManagementReviewRecord :> QMSRecord {
        attribute reviewDate : String;
        attribute attendees : String;
        attribute inputs : String;
        attribute outputs : String;
    }

    // ─── §7.3 Design Control ─────────────────────────────────────────────────

    part def DesignAndDevelopmentPlan :> QMSRecord {
        attribute scope : String;
        attribute designPhases : String;
    }

    part def DesignInput :> QMSRecord {
        attribute inputType : String;
        attribute sourceNeed : String;
    }

    part def DesignOutput :> QMSRecord {
        attribute outputType : String;
        attribute tracesTo : String;
    }

    part def DesignVerification :> QMSRecord {
        attribute verificationMethod : String;
        attribute passFailCriteria : String;
        attribute result : String;
    }

    part def DesignValidation :> QMSRecord {
        attribute validationMethod : String;
        attribute targetUser : String;
        attribute result : String;
    }

    part def DesignTransfer :> QMSRecord {
        attribute productionSite : String;
        attribute transferDate : String;
    }

    part def DesignChange :> QMSRecord {
        attribute changeId : String;
        attribute safetyImpact : Boolean;
        attribute revalidationRequired : Boolean;
    }

    // ─── §7.4 Supplier Control ───────────────────────────────────────────────

    part def SupplierEvaluation :> QMSRecord {
        attribute supplierId : String;
        attribute supplierName : String;
        attribute qualificationStatus : String;
        attribute qualificationDate : String;
    }

    part def PurchaseSpecification :> QMSRecord {
        attribute supplierId : String;
        attribute itemDescription : String;
        attribute qualityRequirements : String;
    }

    // ─── §8.5 Corrective and Preventive Action ───────────────────────────────

    part def CAPARecord :> QMSRecord {
        attribute capaId : String;
        attribute source : String;
        attribute rootCause : String;
        attribute correctiveAction : String;
        attribute preventiveAction : String;
        attribute effectivenessCheck : String;
        attribute closureDate : String;
    }

    connection def TracesDesignInput {
        end output : DesignOutput [1];
        end input : DesignInput [1];
    }

    connection def VerifiesOutput {
        end verification : DesignVerification [1];
        end output : DesignOutput [1];
    }

    connection def ValidatesOutput {
        end validation : DesignValidation [1];
        end output : DesignOutput [1];
    }

    connection def DocumentsChange {
        end change : DesignChange [1];
        end subject[1];
    }
}
