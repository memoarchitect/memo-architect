// ============================================================================
// MEMO Ontology — Relationship Definitions
// Typed connections between elements.
// ============================================================================

package MEMO_Ontology_Relationships {

    // ═══════════════════════════════════════════════════════════════════════
    // RELATIONSHIP DEFINITIONS — Typed connections between elements
    // ═══════════════════════════════════════════════════════════════════════

    connection def Aggregation {
        doc /* Whole-part structural relationship. */
        end whole[1];
        end part[0..*];
    }

    connection def Association {
        doc /* General semantic link between two elements. */
        end source[1];
        end target[1];
    }

    connection def TraceTo {
        doc /* Directed traceability (forward trace). */
        end source[1];
        end target[1];
    }

    connection def Trace {
        doc /* Bidirectional traceability. */
        end source[1];
        end target[1];
    }

    connection def Refines {
        doc /* A more detailed element refines a higher-level one. */
        end refiner[1];
        end refined[1];
    }

    connection def Derives {
        doc /* A downstream requirement or element is derived from another. */
        end source[1];
        end derived[1];
    }

    connection def Constrains {
        doc /* A constraint applies to an element or model fragment. */
        end constraint[1];
        end constrained[1];
    }

    connection def AllocateTo {
        doc /* Allocation of function to structure. */
        end function[1];
        end structure[1];
    }

    connection def ComposedOf {
        doc /* Strong ownership composition. */
        end whole[1];
        end part[0..*];
    }

    connection def Dependency {
        doc /* Usage or dependency relationship. */
        end client[1];
        end supplier[1];
    }

    connection def Realization {
        doc /* Implementation of an interface or spec. */
        end realizing[1];
        end realized[1];
    }

    connection def Satisfy {
        doc /* A requirement is satisfied by a design element. */
        end satisfiedBy[1];
        end satisfies : Requirement [1];
    }

    connection def Verify {
        doc /* A test verifies a requirement. */
        end verifiedBy[1];
        end verifies : Requirement [1];
    }

    connection def Mitigates {
        doc /* A risk control mitigates a hazard or risk. */
        end control : RiskControl [1];
        end hazard : Hazard [1];
    }

    connection def Causes {
        doc /* A hazard causes a hazardous situation. */
        end hazard : Hazard [1];
        end situation : HazardousSituation [1];
    }

    connection def LeadsTo {
        doc /* A hazardous situation leads to harm. */
        end situation : HazardousSituation [1];
        end harm : Harm [1];
    }

    connection def Identifies {
        doc /* A risk assessment identifies a hazard. */
        end risk : Risk [1];
        end hazard : Hazard [1];
    }

    // UseCase relationships
    connection def Extend {
        doc /* UseCase extension. */
        end base[1];
        end extension[1];
    }

    connection def Include {
        doc /* UseCase inclusion. */
        end including[1];
        end included[1];
    }

    connection def Flow {
        doc /* Flow of items or information between actions/elements. */
        end source[1];
        end target[1];
    }

    connection def Succession {
        doc /* Temporal succession between actions or activities. */
        end predecessor[1];
        end successor[1];
    }

    connection def DecomposedBy {
        doc /* Functional decomposition from parent to child. */
        end parent[1];
        end child[0..*];
    }
}
