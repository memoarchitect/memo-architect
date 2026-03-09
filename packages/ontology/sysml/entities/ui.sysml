// ============================================================================
// MEMO Ontology — UI Wireframe Domain
// Screens, Panels, Elements.
// ============================================================================

package MEMO_Ontology_UI {

    // ═══════════════════════════════════════════════════════════════════════
    // 9. UI WIREFRAME — Screens, Panels, Elements
    // ═══════════════════════════════════════════════════════════════════════

    part def UIScreen {
        doc /* A screen/page in the user interface. */
        attribute name : String;
    }

    part def UIPanel {
        doc /* A panel/section within a screen. */
        attribute name : String;
    }

    part def UIElement {
        doc /* An individual UI widget — button, input, display. */
        attribute name : String;
    }
}
