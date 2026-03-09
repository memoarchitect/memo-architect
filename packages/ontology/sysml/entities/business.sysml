// ============================================================================
// MEMO Ontology — Business Analysis Domain
// Stakeholders, Actors, Goals
// Who cares about this system and what do they want?
// ============================================================================

package MEMO_Ontology_Business {

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BUSINESS ANALYSIS — Stakeholders, Actors, Goals
    //    Who cares about this system and what do they want?
    // ═══════════════════════════════════════════════════════════════════════

    part def Actor {
        doc /* A person or external system that interacts with the system. */
        attribute name : String;
    }

    part def Stakeholder :> Actor {
        doc /* A party with interest — patient, clinician, regulator, payer. */
    }

    part def Goal {
        doc /* A high-level objective a stakeholder wants to achieve. */
        attribute name : String;
        attribute level : String;
    }

    part def Concern {
        doc /* A stakeholder worry the architecture must address. */
        attribute name : String;
    }

    part def Responsibility {
        doc /* A duty assigned to an actor or organizational role. */
        attribute name : String;
        attribute level : String;
    }

    part def Capability {
        doc /* A system ability delivering stakeholder value. */
        attribute name : String;
        attribute level : String;
    }
}
