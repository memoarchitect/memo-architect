package MEMO_Ontology_MedicalArch_UI {

    // §4.5.4 — UI concepts carry a uiKind attribute; specific subclasses
    // retain their names for use in examples but declare distinguishing
    // structural attributes per P1 rule 1.

    // A UI-bound function — distinguished from pure logic Function by having
    // explicit screen-flow metadata.
    action def UIFunction :> Function {
        attribute uiContext : String;       // "setup" | "runtime" | "alarm"
    }

    part def UIElement :> SoftwareComponent {
        attribute uiKind : String;          // "screen" | "panel" | "widget" | "dialog"
    }

    part def UIScreen :> UIElement {
        attribute route : String;           // navigation path
    }

    part def UIPanel :> UIElement {
        attribute anchor : String;          // "banner" | "sidebar" | "modal"
    }
}
