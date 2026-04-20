package MEMO_Ontology_MedicalArch_Analysis {

    part def Constraint {
        attribute name : String;
        attribute expression : String;
    }

    part def Assumption {
        attribute name : String;
        attribute statement : String;
    }

    part def Measure {
        attribute name : String;
        attribute unit : String;
    }

    // ─── Trade studies (folded from ontology-extensions/analysis-advanced) ──
    part def AnalysisCase {
        attribute name : String;
    }

    part def Calculation {
        attribute name : String;
        attribute formula : String;
    }

    part def TradeStudy {
        attribute name : String;
    }

    part def AnalysisResult {
        attribute name : String;
        attribute conclusion : String;
    }

    attribute def Parameter { }
}
