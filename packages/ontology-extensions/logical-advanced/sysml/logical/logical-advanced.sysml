package MEMO_Extension_Logical_Advanced {

    // §4.5.11 — SystemOfSystems kept as P1 rule 1 exception (distinct structural
    // attribute: hierarchical member-system composition).
    part def SystemOfSystems :> System {
        attribute memberSystems : String;       // comma-separated system names
        attribute integrationPattern : String;  // "federated" | "acknowledged" | "collaborative"
    }

    // §4.5.11 — SystemExternal retained as an alias of ExternalSystem for
    // downstream models; adds its own interoperability protocol metadata.
    part def SystemExternal :> System {
        attribute externalInterfaceProtocol : String;
        attribute integrationContract : String;
    }

    part def ArchitectureRationale {
        attribute name : String;
    }

    part def Question {
        attribute name : String;
    }
}
