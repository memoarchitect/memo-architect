package MEMO_Ontology_Medical_Platform {

    // Temporary implementation/platform concepts kept in the ontology layer
    // until multi-ontology composition is available in the config chain.
    part def Docker :> Software { }

    part def RosNode :> SoftwareComponent { }

    interface def RosTopic :> SoftwareInterface { }

    interface def RosService :> SoftwareInterface { }
}
