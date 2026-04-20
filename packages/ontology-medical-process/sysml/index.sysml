package MEMO_Ontology_MedicalProcess {
    // Base — medical-arch must be in scope
    import MEMO_Ontology_MedicalArch::*;

    // QMS (ISO 13485) — records, procedures, standards, submissions
    import MEMO_Ontology_MedicalProcess_QMS_Records::*;
    import MEMO_Ontology_MedicalProcess_QMS_DesignControl::*;

    // Design control (21 CFR 820.30, IEC 62366 usability) — intended use, user activities, formative/summative eval
    import MEMO_Ontology_MedicalProcess_DesignControl::*;

    // Risk management (ISO 14971) — hazards, hazardous situations, risk, mitigation, FMEA/FTA
    import MEMO_Ontology_MedicalProcess_Risk::*;
    import MEMO_Ontology_MedicalProcess_RiskAnalysis::*;
    import MEMO_Ontology_MedicalProcess_Risk_Relationships::*;

    // Safety (IEC 60601) — essential performance, safety classification
    import MEMO_Ontology_MedicalProcess_Safety::*;
    import MEMO_Ontology_MedicalProcess_Safety_Relationships::*;

    // Manufacturing / service operations
    import MEMO_Ontology_MedicalProcess_OperationsService::*;
    import MEMO_Ontology_MedicalProcess_Ops_Relationships::*;
}
