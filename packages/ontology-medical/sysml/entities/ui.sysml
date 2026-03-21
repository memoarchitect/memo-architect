package MEMO_Ontology_Medical_UI {

    // Product UI is part of the regulated software realization, not a disconnected sketch layer.
    action def UIFunction :> SystemFunction { }

    part def UIElement :> SoftwareComponent {
        attribute name : String;
    }

    part def UIScreen :> UIElement { }

    part def UIPanel :> UIElement { }
}
