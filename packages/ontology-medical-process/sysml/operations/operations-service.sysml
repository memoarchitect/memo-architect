package MEMO_Ontology_MedicalProcess_OperationsService {

    // §4.5.2 — procedure subclasses carry a procedureType attribute; the base
    // Procedure in ontology-core gains a matching attribute so new usages can
    // drop the subclass name entirely.
    action def ManufacturingProcedure :> Procedure {
        attribute procedureType : String;   // "assembly" | "test" | "packaging"
    }

    action def InstallationProcedure :> Procedure {
        attribute site : String;
    }

    action def ServiceProcedure :> Procedure {
        attribute serviceType : String;     // "repair" | "inspection" | "maintenance"
    }

    action def PreventiveMaintenanceProcedure :> ServiceProcedure {
        attribute interval : String;        // e.g. "3mo", "annual"
    }

    action def CalibrationProcedure :> ServiceProcedure {
        attribute calibrationStandard : String;
    }

    // §4.5.7 — record subclasses carry a recordType; DesignHistoryRecord is
    // kept as a P1 exception (FDA 21 CFR 820.30(j)) in the whitelist.
    part def ManufacturingRecord :> QMSRecord {
        attribute lotNumber : String;
        attribute manufacturedOn : String;
    }

    part def InstallationQualification :> ComplianceEvidence {
        attribute site : String;
        attribute installedOn : String;
    }

    part def ServiceReport :> QMSRecord {
        attribute serviceDate : String;
        attribute technician : String;
    }

    part def CalibrationRecord :> ComplianceEvidence {
        attribute calibratedOn : String;
        attribute nextCalibrationDue : String;
    }
}
