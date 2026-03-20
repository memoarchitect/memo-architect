// ============================================================================
// MEMO Ontology — Analysis Domain
// Constraints, calculations, assumptions, parameters, and measures.
// ============================================================================

package MEMO_Ontology_Analysis {

    part def RequirementSet {
        doc /* A named grouping or specification container for requirements. */
        attribute name : String;
    }

    part def AnalysisCase {
        doc /* A named analysis study or assessment case. */
        attribute name : String;
    }

    part def Constraint {
        doc /* A design or analysis constraint. */
        attribute name : String;
        attribute expression : String;
    }

    part def Calculation {
        doc /* A named calculation or derived quantity. */
        attribute name : String;
        attribute formula : String;
    }

    part def Assumption {
        doc /* An explicit assumption used in reasoning or analysis. */
        attribute name : String;
        attribute statement : String;
    }

    part def Measure {
        doc /* A measurable quantity or KPI. */
        attribute name : String;
        attribute unit : String;
    }

    attribute def Parameter { }
}
