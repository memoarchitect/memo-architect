package MEMO_Ontology_MedicalArch_Software {

    // Every software element shares identity/version metadata.
    part def SoftwareElement {
        attribute name : String;
        attribute version : String;
        attribute supplier : String;
        attribute safetyClassification : String;
    }

    // Generic software artefact used by device examples prior to commitment to
    // a concrete SEI/AADL subtype. Structural attribute: executionModel.
    part def Software :> SoftwareElement {
        attribute executionModel : String;  // "monolithic" | "threaded" | "container" | "bundle"
    }

    // SEI ADD/SAM: deployable implementation element.
    // AADL analogue: thread group/process implementation boundary.
    part def SoftwareComponent :> SoftwareElement {
        attribute componentType : String;   // e.g. "process", "container", "task"
    }

    // SEI SAM/CBAM: module-level decomposition unit.
    // AADL analogue: package/subprogram grouping.
    part def SoftwareModule :> SoftwareElement {
        attribute moduleType : String;      // e.g. "library", "package", "subsystem"
    }

    // SEI ADD: architectural layer/tier.
    part def SoftwareLayer :> SoftwareElement {
        attribute layerRole : String;       // e.g. "presentation", "domain", "infrastructure"
    }

    // SEI SAM: top-level assembled software product.
    // AADL analogue: complete software system package.
    part def SoftwareSystem :> SoftwareElement {
        attribute runtimeTarget : String;
    }

    // AADL analogue: thread/subprogram execution context.
    part def SoftwareThread :> SoftwareElement {
        attribute schedulingPolicy : String;
        attribute period : String;
    }

    // AADL analogue: data component/storage resource.
    part def SoftwareDataStore :> SoftwareElement {
        attribute storageType : String;
        attribute consistencyModel : String;
    }

    // SEI/AADL: explicit connector/channel between elements.
    part def SoftwareConnector :> SoftwareElement {
        attribute connectorType : String;
        attribute protocol : String;
    }

    // Firmware remains a software component coupled to hardware resources.
    part def Firmware :> SoftwareComponent {
        attribute targetHardware : String;
    }

    // ─── Platform runtimes (folded from ontology-extensions/platform-core) ──
    part def Docker :> Software {
        attribute image : String;
        attribute tag : String;
        attribute runtimeSocket : String;
    }

    part def EventDrivenService :> SoftwareComponent {
        attribute consumedEvent : String;
        attribute deliverySemantic : String;
    }

    part def MessageBroker :> SoftwareComponent {
        attribute brokerProtocol : String;
        attribute clusterSize : Integer;
    }
}
