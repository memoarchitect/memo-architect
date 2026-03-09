// ============================================================================
// MEMO Ontology — Logical Architecture Domain
// System structure — part defs for decomposable structural elements.
// ============================================================================

package MEMO_Ontology_Logical {

    // ═══════════════════════════════════════════════════════════════════════
    // 5. LOGICAL ARCHITECTURE — System structure
    //    Part defs for decomposable structural elements.
    // ═══════════════════════════════════════════════════════════════════════

    part def System {
        doc /* Top-level system under development. */
        attribute name : String;
        attribute cost : String;
        part subsystems : Subsystem[0..*];
    }

    part def SystemExternal :> System {
        doc /* An external system interacting with the system under development. */
    }

    part def Subsystem {
        doc /* A major subdivision of the system. */
        attribute name : String;
        attribute cost : String;
    }

    part def Component {
        doc /* A logical or physical component. */
        attribute name : String;
        attribute level : String;
        attribute priority : String;
    }

    part def LogicalComponent {
        doc /* A logical (functional) architectural component. */
        attribute name : String;
    }

    part def LogicalComponentExternal :> LogicalComponent {
        doc /* An external/third-party logical component (SOUP). */
    }

    part def EnvironmentElement {
        doc /* An element of the operating environment affecting the system. */
        attribute name : String;
        attribute level : String;
        attribute humidity : String;
        attribute pressure : String;
        attribute temperature : String;
    }

    part def ArchitectureDecision {
        doc /* A documented architecture decision. */
        attribute name : String;
    }

    part def ArchitectureRationale {
        doc /* The reasoning behind an architecture decision. */
        attribute name : String;
    }

    part def QualityAttribute {
        doc /* A non-functional quality — performance, reliability, security. */
        attribute name : String;
    }

    part def Question {
        doc /* An open design question requiring resolution. */
        attribute name : String;
    }
}
