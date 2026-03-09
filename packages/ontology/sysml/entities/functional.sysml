// ============================================================================
// MEMO Ontology — Functional Analysis Domain
// What the system does — functions, activities, scenarios.
// ============================================================================

package MEMO_Ontology_Functional {

    // ═══════════════════════════════════════════════════════════════════════
    // 4. FUNCTIONAL ANALYSIS — What the system does
    //    Actions model behavior — functions, activities, scenarios.
    // ═══════════════════════════════════════════════════════════════════════

    action def SystemFunction {
        doc /* A system-level function — externally visible behavior. */
        attribute name : String;
        attribute level : String;
    }

    action def ComponentFunction {
        doc /* A component-level function — internal behavior. */
        attribute name : String;
        attribute level : String;
    }

    action def UserActivity {
        doc /* An activity a user performs interacting with the system. */
        attribute name : String;
        attribute level : String;
    }

    action def UIFunction {
        doc /* A user-interface function. */
        attribute name : String;
    }

    action def Scenario {
        doc /* A step-by-step sequence — normal, alternate, or exception flow. */
        attribute name : String;
    }

    part def UseCase {
        doc /* A usage scenario binding actor + goal + system interaction.
             * Contains scenarios as behavioral decomposition. */
        attribute name : String;
        attribute lifecycleStage : String;
        attribute operativeStage : String;
        attribute level : String;
        attribute status : String;
    }
}
