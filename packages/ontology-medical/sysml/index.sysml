package MEMO_Ontology_Medical {
    // Transitive foundation: ontology-core ← ontology-qms ← ontology-medical
    import MEMO_Ontology_Core::*;
    import MEMO_Ontology_QMS::*;

    // Medical domain layers
    import MEMO_Ontology_Medical_DesignControl::*;
    import MEMO_Ontology_Medical_Development::*;
    import MEMO_Ontology_Medical_OperationsService::*;
    import MEMO_Ontology_Medical_Ops_Relationships::*;
    import MEMO_Ontology_Medical_Risk::*;
    import MEMO_Ontology_Medical_RiskAnalysis::*;
    import MEMO_Ontology_Medical_Risk_Relationships::*;
    import MEMO_Ontology_Medical_Safety::*;
    import MEMO_Ontology_Medical_Safety_Relationships::*;
    import MEMO_Ontology_Medical_UI::*;
}
