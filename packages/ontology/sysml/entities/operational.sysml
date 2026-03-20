// ============================================================================
// MEMO Ontology — Operational Domain
// Mission, actors, operational entities, and mission-phase level scenarios.
// ============================================================================

package MEMO_Ontology_Operational {

    part def Mission {
        doc /* A mission or top-level operational objective. */
        attribute name : String;
        attribute objective : String;
    }

    part def OperationalActor {
        doc /* An actor in the operational environment. */
        attribute name : String;
        attribute role : String;
    }

    part def OperationalEntity {
        doc /* A non-system entity participating in operations. */
        attribute name : String;
        attribute category : String;
    }

    part def MissionPhase {
        doc /* A distinct phase in the mission or operational lifecycle. */
        attribute name : String;
        attribute order : Integer;
    }

    action def OperationalActivity {
        doc /* An activity performed during operations. */
        attribute name : String;
        attribute level : String;
    }

    action def OperationalScenario {
        doc /* An operational scenario spanning mission context and actors. */
        attribute name : String;
        attribute scenarioType : String;
    }
}
